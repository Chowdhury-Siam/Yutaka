part of '../main.dart';

@immutable
class LoanStartDateTimeConfiguration {
  const LoanStartDateTimeConfiguration({required this.start});

  final DateTime start;
}

@immutable
class LoanDueDateTimeConfiguration {
  const LoanDueDateTimeConfiguration({required this.dueDate});

  final DateTime? dueDate;
}

@immutable
class LoanInterestConfiguration {
  const LoanInterestConfiguration({
    required this.type,
    required this.period,
    required this.rate,
  });

  final LoanInterestType type;
  final LoanInterestPeriod period;
  final double rate;
}

Future<LoanStartDateTimeConfiguration?> showLoanStartDateTimeConfiguration(
  BuildContext context, {
  required DateTime start,
}) {
  var workingStart = start;

  return showYutakaPopup<LoanStartDateTimeConfiguration>(
    context,
    maxWidth: 470,
    maxHeight: 430,
    child: StatefulBuilder(
      builder: (dialogContext, setModalState) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(18, 20, 18, 18),
          child: YutakaPopupContent(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Time • Date',
                  textAlign: TextAlign.center,
                  style: Theme.of(dialogContext).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 18),
                Text('Start date', style: Theme.of(dialogContext).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w900)),
                const SizedBox(height: 7),
                OutlinedButton.icon(
                  onPressed: () async {
                    final selected = await pickDate(dialogContext, workingStart);
                    if (selected == null || !dialogContext.mounted) return;
                    setModalState(() {
                      workingStart = DateTime(
                        selected.year,
                        selected.month,
                        selected.day,
                        workingStart.hour,
                        workingStart.minute,
                      );
                    });
                  },
                  icon: const Icon(Icons.calendar_today_rounded),
                  label: Text(DateFormat('MMM d, yyyy').format(workingStart)),
                ),
                const SizedBox(height: 14),
                Text('Start time', style: Theme.of(dialogContext).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w900)),
                const SizedBox(height: 7),
                OutlinedButton.icon(
                  onPressed: () async {
                    final selected = await pickTime(dialogContext, TimeOfDay.fromDateTime(workingStart));
                    if (selected == null || !dialogContext.mounted) return;
                    setModalState(() {
                      workingStart = DateTime(
                        workingStart.year,
                        workingStart.month,
                        workingStart.day,
                        selected.hour,
                        selected.minute,
                      );
                    });
                  },
                  icon: const Icon(Icons.schedule_rounded),
                  label: Text(DateFormat('h:mm a').format(workingStart)),
                ),
                const SizedBox(height: 18),
                FilledButton(
                  onPressed: () => Navigator.pop(
                    dialogContext,
                    LoanStartDateTimeConfiguration(start: workingStart),
                  ),
                  child: const Text('Done'),
                ),
              ],
            ),
          ),
        );
      },
    ),
  );
}

Future<LoanDueDateTimeConfiguration?> showLoanDueDateTimeConfiguration(
  BuildContext context, {
  required DateTime start,
  required DateTime? dueDate,
}) {
  var enabled = dueDate != null;
  var workingDueDate = dueDate ?? start.add(const Duration(days: 30));

  return showYutakaPopup<LoanDueDateTimeConfiguration>(
    context,
    maxWidth: 470,
    maxHeight: 520,
    child: StatefulBuilder(
      builder: (dialogContext, setModalState) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(18, 20, 18, 18),
          child: YutakaPopupContent(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Due date',
                  textAlign: TextAlign.center,
                  style: Theme.of(dialogContext).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 18),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: enabled,
                  onChanged: (value) => setModalState(() => enabled = value),
                  title: const Text('Set a due date', style: TextStyle(fontWeight: FontWeight.w800)),
                ),
                if (enabled) ...[
                  const SizedBox(height: 12),
                  Text('Due date', style: Theme.of(dialogContext).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w900)),
                  const SizedBox(height: 7),
                  OutlinedButton.icon(
                    onPressed: () async {
                      final selected = await pickDate(dialogContext, workingDueDate);
                      if (selected == null || !dialogContext.mounted) return;
                      setModalState(() {
                        workingDueDate = DateTime(
                          selected.year,
                          selected.month,
                          selected.day,
                          workingDueDate.hour,
                          workingDueDate.minute,
                        );
                      });
                    },
                    icon: const Icon(Icons.event_available_rounded),
                    label: Text(DateFormat('MMM d, yyyy').format(workingDueDate)),
                  ),
                  const SizedBox(height: 14),
                  Text('Due time', style: Theme.of(dialogContext).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w900)),
                  const SizedBox(height: 7),
                  OutlinedButton.icon(
                    onPressed: () async {
                      final selected = await pickTime(dialogContext, TimeOfDay.fromDateTime(workingDueDate));
                      if (selected == null || !dialogContext.mounted) return;
                      setModalState(() {
                        workingDueDate = DateTime(
                          workingDueDate.year,
                          workingDueDate.month,
                          workingDueDate.day,
                          selected.hour,
                          selected.minute,
                        );
                      });
                    },
                    icon: const Icon(Icons.schedule_rounded),
                    label: Text(DateFormat('h:mm a').format(workingDueDate)),
                  ),
                ],
                const SizedBox(height: 18),
                FilledButton(
                  onPressed: () {
                    if (enabled && workingDueDate.isBefore(start)) {
                      showSnack(dialogContext, 'Due date cannot be before the start date.');
                      return;
                    }
                    Navigator.pop(
                      dialogContext,
                      LoanDueDateTimeConfiguration(dueDate: enabled ? workingDueDate : null),
                    );
                  },
                  child: const Text('Done'),
                ),
              ],
            ),
          ),
        );
      },
    ),
  );
}

Future<LoanInterestConfiguration?> showLoanInterestConfiguration(
  BuildContext context, {
  required LoanInterestType type,
  required LoanInterestPeriod period,
  required double rate,
}) {
  var workingRate = rate > 0 ? rate.toString().replaceFirst(RegExp(r'\.0$'), '') : '';
  var workingType = type;
  var workingPeriod = type == LoanInterestType.simple && period != LoanInterestPeriod.flat
      ? LoanInterestPeriod.yearly : period;
  final rateFieldKey = GlobalKey();
  String? rateError;

  return showYutakaPopup<LoanInterestConfiguration>(
    context,
    maxWidth: 470,
    maxHeight: 660,
    child: StatefulBuilder(
      builder: (dialogContext, setModalState) {
        final theme = Theme.of(dialogContext);
        final scheme = theme.colorScheme;
        final accent = theme.brightness == Brightness.dark ? scheme.primary : scheme.onPrimaryContainer;
        final flat = workingPeriod == LoanInterestPeriod.flat;
        return Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(children: [
                Expanded(child: Text('Loan interest', style: theme.textTheme.titleLarge)),
                IconButton(
                  tooltip: 'Close interest settings',
                  onPressed: () => Navigator.pop(dialogContext),
                  icon: const Icon(Icons.close_rounded),
                ),
              ]),
              const SizedBox(height: 4),
              Text('How is interest charged?', style: theme.textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant)),
              const SizedBox(height: 16),
              Flexible(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      for (final option in const [
                        (LoanInterestType.none, 'No interest', 'Only repay the loan amount.'),
                        (LoanInterestType.simple, 'Simple interest', 'Interest on the original loan amount.'),
                        (LoanInterestType.compound, 'Compound interest', 'Interest on the unpaid amount and interest.'),
                      ])
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Material(
                            color: workingType == option.$1
                                ? scheme.primary.withValues(alpha: .12) : scheme.surfaceContainerHigh,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                              side: BorderSide(color: workingType == option.$1
                                  ? accent.withValues(alpha: .65) : scheme.outlineVariant.withValues(alpha: .4)),
                            ),
                            clipBehavior: Clip.antiAlias,
                            child: RadioListTile<LoanInterestType>(
                              value: option.$1,
                              groupValue: workingType,
                              activeColor: accent,
                              onChanged: (value) => setModalState(() {
                                workingType = value!;
                                rateError = null;
                                if (value == LoanInterestType.simple && workingPeriod != LoanInterestPeriod.flat) {
                                  workingPeriod = LoanInterestPeriod.yearly;
                                }
                              }),
                              title: Text(option.$2, textAlign: TextAlign.start, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                              subtitle: Text(option.$3, textAlign: TextAlign.start, style: theme.textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                            ),
                          ),
                        ),
                      if (workingType != LoanInterestType.none) ...[
                        const SizedBox(height: 12),
                        DropdownButtonFormField<LoanInterestPeriod>(
                          key: ValueKey((workingType, workingPeriod)),
                          initialValue: workingPeriod,
                          isExpanded: true,
                          decoration: InputDecoration(
                            labelText: workingType == LoanInterestType.simple ? 'Interest calculation' : 'Compounding frequency',
                            floatingLabelStyle: TextStyle(color: accent),
                          ),
                          items: [
                            if (workingType == LoanInterestType.simple)
                              const DropdownMenuItem(value: LoanInterestPeriod.yearly, child: Text('Daily, using a yearly rate'))
                            else ...[
                              const DropdownMenuItem(value: LoanInterestPeriod.yearly, child: Text('Yearly')),
                              const DropdownMenuItem(value: LoanInterestPeriod.monthly, child: Text('Monthly')),
                              const DropdownMenuItem(value: LoanInterestPeriod.daily, child: Text('Daily')),
                            ],
                            const DropdownMenuItem(value: LoanInterestPeriod.flat, child: Text('One-time total')),
                          ],
                          onChanged: (value) => setModalState(() => workingPeriod = value!),
                        ),
                        const SizedBox(height: 18),
                        TextFormField(
                          key: rateFieldKey,
                          initialValue: workingRate,
                          contextMenuBuilder: yutakaTextFieldContextMenu,
                          onTapOutside: (_) => FocusManager.instance.primaryFocus?.unfocus(),
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          onChanged: (value) {
                            workingRate = value;
                            if (rateError != null) setModalState(() => rateError = null);
                          },
                          decoration: InputDecoration(
                            labelText: flat ? 'One-time interest rate' : 'Yearly interest rate',
                            floatingLabelStyle: TextStyle(color: accent),
                            hintText: 'e.g. 10',
                            suffixText: flat ? '% total' : '% / year',
                            errorText: rateError,
                            errorMaxLines: 2,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          flat ? 'Charged once as a percentage of the loan amount. It does not grow over time.'
                              : workingType == LoanInterestType.simple
                                  ? 'Calculated daily on the original amount, even after partial repayments.'
                                  : 'Enter a yearly rate, even for monthly or daily compounding.',
                          style: theme.textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () {
                  final rateValue = double.tryParse(workingRate.trim());
                  if (workingType != LoanInterestType.none &&
                      (rateValue == null || !rateValue.isFinite || rateValue < 0 || rateValue > 1000)) {
                    setModalState(() => rateError = 'Enter a number from 0 to 1,000.');
                    Scrollable.ensureVisible(rateFieldKey.currentContext!, duration: AppMotion.fast, alignment: .5);
                    return;
                  }
                  Navigator.pop(dialogContext, LoanInterestConfiguration(
                    type: workingType,
                    period: workingPeriod,
                    rate: workingType == LoanInterestType.none ? 0 : rateValue!,
                  ));
                },
                child: const Text('Save interest'),
              ),
            ],
          ),
        );
      },
    ),
  );
}

Future<void> showLoanEditorSheet(BuildContext context, {Loan? loan, LoanDirection defaultDirection = LoanDirection.lent, bool existingLoan = false}) async {
  var selectedExistingLoan = existingLoan;
  if (loan == null && !existingLoan && context.read<AppController>().loanShowTypeOptions) {
    final choice = await showYutakaPopup<bool>(
      context,
      maxWidth: 440,
      maxHeight: 460,
      child: const _LoanTypeChoicePopup(),
    );
    if (!context.mounted || choice == null) {
      return;
    }
    selectedExistingLoan = choice;
  }
  if (!context.mounted) {
    return;
  }
  await showYutakaPopup<void>(
    context,
    maxWidth: 600,
    maxHeight: 760,
    barrierDismissible: false,
    child: _LoanEditorSheet(loan: loan, defaultDirection: defaultDirection, existingLoan: selectedExistingLoan),
  );
}

class _LoanTypeChoicePopup extends StatelessWidget {
  const _LoanTypeChoicePopup();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final recordMovements = context.read<AppController>().loanRecordTransactionsByDefault;
    Widget option({required String title, required String description, required IconData icon, required bool existing}) {
      return MotionTouchFeedback(
        scale: .98,
        child: OutlinedButton(
          onPressed: () => Navigator.pop(context, existing),
          style: OutlinedButton.styleFrom(
            backgroundColor: scheme.surfaceContainerLow,
            foregroundColor: scheme.onSurface,
            side: BorderSide(color: scheme.outlineVariant.withOpacity(.55)),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
            padding: const EdgeInsets.all(16),
            minimumSize: const Size(0, 88),
            alignment: Alignment.centerLeft,
          ),
          child: Row(children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: scheme.primary.withOpacity(.12),
                borderRadius: BorderRadius.circular(15),
              ),
              child: Icon(icon, size: 24, color: scheme.primary),
            ),
            const SizedBox(width: 14),
            Expanded(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: theme.textTheme.titleMedium?.copyWith(color: scheme.onSurface, fontWeight: FontWeight.w800)),
                const SizedBox(height: 5),
                Text(description, style: theme.textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant, height: 1.35)),
              ],
            )),
            const SizedBox(width: 8),
            Icon(Icons.chevron_right_rounded, size: 20, color: scheme.onSurfaceVariant),
          ]),
        ),
      );
    }
    return YutakaPopupContent(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(children: [
            Expanded(child: Text('Choose loan type', style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900))),
            IconButton(tooltip: 'Close loan type choice', onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close_rounded)),
          ]),
          const SizedBox(height: 8),
          Text('Is this a new loan or one that already exists?', style: theme.textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant)),
          const SizedBox(height: 20),
          option(title: 'New loan', description: recordMovements ? 'Money moving now. Updates your account balance.' : 'Record a loan starting now.', icon: Icons.payments_rounded, existing: false),
          const SizedBox(height: 12),
          option(title: 'Existing loan', description: 'Track what is still owed. Keeps your balance unchanged.', icon: Icons.history_rounded, existing: true),
          const SizedBox(height: 16),
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        ],
      ),
    );
  }
}

class _LoanEditorSheet extends StatefulWidget {
  const _LoanEditorSheet({required this.loan, required this.defaultDirection, required this.existingLoan});

  final Loan? loan;
  final LoanDirection defaultDirection;
  final bool existingLoan;

  @override
  State<_LoanEditorSheet> createState() => _LoanEditorSheetState();
}

class _LoanEditorSheetState extends State<_LoanEditorSheet> {
  late LoanDirection direction;
  late LoanInterestType interestType;
  late LoanInterestPeriod interestPeriod;
  bool defaultsLoaded = false;
  late DateTime startDate;
  DateTime? dueDate;
  String? contactId;
  String? accountId;
  bool busy = false;
  late final bool existingLoan;
  late final TextEditingController amount;
  late final TextEditingController rate;
  late final TextEditingController note;
  late final TextEditingController newPerson;

  bool get editing => widget.loan != null;

  @override
  void initState() {
    super.initState();
    final loan = widget.loan;
    existingLoan = widget.existingLoan;
    direction = loan?.direction ?? widget.defaultDirection;
    interestType = loan?.interestType ?? LoanInterestType.none;
    interestPeriod = loan?.interestPeriod ?? LoanInterestPeriod.yearly;
    startDate = loan?.startDate ?? DateTime.now();
    dueDate = loan?.dueDate;
    contactId = loan?.contactId;
    amount = TextEditingController(text: loan == null ? '' : loan.principal.toStringAsFixed(2));
    rate = TextEditingController(text: loan == null ? '' : loan.interestRate.toString().replaceFirst(RegExp(r'\.0$'), ''));
    note = TextEditingController(text: loan?.note ?? '');
    newPerson = TextEditingController();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (defaultsLoaded) return;
    final state = context.read<AppController>();
    contactId ??= state.loanContacts.where((contact) => !contact.archived).firstOrNull?.id ?? '__new__';
    if (editing && widget.loan?.disbursalTransactionId != null) {
      final linked = state.transactions
          .where((item) => item.id == widget.loan!.disbursalTransactionId)
          .firstOrNull;
      accountId ??= linked?.fromAccountId;
    }
    accountId ??= state.defaultAccountId ?? state.accounts.firstOrNull?.id;
    defaultsLoaded = true;
  }

  @override
  void dispose() {
    amount.dispose();
    rate.dispose();
    note.dispose();
    newPerson.dispose();
    super.dispose();
  }

  SelectionOption? _contactOption(AppController state) {
    if (contactId == '__new__') {
      return const SelectionOption(id: '__new__', title: 'Add new person', subtitle: 'Create while saving', iconName: 'favorite', iconColor: '#FBC879');
    }
    final contact = state.loanContactOf(contactId);
    return contact == null
        ? null
        : SelectionOption(id: contact.id, title: contact.name, subtitle: contact.phone.isEmpty ? 'Saved person' : contact.phone, iconName: contact.iconName, iconColor: contact.iconColor);
  }

  Future<void> _pickContact(AppController state) async {
    final options = [
      ...state.loanContacts.where((contact) => !contact.archived).map(
            (contact) => SelectionOption(id: contact.id, title: contact.name, subtitle: contact.phone.isEmpty ? 'Saved person' : contact.phone, iconName: contact.iconName, iconColor: contact.iconColor),
          ),
      const SelectionOption(id: '__new__', title: 'Add new person', subtitle: 'Create while saving', iconName: 'favorite', iconColor: '#FBC879'),
    ];
    final selected = await showAppleWheelSelectionSheet(context, title: 'Choose a person', options: options, selectedId: contactId);
    if (selected != null && mounted) setState(() => contactId = selected);
  }

  Future<void> _save() async {
    if (busy) return;
    final state = context.read<AppController>();
    final principal = double.tryParse(amount.text.trim()) ?? 0;
    final annualRate = interestType == LoanInterestType.none ? 0.0 : double.tryParse(rate.text.trim()) ?? 0;
    if (!principal.isFinite || principal <= 0) return showSnack(context, 'Enter a valid amount.');
    if (!annualRate.isFinite || annualRate < 0 || annualRate > 1000) return showSnack(context, 'Enter a valid annual rate.');
    if (dueDate != null && dueDate!.isBefore(startDate)) return showSnack(context, 'Due date cannot be before the start date.');
    final movementAccountId = accountId;
    final recordDisbursal = !editing &&
        !existingLoan &&
        state.loanRecordTransactionsByDefault &&
        movementAccountId != null &&
        movementAccountId.isNotEmpty;
    if (!editing && !existingLoan && state.loanRecordTransactionsByDefault &&
        (movementAccountId == null || movementAccountId.isEmpty)) {
      return showSnack(context, 'Select an account.');
    }
    setState(() => busy = true);
    try {
      var selectedContactId = contactId;
      if (selectedContactId == '__new__') {
        final name = newPerson.text.trim();
        if (name.isEmpty) throw StateError('Enter a person name.');
        final now = DateTime.now();
        final contact = LoanContact(id: _uuid.v4(), name: name, createdOn: now, updatedOn: now);
        await state.saveLoanContact(contact);
        selectedContactId = contact.id;
      }
      if (selectedContactId == null || selectedContactId.isEmpty) throw StateError('Select a person.');
      final now = DateTime.now();
      final old = widget.loan;
      final value = Loan(
        id: old?.id ?? _uuid.v4(),
        contactId: selectedContactId,
        direction: direction,
        principal: roundLoanMoney(principal),
        interestType: interestType,
        interestRate: annualRate,
        interestPeriod: interestPeriod,
        startDate: DateTime(startDate.year, startDate.month, startDate.day, startDate.hour, startDate.minute),
        dueDate: dueDate == null ? null : DateTime(dueDate!.year, dueDate!.month, dueDate!.day, dueDate!.hour, dueDate!.minute),
        // The plan/installment editor was removed from this popup. Preserve an
        // existing value when editing older records instead of silently erasing it.
        installmentCount: old?.installmentCount,
        interestAccrualStop: old?.interestAccrualStop ?? LoanAccrualStop.settled,
        note: note.text.trim(),
        status: old?.status ?? LoanStatus.active,
        closedOn: old?.closedOn,
        disbursalTransactionId: old?.disbursalTransactionId,
        createdOn: old?.createdOn ?? now,
        updatedOn: now,
      );
      await state.saveLoan(
        value,
        recordDisbursal: recordDisbursal,
        accountId: movementAccountId,
      );
      if (mounted) Navigator.pop(context);
    } catch (error) {
      if (mounted) showSnack(context, error.toString().replaceFirst('Bad state: ', ''));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppController>();
    final contactOption = _contactOption(state);
    final content = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(child: Text(editing ? 'Edit loan' : widget.existingLoan ? 'Existing loan' : 'New loan', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900))),
              IconButton(onPressed: busy ? null : () => Navigator.pop(context), icon: const Icon(Icons.close_rounded)),
            ],
          ),
          const SizedBox(height: 10),
          if (!editing) ...[
            Text(
              existingLoan
                  ? 'Track only the amount still owed. Account balances stay unchanged. Interest starts from Time • Date; keep today for an opening balance.'
                  : state.loanRecordTransactionsByDefault
                      ? 'This records money moving now and changes the selected account balance.'
                      : 'Account recording is off in loan settings. This loan will leave account balances unchanged.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: kSleekMuted),
            ),
            const SizedBox(height: 12),
          ],
          SleekPillSelector<LoanDirection>(
            options: const [
              SleekPillOption(value: LoanDirection.lent, label: 'I gave', icon: Icons.north_east_rounded),
              SleekPillOption(value: LoanDirection.borrowed, label: 'I took', icon: Icons.south_west_rounded),
            ],
            selected: direction,
            onChanged: (value) => setState(() => direction = value),
          ),
          const SizedBox(height: 6),
          Text(direction == LoanDirection.lent ? 'They owe you this amount.' : 'You owe them this amount.', textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: kSleekMuted, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          AppleSelectionField(label: 'Person', option: contactOption, onTap: () => _pickContact(state)),
          if (contactId == '__new__') ...[
            const SizedBox(height: 10),
            TextField(contextMenuBuilder: yutakaTextFieldContextMenu, enableInteractiveSelection: true, 
              onTapOutside: (_) => FocusManager.instance.primaryFocus?.unfocus(),
              controller: newPerson, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(labelText: 'Person name', prefixIcon: Icon(Icons.person_add_rounded))),
          ],
          const SizedBox(height: 12),
          TextField(contextMenuBuilder: yutakaTextFieldContextMenu, enableInteractiveSelection: true, 
            onTapOutside: (_) => FocusManager.instance.primaryFocus?.unfocus(),
            controller: amount,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(labelText: !editing && existingLoan ? 'Amount still owed' : editing && state.paymentsForLoan(widget.loan!.id).any((payment) => payment.isAddition) ? 'Initial amount' : 'Amount', prefixText: state.currencyPosition == CurrencyPosition.prefix ? state.currencySymbol : null, suffixText: state.currencyPosition == CurrencyPosition.suffix ? state.currencySymbol : null),
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
          ),
          if ((!editing && !existingLoan && state.loanRecordTransactionsByDefault) ||
              (editing && widget.loan?.disbursalTransactionId != null)) ...[
            const SizedBox(height: 12),
            AppleSelectionField(
              label: direction == LoanDirection.lent ? 'Give from account' : 'Receive into account',
              option: state.accountOf(accountId ?? '') == null
                  ? null
                  : optionFromAccount(state.accountOf(accountId ?? '')!, state),
              onTap: () async {
                final selected = await showAppleWheelSelectionSheet(
                  context,
                  title: direction == LoanDirection.lent
                      ? 'Choose the account to give from'
                      : 'Choose the account to receive into',
                  options: state.accounts.map((item) => optionFromAccount(item, state)).toList(),
                  selectedId: accountId,
                );
                if (selected != null && mounted) setState(() => accountId = selected);
              },
            ),
          ],
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: () async {
              FocusManager.instance.primaryFocus?.unfocus();
              final selection = await showLoanStartDateTimeConfiguration(
                context,
                start: startDate,
              );
              if (!mounted || selection == null) return;
              setState(() => startDate = selection.start);
            },
            child: _ConfigurationButtonLabel(
              icon: Icons.event_rounded,
              title: 'Time • Date',
              summary: '${DateFormat('MMM d, yyyy').format(startDate)} • ${DateFormat('h:mm a').format(startDate)}',
            ),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () async {
              FocusManager.instance.primaryFocus?.unfocus();
              final selection = await showLoanInterestConfiguration(
                context,
                type: interestType,
                period: interestPeriod,
                rate: double.tryParse(rate.text.trim()) ?? 0,
              );
              if (!mounted || selection == null) return;
              setState(() {
                interestType = selection.type;
                interestPeriod = selection.period;
                rate.text = selection.rate.toString().replaceFirst(RegExp(r'\.0$'), '');
              });
            },
            child: _ConfigurationButtonLabel(
              icon: Icons.percent_rounded,
              title: 'Interest',
              summary: interestType == LoanInterestType.none ? 'No interest'
                  : interestPeriod == LoanInterestPeriod.flat ? 'One-time · ${rate.text}% total'
                  : '${interestType == LoanInterestType.simple ? 'Simple' : 'Compound'} · ${rate.text}% per year',
            ),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () async {
              FocusManager.instance.primaryFocus?.unfocus();
              final selection = await showLoanDueDateTimeConfiguration(
                context,
                start: startDate,
                dueDate: dueDate,
              );
              if (!mounted || selection == null) return;
              setState(() => dueDate = selection.dueDate);
            },
            child: _ConfigurationButtonLabel(
              icon: Icons.event_available_rounded,
              title: 'Due date',
              summary: dueDate == null
                  ? 'Off'
                  : '${DateFormat('MMM d, yyyy').format(dueDate!)} • ${DateFormat('h:mm a').format(dueDate!)}',
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            contextMenuBuilder: yutakaTextFieldContextMenu,
            enableInteractiveSelection: true,
            onTapOutside: (_) => FocusManager.instance.primaryFocus?.unfocus(),
            controller: note, minLines: 1, maxLines: 3, decoration: const InputDecoration(labelText: 'Note (optional)')),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(child: OutlinedButton(onPressed: busy ? null : () => Navigator.pop(context), child: const Text('Cancel'))),
              const SizedBox(width: 10),
              Expanded(flex: 2, child: FilledButton(onPressed: busy ? null : _save, child: Text(busy ? 'Saving...' : 'Save loan'))),
            ],
          ),
        ],
      );

    return YutakaPopupContent(
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 20),
      child: content,
    );
  }
}

Future<void> showLoanPaymentSheet(BuildContext context, {required Loan loan, double? initialAmount, bool isAddition = false}) {
  return showYutakaPopup<void>(
    context,
    maxWidth: 560,
    maxHeight: 700,
    barrierDismissible: false,
    child: _LoanPaymentSheet(loan: loan, initialAmount: initialAmount, isAddition: isAddition),
  );
}

class _LoanPaymentSheet extends StatefulWidget {
  const _LoanPaymentSheet({required this.loan, this.initialAmount, this.isAddition = false});
  final Loan loan;
  final double? initialAmount;
  final bool isAddition;

  @override
  State<_LoanPaymentSheet> createState() => _LoanPaymentSheetState();
}

class _LoanPaymentSheetState extends State<_LoanPaymentSheet> {
  final amount = TextEditingController();
  final note = TextEditingController();
  DateTime paidOn = DateTime.now();
  String? accountId;
  bool recordInAccount = false;
  bool defaultsLoaded = false;
  bool busy = false;

  @override
  void initState() {
    super.initState();
    final initialAmount = widget.initialAmount;
    if (initialAmount != null && initialAmount > 0) {
      amount.text = roundLoanMoney(initialAmount).toStringAsFixed(2);
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (defaultsLoaded) return;
    final state = context.read<AppController>();
    accountId ??= state.defaultAccountId ?? state.accounts.firstOrNull?.id;
    recordInAccount = state.loanRecordTransactionsByDefault;
    defaultsLoaded = true;
  }

  @override
  void dispose() {
    amount.dispose();
    note.dispose();
    super.dispose();
  }

  void _fill(double value) {
    amount.text = roundLoanMoney(loanNonNegative(value)).toStringAsFixed(2);
    setState(() {});
  }

  Future<void> _save() async {
    if (busy) return;
    final state = context.read<AppController>();
    final value = double.tryParse(amount.text.trim()) ?? 0;
    if (!value.isFinite || value <= 0) return showSnack(context, 'Enter a valid amount.');
    if (roundLoanMoney(value) <= 0) {
      return showSnack(context, 'Enter an amount of at least 0.01.');
    }
    if (recordInAccount && (accountId == null || accountId!.isEmpty)) return showSnack(context, 'Select an account.');
    setState(() => busy = true);
    try {
      final now = DateTime.now();
      final payment = LoanPayment(
        id: _uuid.v4(),
        loanId: widget.loan.id,
        amount: roundLoanMoney(value),
        isAddition: widget.isAddition,
        interestComponent: 0,
        principalComponent: roundLoanMoney(value),
        paidOn: paidOn,
        note: note.text.trim(),
        createdOn: now,
        updatedOn: now,
      );
      await state.addLoanPayment(payment, recordInAccount: recordInAccount, accountId: accountId);
      if (mounted) {
        final remaining = loanNonNegative(state.computationFor(widget.loan.id).outstanding);
        showSnack(context, widget.isAddition
            ? 'Money added · ${state.format(remaining)} remaining.'
            : remaining <= 0.005 ? 'Payment recorded · settled.' : 'Payment recorded · ${state.format(remaining)} left.');
        Navigator.pop(context);
      }
    } catch (error) {
      if (mounted) showSnack(context, error.toString().replaceFirst('Bad state: ', ''));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppController>();
    final computation = state.computationFor(widget.loan.id, at: paidOn);
    final remaining = loanNonNegative(computation.outstanding);
    final parsedValue = double.tryParse(amount.text) ?? 0;
    final value = parsedValue.isFinite ? parsedValue : 0.0;
    final split = allocateLoanPayment(widget.loan, state.paymentsForLoan(widget.loan.id), value, paidOn);
    final account = state.accountOf(accountId ?? '');
    final content = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(child: Text(widget.isAddition ? 'Add money' : 'Record payment', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900))),
              IconButton(onPressed: busy ? null : () => Navigator.pop(context), icon: const Icon(Icons.close_rounded)),
            ],
          ),
          const SizedBox(height: 8),
          Text('Remaining ${state.format(remaining)}', style: Theme.of(context).textTheme.titleMedium?.copyWith(color: kSleekAccent, fontWeight: FontWeight.w900)),
          const SizedBox(height: 14),
          TextField(contextMenuBuilder: yutakaTextFieldContextMenu, enableInteractiveSelection: true, 
            onTapOutside: (_) => FocusManager.instance.primaryFocus?.unfocus(),
            controller: amount,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            onChanged: (_) => setState(() {}),
            readOnly: busy,
            decoration: InputDecoration(labelText: widget.isAddition ? 'Amount to add' : 'Payment amount', suffixText: state.currencyPosition == CurrencyPosition.suffix ? state.currencySymbol : null),
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
          ),
          if (!widget.isAddition) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ActionChip(label: const Text('Full'), onPressed: () => _fill(remaining)),
                ActionChip(label: const Text('Half'), onPressed: () => _fill(remaining / 2)),
                if (computation.emiAmount != null) ActionChip(label: const Text('Monthly'), onPressed: () => _fill(computation.emiAmount!)),
                ActionChip(label: const Text('Round up'), onPressed: () => _fill((remaining / 100).ceil() * 100)),
              ],
            ),
          ],
          if (value.isFinite && value > 0) ...[
            const SizedBox(height: 12),
            ExpressiveCard(
              padding: const EdgeInsets.all(12),
              child: Text(
                widget.isAddition
                    ? '${widget.loan.isLent ? 'Lend' : 'Borrow'} ${state.format(value)} more\nPrincipal after this: ${state.format(computation.principal + value)}'
                    : '${state.format(split.interest)} interest · ${state.format(split.principal)} principal\nRemaining after this: ${state.format(loanNonNegative(remaining - value))}',
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
          ],
          if (!widget.isAddition && value.isFinite && value > remaining + 0.005) ...[
            const SizedBox(height: 8),
            Text(
              'This overpays by ${state.format(value - remaining)}.',
              style: const TextStyle(color: kSleekWarning, fontWeight: FontWeight.w800),
            ),
          ],
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: busy ? null : () async {
              final selected = await pickDate(context, paidOn);
              if (selected != null && mounted) {
                setState(() => paidOn = DateTime(
                      selected.year,
                      selected.month,
                      selected.day,
                      paidOn.hour,
                      paidOn.minute,
                    ));
              }
            },
            icon: const Icon(Icons.event_rounded),
            label: Text(DateFormat('MMM d, yyyy').format(paidOn)),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: busy ? null : () async {
              final selected = await pickTime(context, TimeOfDay.fromDateTime(paidOn));
              if (selected != null && mounted) {
                setState(() => paidOn = DateTime(
                      paidOn.year,
                      paidOn.month,
                      paidOn.day,
                      selected.hour,
                      selected.minute,
                    ));
              }
            },
            icon: const Icon(Icons.schedule_rounded),
            label: Text('Time · ${DateFormat('h:mm a').format(paidOn)}'),
          ),
          const SizedBox(height: 8),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            value: recordInAccount,
            onChanged: busy ? null : (value) => setState(() => recordInAccount = value),
            title: const Text('Record this in an account', style: TextStyle(fontWeight: FontWeight.w800)),
            subtitle: const Text('Updates the balance but stays outside reports.'),
          ),
          if (recordInAccount)
            AppleSelectionField(
              label: 'Account',
              option: account == null ? null : optionFromAccount(account, state),
              onTap: () async {
                if (busy) return;
                final selected = await showAppleWheelSelectionSheet(
                  context,
                  title: 'Choose an account',
                  options: state.accounts.map((item) => optionFromAccount(item, state)).toList(),
                  selectedId: accountId,
                );
                if (selected != null && mounted) setState(() => accountId = selected);
              },
            ),
          const SizedBox(height: 12),
          TextField(
            contextMenuBuilder: yutakaTextFieldContextMenu,
            enableInteractiveSelection: true,
            onTapOutside: (_) => FocusManager.instance.primaryFocus?.unfocus(),
            readOnly: busy,
            controller: note, minLines: 1, maxLines: 3, decoration: const InputDecoration(labelText: 'Note (optional)')),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(child: OutlinedButton(onPressed: busy ? null : () => Navigator.pop(context), child: const Text('Cancel'))),
              const SizedBox(width: 10),
              Expanded(flex: 2, child: FilledButton(onPressed: busy ? null : _save, child: Text(busy ? 'Saving...' : widget.isAddition ? 'Add money' : 'Save payment'))),
            ],
          ),
        ],
      );

    return YutakaPopupContent(
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 20),
      child: content,
    );
  }
}

Future<void> showLoanPreferencesSheet(BuildContext context) {
  return showYutakaPopup<void>(context, maxWidth: 540, maxHeight: 680, child: const _LoanPreferencesSheet());
}

class _LoanPreferencesSheet extends StatelessWidget {
  const _LoanPreferencesSheet();

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppController>();
    return SingleChildScrollView(child: Padding(
      padding: const EdgeInsets.all(18),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(child: Text('Loan preferences', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900))),
              IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close_rounded)),
            ],
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            value: state.loanShowTypeOptions,
            onChanged: (value) => state.setLoanPreferences(showTypeOptions: value),
            title: const Text('Show loan type options', style: TextStyle(fontWeight: FontWeight.w800)),
            subtitle: const Text('Ask New loan or Existing loan before opening the form. When off, use New loan.'),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            value: state.loanRecordTransactionsByDefault,
            onChanged: (value) => state.setLoanPreferences(recordTransactions: value),
            title: const Text('Record account movements by default', style: TextStyle(fontWeight: FontWeight.w800)),
            subtitle: const Text('These movements never count as income or expenses.'),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            value: state.loanTransactionsVisibleInTransactionList,
            onChanged: (value) => state.setLoanPreferences(showTransactionsInTransactionList: value),
            title: const Text('Show loan transactions in Transaction', style: TextStyle(fontWeight: FontWeight.w800)),
            subtitle: const Text('Turn this off to hide loan-linked movements from the main Transaction list.'),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            value: state.loanRemindersEnabled,
            onChanged: (value) => state.setLoanPreferences(reminders: value),
            title: const Text('Due-date reminders', style: TextStyle(fontWeight: FontWeight.w800)),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            value: state.loanShowWrittenOff,
            onChanged: (value) => state.setLoanPreferences(showWrittenOff: value),
            title: const Text('Show written-off records', style: TextStyle(fontWeight: FontWeight.w800)),
          ),
          const SizedBox(height: 10),
          FilledButton(onPressed: () => Navigator.pop(context), child: const Text('Done')),
        ],
      ),
    ));
  }
}
