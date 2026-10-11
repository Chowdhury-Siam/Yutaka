import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yutaka/main.dart';
import 'package:provider/provider.dart';

class SetupAuthController extends AppController {
  int submissions = 0;
  bool startedSetup = false;

  SetupAuthController() {
    selfHostedSyncApiBaseUrl = cloudSyncApiBaseUrl = 'https://test.workers.dev';
    selfHostedSyncEndpointValidated = true;
  }

  @override
  Future<void> loginSyncAccount({required String username, required String password, bool preferCloudData = true}) async {
    submissions++;
    syncAccountUsername = username;
    cloudSyncEnabled = true;
    newSyncAccountAwaitingSetupChoice = true;
    notifyListeners();
  }

  @override
  Future<void> registerSyncAccount({required String username, required String password, bool deferInitialDataSync = false}) =>
      loginSyncAccount(username: username, password: password);

  @override
  Future<void> prepareStartNewSetup() async { startedSetup = true; }

  @override
  Future<void> resolveNewSyncAccountWithLocalSetup() async { newSyncAccountAwaitingSetupChoice = false; }
}

void main() {
  testWidgets('Account & sync exposes only the self-hosted Worker', (tester) async {
    final controller = AppController();
    addTearDown(controller.dispose);

    await tester.pumpWidget(
      ChangeNotifierProvider<AppController>.value(
        value: controller,
        child: const MaterialApp(
          home: MultiDeviceSyncScreen(initialRegisterMode: true),
        ),
      ),
    );

    expect(find.text('Self-hosted Sync Worker'), findsOneWidget);
    expect(find.text('Cloudflare Worker URL'), findsOneWidget);
    expect(find.text('Validate and use Worker'), findsOneWidget);
    expect(find.text('Deploy Database'), findsOneWidget);
    expect(find.text('Default'), findsNothing);
    expect(find.text('Registration Key'), findsNothing);
  });

  for (final register in [false, true]) {
    testWidgets('Enter submits ${register ? 'registration' : 'first login'} and keeps setup available', (tester) async {
      await tester.binding.setSurfaceSize(const Size(1200, 1000));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final controller = SetupAuthController();
      addTearDown(controller.dispose);
      await tester.pumpWidget(ChangeNotifierProvider<AppController>.value(
        value: controller, child: const MaterialApp(home: OnboardingScreen()),
      ));
      await tester.tap(find.text(register ? 'Create account' : 'Login'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));
      Finder field(String label) => find.byWidgetPredicate(
          (widget) => widget is TextField && widget.decoration?.labelText == label);
      await tester.enterText(field('Username'), 'owner');
      await tester.testTextInput.receiveAction(TextInputAction.next);
      await tester.pump();
      final passwordInput = tester.widget<EditableText>(find.descendant(
        of: field('Password'), matching: find.byType(EditableText),
      ));
      expect(passwordInput.focusNode.hasFocus, isTrue);
      expect(controller.submissions, 0);
      await tester.enterText(field('Password'), 'password123');
      // Native desktop Enter produces a text-input action. A raw key event
      // in a widget test does not pass through the platform's text input.
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));
      expect(controller.submissions, 1);
      expect(controller.onboardingCompleted, isFalse);
      expect(find.text('Set up this device'), findsOneWidget);
      await tester.tap(find.text('Start new'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));
      expect(controller.startedSetup, isTrue);
      expect(controller.onboardingCompleted, isFalse);
      expect(find.text('Currency setup'), findsOneWidget);
      expect(tester.takeException(), isNull);
    }, variant: TargetPlatformVariant.only(TargetPlatform.windows));
  }
}
