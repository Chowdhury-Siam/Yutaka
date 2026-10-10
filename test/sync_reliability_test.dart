import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sqflite/sqflite.dart' as sql;
import 'package:sqflite_common_ffi/sqflite_ffi.dart' as ffi;
import 'package:yutaka/main.dart';
import 'package:yutaka/models.dart';
import 'package:yutaka/sync_models.dart';
import 'package:yutaka/sync_services.dart';

Map<String, Object?> account(int amount, int updated) => Account(
    id: 'cash-account', name: 'Cash', type: AccountType.regular,
    iconName: 'wallet', iconColor: '#00BC9A', amount: amount.toDouble(),
    creditLimit: 0, sequence: 0, createdOn: DateTime.fromMillisecondsSinceEpoch(100),
    updatedOn: DateTime.fromMillisecondsSinceEpoch(updated)).toMap();

Map<String, dynamic> remote(Map<String, Object?> payload, {String type = 'accounts', int version = 3}) => {
  'entityType': type, 'entityId': payload['id'], 'operation': 'upsert',
  'version': version, 'payload': payload, 'changedAt': 200,
};

Map<String, dynamic> conflict(Map<String, Object?> row) => {
  'operationId': row['id'], 'entityType': row['entity_type'],
  'entityId': row['entity_id'], 'serverVersion': 2,
};

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Directory directory;
  late YutakaDatabase database;
  late String previousPath;
  sql.DatabaseFactory? previousFactory;
  HttpOverrides? previousHttpOverrides;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    previousFactory = sql.databaseFactoryOrNull;
    ffi.sqfliteFfiInit();
    sql.databaseFactory = ffi.databaseFactoryFfiNoIsolate;
    previousPath = await sql.databaseFactory.getDatabasesPath();
    directory = await Directory.systemTemp.createTemp('yutaka-sync-reliability-');
    await sql.databaseFactory.setDatabasesPath(directory.path);
    database = YutakaDatabase();
    await database.db;
    previousHttpOverrides = HttpOverrides.current;
    HttpOverrides.global = null;
    YutakaSyncApi.cancelPendingRequests();
  });

  tearDown(() async {
    final db = await database.db;
    if (db.isOpen) await db.close();
    await sql.databaseFactory.setDatabasesPath(previousPath);
    sql.databaseFactoryOrNull = previousFactory;
    HttpOverrides.global = previousHttpOverrides;
    YutakaSyncApi.cancelPendingRequests();
    await directory.delete(recursive: true);
  });

  test('rapid edits coalesce for every entity and retain the final deletion', () async {
    for (final type in ['accounts', 'transactions', 'notes', 'loans', 'loan_payments', 'budget_accounts']) {
      for (var amount = 1; amount <= 3; amount++) {
        await database.enqueueSyncOperation(entityType: type, entityId: 'entity-one', operation: 'upsert', payload: {'amount': amount});
      }
      await database.enqueueDelete(type, 'entity-one');
    }
    final pending = await database.pendingSyncOperations();
    expect(pending, hasLength(6));
    expect(await database.pendingSyncOperationCount(), 6);
    expect(pending.every((row) => row['operation'] == 'delete'), isTrue);
  });

  test('an in-flight acknowledgement advances a newer replacement without dropping it', () async {
    await database.enqueueSyncOperation(entityType: 'accounts', entityId: 'cash-account', operation: 'upsert', payload: account(100, 100));
    final attempted = await database.pendingSyncOperations();
    await database.enqueueSyncOperation(entityType: 'accounts', entityId: 'cash-account', operation: 'upsert', payload: account(200, 200));
    final id = attempted.single['id'] as String;
    await database.markOutboxUploaded([id], {id: 1}, attemptedOperations: attempted);
    final newer = (await database.pendingSyncOperations()).single;
    expect(newer['id'], isNot(id));
    expect(newer['base_version'], 1);
    expect(jsonDecode(newer['payload_json'] as String)['amount'], 200);
    await database.saveEntityVersion('accounts', 'cash-account', 5);
    await database.markOutboxUploaded([id], {id: 1}, attemptedOperations: attempted);
    expect(await database.localEntityVersion('accounts', 'cash-account'), 5);
  });

  test('legacy same-entity rows upload in order even when timestamps tie', () async {
    final db = await database.db;
    for (final id in ['old-create', 'old-edit', 'old-delete']) {
      await db.insert('sync_outbox', {'id': id, 'entity_type': 'accounts', 'entity_id': 'cash-account',
        'operation': id == 'old-delete' ? 'delete' : 'upsert', 'payload_json': '{}', 'base_version': 0, 'created_at': 100});
    }
    var pending = await database.pendingSyncOperations();
    expect(pending.single['id'], 'old-create');
    await database.markOutboxUploaded(['old-create'], {'old-create': 1});
    pending = await database.pendingSyncOperations();
    expect(pending.single['id'], 'old-edit');
    expect(pending.single['base_version'], 1);
    await database.markOutboxUploaded(['old-edit'], {'old-edit': 2});
    pending = await database.pendingSyncOperations();
    expect(pending.single['id'], 'old-delete');
    expect(pending.single['base_version'], 2);
  });

  test('pending deletes survive remote upserts and rebase for every row type', () async {
    for (final type in ['accounts', 'notes']) {
      final payload = type == 'accounts' ? account(100, 100) : <String, Object?>{
        'id': 'cash-account', 'title': 'Note', 'body': 'Keep deleted', 'created_on': 100, 'updated_on': 100,
      };
      await database.enqueueDelete(type, 'cash-account');
      final rejected = (await database.latestPendingSyncOperation(type, 'cash-account'))!;
      final change = remote(payload, type: type);
      await database.applyRemoteChanges([change], (_) async {}, conflictedOperationIds: {rejected['id'] as String});
      expect(await database.syncEntityRow(type, 'cash-account'), isNull);
      expect(await database.reconcileSyncConflict(conflict(rejected), change), isTrue);
      final retry = (await database.latestPendingSyncOperation(type, 'cash-account'))!;
      expect(retry['operation'], 'delete');
      expect(retry['base_version'], 3);
    }
  });

  test('newer local edits rebase to the pulled version and newer server edits win', () async {
    for (final localTime in [100, 300]) {
      final payload = account(999, localTime);
      await database.upsertSyncEntityRow('accounts', payload);
      await database.enqueueSyncOperation(entityType: 'accounts', entityId: 'cash-account', operation: 'upsert', payload: payload);
      final rejected = (await database.pendingSyncOperations()).single;
      final change = remote(account(200, 200));
      await database.applyRemoteChanges([change], (_) async {}, conflictedOperationIds: {rejected['id'] as String});
      expect(await database.reconcileSyncConflict(conflict(rejected), change), localTime > 200);
      expect((await database.syncEntityRow('accounts', 'cash-account'))!['amount'], localTime > 200 ? 999 : 200);
      if (localTime > 200) {
        final retry = (await database.pendingSyncOperations()).single;
        expect(retry['id'], isNot(rejected['id']));
        expect(retry['base_version'], 3);
      } else {
        expect(await database.pendingSyncOperationCount(), 0);
      }
    }
  });

  test('editing during a conflict pull retains the newest pending payload', () async {
    await database.upsertSyncEntityRow('accounts', account(100, 100));
    await database.enqueueTableRow('accounts', 'cash-account');
    final rejected = (await database.pendingSyncOperations()).single;
    await database.upsertSyncEntityRow('accounts', account(400, 150));
    await database.enqueueTableRow('accounts', 'cash-account');
    final change = remote(account(200, 200));
    await database.applyRemoteChanges([change], (_) async {}, conflictedOperationIds: {rejected['id'] as String});
    expect(await database.reconcileSyncConflict(conflict(rejected), change), isTrue);
    expect((await database.syncEntityRow('accounts', 'cash-account'))!['amount'], 400);
    expect(jsonDecode((await database.pendingSyncOperations()).single['payload_json'] as String)['amount'], 400);
  });

  test('preserving a local row and queuing its retry commit atomically', () async {
    await database.upsertSyncEntityRow('accounts', account(999, 300));
    final db = await database.db;
    await db.execute("CREATE TRIGGER fail_preserve BEFORE INSERT ON sync_outbox BEGIN SELECT RAISE(ABORT, 'injected queue failure'); END");
    await expectLater(database.applyRemoteChanges([remote(account(200, 200))], (_) async {}), throwsA(isA<sql.DatabaseException>()));
    expect(await database.localEntityVersion('accounts', 'cash-account'), 0);
    expect(await database.pendingSyncOperationCount(), 0);
    await db.execute('DROP TRIGGER fail_preserve');
    expect(await database.applyRemoteChanges([remote(account(200, 200))], (_) async {}), isTrue);
    expect((await database.pendingSyncOperations()).single['base_version'], 3);
  });

  test('a remote note deletion cannot resurrect a rejected stale note', () async {
    final note = <String, Object?>{'id': 'deleted-note', 'title': 'Old', 'body': 'Stale', 'created_on': 100, 'updated_on': 300};
    await database.upsertSyncEntityRow('notes', note);
    await database.enqueueTableRow('notes', 'deleted-note');
    final rejected = (await database.pendingSyncOperations()).single;
    final tombstone = <String, dynamic>{'entityType': 'notes', 'entityId': 'deleted-note', 'operation': 'delete', 'version': 3, 'changedAt': 200};
    await database.applyRemoteChanges([tombstone], (_) async {}, conflictedOperationIds: {rejected['id'] as String});
    expect(await database.reconcileSyncConflict(conflict(rejected), tombstone), isFalse);
    expect(await database.syncEntityRow('notes', 'deleted-note'), isNull);
    expect(await database.pendingSyncOperationCount(), 0);
  });

  test('an interrupted conflict pull preserves the outbox and cursor across restart', () async {
    final controller = AppController();
    addTearDown(controller.dispose);
    await controller.database.upsertSyncEntityRow('accounts', account(999, 300));
    await controller.database.enqueueTableRow('accounts', 'cash-account');
    final original = (await controller.database.pendingSyncOperations()).single;
    await controller.database.writeSyncState('serverCursor', '7');
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    addTearDown(() => server.close(force: true));
    server.listen((request) async {
      final body = await utf8.decoder.bind(request).join();
      request.response.headers.contentType = ContentType.json;
      if (request.uri.path == '/v1/sync/push') {
        final operations = (jsonDecode(body)['operations'] as List).cast<Map>();
        request.response.write(jsonEncode({'accepted': [], 'conflicts': [for (final op in operations) {
          'operationId': op['operationId'], 'entityType': op['entityType'], 'entityId': op['entityId'], 'serverVersion': 2,
        }]}));
      } else {
        request.response.statusCode = 503;
        request.response.write('{"error":"Temporary pull failure"}');
      }
      await request.response.close();
    });
    controller.cloudSyncApiBaseUrl = 'http://127.0.0.1:${server.port}';
    controller.cloudSyncEnabled = true;
    controller.syncAccessToken = 'access';
    controller.syncRefreshToken = 'refresh';
    controller.syncDeviceId = 'device-one';
    await controller.performMultiDeviceSync();
    expect(controller.cloudSyncPending, isTrue);
    expect(controller.cloudSyncError, contains('Temporary pull failure'));
    expect((await controller.database.pendingSyncOperations()).single['id'], original['id']);
    expect(await controller.database.readSyncState('serverCursor', '0'), '7');
    controller.cloudSyncEnabled = false;
    await (await controller.database.db).close();
    database = YutakaDatabase();
    expect((await database.pendingSyncOperations()).single['payload_json'], original['payload_json']);
  });

  test('malformed success responses cannot clear pending operations or stall pagination', () async {
    var response = <String, dynamic>{};
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    addTearDown(() => server.close(force: true));
    server.listen((request) async {
      await request.drain<void>();
      request.response.headers.contentType = ContentType.json;
      request.response.write(jsonEncode(response));
      await request.response.close();
    });
    final api = YutakaSyncApi(baseUrl: 'http://127.0.0.1:${server.port}');
    final invalid = isA<CloudSyncException>().having((error) => error.code, 'code', 'SYNC_INVALID_RESPONSE');
    response = {'accepted': [], 'conflicts': []};
    await expectLater(api.push(accessToken: 'access', operations: [{'operationId': 'pending-id'}]), throwsA(invalid));
    response = {'changes': [], 'cursor': 5, 'hasMore': true};
    await expectLater(api.pull(accessToken: 'access', cursor: 5), throwsA(invalid));
    response = {'changes': [], 'cursor': 4, 'hasMore': false};
    await expectLater(api.pull(accessToken: 'access', cursor: 5), throwsA(invalid));
    response = {'changes': [], 'cursor': 5, 'hasMore': false};
    expect((await api.pull(accessToken: 'access', cursor: 5))['cursor'], 5);
  });
}
