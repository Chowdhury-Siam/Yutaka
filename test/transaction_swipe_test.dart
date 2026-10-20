import 'package:flutter/material.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
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

  testWidgets('short deliberate swipes open both action panes', (tester) async {
    await mount(tester);
    await slowSwipe(tester, 0, -45);
    final controller = Slidable.of(tester.element(find.text('Edit')))!;
    expect(controller.ratio, closeTo(-.48, .001));
    expect(find.text('Edit').hitTestable(), findsOneWidget);
    expect(find.text('Delete').hitTestable(), findsOneWidget);
    controller.close();
    await tester.pumpAndSettle();
    await slowSwipe(tester, 0, 45);
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
        final controller = Slidable.of(
          tester.element(find.text(initialSwipe > 0 ? 'Duplicate' : 'Edit')),
        )!;
        controller.close();
        await tester.pump(const Duration(milliseconds: 16));
        expect(controller.closing, isTrue);
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
          const Offset(45, 0),
          timeStamp: const Duration(milliseconds: 60),
        );
        await tester.pump(const Duration(milliseconds: 16));
        await gesture.up(timeStamp: const Duration(milliseconds: 70));
        await tester.pumpAndSettle();
        expect(find.text('Duplicate').hitTestable(), findsOneWidget);
        expect(controller.ratio, closeTo(.28, .001));
        await tester.tap(find.text('Duplicate'));
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
