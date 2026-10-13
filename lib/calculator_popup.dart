part of 'main.dart';

/// Session-only calculator: calculations never change financial records.
class CalculatorPopup extends StatefulWidget {
  const CalculatorPopup({super.key});

  @override
  State<CalculatorPopup> createState() => _CalculatorPopupState();
}

class _CalculatorPopupState extends State<CalculatorPopup> {
  String _entry = '0';
  double? _total;
  String? _operator;
  bool _replaceEntry = true;
  bool _error = false;

  static const _keys = [
    ['AC', '±', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '−'],
    ['1', '2', '3', '+'],
    ['⌫', '0', '.', '='],
  ];

  String _format(double value) => double.parse(value.toStringAsPrecision(12))
      .toString().replaceFirst(RegExp(r'\.0$'), '');

  void _clear() {
    _entry = '0';
    _total = null;
    _operator = null;
    _replaceEntry = true;
    _error = false;
  }

  void _setValue(double value) {
    if (!value.isFinite) {
      _clear();
      _error = true;
      return;
    }
    _entry = _format(value);
  }

  void _calculate() {
    final right = double.parse(_entry);
    final left = _total ?? right;
    _setValue(switch (_operator) {
      '+' => left + right,
      '−' => left - right,
      '×' => left * right,
      '÷' => left / right,
      _ => right,
    });
    if (!_error) {
      _total = double.parse(_entry);
    }
  }

  void _press(String key) {
    setState(() {
      if (key == 'AC') {
        _clear();
      } else if (RegExp(r'^[0-9.]$').hasMatch(key)) {
        if (_error) {
          _clear();
        }
        if (_replaceEntry) {
          _entry = key == '.' ? '0.' : key;
          _replaceEntry = false;
        } else if (key == '.') {
          if (!_entry.contains('.')) {
            _entry += '.';
          }
        } else if (_entry.replaceAll(RegExp(r'[^0-9]'), '').length < 14) {
          _entry = _entry == '0' ? key : _entry == '-0' ? '-$key' : '$_entry$key';
        }
      } else if (_error) {
        if (key == '⌫') {
          _clear();
        }
      } else if (key == '⌫') {
        if (_replaceEntry) {
          return;
        }
        _entry = _entry.length > 1 ? _entry.substring(0, _entry.length - 1) : '0';
        if (_entry == '-') {
          _entry = '0';
        }
      } else if (key == '±') {
        if (_replaceEntry && _operator != null) {
          _entry = '-0';
          _replaceEntry = false;
        } else {
          _entry = _entry.startsWith('-') ? _entry.substring(1) : '-$_entry';
        }
      } else if (key == '%') {
        if (_replaceEntry && _operator != null) {
          return;
        }
        final fraction = double.parse(_entry) / 100;
        _setValue((_operator == '+' || _operator == '−') && _total != null
            ? _total! * fraction : fraction);
      } else if (key == '=') {
        if (_operator == null || _replaceEntry) {
          return;
        }
        _calculate();
        _operator = null;
        _replaceEntry = true;
      } else {
        if (_operator != null && !_replaceEntry) {
          _calculate();
        }
        if (_error) {
          return;
        }
        _total = double.parse(_entry);
        _operator = key;
        _replaceEntry = true;
      }
    });
  }

  KeyEventResult _onKey(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
      return KeyEventResult.ignored;
    }
    final logical = event.logicalKey;
    if (logical == LogicalKeyboardKey.escape) {
      Navigator.pop(context);
      return KeyEventResult.handled;
    }
    final key = logical == LogicalKeyboardKey.enter || logical == LogicalKeyboardKey.numpadEnter
        ? '=' : logical == LogicalKeyboardKey.backspace
        ? '⌫' : logical == LogicalKeyboardKey.delete
        ? 'AC' : switch (event.character) {
          '*' => '×', '/' => '÷', '-' => '−', ',' => '.',
          'c' || 'C' => 'AC',
          final String value => value,
          _ => '',
        };
    if (!_keys.expand((row) => row).contains(key)) {
      return KeyEventResult.ignored;
    }
    _press(key);
    return KeyEventResult.handled;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    const labels = {
      'AC': 'Clear', '±': 'Change sign', '%': 'Percent', '÷': 'Divide',
      '×': 'Multiply', '−': 'Subtract', '+': 'Add', '⌫': 'Backspace',
      '.': 'Decimal point', '=': 'Equals',
    };
    return Focus(
      autofocus: true,
      onKeyEvent: _onKey,
      child: YutakaPopupContent(
        alignment: Alignment.center,
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(children: [
              Expanded(child: Text('Calculator', style: theme.textTheme.titleLarge)),
              IconButton(
                tooltip: 'Close calculator',
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close_rounded),
              ),
            ]),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: scheme.surfaceContainerHigh,
                borderRadius: BorderRadius.circular(22),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text(_operator == null ? ' ' : '${_format(_total!)} $_operator',
                    style: theme.textTheme.bodyMedium, maxLines: 1, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 6),
                Semantics(
                  liveRegion: true,
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerRight,
                    child: Text(_error ? 'Error' : _entry,
                        key: const ValueKey('calculatorResult'),
                        style: theme.textTheme.headlineLarge?.copyWith(
                            color: _error ? scheme.error : scheme.onSurface,
                            fontWeight: FontWeight.w700)),
                  ),
                ),
              ]),
            ),
            if (_error)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text('Cannot calculate this value. Enter a number or tap AC.',
                    style: theme.textTheme.bodySmall),
              ),
            const SizedBox(height: 12),
            for (final row in _keys)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(children: [
                  for (final key in row)
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 3),
                        child: Semantics(
                          label: labels[key] ?? key,
                          excludeSemantics: true,
                          button: true,
                          onTap: () => _press(key),
                          child: FilledButton(
                            onPressed: () => _press(key),
                            style: FilledButton.styleFrom(
                              backgroundColor: key == '=' ? scheme.primary
                                  : '+−×÷'.contains(key) ? scheme.primaryContainer
                                  : scheme.surfaceContainerHighest,
                              foregroundColor: key == '=' ? scheme.onPrimary
                                  : '+−×÷'.contains(key) ? scheme.onPrimaryContainer
                                  : scheme.onSurface,
                              minimumSize: const Size(48, 52),
                              padding: const EdgeInsets.symmetric(horizontal: 4),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                            ),
                            child: FittedBox(child: Text(key, style: const TextStyle(fontSize: 22))),
                          ),
                        ),
                      ),
                    ),
                ]),
              ),
          ],
        ),
      ),
    );
  }
}
