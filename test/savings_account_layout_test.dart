import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yutaka/main.dart';
import 'package:yutaka/models.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late AppController controller;
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    controller = AppController()..loading = false;
  });
  tearDown(() => controller.dispose());

  Widget app(bool reduced) => ChangeNotifierProvider<AppController>.value(
    value: controller,
    child: MaterialApp(
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(disableAnimations: reduced), child: child!,
      ),
      home: Scaffold(body: Builder(builder: (context) => TextButton(
        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) =>
          const AccountListScreen(filterType: AccountType.savings, title: 'Savings Accounts'))),
        child: const Text('Open'),
      ))),
    ),
  );

  testWidgets('Savings Accounts title stays inside the toolbar and empty state stays compact', (tester) async {
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    for (final width in [320.0, 360.0, 600.0]) {
      tester.view.physicalSize = Size(width, 800);
      for (final scale in [1.0, 2.0]) {
        tester.platformDispatcher.textScaleFactorTestValue = scale;
        await tester.pumpWidget(app(true));
        await tester.tap(find.text('Open'));
        await tester.pumpAndSettle();
        final title = find.text('Savings Accounts');
        final paragraph = tester.renderObject<RenderParagraph>(find.descendant(of: title, matching: find.byType(RichText)));
        expect(paragraph.didExceedMaxLines, isFalse);
        final toolbar = tester.getRect(find.byType(AppBar));
        final titleBounds = tester.getRect(title);
        expect(titleBounds.top, greaterThanOrEqualTo(toolbar.top));
        expect(titleBounds.bottom, lessThanOrEqualTo(toolbar.bottom));
        expect(find.byTooltip('Reorder accounts'), findsNothing);
        if (scale > 1) {
          await tester.ensureVisible(find.text('Add savings account'));
          await tester.pumpAndSettle();
        }
        expect(find.text('Add savings account').hitTestable(), findsOneWidget);
        final empty = tester.widget<EmptyCard>(find.byType(EmptyCard));
        expect(empty.animated, isTrue);
        expect(empty.compact, isTrue);
        final cardBounds = tester.getRect(find.byType(EmptyCard));
        final actionBounds = tester.getRect(find.text('Add savings account'));
        expect(actionBounds.left, greaterThanOrEqualTo(cardBounds.left));
        expect(actionBounds.right, lessThanOrEqualTo(cardBounds.right));
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox.shrink());
      }
    }
  });

  testWidgets('compact empty state is shorter than the standard card at the same width', (tester) async {
    tester.view.physicalSize = const Size(320, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    const compactKey = ValueKey('compact-empty');
    const standardKey = ValueKey('standard-empty');
    Widget card(Key key, bool compact) => EmptyCard(
      key: key, compact: compact, animated: true, icon: Icons.savings_rounded,
      title: 'No savings accounts',
      body: 'Balance edits don’t affect income, expenses, or transaction history.',
      action: () {}, actionLabel: 'Add savings account',
    );
    await tester.pumpWidget(MaterialApp(home: MediaQuery(
      data: const MediaQueryData(size: Size(320, 800), disableAnimations: true),
      child: Scaffold(body: SingleChildScrollView(
        padding: const EdgeInsets.all(12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [card(compactKey, true), card(standardKey, false)]),
      )),
    )));
    await tester.pumpAndSettle();
    expect(tester.getSize(find.byKey(compactKey)).height,
      lessThan(tester.getSize(find.byKey(standardKey)).height));
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('savings pig moves and stops with reduced motion', (tester) async {
    await tester.pumpWidget(app(false));
    await tester.tap(find.text('Open'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    final pig = find.byIcon(Icons.savings_rounded);
    final first = tester.getCenter(pig);
    await tester.pump(const Duration(milliseconds: 650));
    expect(tester.getCenter(pig), isNot(first));
    await tester.pumpWidget(app(true));
    final stopped = tester.getCenter(pig);
    await tester.pump(const Duration(milliseconds: 650));
    expect(tester.getCenter(pig), stopped);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });
}
