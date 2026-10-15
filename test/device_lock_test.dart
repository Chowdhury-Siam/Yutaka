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

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    controller = AppController()..loading = false;
    authenticationSucceeds = false;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, (call) async {
      if (call.method == 'authenticate') { return authenticationSucceeds; }
      return null;
    });
  });
  tearDown(() {
    controller.dispose();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, null);
  });

  Widget app() => ChangeNotifierProvider<AppController>.value(value: controller,
    child: MaterialApp(home: DeviceLockGate(child: Scaffold(body: Column(children: [
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
        expect(find.text('Lock on exit • hide widget amounts'), findsOneWidget);
        expect(tester.takeException(), isNull);
        if (scale == 1.0) {
          expect(tester.getSize(tile).height, lessThan(110));
        }
      }
    }
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('lock is opt-in and enabling requires successful device authentication', (tester) async {
    await tester.pumpWidget(app());
    expect(find.text('Private transaction'), findsOneWidget);
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

  testWidgets('failed authentication stays locked and leaving the app locks every route again', (tester) async {
    controller.deviceLockEnabled = true;
    await tester.pumpWidget(app());
    expect(find.text('Private transaction'), findsNothing);
    await tester.tap(find.text('Unlock'));
    await tester.pumpAndSettle();
    expect(find.text('Private transaction'), findsNothing);
    authenticationSucceeds = true;
    await tester.tap(find.text('Unlock'));
    await tester.pumpAndSettle();
    expect(find.text('Private transaction'), findsOneWidget);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    await tester.pump();
    expect(find.text('Private transaction'), findsNothing);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pump();
    expect(find.text('Private transaction'), findsNothing);
    await tester.tap(find.text('Unlock'));
    await tester.pumpAndSettle();
    expect(find.text('Private transaction'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
  }, variant: TargetPlatformVariant.only(TargetPlatform.android));
}
