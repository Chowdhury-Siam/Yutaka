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

String transactionAccountSummary(AppController state, MoneyTransaction tx) => tx.accountSplits.isEmpty
    ? state.accountOf(tx.fromAccountId)?.name ?? 'Unknown account'
    : tx.accountAmounts.entries.map((entry) => '${state.accountOf(entry.key)?.name ?? 'Unknown account'}: ${_analyticsReportMoney(state, entry.value)}').join(' + ');

bool transactionMatchesSearch(AppController state, MoneyTransaction tx, String query) {
  if (query.trim().isEmpty) { return true; }
  final terms = query.trim().toLowerCase().split(RegExp(r'\s+')).where((term) => term.isNotEmpty);
  final loan = tx.linkedEntityType == 'loans' ? state.loanOf(tx.linkedEntityId ?? '')
      : tx.linkedEntityType == 'loan_payments'
          ? state.loanOf(state.loanPayments.where((payment) => payment.id == tx.linkedEntityId).firstOrNull?.loanId ?? '')
          : null;
  final text = [tx.title, tx.notes, tx.displayType, tx.amount.toString(), tx.baseAmount.toString(),
    tx.amount.toStringAsFixed(2), tx.baseAmount.toStringAsFixed(2), state.format(tx.amount), ...tx.accountAmounts.keys.map((id) => state.accountOf(id)?.name ?? ''),
    state.accountOf(tx.toAccountId ?? '')?.name ?? '',
    ...tx.categoryAmounts.keys.map((id) => state.categoryOf(id)?.name ?? ''),
    state.loanContactOf(loan?.contactId ?? '')?.name ?? '',
    DateFormat('yyyy-MM-dd MMM d yyyy').format(tx.createdOn),
  ].join(' ').toLowerCase();
  return terms.every(text.contains);
}

extension TransactionToolsController on AppController {
  Future<void> permanentlyDeleteTrashedTransaction(String id) async {
    await database.permanentlyDeleteTrashedTransaction(id);
    queueCloudSync(immediate: true);
  }

  Future<void> saveTransactionShortcut(TransactionShortcut shortcut) async {
    if (shortcut.name.trim().isEmpty || shortcut.name.length > 60 || shortcut.draft.isLoanTransaction ||
        !shortcut.draft.amount.isFinite || shortcut.draft.amount < 0 || !shortcut.draft.serviceChargeValue.isFinite) {
      throw StateError('Enter a shortcut name for an income, expense, or transfer.');
    }
    if (shortcut.draft.categorySplits.isNotEmpty || shortcut.draft.accountSplits.isNotEmpty) { shortcut.draft.validateAmounts(); }
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
  Future<void> expireTransactionTrash() async {
    final database = await db;
    await database.transaction(_expireTransactionTrash);
  }

  Future<void> _expireTransactionTrash(sql.DatabaseExecutor txn) async {
    final expired = await txn.query('transaction_trash', columns: ['id'],
      where: 'deleted_on <= ?', whereArgs: [dateToDb(DateTime.now().subtract(const Duration(days: 30)))]);
    for (final row in expired) {
      await txn.delete('transaction_trash', where: 'id = ?', whereArgs: [row['id']]);
      await _enqueueSyncOperation(txn, entityType: 'transaction_trash', entityId: row['id'] as String,
        operation: 'delete', payload: null);
    }
  }

  Future<void> enqueueLegacyTransactionTrashForCloudSync(String accountScope) async {
    if (accountScope.isEmpty) { return; }
    final database = await db;
    final marker = 'transactionTrashSyncBackfillV1:$accountScope';
    await database.transaction((txn) async {
      if ((await txn.query('sync_state', columns: ['value'], where: 'key = ?', whereArgs: [marker])).isNotEmpty) { return; }
      final rows = await txn.rawQuery('''
        SELECT t.* FROM transaction_trash t
        WHERE NOT EXISTS (SELECT 1 FROM sync_outbox o WHERE o.entity_type = 'transaction_trash' AND o.entity_id = t.id)
          AND NOT EXISTS (SELECT 1 FROM sync_entity_versions v WHERE v.entity_type = 'transaction_trash' AND v.entity_id = t.id)
      ''');
      for (final row in rows) {
        await _enqueueSyncOperation(txn, entityType: 'transaction_trash', entityId: row['id'] as String,
          operation: 'upsert', payload: row);
      }
      await txn.insert('sync_state', {'key': marker, 'value': '1'}, conflictAlgorithm: sql.ConflictAlgorithm.replace);
    });
  }

  Future<void> moveTransactionToTrash(String id) async {
    final database = await db;
    await database.transaction((txn) async {
      final rows = await txn.query('transactions', where: 'id = ?', whereArgs: [id]);
      if (rows.isEmpty) { return; }
      await _expireTransactionTrash(txn);
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
      final recovery = <String, Object?>{'id': id, 'payload_json': jsonEncode(payload), 'deleted_on': dateToDb(DateTime.now())};
      await txn.insert('transaction_trash', recovery, conflictAlgorithm: sql.ConflictAlgorithm.replace);
      await _applyTransaction(txn, tx, -1);
      await txn.delete('transactions', where: 'id = ?', whereArgs: [id]);
      await _enqueueSyncOperation(txn, entityType: 'transactions', entityId: id, operation: 'delete', payload: null);
      await _enqueueTrashAccounts(txn, tx);
      await _enqueueSyncOperation(txn, entityType: 'transaction_trash', entityId: id, operation: 'upsert', payload: recovery);
    });
  }

  Future<void> _enqueueTrashAccounts(sql.Transaction txn, MoneyTransaction tx) async {
    for (final id in tx.accountIds) {
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
    await expireTransactionTrash();
    return database.query('transaction_trash', orderBy: 'deleted_on DESC');
  }

  Future<void> permanentlyDeleteTrashedTransaction(String id) async {
    final database = await db;
    // Sync the recovery-copy deletion without touching live rows or balances.
    await database.transaction((txn) async {
      await txn.delete('transaction_trash', where: 'id = ?', whereArgs: [id]);
      await _enqueueSyncOperation(txn, entityType: 'transaction_trash', entityId: id, operation: 'delete', payload: null);
    });
  }

  Future<void> restoreDeletedTransaction(String id) async {
    final database = await db;
    await database.transaction((txn) async {
      await _expireTransactionTrash(txn);
      final rows = await txn.query('transaction_trash', where: 'id = ?', whereArgs: [id]);
      if (rows.isEmpty) { return; }
      final payload = jsonDecode(rows.single['payload_json'] as String) as Map;
      final restored = MoneyTransaction.fromMap(Map<String, Object?>.from(payload['transaction'] as Map))
          .copyWith(updatedOn: DateTime.now());
      final existing = await txn.query('transactions', columns: ['id'], where: 'id = ?', whereArgs: [id]);
      if (existing.isNotEmpty) {
        // A retry or another device already restored it. Never move money twice.
        await txn.delete('transaction_trash', where: 'id = ?', whereArgs: [id]);
        await _enqueueSyncOperation(txn, entityType: 'transaction_trash', entityId: id, operation: 'delete', payload: null);
        return;
      }
      restored.validateAmounts();
      for (final account in restored.accountIds) {
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
      await _enqueueSyncOperation(txn, entityType: 'transaction_trash', entityId: id, operation: 'delete', payload: null);
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
        TextField(controller: name, autofocus: true, maxLength: 60,
          contextMenuBuilder: yutakaTextFieldContextMenu,
          enableInteractiveSelection: true,
          onTapOutside: (_) => FocusManager.instance.primaryFocus?.unfocus(),
          decoration: const InputDecoration(labelText: 'Shortcut name')),
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
    final scheme = Theme.of(context).colorScheme;
    return PageScaffold(title: 'Saved shortcuts', child: ResponsiveListContent(
      desktopMaxWidth: 900,
      header: [Padding(padding: const EdgeInsets.only(bottom: 16), child: Text(
        'Tap a shortcut to review a new transaction.',
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
      ))],
      itemCount: state.transactionShortcuts.length,
      empty: const EmptyCard(animated: true, icon: Icons.bolt_rounded, title: 'No shortcuts yet', body: 'Open Add transaction, choose an account and category, then tap Save shortcut.'),
      itemBuilder: (context, index) {
        final shortcut = state.transactionShortcuts[index];
        final type = switch (shortcut.draft.type) {
          MoneyTransactionType.income => 'Income',
          MoneyTransactionType.expense => 'Expense',
          MoneyTransactionType.transfer => 'Transfer',
        };
        final details = ListTile(
          contentPadding: EdgeInsets.zero, minVerticalPadding: 0, horizontalTitleGap: 12,
          leading: Container(width: 40, height: 40,
            decoration: BoxDecoration(color: kSleekAccent.withOpacity(.12), borderRadius: BorderRadius.circular(13)),
            child: const Icon(Icons.bolt_rounded, color: kSleekAccent, size: 22)),
          title: Text(shortcut.name, maxLines: 2, overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
          subtitle: Text('$type • ${transactionAccountSummary(state, shortcut.draft)}',
            maxLines: 2, overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
          onTap: () => showTransactionEditor(context, shortcut: shortcut),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        );
        final buttons = [
          OutlinedButton.icon(icon: const Icon(Icons.edit_rounded, size: 17), label: const Text('Rename'),
            style: OutlinedButton.styleFrom(minimumSize: const Size(0, 44),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
            onPressed: () => saveShortcutDialog(context, shortcut.draft, existing: shortcut)),
          OutlinedButton.icon(icon: const Icon(Icons.delete_outline_rounded, size: 17), label: const Text('Delete shortcut'),
            style: OutlinedButton.styleFrom(foregroundColor: kSleekExpense,
              side: BorderSide(color: kSleekExpense.withOpacity(.3)),
              backgroundColor: kSleekExpense.withOpacity(.06), minimumSize: const Size(0, 44),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
            onPressed: () => state.removeTransactionShortcut(shortcut.id)),
        ];
        return ExpressiveCard(padding: const EdgeInsets.all(14), radius: 20, surfaceTint: false,
          child: LayoutBuilder(builder: (context, constraints) {
            final inline = constraints.maxWidth >= 540 && MediaQuery.textScalerOf(context).scale(14) <= 18;
            if (inline) {
              return Row(children: [Expanded(child: details), const SizedBox(width: 12),
                buttons[0], const SizedBox(width: 8), buttons[1]]);
            }
            return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
              details,
              const SizedBox(height: 8),
              Wrap(spacing: 8, runSpacing: 8, children: buttons),
            ]);
          }),
        );
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
  List<MoneyTransaction>? transactionSnapshot;
  bool busy = false;
  @override
  void initState() {
    super.initState();
    rows = context.read<AppController>().database.deletedTransactions();
    transactionSnapshot = context.read<AppController>().transactions;
  }
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final state = context.watch<AppController>();
    if (!identical(transactionSnapshot, state.transactions)) {
      transactionSnapshot = state.transactions;
      rows = state.database.deletedTransactions();
    }
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
  Future<void> _deletePermanently(String id) async {
    if (busy) { return; }
    final state = context.read<AppController>();
    setState(() => busy = true);
    try {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          scrollable: true,
          title: const Text('Delete permanently?'),
          content: const Text('Remove this transaction from Recently deleted on your synced devices? You will no longer be able to restore it from this list. Account balances stay unchanged.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancel')),
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              style: FilledButton.styleFrom(backgroundColor: kSleekExpense),
              child: const Text('Delete permanently'),
            ),
          ],
        ),
      );
      if (confirmed != true || !mounted) { return; }
      await state.permanentlyDeleteTrashedTransaction(id);
      if (mounted) {
        setState(() => rows = state.database.deletedTransactions());
        showSnack(context, 'Transaction permanently deleted.');
      }
    } catch (_) {
      if (mounted) { showSnack(context, 'Could not permanently delete transaction. Try again.'); }
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
        header: const [Padding(padding: EdgeInsets.only(bottom: 16), child: Text('Deleted transactions stay available for 30 days and sync with your account. Restore brings back the transaction and its balance effect. Permanent deletion removes its recovery copy from synced devices.'))],
        itemCount: items.length,
        empty: const EmptyCard(animated: true, icon: Icons.delete_outline_rounded, title: 'Nothing to restore', body: 'Transactions deleted on this device will appear here.'),
        itemBuilder: (context, index) {
          final row = items[index];
          final payload = jsonDecode(row['payload_json'] as String) as Map;
          final tx = MoneyTransaction.fromMap(Map<String, Object?>.from(payload['transaction'] as Map));
          return Padding(padding: const EdgeInsets.only(bottom: 10), child: ExpressiveCard(
            child: LayoutBuilder(builder: (context, constraints) {
              final details = Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(tx.title.isEmpty ? tx.displayType : tx.title, style: Theme.of(context).textTheme.titleSmall),
                const SizedBox(height: 3),
                Text('${state.format(tx.amount)} • deleted ${DateFormat('MMM d').format(dateFromDb(row['deleted_on']))}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: kSleekMuted)),
              ]);
              final actions = Wrap(spacing: 8, runSpacing: 4, children: [
                TextButton(onPressed: busy ? null : () => _restore(tx.id), child: const Text('Restore')),
                Tooltip(message: 'Delete permanently', child: TextButton.icon(
                  key: ValueKey('trash-delete-${tx.id}'),
                  onPressed: busy ? null : () => _deletePermanently(tx.id),
                  style: TextButton.styleFrom(foregroundColor: kSleekExpense),
                  icon: const Icon(Icons.delete_forever_rounded, size: 20), label: const Text('Delete'),
                )),
              ]);
              if (constraints.maxWidth >= 480 && MediaQuery.textScalerOf(context).scale(14) <= 18) {
                return Row(children: [Expanded(child: details), const SizedBox(width: 12), actions]);
              }
              return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                details, const SizedBox(height: 8), actions,
              ]);
            }),
          ));
        },
      );
    },
  ));
}

Future<Map<String, double>?> showTransactionSplits(BuildContext context, {required MoneyTransactionType type,
    required double total, required Map<String, double> initial, bool splitAccounts = false}) => showYutakaPopup<Map<String, double>>(
  context, maxWidth: 500, maxHeight: 600,
  child: _TransactionSplitsPopup(type: type, total: total, initial: initial, splitAccounts: splitAccounts),
);

class _TransactionSplitsPopup extends StatefulWidget {
  const _TransactionSplitsPopup({required this.type, required this.total, required this.initial, required this.splitAccounts});
  final MoneyTransactionType type;
  final double total;
  final Map<String, double> initial;
  final bool splitAccounts;
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
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final options = widget.splitAccounts
        ? state.operatingAccounts.map((account) => (id: account.id, name: account.name, iconName: account.iconName, iconColor: account.iconColor)).toList()
        : state.categories.where((category) => category.type ==
            (widget.type == MoneyTransactionType.income ? CategoryType.income : CategoryType.expense))
            .map((category) => (id: category.id, name: category.name, iconName: category.iconName, iconColor: category.iconColor)).toList();
    final kind = widget.splitAccounts ? 'accounts' : 'categories';
    final sum = amounts.values.fold<double>(0, (sum, controller) {
      final value = double.tryParse(controller.text);
      return sum + (value != null && value.isFinite ? value : 0);
    });
    final remaining = widget.total - sum;
    final balanced = remaining.isFinite && remaining.abs() <= .005;
    final over = !remaining.isFinite || remaining < -.005;
    final statusColor = balanced ? kSleekAccent : over ? scheme.error : scheme.onSurfaceVariant;
    final status = !remaining.isFinite ? 'Check amounts'
        : balanced ? 'Fully allocated'
        : over ? 'Over by ${state.format(-remaining)}' : 'Remaining: ${state.format(remaining)}';
    final progress = widget.total > 0 && widget.total.isFinite && sum.isFinite
        ? (sum / widget.total).clamp(0.0, 1.0).toDouble() : 0.0;

    return CompactPopupContent(
      title: 'Split $kind',
      actions: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(liveRegion: true, child: Row(children: [
            Icon(balanced ? Icons.check_circle_rounded : over ? Icons.error_outline_rounded : Icons.pie_chart_outline_rounded,
              color: statusColor, size: 18),
            const SizedBox(width: 8),
            Expanded(child: Text(status, style: theme.textTheme.bodySmall?.copyWith(color: statusColor, fontWeight: FontWeight.w700))),
          ])),
          const SizedBox(height: 8),
          ClipRRect(borderRadius: BorderRadius.circular(4), child: LinearProgressIndicator(
            value: progress, minHeight: 4, color: over ? scheme.error : kSleekAccent,
            backgroundColor: scheme.outlineVariant.withOpacity(.25),
            semanticsLabel: 'Allocated amount',
          )),
          if (error != null) ...[
            const SizedBox(height: 8),
            Semantics(liveRegion: true, child: Text(error!, style: theme.textTheme.bodySmall?.copyWith(color: scheme.error))),
          ],
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 8, alignment: WrapAlignment.end, children: [
            OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            TextButton(onPressed: () => Navigator.pop(context, <String, double>{}), child: const Text('Clear')),
            FilledButton(onPressed: () {
              final splits = <String, double>{};
              for (final category in options) {
                final text = amounts[category.id]?.text.trim() ?? '';
                if (text.isEmpty) { continue; }
                final amount = double.tryParse(text);
                if (amount == null || !amount.isFinite || amount <= 0) {
                  setState(() => error = 'Enter positive amounts or leave an amount blank.');
                  return;
                }
                splits[category.id] = amount;
              }
              if (splits.length < 2 || splits.length > 20 || (splits.values.fold<double>(0, (sum, value) => sum + value) - widget.total).abs() > .005) {
                setState(() => error = 'Use 2–20 $kind whose amounts equal the total.');
                return;
              }
              Navigator.pop(context, splits);
            }, child: const Text('Done')),
          ]),
        ],
      ),
      child: ListView.separated(
        shrinkWrap: true,
        padding: EdgeInsets.zero,
        itemCount: options.length + 1,
        separatorBuilder: (_, __) => const SizedBox(height: 4),
        itemBuilder: (context, rowIndex) {
          if (rowIndex == 0) {
            return Container(
              margin: const EdgeInsets.only(bottom: 4),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: kSleekAccent.withOpacity(.08), borderRadius: BorderRadius.circular(14)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Text('To allocate: ${state.format(widget.total)}',
                  style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text('Before fees. Fees follow each share.',
                  style: theme.textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
              ]),
            );
          }
          final index = rowIndex - 1;
          final option = options[index];
          final controller = amounts.putIfAbsent(option.id, TextEditingController.new);
          final color = colorFromHex(option.iconColor);
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: LayoutBuilder(builder: (context, constraints) {
              final stacked = constraints.maxWidth < 280 || MediaQuery.textScalerOf(context).scale(14) > 18;
              final label = Row(children: [
                Container(width: 32, height: 32,
                  decoration: BoxDecoration(color: color.withOpacity(.12), borderRadius: BorderRadius.circular(10)),
                  child: Center(child: iconGlyph(context, option.iconName, color: color, size: 20))),
                const SizedBox(width: 10),
                Expanded(child: Text(option.name, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600))),
              ]);
              final field = Semantics(
                label: 'Amount for ${option.name}',
                child: TextField(
                  key: ValueKey('split-amount-${option.id}'),
                  contextMenuBuilder: yutakaTextFieldContextMenu,
                  enableInteractiveSelection: true,
                  onTapOutside: (_) => FocusManager.instance.primaryFocus?.unfocus(),
                  controller: controller,
                  textAlign: TextAlign.end,
                  style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  textInputAction: index == options.length - 1 ? TextInputAction.done : TextInputAction.next,
                  onChanged: (_) => setState(() => error = null),
                  decoration: InputDecoration(
                    labelText: 'Amount', hintText: '0.00', isDense: true,
                    floatingLabelBehavior: FloatingLabelBehavior.always,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                    filled: true, fillColor: scheme.surfaceContainerHighest.withOpacity(.3),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: scheme.outlineVariant)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: kSleekAccent, width: 1.5)),
                  ),
                ),
              );
              if (stacked) {
                return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [label, const SizedBox(height: 8), field]);
              }
              return Row(children: [Expanded(child: label), const SizedBox(width: 12), SizedBox(width: 116, child: field)]);
            }),
          );
        },
      ),
    );
  }
}
