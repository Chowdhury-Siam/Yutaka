import 'package:flutter_test/flutter_test.dart';
import 'package:yutaka/data_merge.dart';
import 'package:yutaka/loans/loan_computation.dart';
import 'package:yutaka/loans/loan_models.dart';

import 'loan_computation_test.dart' as fixtures;

void main() {
  final start = DateTime.utc(2025, 1, 1);
  final addedOn = DateTime.utc(2025, 7, 2);
  LoanPayment addition({double amount = 500, DateTime? on}) =>
      fixtures.payment('addition', amount, on ?? addedOn).copyWith(isAddition: true);

  test('adding money preserves original principal and repayments in both directions', () {
    for (final direction in LoanDirection.values) {
      final loan = fixtures.loan().copyWith(direction: direction);
      final repayment = fixtures.payment('repayment', 200, DateTime.utc(2025, 3, 1));
      final result = computeLoan(loan, [addition(), repayment], at: DateTime.utc(2026, 1, 1));
      expect(loan.principal, 1000);
      expect(result.principal, 1500);
      expect(result.totalPaid, 200);
      expect(result.outstanding, 1300);
      expect(result.paymentsCount, 1);
      expect(result.progress, closeTo(200 / 1500, 0.00001));
    }
  });

  test('addition dates apply interest only from the additional disbursal', () {
    final loan = fixtures.loan(interestType: LoanInterestType.simple, interestRate: 10);
    final result = computeLoan(loan, [addition()], at: DateTime.utc(2026, 1, 1));
    expect(result.interestAccrued, 125.07);
    expect(result.totalDue, 1625.07);
    final beforeAddition = computeLoan(loan, [addition()], at: addedOn.subtract(const Duration(days: 1)));
    expect(beforeAddition.principal, 1000);
    expect(beforeAddition.totalPaid, 0);
  });

  test('compound and flat interest include additions without treating them as repayments', () {
    final compound = fixtures.loan(interestType: LoanInterestType.compound, interestRate: 10);
    final compounded = computeLoan(compound, [addition(on: DateTime.utc(2026, 1, 1))], at: DateTime.utc(2027, 1, 1));
    expect(compounded.interestAccrued, 260);
    expect(compounded.outstanding, 1760);
    expect(compounded.paymentsCount, 0);
    final flat = fixtures.loan(interestType: LoanInterestType.simple, interestRate: 10, interestPeriod: LoanInterestPeriod.flat);
    expect(computeLoan(flat, [addition()], at: addedOn).totalDue, 1650);
  });

  test('due-date stop accepts later additions without retroactive daily interest', () {
    final loan = fixtures.loan(interestType: LoanInterestType.simple, interestRate: 10,
        dueDate: addedOn, accrualStop: LoanAccrualStop.dueDate);
    final result = computeLoan(loan, [addition(on: DateTime.utc(2025, 8, 1))], at: DateTime.utc(2026, 1, 1));
    expect(result.principal, 1500);
    expect(result.interestAccrued, 49.86);
  });

  test('removing an addition recalculates settlement and payment allocation', () {
    final loan = fixtures.loan();
    final repayment = fixtures.payment('repayment', 1000, addedOn);
    expect(computeLoan(loan, [repayment], at: addedOn).settled, isTrue);
    expect(computeLoan(loan, [repayment, addition()], at: addedOn).settled, isFalse);
    final split = allocateLoanPayment(loan, [repayment, addition()], 500, addedOn);
    expect(split.principal, 500);
    expect(split.interest, 0);
  });

  test('legacy payments and additions survive serialization and backup merge', () {
    final original = fixtures.payment('repayment', 200, start).toMap()..remove('is_addition');
    expect(LoanPayment.fromMap(original).isAddition, isFalse);
    final row = addition().toMap();
    expect(LoanPayment.fromMap(row).isAddition, isTrue);
    expect(LoanPayment.fromMap(row).copyWith(note: 'More borrowed').isAddition, isTrue);
    final merged = mergeFinanceDatabasePayloads(
      {'loan_payments': [original]}, {'loan_payments': [row]},
    ).database['loan_payments'] as List;
    expect(merged.length, 2);
    expect(merged.where((row) => row['is_addition'] == 1).length, 1);
  });
}
