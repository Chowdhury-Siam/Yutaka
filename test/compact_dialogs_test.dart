import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yutaka/main.dart';
import 'package:yutaka/models.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late AppController controller;
  final now = DateTime(2026, 10, 15);
  final choices = List.generate(30, (i) => SelectionOption(
    id: 'category-$i', title: i == 0 ? 'Food and groceries for the whole household' : 'Category $i',
    subtitle: 'expense', iconName: 'food', iconColor: '#00BC9A',
  ));

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    controller = AppController()..loading = false;
    controller.accounts.add(Account(
      id: 'cash', name: 'Cash', type: AccountType.regular, iconName: 'wallet',
      iconColor: '#00BC9A', amount: 1000, creditLimit: 0, sequence: 0,
      createdOn: now, updatedOn: now,
    ));
    controller.categories.addAll(List.generate(30, (i) => Category(
      id: 'category-$i', name: 'Category $i', type: CategoryType.expense,
      iconName: 'food', iconColor: '#00BC9A', createdOn: now, updatedOn: now,
    )));
  });
  tearDown(() => controller.dispose());

  Future<void> host(WidgetTester tester, Future<void> Function(BuildContext) open,
      {double scale = 1, Brightness brightness = Brightness.dark}) async {
    await tester.pumpWidget(ChangeNotifierProvider<AppController>.value(
      value: controller,
      child: MaterialApp(
        theme: ThemeData(useMaterial3: true, brightness: brightness),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(scale)),
          child: child!,
        ),
        home: Scaffold(body: Builder(builder: (context) => Center(
          child: TextButton(onPressed: () => open(context), child: const Text('Open')),
        ))),
      ),
    ));
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
  }

  testWidgets('choice and split dialogs keep headings and actions visible on short large-text phones', (tester) async {
    tester.view.physicalSize = const Size(320, 480);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final dialogs = <String, Future<void> Function(BuildContext)>{
      'Choose Date Filter': (context) async {
        await showAppleWheelSelectionSheet(context, title: 'Choose Date Filter', tileLayout: true,
          options: DateRangeType.values.map(optionFromDateRangeType).toList(), selectedId: 'allTime');
      },
      'Choose Category': (context) async {
        await showAppleWheelSelectionSheet(context, title: 'Choose Category', options: choices,
          selectedId: choices.first.id, addActionLabel: 'Add category', onAdd: () async => 'created');
      },
      'Choose Account': (context) async {
        await showAppleWheelSelectionSheet(context, title: 'Choose Account',
          options: controller.accounts.map((account) => optionFromAccount(account, controller)).toList(),
          selectedId: 'cash', addActionLabel: 'Add account', onAdd: () async => 'created');
      },
      'Choose currency': (context) async {
        await showCurrencyWheelPickerSheet(context,
          countries: [['Bangladesh', '৳', 'BDT'], ['United States', r'$', 'USD']],
          selectedCode: 'BDT', selectedSymbol: '৳');
      },
      'Filters': showFilterSheet,
      'Sort transactions': showTransactionSortSheet,
      'Loan preferences': showLoanPreferencesSheet,
      'Split accounts': (context) async {
        await showTransactionSplits(context, type: MoneyTransactionType.expense, total: 100, initial: {}, splitAccounts: true);
      },
      'Split categories': (context) async {
        await showTransactionSplits(context, type: MoneyTransactionType.expense, total: 100, initial: {});
      },
    };
    for (final brightness in Brightness.values) {
      for (final dialog in dialogs.entries) {
        await host(tester, dialog.value, scale: 2, brightness: brightness);
        expect(find.text(dialog.key).hitTestable(), findsOneWidget);
        expect(find.byTooltip('Close').hitTestable(), findsOneWidget);
        final footer = dialog.key == 'Filters' ? 'Apply' : 'Done';
        if (dialog.key != 'Sort transactions') {
          expect(find.text(footer).hitTestable(), findsOneWidget);
        }
        if (dialog.key == 'Choose Category') {
          // Large text keeps creation at the end of the scrolling choices;
          // confirmation remains pinned without an oversized fixed footer.
          final list = find.descendant(of: find.byKey(const ValueKey('choice-options-list')), matching: find.byType(Scrollable));
          await tester.scrollUntilVisible(find.text('Category 29'), 180, scrollable: list);
          await tester.scrollUntilVisible(find.byKey(const ValueKey('choice-add-action')), 100, scrollable: list);
          expect(find.text('Add category').hitTestable(), findsOneWidget);
          expect(find.text('Done').hitTestable(), findsOneWidget);
          expect(find.text('Cancel').hitTestable(), findsOneWidget);
        }
        expect(tester.takeException(), isNull, reason: '${dialog.key}, $brightness, 2x text');
        await tester.tap(find.byTooltip('Close'));
        await tester.pumpAndSettle();
        expect(find.byType(CompactPopupContent), findsNothing);
      }
    }
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('account and category creation stay below the choices beside confirmation actions', (tester) async {
    for (final label in ['account', 'category']) {
      String? result;
      await host(tester, (context) async {
        result = await showAppleWheelSelectionSheet(context,
          title: label == 'account' ? 'Choose Account' : 'Choose Category',
          options: choices, selectedId: choices.first.id,
          addActionLabel: 'Add $label', onAdd: () async => 'created-$label');
      });
      final add = find.byKey(const ValueKey('choice-add-action'));
      final list = find.byKey(const ValueKey('choice-options-list'));
      final addTop = tester.getTopLeft(add).dy;
      expect(addTop, greaterThanOrEqualTo(tester.getBottomLeft(list).dy));
      expect(tester.getBottomLeft(add).dy, lessThanOrEqualTo(tester.getTopLeft(find.text('Done')).dy));
      expect(find.descendant(of: list, matching: add), findsNothing);
      final scrollable = find.descendant(of: list, matching: find.byType(Scrollable));
      await tester.scrollUntilVisible(find.text('Category 29'), 180, scrollable: scrollable);
      expect(tester.getTopLeft(add).dy, addTop);
      expect(add.hitTestable(), findsOneWidget);
      await tester.tap(add);
      await tester.pumpAndSettle();
      expect(result, 'created-$label');
      expect(tester.takeException(), isNull);
    }
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('date choice remains a draft until Done and category creation remains available', (tester) async {
    String? result;
    Future<void> openDate(BuildContext context) async {
      result = await showAppleWheelSelectionSheet(context, title: 'Choose Date Filter', tileLayout: true,
        options: DateRangeType.values.map(optionFromDateRangeType).toList(), selectedId: 'allTime');
    }
    await host(tester, openDate);
    expect(tester.getTopLeft(find.text('This Week')).dx,
      greaterThan(tester.getTopLeft(find.text('Today')).dx));
    expect(tester.getTopLeft(find.text('This Month')).dy,
      greaterThan(tester.getTopLeft(find.text('Today')).dy));
    for (final type in DateRangeType.values) {
      expect(find.text(optionFromDateRangeType(type).title).hitTestable(), findsOneWidget);
    }
    await tester.tap(find.text('This Month'));
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(result, isNull);
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Today'));
    // Confirm before another frame: Done must read the latest draft selection.
    await tester.tap(find.text('Done'));
    await tester.pumpAndSettle();
    expect(result, 'today');
    await host(tester, (context) async {
      result = await showAppleWheelSelectionSheet(context, title: 'Choose Category', options: choices,
        selectedId: choices.first.id, addActionLabel: 'Add category', onAdd: () async => 'created');
    });
    expect(find.text('expense'), findsNothing);
    await tester.tap(find.text('Add category'));
    await tester.pumpAndSettle();
    expect(result, 'created');
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('closing Filters discards chip changes', (tester) async {
    await host(tester, showFilterSheet);
    await tester.tap(find.text('Cash'));
    await tester.pump();
    expect(find.text('1 selected'), findsOneWidget);
    expect(controller.filterAccountIds, isEmpty);
    await tester.tap(find.byTooltip('Close'));
    await tester.pumpAndSettle();
    expect(controller.filterAccountIds, isEmpty);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('currency search preserves stable choices and confirms the latest tap', (tester) async {
    List<String>? result;
    await host(tester, (context) async {
      result = await showCurrencyWheelPickerSheet(context,
        countries: [['Bangladesh', '৳', 'BDT'], ['United States', r'$', 'USD'], ['Japan', '¥', 'JPY']],
        selectedCode: 'BDT', selectedSymbol: '৳');
    });
    final search = find.byKey(const ValueKey('choice-search'));
    await tester.enterText(search, 'no such currency');
    await tester.pump();
    expect(find.text('No matches found'), findsOneWidget);
    expect(tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Done')).onPressed, isNull);
    await tester.enterText(search, 'USD');
    await tester.pump();
    await tester.tap(find.text('United States'));
    // Confirm without another rebuild to cover the selection race.
    await tester.tap(find.text('Done'));
    await tester.pumpAndSettle();
    expect(result, ['United States', r'$', 'USD']);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });
}
