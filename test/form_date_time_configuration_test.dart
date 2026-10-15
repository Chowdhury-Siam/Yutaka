import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:yutaka/main.dart';
import 'package:yutaka/models.dart';

void main() {
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
    testWidgets('transaction configuration headings align and AM/PM stays with the time at $scale text', (tester) async {
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
      expect(tester.getTopLeft(date).dy, closeTo(tester.getTopLeft(charge).dy, .5));
      expect(find.text('Oct 15, 2026\n4:52\u00a0PM'), findsOneWidget);
      final dateButton = find.ancestor(of: date, matching: find.byType(OutlinedButton));
      final chargeButton = find.ancestor(of: charge, matching: find.byType(OutlinedButton));
      expect(tester.getSize(dateButton).width, closeTo(tester.getSize(chargeButton).width, .5));
      expect(tester.getSize(dateButton).height, closeTo(tester.getSize(chargeButton).height, .5));
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    });
  }
}
