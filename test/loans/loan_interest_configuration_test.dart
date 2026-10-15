import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:yutaka/main.dart';
import 'package:yutaka/loans/loan_models.dart';

import 'loan_computation_test.dart' as fixtures;

void main() {
  LoanInterestConfiguration? saved;
  Future<void> open(WidgetTester tester, {
    LoanInterestType type = LoanInterestType.none,
    LoanInterestPeriod period = LoanInterestPeriod.yearly,
    double rate = 0,
    Size size = const Size(1000, 900),
    double scale = 1,
  }) async {
    saved = null;
    await tester.binding.setSurfaceSize(size);
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(MaterialApp(
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(scale)), child: child!),
      home: Scaffold(body: Builder(builder: (context) => TextButton(
        child: const Text('Open'),
        onPressed: () async => saved = await showLoanInterestConfiguration(context,
          type: type, period: period, rate: rate),
      ))),
    ));
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
  }

  Future<void> choosePeriod(WidgetTester tester, String label) async {
    final dropdown = find.byType(DropdownButtonFormField<LoanInterestPeriod>);
    await tester.ensureVisible(dropdown);
    await tester.tap(dropdown);
    await tester.pumpAndSettle();
    await tester.tap(find.text(label).last);
    await tester.pumpAndSettle();
  }

  Future<void> save(WidgetTester tester) async {
    await tester.tap(find.text('Save interest'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  }

  testWidgets('no interest explains repayment and ignores an unused rate', (tester) async {
    await open(tester, rate: double.infinity);
    expect(find.text('Only repay the loan amount.'), findsOneWidget);
    expect(find.byType(TextFormField), findsNothing);
    await save(tester);
    expect(saved!.type, LoanInterestType.none);
    expect(saved!.rate, 0);
  });

  testWidgets('monthly compounding keeps a yearly rate and full precision', (tester) async {
    await open(tester, type: LoanInterestType.simple, rate: 10.125);
    expect(find.text('10.125'), findsOneWidget);
    await tester.tap(find.text('Compound interest'));
    await tester.pumpAndSettle();
    await choosePeriod(tester, 'Monthly');
    expect(find.text('% / year'), findsOneWidget);
    await save(tester);
    expect(saved!.type, LoanInterestType.compound);
    expect(saved!.period, LoanInterestPeriod.monthly);
    expect(saved!.rate, 10.125);
  });

  testWidgets('switching from compound to simple uses daily accrual', (tester) async {
    await open(tester, type: LoanInterestType.compound, period: LoanInterestPeriod.monthly, rate: 12);
    await tester.tap(find.text('Simple interest'));
    await tester.pumpAndSettle();
    expect(find.text('Daily, using a yearly rate'), findsOneWidget);
    await save(tester);
    expect(saved!.period, LoanInterestPeriod.yearly);
    expect(saved!.rate, 12);
  });

  for (final type in [LoanInterestType.simple, LoanInterestType.compound]) {
    testWidgets('one-time ${type.name} interest can be reviewed and saved', (tester) async {
      await open(tester, type: type, rate: 7.5);
      await choosePeriod(tester, 'One-time total');
      expect(find.text('One-time interest rate'), findsOneWidget);
      expect(find.text('% total'), findsOneWidget);
      await save(tester);
      expect(saved!.type, type);
      expect(saved!.period, LoanInterestPeriod.flat);
      expect(saved!.rate, 7.5);
    });
  }

  testWidgets('invalid rates show an inline error and can be corrected', (tester) async {
    await open(tester, type: LoanInterestType.simple);
    for (final input in ['', 'abc', 'NaN', 'Infinity', '-1', '1001']) {
      await tester.enterText(find.byType(TextFormField), input);
      await save(tester);
      expect(saved, isNull);
      expect(find.text('Enter a number from 0 to 1,000.'), findsOneWidget);
    }
    await tester.enterText(find.byType(TextFormField), '0');
    await save(tester);
    expect(saved!.rate, 0);
  });

  testWidgets('disabling interest clears errors and preserves a typed rate when toggled', (tester) async {
    await open(tester, type: LoanInterestType.simple, rate: 5);
    await tester.tap(find.text('No interest'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Compound interest'));
    await tester.pumpAndSettle();
    expect(find.text('5'), findsOneWidget);
    await tester.enterText(find.byType(TextFormField), 'bad');
    await save(tester);
    await tester.tap(find.text('No interest'));
    await tester.pumpAndSettle();
    await save(tester);
    expect(saved!.type, LoanInterestType.none);
    expect(saved!.rate, 0);
  });

  testWidgets('short phone with large text scrolls while Save stays visible', (tester) async {
    await open(tester, type: LoanInterestType.compound, rate: 12,
      size: const Size(320, 568), scale: 1.5);
    expect(tester.getSize(find.widgetWithText(FilledButton, 'Save interest')).height, greaterThanOrEqualTo(48));
    final field = find.byType(TextFormField);
    await tester.ensureVisible(field);
    await tester.enterText(field, '14');
    await save(tester);
    expect(saved!.rate, 14);
  });

  testWidgets('close cancels edits', (tester) async {
    await open(tester, type: LoanInterestType.simple, rate: 8);
    await tester.enterText(find.byType(TextFormField), '20');
    await tester.tap(find.byTooltip('Close interest settings'));
    await tester.pumpAndSettle();
    expect(saved, isNull);
    expect(find.text('Loan interest'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('loan form shows the saved settings without rounding the rate', (tester) async {
    await tester.binding.setSurfaceSize(const Size(1000, 1000));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final controller = AppController();
    await tester.pumpWidget(ChangeNotifierProvider<AppController>.value(
      value: controller,
      child: MaterialApp(home: Scaffold(body: Builder(builder: (context) => TextButton(
        onPressed: () => showLoanEditorSheet(context,
          loan: fixtures.loan(interestType: LoanInterestType.simple, interestRate: 10.125)),
        child: const Text('Edit loan'),
      )))),
    ));
    await tester.tap(find.text('Edit loan'));
    await tester.pumpAndSettle();
    expect(find.text('Simple · 10.125% per year'), findsOneWidget);
    await tester.tap(find.text('Interest'));
    await tester.pumpAndSettle();
    expect(find.text('10.125'), findsOneWidget);
    await tester.tap(find.text('No interest'));
    await tester.pumpAndSettle();
    await save(tester);
    expect(find.text('No interest'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
    controller.dispose();
  });
}
