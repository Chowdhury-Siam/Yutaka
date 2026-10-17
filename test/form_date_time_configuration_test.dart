import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:yutaka/main.dart';
import 'package:yutaka/models.dart';

void main() {
  for (final scale in [1.0, 2.0]) {
    testWidgets('Repeat keeps all choices and cancellation on a short phone at $scale text', (tester) async {
      tester.view.physicalSize = const Size(320, 480);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      SubscriptionFrequency? result;
      await tester.pumpWidget(MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(scale)), child: child!),
        home: Scaffold(body: Builder(builder: (context) => TextButton(
          onPressed: () async => result = await showSubscriptionFrequencyPopup(context, SubscriptionFrequency.monthly),
          child: const Text('Open'),
        ))),
      ));
      for (final value in SubscriptionFrequency.values) {
        await tester.tap(find.text('Open'));
        await tester.pumpAndSettle();
        final choice = find.byKey(ValueKey('repeat-${value.name}'));
        await tester.ensureVisible(choice);
        await tester.pumpAndSettle();
        await tester.tap(choice);
        await tester.pumpAndSettle();
        expect(result, value);
        expect(tester.takeException(), isNull);
      }
      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Close'));
      await tester.pumpAndSettle();
      expect(result, isNull);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    });
  }

  testWidgets('single date/time changes remain a draft until Done', (tester) async {
    final initial = DateTime(2026, 10, 15, 16, 52);
    DateTime? saved;
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: Builder(builder: (context) => TextButton(
        onPressed: () async => saved = await showSingleDateTimeConfiguration(context, initial: initial),
        child: const Text('Open'),
      ))),
    ));
    for (final action in ['Cancel', 'Done']) {
      saved = initial;
      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('single-date-choice')));
      await tester.pumpAndSettle();
      // Supply a result at the native picker boundary; its UI belongs to Flutter.
      Navigator.of(tester.element(find.byType(DatePickerDialog))).pop(DateTime(2027, 11, 20));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('single-time-choice')));
      await tester.pumpAndSettle();
      expect(tester.widget<TimePickerDialog>(find.byType(TimePickerDialog)).initialTime,
          const TimeOfDay(hour: 16, minute: 52));
      Navigator.of(tester.element(find.byType(TimePickerDialog))).pop(const TimeOfDay(hour: 17, minute: 45));
      await tester.pumpAndSettle();
      expect(saved, initial);
      await tester.tap(find.text(action));
      await tester.pumpAndSettle();
      expect(saved, action == 'Cancel' ? isNull : DateTime(2027, 11, 20, 17, 45));
      expect(tester.takeException(), isNull);
    }
    await tester.pumpWidget(const SizedBox.shrink());
  });

  for (final scale in [1.0, 2.0]) {
    testWidgets('transaction configuration content stays centered and AM/PM stays with the time at $scale text', (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final state = AppController()..loading = false;
      addTearDown(state.dispose);
      final now = DateTime(2026, 10, 15, 16, 52);
      final transaction = MoneyTransaction(
        id: 'draft', title: 'Dinner', type: MoneyTransactionType.expense,
        amount: 35, notes: '', categoryId: 'food', fromAccountId: 'cash',
        createdOn: now, updatedOn: now,
      );
      await tester.pumpWidget(ChangeNotifierProvider<AppController>.value(
        value: state,
        child: MaterialApp(
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(scale), disableAnimations: true),
            child: child!,
          ),
          home: Scaffold(body: TransactionEditor(transaction: transaction)),
        ),
      ));
      await tester.pump();
      final date = find.text('Time • Date');
      final charge = find.text('Service charge');
      expect(find.text('Oct 15, 2026\n4:52\u00a0PM'), findsOneWidget);
      final dateButton = find.ancestor(of: date, matching: find.byType(OutlinedButton));
      final chargeButton = find.ancestor(of: charge, matching: find.byType(OutlinedButton));
      expect(tester.getSize(dateButton).width, closeTo(tester.getSize(chargeButton).width, .5));
      expect(tester.getSize(dateButton).height, closeTo(tester.getSize(chargeButton).height, .5));
      for (final button in [dateButton, chargeButton]) {
        final content = find.descendant(of: button, matching: find.byType(Column)).first;
        expect(tester.getCenter(content).dy, closeTo(tester.getCenter(button).dy, .5));
        expect(tester.getCenter(content).dx, closeTo(tester.getCenter(button).dx, .5));
      }
      final statusGap = tester.getTopLeft(find.text('Off')).dy - tester.getBottomLeft(charge).dy;
      expect(statusGap, inInclusiveRange(0, 6 * scale));
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    });
  }
}
