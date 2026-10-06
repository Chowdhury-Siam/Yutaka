import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/testing.dart';
import 'package:path_provider_platform_interface/path_provider_platform_interface.dart';
import 'package:provider/provider.dart';
import 'package:sqflite/sqflite.dart' as sql;
import 'package:sqflite_common_ffi/sqflite_ffi.dart' as ffi;
import 'package:yutaka/app_config.dart';
import 'package:yutaka/main.dart';
import 'package:yutaka/update_service.dart';

class _TestPaths extends PathProviderPlatform {
  _TestPaths(this.path);

  final String path;

  @override
  Future<String?> getApplicationSupportPath() async => path;

  @override
  Future<String?> getApplicationDocumentsPath() async {
    fail('Flatpak storage must not use the host Documents directory.');
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('Flatpak database and backups stay in private persistent storage', () async {
    final directory = await Directory.systemTemp.createTemp('yutaka-flatpak-data-');
    final previousPaths = PathProviderPlatform.instance;
    final previousFactory = sql.databaseFactoryOrNull;
    sql.Database? database;
    try {
      PathProviderPlatform.instance = _TestPaths(directory.path);
      ffi.sqfliteFfiInit();
      sql.databaseFactory = ffi.databaseFactoryFfiNoIsolate;
      database = await YutakaDatabase().db;
      expect(database.path, '${directory.path}/yutaka_flutter.db');
      await database.execute('CREATE TABLE flatpak_persistence_probe (value TEXT)');
      await database.insert('flatpak_persistence_probe', {'value': 'preserved'});
      await database.close();
      database = await YutakaDatabase().db;
      expect(await database.query('flatpak_persistence_probe'), [{'value': 'preserved'}]);
      final backups = await BackupService.backupStorageDirectory();
      expect(backups.path, '${directory.path}/backups');
      expect(await backups.exists(), isTrue);
    } finally {
      if (database != null && database.isOpen) await database.close();
      sql.databaseFactoryOrNull = previousFactory;
      PathProviderPlatform.instance = previousPaths;
      await directory.delete(recursive: true);
    }
  }, skip: !kIsFlatpakBuild);

  test('Flatpak checks never contact GitHub', () async {
    final service = GithubUpdateService(client: MockClient((_) async {
      fail('Flatpak must not request GitHub app releases.');
    }));
    for (final prereleases in [false, true]) {
      final result = await service.check(
        installedVersion: appVersion,
        includePrereleases: prereleases,
      );
      expect(result.hasUpdate, isFalse);
      expect(result.release, isNull);
      expect(result.message, kFlatpakUpdateMessage);
    }
  }, skip: !kIsFlatpakBuild);

  test('Flatpak refuses existing Linux installers and controller downloads', () async {
    final directory = await Directory.systemTemp.createTemp('yutaka-flatpak-');
    final installer = File('${directory.path}/Yutaka-setup.run');
    await installer.writeAsString('#!/bin/sh\nexit 0\n');
    final controller = AppController();
    addTearDown(controller.dispose);
    addTearDown(() => directory.delete(recursive: true));
    controller.pendingLinuxUpdatePath = installer.path;
    controller.pendingLinuxUpdateVersion = '99.0.0';

    expect(await LinuxUpdateInstaller.install(installer.path), isFalse);
    await controller.downloadLinuxUpdate(force: true);
    expect(controller.updateStatusMessage, kFlatpakUpdateMessage);
    await controller.installPendingLinuxUpdate();
    expect(controller.updateStatusMessage, kFlatpakUpdateMessage);
    expect(controller.hasPendingLinuxUpdate, isFalse);
    expect(controller.updateDownloadBusy, isFalse);
    expect(controller.updateInstallBusy, isFalse);
    expect(await installer.exists(), isTrue);
  }, skip: !kIsFlatpakBuild);

  testWidgets('Settings exposes the app updater only for direct distributions', (tester) async {
    final controller = AppController();
    addTearDown(controller.dispose);
    await tester.pumpWidget(ChangeNotifierProvider<AppController>.value(
      value: controller,
      child: const MaterialApp(home: SettingsScreen()),
    ));
    expect(
      find.text('Updates'),
      kIsFlatpakBuild || kIsGooglePlayBuild ? findsNothing : findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });
}
