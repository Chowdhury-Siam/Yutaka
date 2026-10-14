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

  testWidgets('lock is opt-in and enabling requires successful device authentication', (tester) async {
    await tester.pumpWidget(app());
    expect(find.text('Private transaction'), findsOneWidget);
    final toggle = find.byType(SwitchListTile);
    await tester.tap(toggle);
    await tester.pumpAndSettle();
    expect(controller.deviceLockEnabled, isFalse);
    await tester.tap(find.byTooltip('Dismiss'));
    await tester.pumpAndSettle();
    authenticationSucceeds = true;
    await tester.tap(toggle);
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
