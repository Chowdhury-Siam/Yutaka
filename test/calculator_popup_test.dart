import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:yutaka/app_config.dart';
import 'package:yutaka/main.dart';

class CalculatorTestController extends AppController {
  @override
  Future<int> processDueSubscriptions() async => 0;

  @override
  Future<void> refreshUpdateInstallationStatus({bool resumed = false}) async {}
}

void main() {
  String result(WidgetTester tester) => tester.widget<Text>(
      find.byKey(const ValueKey('calculatorResult'))).data!;

  Future<void> press(WidgetTester tester, List<String> keys) async {
    for (final key in keys) {
      await tester.tap(find.widgetWithText(FilledButton, key));
      await tester.pump();
    }
  }

  Future<void> openPopup(WidgetTester tester, Size size, {double textScale = 1}) async {
    await tester.binding.setSurfaceSize(size);
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(MaterialApp(
      theme: ThemeData(useMaterial3: true),
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(textScale)),
        child: child!,
      ),
      home: Builder(builder: (context) => Scaffold(
        body: TextButton(
          onPressed: () => showYutakaPopup<void>(context,
              maxWidth: 380, maxHeight: 560, child: const CalculatorPopup()),
          child: const Text('Open'),
        ),
      )),
    ));
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
  }

  for (final width in [360.0, 1000.0, 1280.0]) {
    testWidgets('three consecutive Home taps open one popup at width $width', (tester) async {
      final controller = CalculatorTestController()..updateLastCheckedAt = DateTime.now();
      await tester.binding.setSurfaceSize(Size(width, 800));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await tester.pumpWidget(ChangeNotifierProvider<AppController>.value(
        value: controller,
        child: const MaterialApp(home: MainShell()),
      ));
      await tester.pump(const Duration(milliseconds: 400));
      Future<void> home() async {
        await tester.tap(find.byIcon(controller.tabIndex == kHomeTabIndex
            ? Icons.home_rounded : Icons.home_outlined));
        await tester.pump(const Duration(milliseconds: 100));
      }

      await home();
      await home();
      expect(find.byType(CalculatorPopup), findsNothing);
      await tester.pump(const Duration(milliseconds: 2100));
      await home();
      expect(find.byType(CalculatorPopup), findsNothing);
      // A different tab interrupts the sequence; entering Home counts as tap one.
      await tester.tap(find.byIcon(Icons.category_outlined));
      await tester.pump(const Duration(milliseconds: 400));
      await home();
      await home();
      expect(find.byType(CalculatorPopup), findsNothing);
      await home();
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.byType(CalculatorPopup), findsOneWidget);
      expect(controller.tabIndex, kHomeTabIndex);
      await tester.tap(find.byTooltip('Close calculator'));
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.byType(CalculatorPopup), findsNothing);
      await home();
      await home();
      expect(find.byType(CalculatorPopup), findsNothing);
      await home();
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.byType(CalculatorPopup), findsOneWidget);
      // Android/system Back dismisses the modal without leaving Home.
      await tester.binding.handlePopRoute();
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.byType(CalculatorPopup), findsNothing);
      expect(controller.tabIndex, kHomeTabIndex);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      controller.dispose();
    });
  }

  testWidgets('Calculator quick action opens a popup and closes the action menu', (tester) async {
    final controller = CalculatorTestController()
      ..tabIndex = kTransactionTabIndex
      ..updateLastCheckedAt = DateTime.now();
    await tester.binding.setSurfaceSize(const Size(360, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(ChangeNotifierProvider<AppController>.value(
      value: controller,
      child: const MaterialApp(home: MainShell()),
    ));
    await tester.pump(const Duration(milliseconds: 400));
    final menu = find.byTooltip('Note, plan, subscriptions, and calculator');
    await tester.tap(menu);
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.widgetWithText(FloatingActionButton, 'Note'), findsOneWidget);
    expect(find.widgetWithText(FloatingActionButton, 'Plan'), findsOneWidget);
    await tester.tap(find.widgetWithText(FloatingActionButton, 'Calculator'));
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byType(CalculatorPopup), findsOneWidget);
    expect(controller.tabIndex, kTransactionTabIndex);
    await press(tester, ['2', '+', '3', '=']);
    expect(result(tester), '5');
    await tester.tap(find.byTooltip('Close calculator'));
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byType(CalculatorPopup), findsNothing);
    await tester.tap(menu);
    await tester.pump(const Duration(milliseconds: 400));
    await tester.tap(find.widgetWithText(FloatingActionButton, 'Calculator'));
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byType(CalculatorPopup), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
    controller.dispose();
  });

  testWidgets('calculator arithmetic, editing, percentages and error recovery', (tester) async {
    await openPopup(tester, const Size(360, 800));
    await press(tester, ['0', '.', '1', '+', '0', '.', '2', '=']);
    expect(result(tester), '0.3');
    await press(tester, ['AC', '2', '0', '0', '+', '1', '0', '%', '=']);
    expect(result(tester), '220');
    await press(tester, ['AC', '9', '×', '3', '−', '2', '=']);
    expect(result(tester), '25');
    await press(tester, ['AC', '8', '+', '×', '2', '=']);
    expect(result(tester), '16');
    await press(tester, ['5', '0', '%', '±']);
    expect(result(tester), '-0.5');
    await press(tester, ['AC', '1', '.', '.', '2', '⌫', '3']);
    expect(result(tester), '1.3');
    await press(tester, ['AC', '8', '÷', '0', '=']);
    expect(result(tester), 'Error');
    await press(tester, ['4', '+', '2', '=']);
    expect(result(tester), '6');
    await press(tester, ['AC', '±', '.', '5', '+', '1', '=']);
    expect(result(tester), '0.5');
    expect(tester.takeException(), isNull);
  });

  testWidgets('desktop keyboard calculates and Escape dismisses', (tester) async {
    await openPopup(tester, const Size(1200, 800));
    await tester.sendKeyEvent(LogicalKeyboardKey.digit8, character: '8');
    await tester.sendKeyEvent(LogicalKeyboardKey.slash, character: '/');
    await tester.sendKeyEvent(LogicalKeyboardKey.digit2, character: '2');
    await tester.sendKeyEvent(LogicalKeyboardKey.enter);
    await tester.pump();
    expect(result(tester), '4');
    await tester.sendKeyEvent(LogicalKeyboardKey.escape);
    await tester.pumpAndSettle();
    expect(find.byType(CalculatorPopup), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('short phone and large text keep calculator inside a modal', (tester) async {
    await openPopup(tester, const Size(320, 568), textScale: 1.5);
    final rect = tester.getRect(find.byType(CalculatorPopup));
    expect(rect.left, greaterThan(0));
    expect(rect.right, lessThan(320));
    expect(rect.top, greaterThan(0));
    expect(rect.bottom, lessThan(568));
    await press(tester, ['7', '+', '3', '=']);
    expect(result(tester), '10');
    await tester.tapAt(const Offset(2, 2));
    await tester.pumpAndSettle();
    expect(find.byType(CalculatorPopup), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
