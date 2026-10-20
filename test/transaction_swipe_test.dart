import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:yutaka/main.dart';
import 'package:yutaka/models.dart';

class SwipeTestController extends AppController {
  int duplicates = 0;

  @override
  Future<void> addTransaction(MoneyTransaction tx) async {
    duplicates++;
  }
}

void main() {
  Future<SwipeTestController> mount(
    WidgetTester tester, {
    String idPrefix = '',
    bool linkedLoan = false,
  }) async {
    tester.view.physicalSize = const Size(390, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final state = SwipeTestController()..loading = false;
    addTearDown(state.dispose);
    final now = DateTime(2026, 10, 16);
    final rows = List.generate(
      12,
      (i) => MoneyTransaction(
        id: '$idPrefix$i',
        title: 'Purchase $i',
        type: MoneyTransactionType.expense,
        amount: 10,
        notes: '',
        categoryId: 'food',
        fromAccountId: 'cash',
        linkedEntityType: linkedLoan && i == 3 ? 'loans' : null,
        linkedEntityId: linkedLoan && i == 3 ? 'loan' : null,
        createdOn: now,
        updatedOn: now,
      ),
    );
    await tester.pumpWidget(
      ChangeNotifierProvider<AppController>.value(
        value: state,
        child: MaterialApp(
          home: Scaffold(
            body: ResponsiveListContent(
              itemCount: rows.length,
              itemBuilder: (_, i) => TransactionTile(tx: rows[i]),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    return state;
  }

  Future<void> slowSwipe(WidgetTester tester, int row, double dx) async {
    final gesture = await tester.startGesture(
      tester.getCenter(find.byType(TransactionTile).at(row)),
    );
    for (var i = 0; i < 10; i++) {
      await gesture.moveBy(
        Offset(dx / 10, 0),
        timeStamp: Duration(milliseconds: (i + 1) * 40),
      );
      await tester.pump(const Duration(milliseconds: 40));
    }
    await tester.pump(const Duration(milliseconds: 150));
    for (var i = 0; i < 4; i++) {
      await gesture.moveBy(
        const Offset(.001, 0),
        timeStamp: Duration(milliseconds: 550 + i * 30),
      );
    }
    await gesture.up(timeStamp: const Duration(milliseconds: 670));
    await tester.pumpAndSettle();
  }

  double swipeRatio(WidgetTester tester, int row) {
    final finder = find.byType(TransactionTile).at(row);
    final tx = tester.widget<TransactionTile>(finder).tx;
    final content = find.byKey(ValueKey('transaction-content-${tx.id}'));
    return (tester.getTopLeft(content).dx - tester.getTopLeft(finder).dx) /
        tester.getSize(finder).width;
  }

  testWidgets('short deliberate swipes open both action panes', (tester) async {
    await mount(tester);
    await slowSwipe(tester, 0, -45);
    expect(swipeRatio(tester, 0), closeTo(-.48, .001));
    expect(find.text('Edit').hitTestable(), findsOneWidget);
    expect(find.text('Delete').hitTestable(), findsOneWidget);
    await slowSwipe(tester, 0, 250);
    expect(find.text('Duplicate').hitTestable(), findsOneWidget);
  }, variant: TargetPlatformVariant.only(TargetPlatform.android));

  testWidgets('another row responds to its first tap while a pane is open', (
    tester,
  ) async {
    await mount(tester);
    await slowSwipe(tester, 0, -200);
    await tester.tap(find.text('Purchase 1'));
    await tester.pumpAndSettle();
    expect(find.byType(TransactionEditor), findsOneWidget);
  }, variant: TargetPlatformVariant.only(TargetPlatform.android));

  for (final initialSwipe in [100.0, -200.0]) {
    testWidgets('right swipe reopens while closing from $initialSwipe', (
      tester,
    ) async {
      final state = await mount(tester);
      for (var attempt = 0; attempt < 3; attempt++) {
        // Keep the gesture below the Duplicate confirmation banner.
        await slowSwipe(tester, 2, initialSwipe);
        expect(
          find.text(initialSwipe > 0 ? 'Duplicate' : 'Edit').hitTestable(),
          findsOneWidget,
          reason: 'initial pane on attempt $attempt',
        );
        await tester.drag(
          find.byType(TransactionTile).at(1),
          const Offset(100, 0),
        );
        await tester.pump(const Duration(milliseconds: 16));
        final gesture = await tester.startGesture(
          tester.getCenter(find.byType(TransactionTile).at(2)),
        );
        await tester.pump(const Duration(milliseconds: 16));
        await gesture.moveBy(
          const Offset(35, 0),
          timeStamp: const Duration(milliseconds: 30),
        );
        await tester.pump(const Duration(milliseconds: 16));
        await gesture.moveBy(
          const Offset(145, 0),
          timeStamp: const Duration(milliseconds: 60),
        );
        await tester.pump(const Duration(milliseconds: 16));
        await gesture.up(timeStamp: const Duration(milliseconds: 70));
        await tester.pumpAndSettle();
        final duplicate = find.descendant(
          of: find.byType(TransactionTile).at(2),
          matching: find.text('Duplicate'),
        );
        expect(duplicate.hitTestable(), findsOneWidget);
        expect(swipeRatio(tester, 2), closeTo(.28, .001));
        await tester.tap(duplicate);
        await tester.pumpAndSettle();
        expect(state.duplicates, attempt + 1);
      }
    }, variant: TargetPlatformVariant.only(TargetPlatform.android));
  }

  testWidgets('a reused row closes actions from the previous transaction', (
    tester,
  ) async {
    await mount(tester);
    await slowSwipe(tester, 0, 100);
    final rowState = tester.state(find.byType(TransactionTile).first);
    await mount(tester, idPrefix: 'replacement-');
    expect(tester.state(find.byType(TransactionTile).first), same(rowState));
    expect(find.text('Duplicate'), findsNothing);
    await slowSwipe(tester, 0, 100);
    expect(find.text('Duplicate').hitTestable(), findsOneWidget);
  }, variant: TargetPlatformVariant.only(TargetPlatform.android));

  testWidgets('right swipes keep working across every visible row', (
    tester,
  ) async {
    await mount(tester);
    for (final row in [0, 1, 2, 3, 4, 5, 2, 3, 4, 5, 1, 0]) {
      await slowSwipe(tester, row, 140);
      final pane = find.descendant(
        of: find.byType(TransactionTile).at(row),
        matching: find.text('Duplicate'),
      );
      expect(pane.hitTestable(), findsOneWidget, reason: 'row $row');
      expect(
        List.generate(
          6,
          (index) => swipeRatio(tester, index),
        ).where((ratio) => ratio.abs() > .01),
        hasLength(1),
      );
    }
  }, variant: TargetPlatformVariant.only(TargetPlatform.android));

  testWidgets('loan-linked rows explain why Duplicate is unavailable', (
    tester,
  ) async {
    final state = await mount(tester, linkedLoan: true);
    await slowSwipe(tester, 3, 140);
    await tester.tap(find.text('Duplicate'));
    await tester.pumpAndSettle();
    expect(state.duplicates, 0);
    expect(
      find.text('Loan-linked transactions cannot be duplicated.'),
      findsOneWidget,
    );
  }, variant: TargetPlatformVariant.only(TargetPlatform.android));

  testWidgets('scrolling closes open transaction actions', (tester) async {
    await mount(tester);
    await slowSwipe(tester, 2, 140);
    await tester.drag(find.byType(ListView), const Offset(0, -140));
    await tester.pumpAndSettle();
    expect(find.text('Duplicate'), findsNothing);
  }, variant: TargetPlatformVariant.only(TargetPlatform.android));

  testWidgets('actions respond after switching rows and scrolling', (
    tester,
  ) async {
    final state = await mount(tester);
    await slowSwipe(tester, 0, -200);
    await slowSwipe(tester, 1, 150);
    await tester.tap(find.text('Duplicate'));
    await tester.pumpAndSettle();
    expect(state.duplicates, 1);
    await slowSwipe(tester, 1, -200);
    await tester.tap(find.text('Edit'));
    await tester.pumpAndSettle();
    expect(find.byType(TransactionEditor), findsOneWidget);
    Navigator.of(tester.element(find.byType(TransactionEditor))).pop();
    await tester.pumpAndSettle();
    await tester.drag(find.byType(ListView), const Offset(0, -140));
    await tester.pumpAndSettle();
    await slowSwipe(tester, 1, -200);
    await tester.tap(find.text('Delete'));
    await tester.pumpAndSettle();
    expect(find.text('Delete transaction?'), findsOneWidget);
    expect(state.duplicates, 1);
    expect(tester.takeException(), isNull);
  }, variant: TargetPlatformVariant.only(TargetPlatform.android));
}
