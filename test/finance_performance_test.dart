import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:yutaka/main.dart';
import 'package:yutaka/models.dart';

class _CountingController extends AppController {
  int listQueries = 0;
  int summaryQueries = 0;
  int moneyFormats = 0;

  void publish() => notifyListeners();

  @override
  String format(double amount) {
    moneyFormats++;
    return super.format(amount);
  }

  @override
  List<MoneyTransaction> filteredTransactions({String? categoryId, String? accountId,
      List<MoneyTransactionType>? types, bool ignoreDate = false}) {
    summaryQueries++;
    return super.filteredTransactions(categoryId: categoryId, accountId: accountId,
      types: types, ignoreDate: ignoreDate);
  }

  @override
  List<MoneyTransaction> transactionListTransactions({String? categoryId,
      bool ignoreDate = false, bool respectLoanVisibility = true}) {
    listQueries++;
    return super.transactionListTransactions(categoryId: categoryId,
      ignoreDate: ignoreDate, respectLoanVisibility: respectLoanVisibility);
  }
}

MoneyTransaction _transaction(String id, String title, int day, double amount) => MoneyTransaction(
  id: id, type: MoneyTransactionType.expense, amount: amount, title: title,
  notes: '', categoryId: 'food', fromAccountId: 'cash',
  createdOn: DateTime(2026, 10, day), updatedOn: DateTime(2026, 10, day),
);

void main() {
  test('empty search skips formatting and populated search still matches all terms', () {
    final state = _CountingController();
    addTearDown(state.dispose);
    final tx = _transaction('lunch', 'Lunch', 1, 12.5);
    expect(transactionMatchesSearch(state, tx, '   '), isTrue);
    expect(state.moneyFormats, 0);
    expect(transactionMatchesSearch(state, tx, 'lunch 12.50'), isTrue);
    expect(transactionMatchesSearch(state, tx, 'lunch dinner'), isFalse);
  });

  test('single-pass list sorting preserves all orders and the source history', () {
    final state = AppController()..transactions = [
      _transaction('a', 'Zulu', 1, 30),
      _transaction('b', 'Alpha', 3, 20),
      _transaction('c', 'Middle', 2, 10),
    ];
    addTearDown(state.dispose);
    final expected = {
      TransactionSortMode.dateNewest: ['b', 'c', 'a'],
      TransactionSortMode.dateOldest: ['a', 'c', 'b'],
      TransactionSortMode.categoryAsc: ['b', 'c', 'a'],
      TransactionSortMode.categoryDesc: ['b', 'c', 'a'],
      TransactionSortMode.amountHigh: ['a', 'b', 'c'],
      TransactionSortMode.amountLow: ['c', 'b', 'a'],
      TransactionSortMode.titleAsc: ['b', 'c', 'a'],
      TransactionSortMode.titleDesc: ['a', 'c', 'b'],
    };
    for (final mode in TransactionSortMode.values) {
      state.transactionSortMode = mode;
      expect(state.transactionListTransactions().map((tx) => tx.id), expected[mode]);
    }
    expect(state.transactions.map((tx) => tx.id), ['a', 'b', 'c']);
    state.filterAccountIds = ['other'];
    expect(state.transactionListTransactions(), isEmpty);
  });

  testWidgets('typing searches cached rows and progress does not rebuild finance pages', (tester) async {
    final state = _CountingController()..loading = false
      ..transactions = [_transaction('lunch', 'Lunch', 1, 12.5)];
    addTearDown(state.dispose);
    Widget host(Widget page) => ChangeNotifierProvider<AppController>.value(
      value: state,
      child: MaterialApp(home: MediaQuery(
        data: const MediaQueryData(disableAnimations: true), child: page)),
    );
    await tester.pumpWidget(host(const TransactionListScreen()));
    await tester.pumpAndSettle();
    final queries = state.listQueries;
    await tester.enterText(find.byKey(const ValueKey('transaction-search')), 'Lunch');
    await tester.pump();
    expect(state.listQueries, queries);
    expect(find.text('Lunch'), findsWidgets);
    state.syncStatus = 'Checking cloud changes';
    state.publish();
    await tester.pump();
    expect(state.listQueries, queries);
    state.transactions = [_transaction('dinner', 'Dinner', 2, 20)];
    state.publish();
    await tester.pump();
    expect(state.listQueries, queries + 1);
    expect(find.text('No search matches'), findsOneWidget);
    await tester.pumpWidget(host(const HomeDashboardScreen()));
    await tester.pumpAndSettle();
    final summaries = state.summaryQueries;
    state.syncStatus = 'Synced';
    state.publish();
    await tester.pump();
    expect(state.summaryQueries, summaries);
    state.currencySymbol = r'$';
    state.publish();
    await tester.pump();
    expect(state.summaryQueries, greaterThan(summaries));
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });
}
