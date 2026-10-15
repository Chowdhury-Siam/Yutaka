import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yutaka/main.dart';

void main() {
  const channel = MethodChannel('com.yutaka.siam/device_access');
  TestWidgetsFlutterBinding.ensureInitialized();
  late AppController controller;
  var authenticationSucceeds = false;
  var authenticationCalls = 0;
  var widgetRefreshCalls = 0;
  late DateTime now;

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    controller = AppController()..loading = false;
    authenticationSucceeds = false;
    authenticationCalls = 0;
    widgetRefreshCalls = 0;
    now = DateTime(2026, 10, 15, 13);
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, (call) async {
      if (call.method == 'authenticate') {
        authenticationCalls++;
        return authenticationSucceeds;
      }
      if (call.method == 'refreshWidget') { widgetRefreshCalls++; }
      return null;
    });
  });
  tearDown(() {
    controller.dispose();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, null);
  });

  Widget app() => ChangeNotifierProvider<AppController>.value(value: controller,
    child: MaterialApp(home: DeviceLockGate(now: () => now, child: Scaffold(body: Column(children: [
      const Text('Private transaction'), const DeviceLockSettingsTile(),
    ])))));

  testWidgets('device lock uses the shared compact card and wraps on narrow screens', (tester) async {
    tester.view.physicalSize = const Size(320, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    for (final brightness in Brightness.values) {
      for (final scale in [1.0, 2.0]) {
        await tester.pumpWidget(ChangeNotifierProvider<AppController>.value(
          value: controller,
          child: MaterialApp(
            theme: ThemeData(brightness: brightness, useMaterial3: true),
            home: MediaQuery(
              data: MediaQueryData(size: const Size(320, 800), textScaler: TextScaler.linear(scale)),
              child: const Scaffold(body: Column(children: [DeviceLockSettingsTile()])),
            ),
          ),
        ));
        await tester.pumpAndSettle();
        final tile = find.byType(SettingsTile);
        expect(find.descendant(of: tile, matching: find.byType(ExpressiveCard)), findsOneWidget);
        expect(find.descendant(of: tile, matching: find.byType(Switch)), findsOneWidget);
        expect(find.text('Lock after 10 seconds away'), findsOneWidget);
        expect(tester.takeException(), isNull);
        // Wrapping text can grow the card; the control stays compact and tappable.
        final switchSize = tester.getSize(find.byType(Switch));
        expect(switchSize.width, inInclusiveRange(48, 56));
        expect(switchSize.height, greaterThanOrEqualTo(48));
      }
    }
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('lock is opt-in and enabling requires successful device authentication', (tester) async {
    await tester.pumpWidget(app());
    expect(find.text('Private transaction'), findsOneWidget);
    expect(authenticationCalls, 0);
    final toggle = find.byType(Switch);
    await tester.tap(toggle);
    await tester.pumpAndSettle();
    expect(controller.deviceLockEnabled, isFalse);
    await tester.tap(find.byTooltip('Dismiss'));
    await tester.pumpAndSettle();
    authenticationSucceeds = true;
    await tester.tap(find.text('Fingerprint / device lock'));
    await tester.pumpAndSettle();
    expect(controller.deviceLockEnabled, isTrue);
    expect(await controller.prefs.getBool('deviceLockEnabled', false), isTrue);
    expect((await controller.exportPreferences()).containsKey('deviceLockEnabled'), isFalse);
    await tester.pumpWidget(const SizedBox.shrink());
  }, variant: TargetPlatformVariant.only(TargetPlatform.android));

  testWidgets('failed authentication stays locked and background grace expires after ten seconds', (tester) async {
    controller.deviceLockEnabled = true;
    await tester.pumpWidget(app());
    await tester.pumpAndSettle();
    expect(authenticationCalls, 1);
    expect(find.byWidgetPredicate((widget) => widget is Image &&
      widget.image is AssetImage && (widget.image as AssetImage).assetName == 'assets/icons/yutaka_mark.png'), findsOneWidget);
    expect(find.byIcon(Icons.lock_rounded), findsNothing);
    expect(find.text('Private transaction'), findsNothing);
    authenticationSucceeds = true;
    await tester.tap(find.text('Unlock'));
    await tester.pumpAndSettle();
    expect(find.text('Private transaction'), findsOneWidget);
    expect(authenticationCalls, 2);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    await tester.pump();
    expect(find.text('Private transaction'), findsNothing);
    now = now.add(const Duration(seconds: 9));
    await tester.pump(const Duration(seconds: 9));
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpAndSettle();
    expect(authenticationCalls, 2);
    expect(find.text('Private transaction'), findsOneWidget);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    now = now.add(const Duration(seconds: 6));
    await tester.pump(const Duration(seconds: 6));
    // Later lifecycle events must not restart the original ten-second window.
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    now = now.add(const Duration(seconds: 4));
    await tester.pump(const Duration(seconds: 4));
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpAndSettle();
    expect(authenticationCalls, 3);
    expect(find.text('Private transaction'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
  }, variant: TargetPlatformVariant.only(TargetPlatform.android));

  testWidgets('resume checks elapsed time even when the background timer has not run', (tester) async {
    controller.deviceLockEnabled = true;
    authenticationSucceeds = true;
    await tester.pumpWidget(app());
    await tester.pumpAndSettle();
    expect(authenticationCalls, 1);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    // Advance wall time without pumping the timer, as if Android suspended Dart.
    now = now.add(const Duration(seconds: 11));
    authenticationSucceeds = false;
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpAndSettle();
    expect(authenticationCalls, 2);
    expect(find.text('Private transaction'), findsNothing);
    await tester.pumpWidget(const SizedBox.shrink());
  }, variant: TargetPlatformVariant.only(TargetPlatform.android));

  testWidgets('disabling device lock cancels a pending background lock', (tester) async {
    controller.deviceLockEnabled = true;
    authenticationSucceeds = true;
    await tester.pumpWidget(app());
    await tester.pumpAndSettle();
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    controller.deviceLockEnabled = false;
    controller.publishAutosavedNotes();
    now = now.add(const Duration(seconds: 11));
    await tester.pump(const Duration(seconds: 11));
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpAndSettle();
    expect(authenticationCalls, 1);
    expect(find.text('Private transaction'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
  }, variant: TargetPlatformVariant.only(TargetPlatform.android));

  testWidgets('unrelated notifications do not refresh the launcher widget', (tester) async {
    await tester.pumpWidget(app());
    await tester.pump(const Duration(milliseconds: 200));
    final refreshes = widgetRefreshCalls;
    expect(refreshes, greaterThan(0));
    controller.publishAutosavedNotes();
    await tester.pump(const Duration(milliseconds: 200));
    expect(widgetRefreshCalls, refreshes);
    controller.currencySymbol = r'$';
    controller.publishAutosavedNotes();
    await tester.pump(const Duration(milliseconds: 200));
    expect(widgetRefreshCalls, refreshes + 1);
    await tester.pumpWidget(const SizedBox.shrink());
  }, variant: TargetPlatformVariant.only(TargetPlatform.android));

  for (final authenticated in [false, true]) {
    testWidgets('native prompt lifecycle completes once before resume: $authenticated', (tester) async {
      controller.deviceLockEnabled = true;
      final pending = Completer<bool>();
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, (call) async {
        if (call.method == 'authenticate') {
          authenticationCalls++;
          return pending.future;
        }
        return null;
      });
      await tester.pumpWidget(app());
      await tester.pump();
      expect(authenticationCalls, 1);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      now = now.add(const Duration(seconds: 20));
      await tester.pump(const Duration(seconds: 20));
      // The result can arrive before Android reports the activity resumed.
      pending.complete(authenticated);
      await tester.pump();
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pumpAndSettle();
      expect(authenticationCalls, 1);
      expect(find.text('Private transaction'), authenticated ? findsOneWidget : findsNothing);
      expect(find.text('Unlock'), authenticated ? findsNothing : findsOneWidget);
      // A later app visit is a fresh request after either outcome.
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      now = now.add(const Duration(seconds: 10));
      await tester.pump(const Duration(seconds: 10));
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pumpAndSettle();
      expect(authenticationCalls, 2);
      expect(find.text('Private transaction'), authenticated ? findsOneWidget : findsNothing);
      await tester.pumpWidget(const SizedBox.shrink());
    }, variant: TargetPlatformVariant.only(TargetPlatform.android));
  }
}
