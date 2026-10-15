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
      subtitle: 'Lock on exit • hide widget amounts',
      color: kSleekAccentHex,
      onTap: busy ? null : () => _toggle(!enabled),
      trailing: Semantics(
        label: 'Fingerprint / device lock',
        child: Switch(value: enabled, onChanged: busy ? null : _toggle),
      ),
    );
  }
}

class DeviceLockGate extends StatefulWidget {
  const DeviceLockGate({super.key, required this.child});
  final Widget child;
  @override
  State<DeviceLockGate> createState() => _DeviceLockGateState();
}

class _DeviceLockGateState extends State<DeviceLockGate> with WidgetsBindingObserver {
  AppController? controller;
  bool bootstrapped = false;
  bool locked = true;
  bool authenticating = false;
  bool foreground = true;
  String? pendingAction;
  String? message;
  Timer? refreshTimer;
  bool openingAction = false;

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
    if (!state.loading && !bootstrapped) {
      bootstrapped = true;
      locked = _androidQuickAccessSupported && state.deviceLockEnabled;
    }
    if (!state.deviceLockEnabled && bootstrapped) { locked = false; }
    if (mounted) { setState(() {}); }
    refreshTimer?.cancel();
    refreshTimer = Timer(const Duration(milliseconds: 180), () => refreshYutakaWidget(state));
    _openPendingAction();
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

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    foreground = state == AppLifecycleState.resumed;
    if (state == AppLifecycleState.inactive || state == AppLifecycleState.paused || state == AppLifecycleState.hidden) {
      if (controller?.deviceLockEnabled == true) {
        FocusManager.instance.primaryFocus?.unfocus();
        setState(() => locked = true);
      }
    } else if (state == AppLifecycleState.resumed) {
      if (_androidQuickAccessSupported) { _loadPendingAction(); }
      _openPendingAction();
      if (controller != null) { refreshYutakaWidget(controller!); }
    }
  }

  @override
  void dispose() {
    refreshTimer?.cancel();
    controller?.removeListener(_stateChanged);
    WidgetsBinding.instance.removeObserver(this);
    if (_androidQuickAccessSupported) { _deviceAccessChannel.setMethodCallHandler(null); }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final hidden = _androidQuickAccessSupported && (!bootstrapped || locked || (!foreground && controller?.deviceLockEnabled == true));
    return Stack(fit: StackFit.expand, children: [
      Offstage(offstage: hidden, child: TickerMode(enabled: !hidden, child: widget.child)),
      if (hidden) Material(color: Theme.of(context).scaffoldBackgroundColor,
        child: SafeArea(child: Center(child: Padding(padding: const EdgeInsets.all(28), child: Column(
          mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.lock_rounded, size: 56, color: kSleekAccent),
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
