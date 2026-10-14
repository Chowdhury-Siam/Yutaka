part of 'main.dart';

class TransactionShortcut {
  const TransactionShortcut({required this.id, required this.name, required this.draft});
  final String id;
  final String name;
  final MoneyTransaction draft;

  Map<String, Object?> toMap() => {'id': id, 'name': name, 'draft': draft.toMap()};

  static List<TransactionShortcut> decode(String value) {
    try {
      final rows = jsonDecode(value);
      if (rows is! List) { return []; }
      return rows.whereType<Map>().where((row) => row['draft'] is Map && row['id'] is String && row['name'] is String)
          .map((row) => TransactionShortcut(id: row['id'] as String, name: row['name'] as String,
              draft: MoneyTransaction.fromMap(Map<String, Object?>.from(row['draft'] as Map))))
          .where((shortcut) => !shortcut.draft.isLoanTransaction).toList();
    } on FormatException {
      return [];
    } on TypeError {
      return [];
    }
  }
}

String transactionCategorySummary(AppController state, MoneyTransaction tx) => tx.categorySplits.isEmpty
    ? state.categoryOf(tx.categoryId)?.name ?? 'Uncategorized'
    : tx.categoryAmounts.entries.map((entry) => '${state.categoryOf(entry.key)?.name ?? 'Uncategorized'}: ${_analyticsReportMoney(state, entry.value)}').join(' + ');

bool transactionMatchesSearch(AppController state, MoneyTransaction tx, String query) {
  final terms = query.trim().toLowerCase().split(RegExp(r'\s+')).where((term) => term.isNotEmpty);
  final loan = tx.linkedEntityType == 'loans' ? state.loanOf(tx.linkedEntityId ?? '')
      : state.loanOf(state.loanPayments.where((payment) => payment.id == tx.linkedEntityId).firstOrNull?.loanId ?? '');
  final text = [tx.title, tx.notes, tx.displayType, tx.amount.toString(), tx.baseAmount.toString(),
    tx.amount.toStringAsFixed(2), tx.baseAmount.toStringAsFixed(2), state.format(tx.amount), state.accountOf(tx.fromAccountId)?.name ?? '',
    state.accountOf(tx.toAccountId ?? '')?.name ?? '',
    ...tx.categoryAmounts.keys.map((id) => state.categoryOf(id)?.name ?? ''),
    state.loanContactOf(loan?.contactId ?? '')?.name ?? '',
    DateFormat('yyyy-MM-dd MMM d yyyy').format(tx.createdOn),
  ].join(' ').toLowerCase();
  return terms.every(text.contains);
}

extension TransactionToolsController on AppController {
  Future<void> saveTransactionShortcut(TransactionShortcut shortcut) async {
    if (shortcut.name.trim().isEmpty || shortcut.name.length > 60 || shortcut.draft.isLoanTransaction ||
        !shortcut.draft.amount.isFinite || shortcut.draft.amount < 0 || !shortcut.draft.serviceChargeValue.isFinite) {
      throw StateError('Enter a shortcut name for an income, expense, or transfer.');
    }
    if (shortcut.draft.categorySplits.isNotEmpty) { shortcut.draft.validateAmounts(); }
    final next = [...transactionShortcuts.where((item) => item.id != shortcut.id), shortcut];
    await prefs.setString('transactionShortcuts', jsonEncode(next.map((item) => item.toMap()).toList()));
    transactionShortcuts = next;
    // The controller owns listener notification and preference synchronization.
    _notifyLoanPreferenceListeners();
    await queuePreferenceSync();
  }

  Future<void> removeTransactionShortcut(String id) async {
    final next = transactionShortcuts.where((item) => item.id != id).toList();
    await prefs.setString('transactionShortcuts', jsonEncode(next.map((item) => item.toMap()).toList()));
    transactionShortcuts = next;
    _notifyLoanPreferenceListeners();
    await queuePreferenceSync();
  }

  Future<void> moveTransactionToTrash(String id) async {
    await database.moveTransactionToTrash(id);
    await reload(queueSync: true);
  }

  Future<void> restoreDeletedTransaction(String id) async {
    await database.restoreDeletedTransaction(id);
    await reload(queueSync: true);
  }
}

extension TransactionTrashRepository on YutakaDatabase {
  Future<void> moveTransactionToTrash(String id) async {
    final database = await db;
    await database.transaction((txn) async {
      final rows = await txn.query('transactions', where: 'id = ?', whereArgs: [id]);
      if (rows.isEmpty) { return; }
      await txn.delete('transaction_trash', where: 'deleted_on < ?',
          whereArgs: [dateToDb(DateTime.now().subtract(const Duration(days: 30)))]);
      final tx = MoneyTransaction.fromMap(rows.single);
      final payload = <String, Object?>{'transaction': tx.toMap()};
      if (tx.linkedEntityType == 'loan_payments') {
        final payments = await txn.query('loan_payments', where: 'id = ?', whereArgs: [tx.linkedEntityId]);
        if (payments.isNotEmpty) {
          final payment = LoanPayment.fromMap(payments.single);
          payload['payment'] = payment.toMap();
          await txn.delete('loan_payments', where: 'id = ?', whereArgs: [payment.id]);
          await _enqueueSyncOperation(txn, entityType: 'loan_payments', entityId: payment.id, operation: 'delete', payload: null);
          await _refreshTrashedLoanStatus(txn, payment.loanId);
        }
      } else if (tx.linkedEntityType == 'loans') {
        final loans = await txn.query('loans', where: 'id = ?', whereArgs: [tx.linkedEntityId]);
        if (loans.isNotEmpty) {
          final loan = Loan.fromMap(loans.single);
          if (loan.disbursalTransactionId == id) {
            final detached = loan.copyWith(clearDisbursalTransactionId: true, updatedOn: DateTime.now());
            await txn.update('loans', detached.toMap(), where: 'id = ?', whereArgs: [loan.id]);
            await _enqueueSyncOperation(txn, entityType: 'loans', entityId: loan.id, operation: 'upsert', payload: detached.toMap());
          }
        }
      }
      await txn.insert('transaction_trash', {'id': id, 'payload_json': jsonEncode(payload),
        'deleted_on': dateToDb(DateTime.now())}, conflictAlgorithm: sql.ConflictAlgorithm.replace);
      await _applyTransaction(txn, tx, -1);
      await txn.delete('transactions', where: 'id = ?', whereArgs: [id]);
      await _enqueueSyncOperation(txn, entityType: 'transactions', entityId: id, operation: 'delete', payload: null);
      await _enqueueTrashAccounts(txn, tx);
    });
  }

  Future<void> _enqueueTrashAccounts(sql.Transaction txn, MoneyTransaction tx) async {
    for (final id in {tx.fromAccountId, tx.toAccountId}.whereType<String>()) {
      final rows = await txn.query('accounts', where: 'id = ?', whereArgs: [id]);
      if (rows.isNotEmpty) {
        await _enqueueSyncOperation(txn, entityType: 'accounts', entityId: id, operation: 'upsert', payload: rows.single);
      }
    }
  }

  Future<void> _refreshTrashedLoanStatus(sql.Transaction txn, String id) async {
    final rows = await txn.query('loans', where: 'id = ?', whereArgs: [id]);
    if (rows.isEmpty) { return; }
    final loan = Loan.fromMap(rows.single);
    if (loan.status == LoanStatus.writtenOff) { return; }
    final payments = (await txn.query('loan_payments', where: 'loan_id = ?', whereArgs: [id])).map(LoanPayment.fromMap);
    final status = computeLoan(loan, payments).settled ? LoanStatus.closed : LoanStatus.active;
    final updated = loan.copyWith(status: status, closedOn: status == LoanStatus.closed ? DateTime.now() : null,
        clearClosedOn: status == LoanStatus.active, updatedOn: DateTime.now());
    await txn.update('loans', updated.toMap(), where: 'id = ?', whereArgs: [id]);
    await _enqueueSyncOperation(txn, entityType: 'loans', entityId: id, operation: 'upsert', payload: updated.toMap());
  }

  Future<List<Map<String, Object?>>> deletedTransactions() async {
    final database = await db;
    await database.delete('transaction_trash', where: 'deleted_on < ?',
        whereArgs: [dateToDb(DateTime.now().subtract(const Duration(days: 30)))]);
    return database.query('transaction_trash', orderBy: 'deleted_on DESC');
  }

  Future<void> restoreDeletedTransaction(String id) async {
    final database = await db;
    await database.transaction((txn) async {
      final rows = await txn.query('transaction_trash', where: 'id = ?', whereArgs: [id]);
      if (rows.isEmpty) { return; }
      final payload = jsonDecode(rows.single['payload_json'] as String) as Map;
      final restored = MoneyTransaction.fromMap(Map<String, Object?>.from(payload['transaction'] as Map))
          .copyWith(updatedOn: DateTime.now());
      final existing = await txn.query('transactions', columns: ['id'], where: 'id = ?', whereArgs: [id]);
      if (existing.isNotEmpty) {
        // A retry or another device already restored it. Never move money twice.
        await txn.delete('transaction_trash', where: 'id = ?', whereArgs: [id]);
        return;
      }
      restored.validateAmounts();
      for (final account in {restored.fromAccountId, restored.toAccountId}.whereType<String>()) {
        if ((await txn.query('accounts', columns: ['id'], where: 'id = ?', whereArgs: [account])).isEmpty) {
          throw StateError('Restore the missing account before restoring this transaction.');
        }
      }
      if (!restored.isLoanTransaction && restored.type != MoneyTransactionType.transfer) {
        for (final category in restored.categoryAmounts.keys) {
          if ((await txn.query('categories', columns: ['id'], where: 'id = ?', whereArgs: [category])).isEmpty) {
            throw StateError('The category was deleted. This transaction cannot be restored safely.');
          }
        }
      }
      if (restored.isLoanTransaction) {
        final paymentMap = payload['payment'];
        final payment = paymentMap is Map ? LoanPayment.fromMap(Map<String, Object?>.from(paymentMap)) : null;
        final loanId = payment?.loanId ?? restored.linkedEntityId;
        final loans = await txn.query('loans', where: 'id = ?', whereArgs: [loanId]);
        if (loans.isEmpty) { throw StateError('The linked loan no longer exists.'); }
        if (payment != null) {
          if ((await txn.query('loan_payments', where: 'id = ?', whereArgs: [payment.id])).isNotEmpty) {
            throw StateError('The linked payment already exists. Refresh before restoring.');
          }
          final updated = payment.copyWith(updatedOn: DateTime.now());
          await txn.insert('loan_payments', updated.toMap());
          await _enqueueSyncOperation(txn, entityType: 'loan_payments', entityId: updated.id, operation: 'upsert', payload: updated.toMap());
          await _refreshTrashedLoanStatus(txn, updated.loanId);
        } else if (restored.linkedEntityType == 'loans') {
          final loan = Loan.fromMap(loans.single);
          if (loan.disbursalTransactionId != null && loan.disbursalTransactionId != id) {
            throw StateError('This loan already has another money movement.');
          }
          final updated = loan.copyWith(disbursalTransactionId: id, updatedOn: DateTime.now());
          await txn.update('loans', updated.toMap(), where: 'id = ?', whereArgs: [loan.id]);
          await _enqueueSyncOperation(txn, entityType: 'loans', entityId: loan.id, operation: 'upsert', payload: updated.toMap());
        } else {
          throw StateError('The linked loan payment is missing.');
        }
      }
      await txn.insert('transactions', restored.toMap());
      await _applyTransaction(txn, restored, 1);
      await _enqueueSyncOperation(txn, entityType: 'transactions', entityId: id, operation: 'upsert', payload: restored.toMap());
      await _enqueueTrashAccounts(txn, restored);
      await txn.delete('transaction_trash', where: 'id = ?', whereArgs: [id]);
    });
  }
}

Future<void> saveShortcutDialog(BuildContext context, MoneyTransaction draft, {TransactionShortcut? existing}) async {
  final name = TextEditingController(text: existing?.name ?? draft.title);
  try {
    final selected = await showYutakaPopup<String>(context, maxWidth: 420, maxHeight: 280,
      child: Padding(padding: const EdgeInsets.all(20), child: Column(mainAxisSize: MainAxisSize.min, children: [
        Text(existing == null ? 'Save shortcut' : 'Rename shortcut', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 16),
        TextField(controller: name, autofocus: true, maxLength: 60, decoration: const InputDecoration(labelText: 'Shortcut name')),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel'))),
          Expanded(child: FilledButton(onPressed: () {
            if (name.text.trim().isNotEmpty) { Navigator.pop(context, name.text.trim()); }
          }, child: const Text('Save'))),
        ]),
      ])));
    if (!context.mounted || selected == null) { return; }
    await context.read<AppController>().saveTransactionShortcut(TransactionShortcut(
        id: existing?.id ?? _uuid.v4(), name: selected, draft: draft));
    if (context.mounted) { showSnack(context, 'Shortcut saved.'); }
  } catch (error) {
    if (context.mounted) { showSnack(context, error.toString().replaceFirst('Bad state: ', '')); }
  } finally {
    name.dispose();
  }
}

class TransactionShortcutsScreen extends StatelessWidget {
  const TransactionShortcutsScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppController>();
    return PageScaffold(title: 'Saved shortcuts', child: ResponsiveListContent(
      header: const [Padding(padding: EdgeInsets.only(bottom: 16), child: Text('Save a shortcut from the transaction editor. Every use opens a new draft for review.'))],
      itemCount: state.transactionShortcuts.length,
      empty: const EmptyCard(icon: Icons.bolt_rounded, title: 'No shortcuts yet', body: 'Open Add transaction, choose an account and category, then tap Save shortcut.'),
      itemBuilder: (context, index) {
        final shortcut = state.transactionShortcuts[index];
        return Padding(padding: const EdgeInsets.only(bottom: 10), child: ExpressiveCard(
          child: ListTile(leading: const Icon(Icons.bolt_rounded, color: kSleekAccent), title: Text(shortcut.name),
            subtitle: Text('${shortcut.draft.displayType} • ${state.accountOf(shortcut.draft.fromAccountId)?.name ?? 'Choose account'}'),
            onTap: () => showTransactionEditor(context, shortcut: shortcut),
            trailing: PopupMenuButton<String>(onSelected: (value) async {
              if (value == 'rename') { await saveShortcutDialog(context, shortcut.draft, existing: shortcut); }
              if (value == 'delete') { await state.removeTransactionShortcut(shortcut.id); }
            }, itemBuilder: (_) => const [PopupMenuItem(value: 'rename', child: Text('Rename')),
              PopupMenuItem(value: 'delete', child: Text('Delete shortcut'))]),
          ),
        ));
      },
    ));
  }
}

class RecentlyDeletedTransactionsScreen extends StatefulWidget {
  const RecentlyDeletedTransactionsScreen({super.key});
  @override
  State<RecentlyDeletedTransactionsScreen> createState() => _RecentlyDeletedTransactionsScreenState();
}

class _RecentlyDeletedTransactionsScreenState extends State<RecentlyDeletedTransactionsScreen> {
  late Future<List<Map<String, Object?>>> rows;
  bool busy = false;
  @override
  void initState() {
    super.initState();
    rows = context.read<AppController>().database.deletedTransactions();
  }
  Future<void> _restore(String id) async {
    if (busy) { return; }
    setState(() => busy = true);
    try {
      await context.read<AppController>().restoreDeletedTransaction(id);
      if (mounted) {
        showSnack(context, 'Transaction restored.');
        setState(() => rows = context.read<AppController>().database.deletedTransactions());
      }
    } catch (error) {
      if (mounted) { showSnack(context, error.toString().replaceFirst('Bad state: ', '')); }
    } finally {
      if (mounted) { setState(() => busy = false); }
    }
  }
  @override
  Widget build(BuildContext context) => PageScaffold(title: 'Recently deleted', child: FutureBuilder<List<Map<String, Object?>>>(
    future: rows, builder: (context, snapshot) {
      if (snapshot.hasError) { return const Center(child: Text('Could not load deleted transactions.')); }
      if (!snapshot.hasData) { return const Center(child: CircularProgressIndicator()); }
      final items = snapshot.data!;
      final state = context.watch<AppController>();
      return ResponsiveListContent(
        header: const [Padding(padding: EdgeInsets.only(bottom: 16), child: Text('Deleted transactions stay on this device for 30 days. Restore brings back the transaction and its balance effect. Switching accounts clears this list.'))],
        itemCount: items.length,
        empty: const EmptyCard(icon: Icons.delete_outline_rounded, title: 'Nothing to restore', body: 'Transactions deleted on this device will appear here.'),
        itemBuilder: (context, index) {
          final row = items[index];
          final payload = jsonDecode(row['payload_json'] as String) as Map;
          final tx = MoneyTransaction.fromMap(Map<String, Object?>.from(payload['transaction'] as Map));
          return Padding(padding: const EdgeInsets.only(bottom: 10), child: ExpressiveCard(child: ListTile(
            title: Text(tx.title.isEmpty ? tx.displayType : tx.title),
            subtitle: Text('${state.format(tx.amount)} • deleted ${DateFormat('MMM d').format(dateFromDb(row['deleted_on']))}'),
            trailing: TextButton(onPressed: busy ? null : () => _restore(tx.id), child: const Text('Restore')),
          )));
        },
      );
    },
  ));
}

Future<Map<String, double>?> showTransactionSplits(BuildContext context, {required MoneyTransactionType type,
    required double total, required Map<String, double> initial}) => showYutakaPopup<Map<String, double>>(
  context, maxWidth: 500, maxHeight: 650,
  child: _TransactionSplitsPopup(type: type, total: total, initial: initial),
);

class _TransactionSplitsPopup extends StatefulWidget {
  const _TransactionSplitsPopup({required this.type, required this.total, required this.initial});
  final MoneyTransactionType type;
  final double total;
  final Map<String, double> initial;
  @override
  State<_TransactionSplitsPopup> createState() => _TransactionSplitsPopupState();
}

class _TransactionSplitsPopupState extends State<_TransactionSplitsPopup> {
  final amounts = <String, TextEditingController>{};
  String? error;
  @override
  void initState() {
    super.initState();
    for (final entry in widget.initial.entries) {
      amounts[entry.key] = TextEditingController(text: entry.value.toStringAsFixed(2));
    }
  }
  @override
  void dispose() {
    for (final controller in amounts.values) { controller.dispose(); }
    super.dispose();
  }
  @override
  Widget build(BuildContext context) {
    final state = context.read<AppController>();
    final categories = state.categories.where((category) => category.type ==
        (widget.type == MoneyTransactionType.income ? CategoryType.income : CategoryType.expense)).toList();
    final sum = amounts.values.fold<double>(0, (sum, controller) => sum + (double.tryParse(controller.text) ?? 0));
    return Padding(padding: const EdgeInsets.all(20), child: Column(mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text('Split categories', style: Theme.of(context).textTheme.titleLarge),
      const SizedBox(height: 8),
      Text('Allocate ${state.format(widget.total)} before any service charge. Fees are shared proportionally across categories.'),
      const SizedBox(height: 12),
      Flexible(child: SingleChildScrollView(child: Column(children: categories.map((category) {
        final controller = amounts.putIfAbsent(category.id, TextEditingController.new);
        return Padding(padding: const EdgeInsets.only(bottom: 10), child: TextField(
          controller: controller, keyboardType: const TextInputType.numberWithOptions(decimal: true),
          onChanged: (_) => setState(() => error = null), decoration: InputDecoration(labelText: category.name,
              hintText: 'Leave blank to skip', prefixIcon: Icon(iconFor(category.iconName))),
        ));
      }).toList()))),
      const SizedBox(height: 8),
      Text('Remaining: ${state.format(widget.total - sum)}', style: TextStyle(color: (widget.total - sum).abs() <= .005 ? kSleekAccent : kSleekExpense)),
      if (error != null) Text(error!, style: const TextStyle(color: kSleekExpense)),
      Row(children: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        TextButton(onPressed: () => Navigator.pop(context, <String, double>{}), child: const Text('Clear')),
        const Spacer(),
        FilledButton(onPressed: () {
          final splits = <String, double>{};
          for (final category in categories) {
            final text = amounts[category.id]?.text.trim() ?? '';
            if (text.isEmpty) { continue; }
            final amount = double.tryParse(text);
            if (amount == null || !amount.isFinite || amount <= 0) {
              setState(() => error = 'Enter positive amounts or leave a category blank.');
              return;
            }
            splits[category.id] = amount;
          }
          if (splits.length < 2 || splits.length > 20 || (splits.values.fold<double>(0, (sum, value) => sum + value) - widget.total).abs() > .005) {
            setState(() => error = 'Use 2–20 categories whose amounts equal the total.');
            return;
          }
          Navigator.pop(context, splits);
        }, child: const Text('Done')),
      ]),
    ]));
  }
}
