import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sqflite/sqflite.dart' as sql;
import 'package:sqflite_common_ffi/sqflite_ffi.dart' as ffi;
import 'package:yutaka/loans/loan_models.dart';
import 'package:yutaka/main.dart';
import 'package:yutaka/models.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Directory directory;
  late String previousPath;
  sql.DatabaseFactory? previousFactory;
  late AppController controller;
  late sql.Database database;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    previousFactory = sql.databaseFactoryOrNull;
    ffi.sqfliteFfiInit();
    sql.databaseFactory = ffi.databaseFactoryFfiNoIsolate;
    previousPath = await sql.databaseFactory.getDatabasesPath();
    directory = await Directory.systemTemp.createTemp('yutaka-existing-loans-');
    await sql.databaseFactory.setDatabasesPath(directory.path);
    controller = AppController()..loanRemindersEnabled = false;
    database = await controller.database.db;
    final now = DateTime.now();
    await database.insert('accounts', Account(
      id: 'cash', name: 'Cash', type: AccountType.regular,
      iconName: 'wallet', iconColor: '#00BC9A', amount: 1000, creditLimit: 0,
      sequence: 0, createdOn: now, updatedOn: now,
    ).toMap());
    await controller.reload();
  });

  tearDown(() async {
    controller.dispose();
    if (database.isOpen) await database.close();
    await sql.databaseFactory.setDatabasesPath(previousPath);
    sql.databaseFactoryOrNull = previousFactory;
    await directory.delete(recursive: true);
  });

  Finder field(String label) => find.byWidgetPredicate(
      (widget) => widget is TextField && widget.decoration?.labelText == label);

  for (final direction in LoanDirection.values) {
    testWidgets('setup ${direction.name} loan preserves current money and future repayments work', (tester) async {
      await tester.binding.setSurfaceSize(const Size(1000, 1000));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await tester.pumpWidget(ChangeNotifierProvider<AppController>.value(
        value: controller,
        child: MaterialApp(home: Scaffold(body: LoanSetupPane(state: controller, onSkip: () async {}))),
      ));
      await tester.tap(find.text(direction == LoanDirection.lent ? 'Money owed to me' : 'Money I owe'));
      await tester.pumpAndSettle();
      expect(find.text('New money'), findsNothing);
      expect(find.text('Give from account'), findsNothing);
      expect(find.text('Receive into account'), findsNothing);
      await tester.enterText(field('Person name'), 'Rohan');
      await tester.enterText(field('Amount still owed'), '200');
      // Await the real save callback so SQLite work finishes before assertions
      // or teardown, instead of relying on a fixed number of pumped frames.
      final save = tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Save loan')).onPressed!;
      await tester.runAsync(() async {
        await (Function.apply(save, const []) as Future<void>);
      });
      await tester.pumpAndSettle();
      final loan = controller.loans.single;
      expect(loan.direction, direction);
      expect(loan.disbursalTransactionId, isNull);
      expect(controller.accountOf('cash')!.amount, 1000);
      expect(controller.transactions, isEmpty);
      expect(controller.computationFor(loan.id).outstanding, 200);
      await tester.runAsync(() async {
        final queued = await controller.database.pendingSyncOperations();
        expect(queued.any((row) => row['entity_type'] == 'loans' && row['entity_id'] == loan.id), isTrue);
        final now = DateTime.now();
        await controller.addLoanPayment(LoanPayment(
          id: 'repayment', loanId: loan.id, amount: 50,
          interestComponent: 0, principalComponent: 50,
          paidOn: now, createdOn: now, updatedOn: now,
        ), recordInAccount: true, accountId: 'cash');
      });
      await tester.pumpAndSettle();
      expect(controller.computationFor(loan.id).outstanding, 150);
      expect(controller.accountOf('cash')!.amount, direction == LoanDirection.lent ? 1050 : 950);
      expect(controller.transactions.single.amount, 50);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('regular loan editor can record an existing loan without an account', (tester) async {
    await tester.runAsync(() async {
      await database.delete('accounts');
      await controller.reload();
    });
    await tester.binding.setSurfaceSize(const Size(1000, 1000));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(ChangeNotifierProvider<AppController>.value(
      value: controller,
      child: MaterialApp(home: Scaffold(body: Builder(builder: (context) => TextButton(
        onPressed: () => showLoanEditorSheet(context), child: const Text('Add loan'),
      )))),
    ));
    await tester.tap(find.text('Add loan'));
    await tester.pumpAndSettle();
    expect(find.text('Give from account'), findsOneWidget);
    await tester.tap(find.text('Existing loan'));
    await tester.pumpAndSettle();
    expect(find.text('Give from account'), findsNothing);
    await tester.enterText(field('Person name'), 'Rohan');
    await tester.enterText(field('Amount still owed'), '200');
    final save = tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Save loan')).onPressed!;
    await tester.runAsync(() async {
      await (Function.apply(save, const []) as Future<void>);
    });
    await tester.pumpAndSettle();
    expect(controller.loans.single.disbursalTransactionId, isNull);
    expect(controller.transactions, isEmpty);
    expect(controller.accounts, isEmpty);
    expect(tester.takeException(), isNull);
  });

  test('new borrowed money still changes the selected account once', () async {
    final now = DateTime.now();
    await controller.saveLoanContact(LoanContact(id: 'person', name: 'Rohan', createdOn: now, updatedOn: now));
    final loan = Loan(id: 'new-money', contactId: 'person', direction: LoanDirection.borrowed,
        principal: 200, startDate: now, createdOn: now, updatedOn: now);
    await controller.saveLoan(loan, recordDisbursal: true, accountId: 'cash');
    final saved = controller.loans.single;
    expect(saved.disbursalTransactionId, isNotNull);
    expect(controller.accountOf('cash')!.amount, 1200);
    expect(controller.transactions.single.amount, 200);
    await controller.saveLoan(saved, accountId: 'cash');
    expect(controller.accountOf('cash')!.amount, 1200);
    expect(controller.transactions, hasLength(1));
  });
}
