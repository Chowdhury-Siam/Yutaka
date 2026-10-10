import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yutaka/main.dart';
import 'package:provider/provider.dart';

Future<void> pumpOnboardingFrame(WidgetTester tester) async {
  // The onboarding glyph intentionally repeats forever. Advancing a bounded
  // amount of time lets finite page/dialog transitions complete without
  // waiting for an ambient animation that is not supposed to settle.
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 500));
}

Future<AppController> pumpOnboarding(WidgetTester tester) async {
  final controller = AppController();
  addTearDown(controller.dispose);
  await tester.pumpWidget(
    ChangeNotifierProvider<AppController>.value(
      value: controller,
      child: const MaterialApp(home: OnboardingScreen()),
    ),
  );
  await pumpOnboardingFrame(tester);
  return controller;
}

void main() {
  testWidgets('Use offline asks whether to restore or start new', (tester) async {
    await pumpOnboarding(tester);

    await tester.tap(find.text('Use offline'));
    await pumpOnboardingFrame(tester);

    expect(find.text('Set up this device'), findsOneWidget);
    expect(find.text('Restore backup'), findsOneWidget);
    expect(find.text('Start new'), findsOneWidget);
  });

  testWidgets('signed-in unfinished onboarding exposes Continue setup', (tester) async {
    final controller = await pumpOnboarding(tester);
    controller.cloudSyncEnabled = true;
    controller.syncAccountUsername = 'owner';
    controller.notifyListeners();
    await pumpOnboardingFrame(tester);

    expect(find.text('Continue setup'), findsOneWidget);
    expect(find.text('Login'), findsNothing);
    expect(find.text('Create account'), findsNothing);

    await tester.tap(find.text('Continue setup'));
    await pumpOnboardingFrame(tester);

    expect(find.text('Set up this device'), findsOneWidget);
    expect(find.textContaining('Your sync account is ready.'), findsOneWidget);
  });

  testWidgets('loan setup comes after accounts and can be skipped before finishing', (tester) async {
    await pumpOnboarding(tester);
    final pages = tester.widget<PageView>(find.byType(PageView));
    pages.controller!.jumpToPage(2);
    await pumpOnboardingFrame(tester);
    expect(find.text('Set up your accounts'), findsOneWidget);
    await tester.tap(find.text('Next'));
    await pumpOnboardingFrame(tester);
    expect(find.text('Add existing loans'), findsOneWidget);
    expect(find.text('Start'), findsNothing);
    await tester.ensureVisible(find.text('Skip loans'));
    await tester.tap(find.text('Skip loans'));
    await pumpOnboardingFrame(tester);
    expect(find.text('Private local database'), findsOneWidget);
    expect(find.text('Start'), findsOneWidget);
  });

  testWidgets('existing loan guidance fits a small display with large text', (tester) async {
    final controller = AppController();
    addTearDown(controller.dispose);
    await tester.binding.setSurfaceSize(const Size(320, 568));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    var skipped = false;
    await tester.pumpWidget(ChangeNotifierProvider<AppController>.value(
      value: controller,
      child: MaterialApp(home: Scaffold(body: MediaQuery(
        data: const MediaQueryData(size: Size(320, 568), textScaler: TextScaler.linear(1.5)),
        child: LoanSetupPane(state: controller, onSkip: () async { skipped = true; }),
      ))),
    ));
    await tester.ensureVisible(find.text('Skip loans'));
    await tester.tap(find.text('Skip loans'));
    await tester.pump();
    expect(skipped, isTrue);
    expect(tester.takeException(), isNull);
  });
}
