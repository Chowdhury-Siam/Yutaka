part of 'main.dart';

const _deviceAccessChannel = MethodChannel('com.yutaka.siam/device_access');
bool get _androidQuickAccessSupported => !kIsWeb && defaultTargetPlatform == TargetPlatform.android;

Future<bool> authenticateYutakaDevice() async {
  if (!_androidQuickAccessSupported) { return false; }
  try {
    return await _deviceAccessChannel.invokeMethod<bool>('authenticate') ?? false;
  } on PlatformException {
    return false;
  } on MissingPluginException {
    return false;
  }
}

Future<void> refreshYutakaWidget(AppController state) async {
  if (!_androidQuickAccessSupported || state.loading) { return; }
  try {
    await _deviceAccessChannel.invokeMethod<void>('refreshWidget', {
      'symbol': state.currencySymbol, 'suffix': state.currencyPosition == CurrencyPosition.suffix,
      'lockEnabled': state.deviceLockEnabled, 'separators': state.useSeparators, 'hidden': state.amountsHidden || state.deviceLockEnabled,
    });
  } on PlatformException {
    // A widget failure must never interfere with transaction saves.
  } on MissingPluginException {
    // Flutter-only tests and desktop builds have no Android channel.
  }
}

Future<void> pinYutakaWidget(BuildContext context) async {
  try {
    final supported = await _deviceAccessChannel.invokeMethod<bool>('pinWidget') ?? false;
    if (context.mounted && !supported) { showSnack(context, 'Add Yutaka from your launcher’s widget picker.'); }
  } on PlatformException {
    if (context.mounted) { showSnack(context, 'Add Yutaka from your launcher’s widget picker.'); }
  }
}

class DeviceLockSettingsTile extends StatefulWidget {
  const DeviceLockSettingsTile({super.key});
  @override
  State<DeviceLockSettingsTile> createState() => _DeviceLockSettingsTileState();
}

class _DeviceLockSettingsTileState extends State<DeviceLockSettingsTile> {
  bool busy = false;
  Future<void> _toggle(bool value) async {
    if (busy) { return; }
    setState(() => busy = true);
    final state = context.read<AppController>();
    try {
      // Verify device ownership before enabling or disabling the lock.
      if (!await authenticateYutakaDevice()) {
        if (mounted) { showSnack(context, 'Authentication cancelled or unavailable. Set a device PIN, password or fingerprint first.'); }
        return;
      }
      await state.prefs.setBool('deviceLockEnabled', value);
      state.deviceLockEnabled = value;
      state._notifyLoanPreferenceListeners();
      await refreshYutakaWidget(state);
    } finally {
      if (mounted) { setState(() => busy = false); }
    }
  }
  @override
  Widget build(BuildContext context) {
    final enabled = context.select<AppController, bool>((state) => state.deviceLockEnabled);
    return SettingsTile(
      icon: Icons.fingerprint_rounded,
      title: 'Fingerprint / device lock',
      subtitle: 'Lock after 10 seconds away',
      color: kSleekAccentHex,
      onTap: busy ? null : () => _toggle(!enabled),
      trailing: Semantics(
        label: 'Fingerprint / device lock',
        child: SizedBox(width: 52, height: 48,
          child: Switch(value: enabled, onChanged: busy ? null : _toggle)),
      ),
    );
  }
}

class DeviceLockGate extends StatefulWidget {
  const DeviceLockGate({super.key, required this.child, this.now = DateTime.now});
  final Widget child;
  final DateTime Function() now;
  @override
  State<DeviceLockGate> createState() => _DeviceLockGateState();
}

class _DeviceLockGateState extends State<DeviceLockGate> with WidgetsBindingObserver {
  static const _lockDelay = Duration(seconds: 10);
  AppController? controller;
  bool bootstrapped = false;
  bool locked = true;
  bool authenticating = false;
  bool automaticUnlockPending = true;
  bool foreground = true;
  bool backgrounded = false;
  String? pendingAction;
  String? message;
  Timer? refreshTimer;
  Timer? backgroundLockTimer;
  DateTime? lockDeadline;
  bool openingAction = false;
  Object? widgetSnapshot;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    if (_androidQuickAccessSupported) {
      _deviceAccessChannel.setMethodCallHandler((call) async {
        if (call.method == 'quickAction') {
          await _loadPendingAction();
        }
      });
      _loadPendingAction();
    }
  }

  Future<void> _loadPendingAction() async {
    try {
      final action = await _deviceAccessChannel.invokeMethod<String>('takeQuickAction');
      if (action != null) { pendingAction = action; }
      if (mounted) { _openPendingAction(); }
    } on PlatformException {
      // Normal launcher starts have no quick action.
    } on MissingPluginException {
      // Native integration is absent in Flutter-only tests.
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final state = context.read<AppController>();
    if (controller != state) {
      controller?.removeListener(_stateChanged);
      controller = state;
      state.addListener(_stateChanged);
      _stateChanged();
    }
  }

  void _stateChanged() {
    final state = controller!;
    final previousGate = (bootstrapped, locked);
    if (!state.loading && !bootstrapped) {
      bootstrapped = true;
      locked = _androidQuickAccessSupported && state.deviceLockEnabled;
    }
    if (!state.deviceLockEnabled) {
      _cancelBackgroundLock();
      if (bootstrapped) { locked = false; }
    }
    if (mounted && previousGate != (bootstrapped, locked)) { setState(() {}); }
    final snapshot = (state.loading, state.transactions, state.currencySymbol,
      state.currencyPosition, state.deviceLockEnabled, state.useSeparators, state.amountsHidden);
    if (widgetSnapshot != snapshot) {
      widgetSnapshot = snapshot;
      refreshTimer?.cancel();
      refreshTimer = Timer(const Duration(milliseconds: 180), () => refreshYutakaWidget(state));
    }
    _openPendingAction();
    _promptAutomaticUnlock();
  }

  void _promptAutomaticUnlock() {
    if (!_androidQuickAccessSupported || !automaticUnlockPending || !bootstrapped ||
        !locked || !foreground || authenticating) { return; }
    automaticUnlockPending = false;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) { return; }
      if (!foreground) { automaticUnlockPending = true; return; }
      if (locked && controller?.deviceLockEnabled == true) { _unlock(); }
    });
  }

  void _openPendingAction() {
    if (openingAction) { pendingAction = null; return; }
    if (!mounted || locked || !bootstrapped || !foreground || pendingAction != 'add_expense' ||
        controller!.loading || !controller!.onboardingCompleted) { return; }
    openingAction = true;
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final navigationContext = _yutakaNavigatorKey.currentContext;
      if (!mounted || locked || !foreground || navigationContext == null) {
        openingAction = false;
        return;
      }
      pendingAction = null;
      try {
        await showTransactionEditor(navigationContext);
      } finally {
        openingAction = false;
      }
    });
  }

  Future<void> _unlock() async {
    if (authenticating) { return; }
    automaticUnlockPending = false;
    setState(() { authenticating = true; message = null; });
    final unlocked = await authenticateYutakaDevice();
    if (!mounted) { return; }
    setState(() {
      authenticating = false;
      locked = !unlocked;
      message = unlocked ? null : 'Could not unlock. Try again with your device screen lock.';
    });
    _openPendingAction();
  }

  void _cancelBackgroundLock() {
    backgroundLockTimer?.cancel();
    backgroundLockTimer = null;
    lockDeadline = null;
  }

  void _startBackgroundLock() {
    // Native authentication can also pause the app. Its return must not
    // create a fresh lock request or reopen a cancelled prompt.
    if (authenticating) { return; }
    automaticUnlockPending = true;
    if (locked || lockDeadline != null) { return; }
    lockDeadline = widget.now().add(_lockDelay);
    backgroundLockTimer = Timer(_lockDelay, () {
      backgroundLockTimer = null;
      if (mounted && backgrounded && controller?.deviceLockEnabled == true) {
        setState(() => locked = true);
      }
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    foreground = state == AppLifecycleState.resumed;
    // Android can lose focus to a screenshot overlay or notification shade
    // while the activity is still visible. Only background visibility changes
    // start the grace period and hide the app's content.
    if (state == AppLifecycleState.paused || state == AppLifecycleState.hidden) {
      final enteringBackground = !backgrounded;
      backgrounded = true;
      if (controller?.deviceLockEnabled == true) {
        // hidden also occurs on the way back from paused. Do not re-arm the
        // lock after a native prompt has already completed in the background.
        if (enteringBackground) { _startBackgroundLock(); }
        FocusManager.instance.primaryFocus?.unfocus();
        // Hide private content immediately, even during the grace period.
        setState(() {});
      }
    } else if (state == AppLifecycleState.resumed) {
      backgrounded = false;
      // Android may suspend Dart timers in the background. Check the saved
      // deadline before exposing any content or opening a widget quick action.
      final expired = lockDeadline != null && !widget.now().isBefore(lockDeadline!);
      _cancelBackgroundLock();
      if (expired && controller?.deviceLockEnabled == true) { locked = true; }
      setState(() {});
      _promptAutomaticUnlock();
      if (_androidQuickAccessSupported) { _loadPendingAction(); }
      _openPendingAction();
      if (controller != null) { refreshYutakaWidget(controller!); }
    }
  }

  @override
  void dispose() {
    refreshTimer?.cancel();
    _cancelBackgroundLock();
    controller?.removeListener(_stateChanged);
    WidgetsBinding.instance.removeObserver(this);
    if (_androidQuickAccessSupported) { _deviceAccessChannel.setMethodCallHandler(null); }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final hidden = _androidQuickAccessSupported && (!bootstrapped || locked || (backgrounded && controller?.deviceLockEnabled == true));
    return Stack(fit: StackFit.expand, children: [
      Offstage(offstage: hidden, child: TickerMode(enabled: !hidden, child: widget.child)),
      if (hidden) Material(color: Theme.of(context).scaffoldBackgroundColor,
        child: SafeArea(child: Center(child: Padding(padding: const EdgeInsets.all(28), child: Column(
          mainAxisSize: MainAxisSize.min, children: [
          Image.asset(
            'assets/icons/yutaka_mark.png',
            width: 72,
            height: 80,
            fit: BoxFit.contain,
            filterQuality: FilterQuality.high,
            excludeFromSemantics: true,
          ),
          const SizedBox(height: 20),
          Text(bootstrapped ? 'Yutaka is locked' : 'Yutaka', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 12),
          if (message != null) Text(message!, textAlign: TextAlign.center),
          const SizedBox(height: 16),
          if (!bootstrapped) const CircularProgressIndicator()
          else FilledButton.icon(onPressed: authenticating ? null : _unlock,
              icon: const Icon(Icons.fingerprint_rounded), label: Text(authenticating ? 'Authenticating…' : 'Unlock')),
        ]))))),
    ]);
  }
}
