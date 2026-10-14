import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sqflite/sqflite.dart' as sql;
import 'package:sqflite_common_ffi/sqflite_ffi.dart' as ffi;
import 'package:yutaka/main.dart';
import 'package:yutaka/models.dart';
import 'package:yutaka/loans/loan_models.dart';
import 'package:yutaka/category_deduplication.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Directory directory;
  late String previousPath;
  sql.DatabaseFactory? previousFactory;
  late AppController controller;
  late sql.Database database;
  late String food;
  late String travel;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    previousFactory = sql.databaseFactoryOrNull;
    ffi.sqfliteFfiInit();
    sql.databaseFactory = ffi.databaseFactoryFfiNoIsolate;
    previousPath = await sql.databaseFactory.getDatabasesPath();
    directory = await Directory.systemTemp.createTemp('yutaka-transaction-tools-');
    await sql.databaseFactory.setDatabasesPath(directory.path);
    controller = AppController()..loanRemindersEnabled = false;
    database = await controller.database.db;
    final now = DateTime.now();
    for (final entry in {'cash': 1000.0, 'bank': 500.0}.entries) {
      await database.insert('accounts', Account(id: entry.key, name: entry.key == 'cash' ? 'Cash' : 'Bank',
        type: AccountType.regular, iconName: 'wallet', iconColor: '#00BC9A', amount: entry.value,
        creditLimit: 0, sequence: 0, createdOn: now, updatedOn: now).toMap());
    }
    await controller.reload();
    final categories = controller.categories.where((category) => category.type == CategoryType.expense).toList();
    food = categories.first.id;
    travel = categories.last.id;
  });

  tearDown(() async {
    controller.dispose();
    if (database.isOpen) { await database.close(); }
    await sql.databaseFactory.setDatabasesPath(previousPath);
    sql.databaseFactoryOrNull = previousFactory;
    await directory.delete(recursive: true);
  });

  MoneyTransaction split({String id = 'split'}) {
    final now = DateTime.now();
    return MoneyTransaction(id: id, type: MoneyTransactionType.expense, amount: 110, baseAmount: 100,
      serviceChargeEnabled: true, serviceChargeValue: 10, serviceChargeAmount: 10,
      title: 'Market', notes: 'Weekly groceries', categoryId: food, categorySplits: {food: 60, travel: 40},
      fromAccountId: 'cash', createdOn: now, updatedOn: now);
  }

  test('split save, edit, budgets and undo each move the posted total once', () async {
    await controller.addTransaction(split());
    await controller.addTransaction(split());
    expect(controller.transactions, hasLength(1));
    expect(controller.accountOf('cash')!.amount, 890);
    expect(controller.categoryTotals(CategoryType.expense)[food], 66);
    expect(controller.categoryTotals(CategoryType.expense)[travel], 44);
    final now = DateTime.now();
    await controller.saveBudget(Budget(id: 'food-budget', selectedMonth: now, amount: 200,
      allAccountsSelected: true, allCategoriesSelected: false, accountIds: [], categoryIds: [food], createdOn: now, updatedOn: now));
    expect(controller.budgetProgress().single.spent, 66);
    final updated = split().copyWith(amount: 220, baseAmount: 200, categorySplits: {food: 120, travel: 80},
      serviceChargeAmount: 20, serviceChargeValue: 20);
    await controller.updateTransaction(updated);
    expect(controller.accountOf('cash')!.amount, 780);
    expect(controller.budgetProgress().single.spent, 132);
    await controller.moveTransactionToTrash('split');
    expect(controller.accountOf('cash')!.amount, 1000);
    expect(controller.transactions, isEmpty);
    expect(await controller.database.deletedTransactions(), hasLength(1));
    await controller.restoreDeletedTransaction('split');
    await controller.restoreDeletedTransaction('split');
    expect(controller.accountOf('cash')!.amount, 780);
    expect(controller.transactions.single.categorySplits, {food: 120, travel: 80});
    expect(await controller.database.deletedTransactions(), isEmpty);
    final queued = await controller.database.pendingSyncOperations();
    final transaction = queued.singleWhere((row) => row['entity_type'] == 'transactions');
    expect(transaction['operation'], 'upsert');
    expect(jsonDecode(transaction['payload_json'] as String)['category_splits'], jsonEncode({food: 120.0, travel: 80.0}));
  });

  test('invalid splits and a failed restore leave balances and trash intact', () async {
    await expectLater(controller.addTransaction(split().copyWith(categorySplits: {food: 70, travel: 40})), throwsStateError);
    expect(controller.accountOf('cash')!.amount, 1000);
    await controller.addTransaction(split());
    await controller.moveTransactionToTrash('split');
    await database.execute("CREATE TRIGGER reject_restore BEFORE INSERT ON transactions BEGIN SELECT RAISE(ABORT, 'failed restore'); END");
    await expectLater(controller.restoreDeletedTransaction('split'), throwsA(isA<sql.DatabaseException>()));
    expect((await database.query('accounts', where: 'id = ?', whereArgs: ['cash'])).single['amount'], 1000);
    expect(await controller.database.deletedTransactions(), hasLength(1));
    await database.execute('DROP TRIGGER reject_restore');
    await database.delete('accounts', where: 'id = ?', whereArgs: ['cash']);
    await expectLater(controller.restoreDeletedTransaction('split'), throwsStateError);
    expect(await controller.database.deletedTransactions(), hasLength(1));
  });

  test('transfer undo preserves source-only fees and destination money', () async {
    final now = DateTime.now();
    await controller.addTransaction(MoneyTransaction(id: 'transfer', type: MoneyTransactionType.transfer,
      amount: 110, baseAmount: 100, serviceChargeEnabled: true, serviceChargeAmount: 10,
      notes: '', categoryId: '', fromAccountId: 'cash', toAccountId: 'bank', createdOn: now, updatedOn: now));
    expect(controller.accountOf('bank')!.amount, 600);
    await controller.moveTransactionToTrash('transfer');
    expect(controller.accountOf('cash')!.amount, 1000);
    expect(controller.accountOf('bank')!.amount, 500);
    await controller.restoreDeletedTransaction('transfer');
    expect(controller.accountOf('cash')!.amount, 890);
    expect(controller.accountOf('bank')!.amount, 600);
  });

  test('shortcuts persist without moving money; search includes split categories and account', () async {
    final draft = split();
    await controller.saveTransactionShortcut(TransactionShortcut(id: 'market', name: 'Market run', draft: draft));
    expect(controller.transactions, isEmpty);
    expect(controller.accountOf('cash')!.amount, 1000);
    final serialized = (await controller.exportPreferences())['transactionShortcuts'] as String;
    expect(TransactionShortcut.decode(serialized).single.draft.categorySplits, draft.categorySplits);
    expect(await controller.prefs.getString('transactionShortcuts', ''), serialized);
    expect(transactionMatchesSearch(controller, draft, 'MARKET cash 110'), isTrue);
    expect(transactionMatchesSearch(controller, draft, controller.categoryOf(travel)!.name), isTrue);
    expect(transactionMatchesSearch(controller, draft, 'missing term'), isFalse);
    await controller.removeTransactionShortcut('market');
    expect(TransactionShortcut.decode(await controller.prefs.getString('transactionShortcuts', '[]')), isEmpty);
  });

  test('account replacement clears local trash and old split metadata is optional', () async {
    await controller.addTransaction(split());
    await controller.moveTransactionToTrash('split');
    await controller.database.clearFinanceDataForRemoteLogin();
    expect(await controller.database.deletedTransactions(), isEmpty);
    final map = split().toMap()..remove('category_splits');
    expect(MoneyTransaction.fromMap(map).categoryAmounts, {food: 110});
  });

  test('category merging preserves split totals and remaps saved shortcuts', () {
    final draft = split().copyWith(categoryId: 'older', categorySplits: {'older': 60, 'newer': 40});
    final payload = normalizeCategoryDatabasePayload({
      'categories': [
        {'id': 'older', 'name': 'Food', 'type': 'expense', 'created_on': 1, 'updated_on': 1},
        {'id': 'newer', 'name': ' food ', 'type': 'expense', 'created_on': 2, 'updated_on': 2},
      ],
      'transactions': [draft.toMap()],
    });
    final restored = MoneyTransaction.fromMap(Map<String, Object?>.from((payload.database['transactions'] as List).single as Map));
    expect(restored.categorySplits, {'older': 100});
    expect(restored.categoryAmounts, {'older': 110});
    restored.validateAmounts();
    final preferences = remapCategoryPreferences({'transactionShortcuts': jsonEncode([
      TransactionShortcut(id: 'shortcut', name: 'Food', draft: draft).toMap(),
    ])}, payload.plan);
    expect(TransactionShortcut.decode(preferences['transactionShortcuts'] as String).single.draft.categorySplits, {'older': 100});
  });

  for (final direction in LoanDirection.values) {
    test('undo restores ${direction.name} loan movements and repayment links once', () async {
      final now = DateTime.now();
      await controller.saveLoanContact(LoanContact(id: 'person', name: 'Rohan', createdOn: now, updatedOn: now));
      await controller.saveLoan(Loan(id: 'loan', contactId: 'person', direction: direction,
        principal: 200, startDate: now, createdOn: now, updatedOn: now), recordDisbursal: true, accountId: 'cash');
      final disbursalId = controller.loans.single.disbursalTransactionId!;
      final afterDisbursal = direction == LoanDirection.lent ? 800.0 : 1200.0;
      expect(controller.accountOf('cash')!.amount, afterDisbursal);
      await controller.moveTransactionToTrash(disbursalId);
      expect(controller.accountOf('cash')!.amount, 1000);
      expect(controller.loans.single.disbursalTransactionId, isNull);
      await controller.restoreDeletedTransaction(disbursalId);
      expect(controller.accountOf('cash')!.amount, afterDisbursal);
      expect(controller.loans.single.disbursalTransactionId, disbursalId);
      await controller.addLoanPayment(LoanPayment(id: 'repayment', loanId: 'loan', amount: 50,
        interestComponent: 0, principalComponent: 50, paidOn: now, createdOn: now, updatedOn: now),
        recordInAccount: true, accountId: 'cash');
      final transactionId = controller.loanPayments.single.transactionId!;
      await controller.moveTransactionToTrash(transactionId);
      expect(controller.loanPayments, isEmpty);
      expect(controller.accountOf('cash')!.amount, afterDisbursal);
      expect(controller.computationFor('loan').outstanding, 200);
      await controller.restoreDeletedTransaction(transactionId);
      await controller.restoreDeletedTransaction(transactionId);
      expect(controller.loanPayments.single.transactionId, transactionId);
      expect(controller.computationFor('loan').outstanding, 150);
      expect(controller.accountOf('cash')!.amount, direction == LoanDirection.lent ? 850 : 1150);
    });
  }

  testWidgets('search filters visible records and shortcut opens a fresh reviewed draft', (tester) async {
    await tester.binding.setSurfaceSize(const Size(1000, 1000));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.runAsync(() async {
      await controller.addTransaction(split());
      await controller.saveTransactionShortcut(TransactionShortcut(id: 'market', name: 'Market shortcut', draft: split()));
    });
    await tester.pumpWidget(ChangeNotifierProvider<AppController>.value(value: controller,
      child: MaterialApp(home: const Scaffold(body: TransactionListScreen()))));
    await tester.pump();
    await tester.enterText(find.byKey(const ValueKey('transaction-search')), 'unknown');
    await tester.pump();
    expect(find.text('No search matches'), findsOneWidget);
    await tester.tap(find.byTooltip('Clear search'));
    await tester.pump();
    expect(find.text('Market'), findsOneWidget);
    await tester.tap(find.text('Shortcuts'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Market shortcut'));
    await tester.pumpAndSettle();
    expect(find.text('Add transaction'), findsOneWidget);
    expect(find.text('Edit transaction'), findsNothing);
    expect(controller.transactions, hasLength(1));
    expect(controller.accountOf('cash')!.amount, 890);
    final save = tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Save')).onPressed!;
    await tester.runAsync(() async { await (Function.apply(save, const []) as Future<void>); });
    await tester.pumpAndSettle();
    expect(controller.transactions, hasLength(2));
    expect(controller.transactions.map((tx) => tx.id).toSet(), hasLength(2));
    expect(controller.accountOf('cash')!.amount, 780);
    expect(tester.takeException(), isNull);
  });
}
