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
  Future<SwipeTestController> mount(WidgetTester tester) async {
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
        id: '$i',
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
