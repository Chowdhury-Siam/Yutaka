import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:yutaka/main.dart';
import 'package:yutaka/models.dart';
import 'package:yutaka/ui_foundation.dart';

Future<void> settleScroll(WidgetTester tester, ScrollPosition position) async {
  // Wait for the scroll spring, not the repeating empty-state animation.
  for (var frame = 0; frame < 240 && position.isScrollingNotifier.value; frame++) {
    await tester.pump(const Duration(milliseconds: 16));
  }
  expect(position.isScrollingNotifier.value, isFalse, reason: 'The list should finish scrolling');
  await tester.pump();
}

void main() {
  for (final scale in [1.0, 2.0]) {
    testWidgets('transaction controls stay fixed during pull and scroll at text scale $scale', (tester) async {
      tester.view.physicalSize = Size(scale == 1 ? 360 : 320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final state = AppController()..loading = false;
      addTearDown(state.dispose);
      final now = DateTime(2026, 10, 15);

      for (final count in [0, 40]) {
        state.transactions = List.generate(count, (index) => MoneyTransaction(
          id: 'transaction-$index', title: 'Purchase $index',
          type: MoneyTransactionType.expense, amount: 10, notes: '',
          categoryId: 'food', fromAccountId: 'cash', createdOn: now, updatedOn: now,
        ));
        await tester.pumpWidget(ChangeNotifierProvider<AppController>.value(
          value: state,
          child: MaterialApp(
            scrollBehavior: const YutakaScrollBehavior(),
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(scale)),
              child: child!,
            ),
            home: TransactionListScreen(key: ValueKey(count)),
          ),
        ));
        // Empty history deliberately keeps animating, so the whole widget tree
        // never settles. Render its layout without waiting for idle tickers.
        await tester.pump();
        final search = find.byKey(const ValueKey('transaction-search'));
        final summary = find.byKey(const ValueKey('transaction-summary'));
        final shortcuts = find.byTooltip('Shortcuts');
        final trash = find.byTooltip('Recently deleted');
        final controls = [search, summary, shortcuts, trash];
        final positions = controls.map(tester.getTopLeft).toList();
        final list = find.descendant(of: find.byType(ResponsiveListContent), matching: find.byType(ListView));
        final scrollable = find.descendant(of: list, matching: find.byType(Scrollable));
        final position = tester.state<ScrollableState>(scrollable).position;
        final firstRow = count == 0 ? find.byType(TransactionListEmptyState) : find.byType(TransactionTile).first;
        final rowTop = tester.getTopLeft(firstRow).dy;

        final pull = await tester.startGesture(tester.getCenter(list));
        // Cross touch slop to claim the drag, then send an update while the
        // finger is still down. DragStartBehavior.start consumes the first move.
        await pull.moveBy(const Offset(0, 40));
        await tester.pump();
        await pull.moveBy(const Offset(0, 160));
        await tester.pump();
        expect(position.pixels, lessThan(0));
        expect(tester.getTopLeft(firstRow).dy, greaterThan(rowTop));
        for (var i = 0; i < controls.length; i++) {
          expect(tester.getTopLeft(controls[i]), positions[i]);
        }
        await pull.up();
        await settleScroll(tester, position);
        expect(position.pixels, closeTo(0, 1));

        if (count > 0) {
          await tester.drag(list, const Offset(0, -180));
          await settleScroll(tester, position);
          expect(position.pixels, greaterThan(0));
          for (var i = 0; i < controls.length; i++) {
            expect(tester.getTopLeft(controls[i]), positions[i]);
          }
          await tester.enterText(search, 'not a matching title');
          await tester.pump();
          await settleScroll(tester, position);
          expect(find.text('No search matches'), findsOneWidget);
          expect(summary.hitTestable(), findsOneWidget);
          await tester.tap(find.byTooltip('Clear search'));
          await tester.pump();
          await settleScroll(tester, position);
          expect(find.text('No search matches'), findsNothing);
        }
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox.shrink());
      }
    }, variant: TargetPlatformVariant.only(TargetPlatform.android));
  }
}
