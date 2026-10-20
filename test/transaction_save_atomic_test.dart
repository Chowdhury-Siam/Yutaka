import 'dart:async';
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

class SaveTestController extends AppController {
  Completer<void>? saveGate;
  bool failAfterCommit = false;
  final attemptedIds = <String>[];

  @override
  Future<void> addTransaction(MoneyTransaction tx) async {
    attemptedIds.add(tx.id);
    if (saveGate != null) await saveGate!.future;
    await super.addTransaction(tx);
    if (failAfterCommit) throw StateError('Simulated interruption after commit');
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Directory directory;
  late String previousPath;
  sql.DatabaseFactory? previousFactory;
  late SaveTestController controller;
  late sql.Database database;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    previousFactory = sql.databaseFactoryOrNull;
    ffi.sqfliteFfiInit();
    sql.databaseFactory = ffi.databaseFactoryFfiNoIsolate;
    previousPath = await sql.databaseFactory.getDatabasesPath();
    directory = await Directory.systemTemp.createTemp('yutaka-atomic-save-');
    await sql.databaseFactory.setDatabasesPath(directory.path);
    controller = SaveTestController()..loanRemindersEnabled = false;
    database = await controller.database.db;
    final now = DateTime.now();
    for (final entry in {'cash': 80.0, 'bank': 20.0}.entries) {
      await database.insert('accounts', Account(
        id: entry.key, name: entry.key, type: AccountType.regular,
        iconName: 'wallet', iconColor: '#00BD91', amount: entry.value,
        creditLimit: 0, sequence: 0, createdOn: now, updatedOn: now,
      ).toMap());
    }
    await controller.reload();
    controller.defaultAccountId = 'cash';
  });

  tearDown(() async {
    controller.dispose();
    if (database.isOpen) await database.close();
    await sql.databaseFactory.setDatabasesPath(previousPath);
    sql.databaseFactoryOrNull = previousFactory;
    await directory.delete(recursive: true);
  });

  MoneyTransaction draft({MoneyTransactionType type = MoneyTransactionType.expense}) {
    final now = DateTime.now();
    return MoneyTransaction(
      id: 'dinner-draft', type: type, amount: 65, title: 'Dinner', notes: '',
      categoryId: type == MoneyTransactionType.income
          ? controller.defaultIncomeCategoryId! : controller.defaultExpenseCategoryId!,
      fromAccountId: 'cash',
      toAccountId: type == MoneyTransactionType.transfer ? 'bank' : null,
      createdOn: now, updatedOn: now,
    );
  }

  for (final type in MoneyTransactionType.values) {
    test('replaying ${type.name} draft moves money once and preserves the outbox', () async {
      final tx = draft(type: type);
      await controller.addTransaction(tx);
      final firstOutbox = await controller.database.pendingSyncOperations();
      await controller.addTransaction(tx);
      await controller.addTransaction(tx);
      expect(controller.transactions, hasLength(1));
      expect(controller.accountOf('cash')!.amount,
          type == MoneyTransactionType.income ? 145 : 15);
      expect(controller.accountOf('bank')!.amount,
          type == MoneyTransactionType.transfer ? 85 : 20);
      final queued = await controller.database.pendingSyncOperations();
      expect(queued.map((row) => row['id']).toSet(), firstOutbox.map((row) => row['id']).toSet());
      final cash = queued.singleWhere((row) => row['entity_type'] == 'accounts' && row['entity_id'] == 'cash');
      expect(jsonDecode(cash['payload_json'] as String)['amount'], controller.accountOf('cash')!.amount);
    });
  }

  test('different drafts with identical details remain separate transactions', () async {
    final tx = draft();
    await controller.addTransaction(tx);
    await controller.addTransaction(tx.copyWith(id: 'another-dinner'));
    expect(controller.transactions, hasLength(2));
    expect(controller.accountOf('cash')!.amount, -50);
  });

  test('foreground subscription polling does not stall a local transaction', () async {
    final now = DateTime.now();
    await database.insert('subscriptions', RecurringSubscription(
      id: 'due-subscription', name: 'Mobile plan', amount: 10,
      categoryId: controller.defaultExpenseCategoryId!, accountId: 'cash',
      nextDueOn: now.subtract(const Duration(days: 1)),
      frequency: SubscriptionFrequency.monthly, createdOn: now, updatedOn: now,
    ).toMap());
    final transactionStarted = Completer<void>();
    final releaseTransaction = Completer<void>();
    final write = database.transaction((txn) async {
      await txn.rawUpdate('UPDATE accounts SET amount = amount WHERE id = ?', ['cash']);
      transactionStarted.complete();
      await releaseTransaction.future;
      await txn.query('accounts');
    }, exclusive: true);
    await transactionStarted.future;
    final watch = Stopwatch()..start();
    final sweep = controller.processDueSubscriptions();
    await Future<void>.delayed(const Duration(milliseconds: 50));
    releaseTransaction.complete();
    await Future.wait([write, sweep]).timeout(const Duration(seconds: 3));
    expect(await sweep, 1);
    expect(watch.elapsed, lessThan(const Duration(seconds: 3)));
    expect((await controller.database.accounts()).firstWhere((row) => row.id == 'cash').amount, 70);
  });

  test('outbox failure rolls back both the transaction and account balance', () async {
    await database.execute('''
      CREATE TRIGGER fail_save_outbox BEFORE INSERT ON sync_outbox
      BEGIN SELECT RAISE(ABORT, 'forced outbox failure'); END
    ''');
    final tx = draft();
    await expectLater(controller.addTransaction(tx), throwsA(isA<sql.DatabaseException>()));
    expect(await controller.database.transactions(), isEmpty);
    expect((await controller.database.accounts()).singleWhere((account) => account.id == 'cash').amount, 80);
    expect(await controller.database.pendingSyncOperations(), isEmpty);
    await database.execute('DROP TRIGGER fail_save_outbox');
    await controller.addTransaction(tx);
    expect(controller.transactions, hasLength(1));
    expect(controller.accountOf('cash')!.amount, 15);
  });

  test('manual subscription entry keeps the app connection usable offline', () async {
    final now = DateTime.now();
    final subscription = RecurringSubscription(
      id: 'manual-subscription', name: 'Mobile plan', amount: 10,
      categoryId: controller.defaultExpenseCategoryId!, accountId: 'cash',
      nextDueOn: now, frequency: SubscriptionFrequency.monthly,
      createdOn: now, updatedOn: now,
    );
    await database.insert('subscriptions', subscription.toMap());
    await controller.recordSubscriptionNow(subscription).timeout(const Duration(seconds: 3));
    expect(database.isOpen, isTrue);
    expect(controller.accountOf('cash')!.amount, 70);
    await controller.addTransaction(draft()).timeout(const Duration(seconds: 3));
    expect(controller.transactions, hasLength(2));
    expect(controller.accountOf('cash')!.amount, 5);
  });

  Finder field(String label) => find.byWidgetPredicate(
      (widget) => widget is TextField && widget.decoration?.labelText == label);

  Future<void> openEditor(WidgetTester tester) async {
    await tester.binding.setSurfaceSize(const Size(1000, 1000));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(ChangeNotifierProvider<AppController>.value(
      value: controller,
      child: MaterialApp(home: Scaffold(body: Builder(builder: (context) => TextButton(
        onPressed: () => showTransactionEditor(context), child: const Text('Open editor'),
      )))),
    ));
    await tester.tap(find.text('Open editor'));
    await tester.pumpAndSettle();
    await tester.enterText(field('Title'), 'Dinner');
    await tester.enterText(field('Amount'), '65');
  }

  testWidgets('two callbacks before rebuild submit once and close after local commit', (tester) async {
    await openEditor(tester);
    final save = tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Save')).onPressed!;
    await tester.runAsync(() async {
      // Create and complete the gate in runAsync's real zone. A gate created
      // in the widget test's fake zone needs a pump to deliver completion.
      controller.saveGate = Completer<void>();
      final first = Function.apply(save, const []) as Future<void>;
      try {
        await (Function.apply(save, const []) as Future<void>)
            .timeout(const Duration(seconds: 10));
        expect(controller.attemptedIds, hasLength(1));
      } finally {
        controller.saveGate!.complete();
        await first.timeout(const Duration(seconds: 10));
      }
    });
    expect(tester.takeException(), isNull);
    await tester.pumpAndSettle();
    expect(find.byType(TransactionEditor), findsNothing);
    expect(controller.transactions, hasLength(1));
    expect(controller.accountOf('cash')!.amount, 15);
    expect(tester.takeException(), isNull);
  });

  testWidgets('retry after a committed save keeps the draft ID and balance', (tester) async {
    await openEditor(tester);
    controller.failAfterCommit = true;
    final firstSave = tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Save')).onPressed!;
    await tester.runAsync(() async {
      await (Function.apply(firstSave, const []) as Future<void>)
          .timeout(const Duration(seconds: 10));
    });
    expect(tester.takeException(), isNull);
    await tester.pumpAndSettle();
    expect(find.byType(TransactionEditor), findsOneWidget);
    expect(controller.transactions, hasLength(1));
    controller.failAfterCommit = false;
    final retry = tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Save')).onPressed!;
    await tester.runAsync(() async {
      await (Function.apply(retry, const []) as Future<void>)
          .timeout(const Duration(seconds: 10));
    });
    expect(tester.takeException(), isNull);
    await tester.pumpAndSettle();
    expect(controller.attemptedIds, hasLength(2));
    expect(controller.attemptedIds.toSet(), hasLength(1));
    expect(find.byType(TransactionEditor), findsNothing);
    expect(controller.transactions, hasLength(1));
    expect(controller.accountOf('cash')!.amount, 15);
    expect(tester.takeException(), isNull);
  });
}
