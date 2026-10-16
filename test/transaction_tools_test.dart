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
    final recovery = (await controller.database.latestPendingSyncOperation('transaction_trash', 'split'))!;
    expect(recovery['operation'], 'upsert');
    expect(jsonDecode(jsonDecode(recovery['payload_json'] as String)['payload_json'] as String)['transaction']['amount'], 220);
    await controller.restoreDeletedTransaction('split');
    await controller.restoreDeletedTransaction('split');
    expect(controller.accountOf('cash')!.amount, 780);
    expect(controller.transactions.single.categorySplits, {food: 120, travel: 80});
    expect(await controller.database.deletedTransactions(), isEmpty);
    expect((await controller.database.latestPendingSyncOperation('transaction_trash', 'split'))!['operation'], 'delete');
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

  test('permanent trash deletion preserves balances, live rows, pending sync and other recovery copies', () async {
    for (final id in ['discard', 'recover', 'live']) {
      await controller.addTransaction(split(id: id));
    }
    await controller.moveTransactionToTrash('discard');
    await controller.moveTransactionToTrash('recover');
    final accounts = await database.query('accounts', orderBy: 'id');
    final live = await database.query('transactions', orderBy: 'id');
    final pending = await controller.database.pendingSyncOperations();
    await database.execute("CREATE TRIGGER reject_trash_delete BEFORE DELETE ON transaction_trash BEGIN SELECT RAISE(ABORT, 'failed delete'); END");
    await expectLater(controller.database.permanentlyDeleteTrashedTransaction('discard'), throwsA(isA<sql.DatabaseException>()));
    expect(await database.query('transaction_trash'), hasLength(2));
    await database.execute('DROP TRIGGER reject_trash_delete');
    await controller.database.permanentlyDeleteTrashedTransaction('discard');
    await controller.database.permanentlyDeleteTrashedTransaction('discard');
    await controller.database.permanentlyDeleteTrashedTransaction('live');
    await controller.database.restoreDeletedTransaction('discard');
    expect((await controller.database.deletedTransactions()).single['id'], 'recover');
    expect(await database.query('accounts', orderBy: 'id'), accounts);
    expect(await database.query('transactions', orderBy: 'id'), live);
    final afterDelete = await controller.database.pendingSyncOperations();
    expect(afterDelete.where((row) => row['entity_type'] != 'transaction_trash').toList(),
      pending.where((row) => row['entity_type'] != 'transaction_trash').toList());
    expect(afterDelete.singleWhere((row) => row['entity_type'] == 'transaction_trash' && row['entity_id'] == 'discard')['operation'], 'delete');
    await controller.restoreDeletedTransaction('recover');
    expect(controller.transactions.map((tx) => tx.id).toSet(), {'live', 'recover'});
    expect(controller.accountOf('cash')!.amount, 780);
    expect(await controller.database.deletedTransactions(), isEmpty);
  });

  testWidgets('permanent delete confirms, cancels and removes only the selected trash card on a large-text phone', (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.runAsync(() async {
      await controller.addTransaction(split(id: 'discard').copyWith(title: 'Discard me'));
      await controller.addTransaction(split(id: 'recover').copyWith(title: 'Keep me'));
      await controller.moveTransactionToTrash('discard');
      await controller.moveTransactionToTrash('recover');
    });
    await tester.pumpWidget(ChangeNotifierProvider<AppController>.value(
      value: controller,
      child: MaterialApp(home: MediaQuery(
        data: const MediaQueryData(size: Size(320, 640), textScaler: TextScaler.linear(2), disableAnimations: true),
        child: const RecentlyDeletedTransactionsScreen(),
      )),
    ));
    for (var attempt = 0; attempt < 10 && find.byType(ResponsiveListContent).evaluate().isEmpty; attempt++) {
      await tester.runAsync(() => controller.database.deletedTransactions());
      await tester.pump();
    }
    expect(find.byType(ResponsiveListContent), findsOneWidget);
    final delete = find.byKey(const ValueKey('trash-delete-discard'));
    // The older card can be outside the lazy list's build/cache range.
    final scrollable = find.descendant(of: find.byType(ResponsiveListContent), matching: find.byType(Scrollable));
    await tester.scrollUntilVisible(delete, 150, scrollable: scrollable);
    await tester.pumpAndSettle();
    await tester.tap(delete);
    await tester.pumpAndSettle();
    expect(find.text('Delete permanently?'), findsOneWidget);
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(await tester.runAsync(() => controller.database.deletedTransactions()), hasLength(2));
    await tester.tap(delete);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Delete permanently'));
    await tester.runAsync(() => controller.database.deletedTransactions());
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pump();
    expect(find.byKey(const ValueKey('trash-delete-discard')), findsNothing);
    final remaining = await tester.runAsync(() => controller.database.deletedTransactions());
    expect(remaining!.single['id'], 'recover');
    expect(controller.accountOf('cash')!.amount, 1000);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  test('account splits preserve both balances, budgets, backup, sync, edit and undo', () async {
    final draft = split().copyWith(accountSplits: {'cash': 60, 'bank': 40});
    await controller.addTransaction(draft);
    await controller.addTransaction(draft);
    expect(controller.transactions, hasLength(1));
    expect(controller.accountOf('cash')!.amount, 934);
    expect(controller.accountOf('bank')!.amount, 456);
    expect(controller.filteredTransactions(accountId: 'bank').single.id, draft.id);
    controller.filterAccountIds = ['bank'];
    expect(controller.filteredTransactions().single.id, draft.id);
    controller.filterAccountIds = [];
    expect(transactionMatchesSearch(controller, draft, 'Market Bank'), isTrue);
    final now = DateTime.now();
    await controller.saveBudget(Budget(id: 'bank-food', selectedMonth: now, amount: 200,
      allAccountsSelected: false, allCategoriesSelected: false, accountIds: ['bank'], categoryIds: [food],
      createdOn: now, updatedOn: now));
    expect(controller.budgetProgress().single.spent, closeTo(26.4, .000001));
    expect(draft.amountForScope(accountIds: ['cash', 'bank']), 110);
    await controller.saveTransactionShortcut(TransactionShortcut(id: 'mixed', name: 'Mixed payment', draft: draft));
    final preferences = await controller.exportPreferences();
    expect(TransactionShortcut.decode(preferences['transactionShortcuts'] as String).single.draft.accountSplits,
        {'cash': 60, 'bank': 40});
    final snapshot = await controller.database.exportAll();
    await controller.database.importAll(snapshot);
    await controller.reload();
    expect(controller.transactions.single.accountSplits, {'cash': 60, 'bank': 40});
    expect(controller.accountOf('bank')!.amount, 456);
    final updated = draft.copyWith(accountSplits: {'cash': 20, 'bank': 80});
    await controller.updateTransaction(updated);
    expect(controller.accountOf('cash')!.amount, 978);
    expect(controller.accountOf('bank')!.amount, 412);
    final queued = await controller.database.pendingSyncOperations();
    for (final id in ['cash', 'bank']) {
      final operation = queued.singleWhere((row) => row['entity_type'] == 'accounts' && row['entity_id'] == id);
      expect(jsonDecode(operation['payload_json'] as String)['amount'], controller.accountOf(id)!.amount);
    }
    final transaction = queued.singleWhere((row) => row['entity_type'] == 'transactions');
    expect(jsonDecode(transaction['payload_json'] as String)['account_splits'], jsonEncode({'cash': 20.0, 'bank': 80.0}));
    await controller.moveTransactionToTrash(draft.id);
    expect(controller.accountOf('cash')!.amount, 1000);
    expect(controller.accountOf('bank')!.amount, 500);
    await controller.restoreDeletedTransaction(draft.id);
    await controller.restoreDeletedTransaction(draft.id);
    expect(controller.accountOf('cash')!.amount, 978);
    expect(controller.accountOf('bank')!.amount, 412);
    await controller.updateTransaction(updated.copyWith(accountSplits: {}));
    expect(controller.accountOf('cash')!.amount, 890);
    expect(controller.accountOf('bank')!.amount, 500);
    await controller.deleteTransaction(draft.id);
    expect(controller.accountOf('cash')!.amount, 1000);
    expect(controller.accountOf('bank')!.amount, 500);
  });

  test('split income credits net amounts and missing secondary accounts roll back atomically', () async {
    final draft = split().copyWith(type: MoneyTransactionType.income, amount: 90,
        categorySplits: {}, accountSplits: {'cash': 60, 'bank': 40});
    await controller.addTransaction(draft);
    expect(controller.accountOf('cash')!.amount, 1054);
    expect(controller.accountOf('bank')!.amount, 536);
    await controller.moveTransactionToTrash(draft.id);
    await database.delete('accounts', where: 'id = ?', whereArgs: ['bank']);
    await expectLater(controller.restoreDeletedTransaction(draft.id), throwsStateError);
    expect(await controller.database.deletedTransactions(), hasLength(1));
    await expectLater(controller.addTransaction(draft.copyWith(id: 'missing-account')), throwsStateError);
    expect((await database.query('accounts', where: 'id = ?', whereArgs: ['cash'])).single['amount'], 1000);
    expect(await database.query('transactions'), isEmpty);
  });

  test('account split validation rejects mismatches, loans and transfers; legacy metadata is optional', () async {
    final draft = split();
    for (final invalid in [
      draft.copyWith(accountSplits: {'cash': 60, 'bank': 50}),
      draft.copyWith(accountSplits: {'cash': 100}),
      draft.copyWith(accountSplits: {'cash': -10, 'bank': 110}),
      draft.copyWith(accountSplits: {'cash': double.nan, 'bank': 100}),
      draft.copyWith(accountSplits: {'other': 60, 'bank': 40}),
      draft.copyWith(type: MoneyTransactionType.transfer, categorySplits: {}, accountSplits: {'cash': 60, 'bank': 40}),
      draft.copyWith(linkedEntityType: 'loans', categorySplits: {}, accountSplits: {'cash': 60, 'bank': 40}),
    ]) {
      await expectLater(controller.addTransaction(invalid), throwsStateError);
    }
    expect(controller.accountOf('cash')!.amount, 1000);
    expect(controller.accountOf('bank')!.amount, 500);
    final legacy = MoneyTransaction.fromMap(draft.toMap()..remove('account_splits'));
    expect(legacy.accountSplits, isEmpty);
    expect(legacy.accountAmounts, {'cash': 110});
  });

  test('upgrading a version 17 database preserves existing balances and transactions', () async {
    await controller.addTransaction(split());
    await database.execute('ALTER TABLE transactions DROP COLUMN account_splits');
    await database.setVersion(17);
    await database.close();
    database = await YutakaDatabase().db;
    expect(await database.getVersion(), 18);
    final restored = MoneyTransaction.fromMap((await database.query('transactions')).single);
    expect(restored.accountSplits, isEmpty);
    expect(restored.categorySplits, {food: 60, travel: 40});
    expect(restored.amount, 110);
    expect((await database.query('accounts', where: 'id = ?', whereArgs: ['cash'])).single['amount'], 890);
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

  test('legacy recovery copies backfill once per account without overwriting tracked rows', () async {
    final now = DateTime.now().millisecondsSinceEpoch;
    for (final id in ['legacy', 'tracked']) {
      await database.insert('transaction_trash', {'id': id, 'payload_json': jsonEncode({'transaction': split(id: id).toMap()}), 'deleted_on': now});
    }
    await controller.database.saveEntityVersion('transaction_trash', 'tracked', 2);
    await controller.database.enqueueLegacyTransactionTrashForCloudSync('owner');
    final pending = await controller.database.latestPendingSyncOperation('transaction_trash', 'legacy');
    expect(pending!['operation'], 'upsert');
    expect(await controller.database.latestPendingSyncOperation('transaction_trash', 'tracked'), isNull);
    await controller.database.enqueueLegacyTransactionTrashForCloudSync('owner');
    expect((await controller.database.latestPendingSyncOperation('transaction_trash', 'legacy'))!['id'], pending['id']);
    await database.update('transaction_trash', {'deleted_on': now - const Duration(days: 31).inMilliseconds}, where: 'id = ?', whereArgs: ['legacy']);
    await controller.database.expireTransactionTrash();
    expect((await controller.database.latestPendingSyncOperation('transaction_trash', 'legacy'))!['operation'], 'delete');
    expect((await controller.database.deletedTransactions()).single['id'], 'tracked');
  });

  test('a second device restores a synced recovery copy once and both devices converge', () async {
    await controller.addTransaction(split());
    await controller.moveTransactionToTrash('split');
    final snapshot = await controller.database.exportAll();
    final pending = await controller.database.pendingSyncOperations();
    await controller.database.markOutboxUploaded(pending.map((row) => row['id'] as String).toList(),
      {for (final row in pending) row['id'] as String: 1});
    final firstPath = await sql.databaseFactory.getDatabasesPath();
    final secondPath = Directory('${directory.path}/second')..createSync();
    await sql.databaseFactory.setDatabasesPath(secondPath.path);
    final second = YutakaDatabase();
    try {
      await second.replaceFinanceDataWithRemoteChanges([
        for (final table in YutakaDatabase.syncTables)
          for (final row in (snapshot[table] as List? ?? []))
            {'entityType': table, 'entityId': row['id'], 'operation': 'upsert', 'version': 1, 'payload': row},
      ]);
      expect(await second.deletedTransactions(), hasLength(1));
      await second.restoreDeletedTransaction('split');
      await second.restoreDeletedTransaction('split');
      final deviceDb = await second.db;
      expect((await deviceDb.query('accounts', where: 'id = ?', whereArgs: ['cash'])).single['amount'], 890);
      final operations = await second.pendingSyncOperations();
      await controller.database.applyRemoteChanges([
        for (final row in operations)
          {'entityType': row['entity_type'], 'entityId': row['entity_id'], 'operation': row['operation'],
            'version': 2, 'changedAt': DateTime.now().millisecondsSinceEpoch,
            'payload': row['payload_json'] == null ? null : jsonDecode(row['payload_json'] as String)},
      ], (_) async {});
      await controller.reload();
      expect(controller.transactions.single.id, 'split');
      expect(controller.accountOf('cash')!.amount, 890);
      expect(await controller.database.deletedTransactions(), isEmpty);
    } finally {
      await (await second.db).close();
      await sql.databaseFactory.setDatabasesPath(firstPath);
    }
  });

  test('backup merge preserves recovery copies and remaps their split categories', () async {
    await controller.addTransaction(split());
    await controller.moveTransactionToTrash('split');
    final backup = await controller.database.exportAll();
    expect(backup['transaction_trash'], hasLength(1));
    await controller.database.mergeAll(backup);
    expect(await controller.database.deletedTransactions(), hasLength(1));
    final normalized = normalizeCategoryDatabasePayload({
      'categories': [
        {'id': 'old', 'name': 'Food', 'type': 'expense', 'created_on': 1},
        {'id': 'new', 'name': ' food ', 'type': 'expense', 'created_on': 2},
      ],
      'transaction_trash': [
        {'id': 'recover', 'deleted_on': DateTime.now().millisecondsSinceEpoch,
          'payload_json': jsonEncode({'transaction': split(id: 'recover').copyWith(categoryId: 'new', categorySplits: {'new': 100}).toMap()})},
      ],
    });
    final row = (normalized.database['transaction_trash'] as List).single as Map;
    final tx = (jsonDecode(row['payload_json'] as String) as Map)['transaction'] as Map;
    expect(tx['category_id'], 'old');
    expect(jsonDecode(tx['category_splits'] as String), {'old': 100});
    final category = controller.categories.first.toMap();
    await database.insert('categories', {...category, 'id': 'old', 'name': 'Recovery category', 'type': 'expense', 'created_on': 1});
    await database.insert('categories', {...category, 'id': 'new', 'name': ' recovery category ', 'type': 'expense', 'created_on': 2});
    await database.insert('transaction_trash', {'id': 'db-recover', 'deleted_on': DateTime.now().millisecondsSinceEpoch,
      'payload_json': jsonEncode({'transaction': split(id: 'db-recover').copyWith(categoryId: 'new', categorySplits: {'new': 100}).toMap()})});
    final repaired = await controller.database.mergeDuplicateCategories();
    expect(repaired.updatedTransactionTrashIds, contains('db-recover'));
    await controller.restoreDeletedTransaction('db-recover');
    expect(controller.transactions.single.categoryId, 'old');
    expect(controller.transactions.single.categorySplits, {'old': 100});
    expect(controller.accountOf('cash')!.amount, 890);
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

  testWidgets('shortcut and trash empty icons move and respect reduced motion', (tester) async {
    await tester.binding.setSurfaceSize(const Size(800, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    for (final entry in [
      (screen: const TransactionShortcutsScreen(), icon: Icons.bolt_rounded),
      (screen: const RecentlyDeletedTransactionsScreen(), icon: Icons.delete_outline_rounded),
    ]) {
      Widget page(bool reduced) => ChangeNotifierProvider<AppController>.value(
        value: controller,
        child: MaterialApp(home: MediaQuery(
          data: MediaQueryData(size: const Size(800, 900), disableAnimations: reduced),
          child: entry.screen,
        )),
      );
      await tester.pumpWidget(page(false));
      // The database is already open; let the trash query finish before testing its icon.
      await tester.runAsync(() => controller.database.deletedTransactions());
      await tester.pump();
      expect(tester.widget<EmptyCard>(find.byType(EmptyCard)).animated, isTrue);
      final icon = find.byIcon(entry.icon);
      final start = tester.getCenter(icon);
      await tester.pump(const Duration(milliseconds: 650));
      expect(tester.getCenter(icon), isNot(start));
      await tester.pumpWidget(page(true));
      final stopped = tester.getCenter(icon);
      await tester.pump(const Duration(milliseconds: 650));
      expect(tester.getCenter(icon), stopped);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    }
  });

  for (final splitAccounts in [false, true]) {
    testWidgets('${splitAccounts ? 'account' : 'category'} split shows allocation status and returns validated shares', (tester) async {
      final semantics = tester.ensureSemantics();
      try {
        await tester.binding.setSurfaceSize(const Size(360, 640));
        addTearDown(() => tester.binding.setSurfaceSize(null));
        Map<String, double>? result;
        await tester.pumpWidget(ChangeNotifierProvider<AppController>.value(
          value: controller,
          child: MaterialApp(home: Scaffold(body: Builder(builder: (context) => TextButton(
            onPressed: () async {
              result = await showTransactionSplits(context, type: MoneyTransactionType.expense,
                total: 100, initial: {}, splitAccounts: splitAccounts);
            },
            child: const Text('Split'),
          )))),
        ));
        await tester.tap(find.text('Split'));
        await tester.pumpAndSettle();
        final ids = splitAccounts ? ['cash', 'bank'] : controller.categories
            .where((c) => c.type == CategoryType.expense).take(2).map((c) => c.id).toList();
        final first = find.byKey(ValueKey('split-amount-${ids[0]}'));
        final second = find.byKey(ValueKey('split-amount-${ids[1]}'));
        await tester.enterText(first, '60');
        await tester.enterText(second, '50');
        await tester.pump();
        expect(find.text('Over by ${controller.format(10)}'), findsOneWidget);
        await tester.tap(find.text('Done'));
        await tester.pump();
        expect(result, isNull);
        expect(find.text('Use 2–20 ${splitAccounts ? 'accounts' : 'categories'} whose amounts equal the total.'), findsOneWidget);
        await tester.enterText(second, '40');
        await tester.pump();
        expect(find.text('Fully allocated'), findsOneWidget);
        await tester.tap(find.text('Done'));
        await tester.pumpAndSettle();
        expect(result, {ids[0]: 60.0, ids[1]: 40.0});
        expect(controller.transactions, isEmpty);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox.shrink());
      } finally {
        semantics.dispose();
      }
    });
  }

  testWidgets('account split popup validates amounts before saving a reviewed draft', (tester) async {
    await tester.binding.setSurfaceSize(const Size(1000, 1000));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(ChangeNotifierProvider<AppController>.value(value: controller,
      child: MaterialApp(home: Builder(builder: (context) => Scaffold(body: TextButton(
        onPressed: () => showTransactionEditor(context,
          shortcut: TransactionShortcut(id: 'mixed', name: 'Mixed payment', draft: split())),
        child: const Text('Open editor'),
      ))))));
    await tester.tap(find.text('Open editor'));
    await tester.pumpAndSettle();
    final splitButton = find.byTooltip('Split accounts');
    expect(find.ancestor(of: splitButton, matching: find.byType(AppleSelectionField)), findsOneWidget);
    await tester.ensureVisible(splitButton);
    await tester.tap(splitButton);
    await tester.pumpAndSettle();
    final cash = find.byKey(const ValueKey('split-amount-cash'));
    final bank = find.byKey(const ValueKey('split-amount-bank'));
    await tester.enterText(cash, '60');
    await tester.enterText(bank, '50');
    await tester.tap(find.text('Done'));
    await tester.pump();
    expect(find.text('Use 2–20 accounts whose amounts equal the total.'), findsOneWidget);
    await tester.enterText(bank, '40');
    await tester.tap(find.text('Done'));
    await tester.pumpAndSettle();
    expect(find.byTooltip('Edit account split'), findsOneWidget);
    expect(controller.transactions, isEmpty);
    final saveFinder = find.widgetWithText(FilledButton, 'Save');
    final shortcutButton = find.widgetWithText(OutlinedButton, 'Save shortcut');
    await tester.ensureVisible(shortcutButton);
    expect(tester.getTopLeft(shortcutButton).dy, greaterThan(tester.getBottomLeft(saveFinder).dy));
    final save = tester.widget<FilledButton>(saveFinder).onPressed!;
    await tester.runAsync(() async { await (Function.apply(save, const []) as Future<void>); });
    await tester.pumpAndSettle();
    expect(controller.transactions.single.accountSplits, {'cash': 60, 'bank': 40});
    expect(controller.accountOf('cash')!.amount, 934);
    expect(controller.accountOf('bank')!.amount, 456);
    expect(tester.takeException(), isNull);
  });

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
    await tester.tap(find.byTooltip('Shortcuts'));
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
