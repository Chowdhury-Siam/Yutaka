import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite/sqflite.dart' as sql;
import 'package:sqflite_common_ffi/sqflite_ffi.dart' as ffi;
import 'package:yutaka/loans/loan_models.dart';
import 'package:yutaka/main.dart';
import 'package:yutaka/models.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('loan additions persist, move account money, reopen and support edit/delete', () async {
    final directory = await Directory.systemTemp.createTemp('yutaka-loan-addition-');
    final previousFactory = sql.databaseFactoryOrNull;
    final controller = AppController();
    sql.Database? db;
    String? previousDatabasePath;
    try {
      ffi.sqfliteFfiInit();
      sql.databaseFactory = ffi.databaseFactoryFfiNoIsolate;
      previousDatabasePath = await sql.databaseFactory.getDatabasesPath();
      await sql.databaseFactory.setDatabasesPath(directory.path);
      controller.loanRemindersEnabled = false;
      db = await controller.database.db;
      final now = DateTime.now();
      await db.insert('accounts', Account(id: 'cash', name: 'Cash', type: AccountType.regular,
          iconName: 'wallet', iconColor: '#00BC9A', amount: 1000, creditLimit: 0,
          sequence: 0, createdOn: now, updatedOn: now).toMap());
      await controller.loanRepository.upsertContact(LoanContact(id: 'person', name: 'Rohan', createdOn: now, updatedOn: now));
      for (final direction in LoanDirection.values) {
        final loan = Loan(id: direction.name, contactId: 'person', direction: direction,
            principal: 100, startDate: now.subtract(const Duration(days: 1)),
            createdOn: now, updatedOn: now);
        await controller.loanRepository.upsertLoan(loan);
        await controller.reload();
        final addition = LoanPayment(id: 'addition-${direction.name}', loanId: loan.id,
            amount: 50, isAddition: true, interestComponent: 0, principalComponent: 50,
            paidOn: now, createdOn: now, updatedOn: now);
        final before = controller.accountOf('cash')!.amount;
        await controller.addLoanPayment(addition, recordInAccount: true, accountId: 'cash');
        expect(controller.computationFor(loan.id).principal, 150);
        expect(controller.computationFor(loan.id).totalPaid, 0);
        expect(controller.accountOf('cash')!.amount, before + (loan.isLent ? -50 : 50));
        final saved = controller.paymentsForLoan(loan.id).single;
        final movement = controller.transactions.singleWhere((tx) => tx.id == saved.transactionId);
        expect(movement.excludeFromReports, isTrue);
        expect(movement.type, loan.isLent ? MoneyTransactionType.expense : MoneyTransactionType.income);
        await controller.updateLinkedLoanTransaction(movement.copyWith(amount: 75));
        expect(controller.computationFor(loan.id).principal, 175);
        expect(controller.paymentsForLoan(loan.id).single.isAddition, isTrue);
        expect(controller.accountOf('cash')!.amount, before + (loan.isLent ? -75 : 75));
        await controller.deleteLinkedLoanTransaction(controller.transactions.singleWhere((tx) => tx.id == saved.transactionId));
        expect(controller.computationFor(loan.id).principal, 100);
        expect(controller.accountOf('cash')!.amount, before);
        expect(controller.paymentsForLoan(loan.id), isEmpty);
        await controller.setLoanStatus(loan.id, LoanStatus.closed);
        await controller.addLoanPayment(addition);
        expect(controller.loanOf(loan.id)!.status, LoanStatus.active);
        expect(controller.accountOf('cash')!.amount, before);
        final queued = await controller.database.pendingSyncOperations(limit: 1000);
        expect(queued.any((row) => row['entity_type'] == 'loan_payments' && row['entity_id'] == addition.id), isTrue);
        await expectLater(controller.addLoanPayment(addition.copyWith(amount: 0.001)), throwsStateError);
        await expectLater(controller.addLoanPayment(addition.copyWith(paidOn: loan.startDate.subtract(const Duration(days: 1)))), throwsStateError);
        await expectLater(controller.addLoanPayment(addition.copyWith(paidOn: now.add(const Duration(days: 1)))), throwsStateError);
      }
      // Exercise migration on a database created before the addition flag existed.
      await db.execute('ALTER TABLE loan_payments DROP COLUMN is_addition');
      await db.execute('PRAGMA user_version = 15');
      await db.close();
      db = await YutakaDatabase().db;
      final columns = await db.rawQuery('PRAGMA table_info(loan_payments)');
      expect(columns.any((row) => row['name'] == 'is_addition'), isTrue);
      final preserved = await db.query('loan_payments');
      expect(preserved.length, 2);
      expect(preserved.every((row) => row['is_addition'] == 0 && row['amount'] == 50), isTrue);
    } finally {
      controller.dispose();
      if (db != null && db.isOpen) await db.close();
      if (previousDatabasePath != null) await sql.databaseFactory.setDatabasesPath(previousDatabasePath);
      sql.databaseFactoryOrNull = previousFactory;
      await directory.delete(recursive: true);
    }
  });
}
