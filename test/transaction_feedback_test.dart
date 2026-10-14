import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yutaka/main.dart';

void main() {
  Widget app({required bool accessibleNavigation, required Future<void> Function() undo,
      bool disableAnimations = false, bool tickerEnabled = true}) => MaterialApp(
    builder: (context, child) => MediaQuery(
      data: MediaQuery.of(context).copyWith(accessibleNavigation: accessibleNavigation, disableAnimations: disableAnimations),
      child: TickerMode(enabled: tickerEnabled, child: child!),
    ),
    home: Scaffold(body: Builder(builder: (context) => Center(child: TextButton(
      onPressed: () => showSnack(context, 'Transaction deleted.', actionLabel: 'Undo', onAction: undo,
          visibleDuration: const Duration(seconds: 8)),
      child: const Text('Show deletion message'),
    )))),
  );

  for (final accessible in [false, true]) {
    testWidgets('Undo feedback appears at the top and expires with accessibility=$accessible', (tester) async {
      await tester.binding.setSurfaceSize(const Size(1200, 800));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      var undone = 0;
      try {
        await tester.pumpWidget(app(accessibleNavigation: accessible, undo: () async { undone++; }));
        await tester.tap(find.text('Show deletion message'));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 300));
        expect(find.byType(SnackBar), findsNothing);
        expect(find.text('Transaction deleted.'), findsOneWidget);
        expect(find.text('Undo'), findsOneWidget);
        expect(tester.getCenter(find.text('Transaction deleted.')).dy, lessThan(130));
        await tester.pump(const Duration(seconds: 8));
        await tester.pump(const Duration(milliseconds: 450));
        expect(find.text('Transaction deleted.'), findsNothing);
        expect(find.text('Undo'), findsNothing);
        expect(undone, 0);
        expect(tester.takeException(), isNull);
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
      }
    });
  }

  testWidgets('Undo runs once and dismisses its banner immediately', (tester) async {
    var undone = 0;
    try {
      await tester.pumpWidget(app(accessibleNavigation: true, undo: () async { undone++; }));
      await tester.tap(find.text('Show deletion message'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      await tester.tap(find.text('Undo'));
      await tester.tap(find.text('Undo'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 450));
      expect(undone, 1);
      expect(find.text('Transaction deleted.'), findsNothing);
      expect(find.text('Undo'), findsNothing);
      await tester.pump(const Duration(seconds: 9));
      expect(undone, 1);
      expect(tester.takeException(), isNull);
    } finally {
      await tester.pumpWidget(const SizedBox.shrink());
    }
  });

  testWidgets('Close dismisses without restoring a transaction', (tester) async {
    var undone = 0;
    try {
      await tester.pumpWidget(app(accessibleNavigation: true, undo: () async { undone++; }));
      await tester.tap(find.text('Show deletion message'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      await tester.tap(find.byTooltip('Dismiss'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 450));
      expect(find.text('Undo'), findsNothing);
      expect(undone, 0);
      expect(tester.takeException(), isNull);
    } finally {
      await tester.pumpWidget(const SizedBox.shrink());
    }
  });

  for (final animationsDisabled in [false, true]) {
    testWidgets('deadline removes feedback when animations are disabled=$animationsDisabled or ticker is muted', (tester) async {
      try {
        await tester.pumpWidget(app(accessibleNavigation: true, disableAnimations: animationsDisabled,
          tickerEnabled: false, undo: () async {}));
        await tester.tap(find.text('Show deletion message'));
        await tester.pump();
        expect(find.text('Undo'), findsOneWidget);
        await tester.pump(const Duration(seconds: 8));
        await tester.pump();
        expect(find.text('Undo'), findsNothing);
        expect(tester.takeException(), isNull);
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
      }
    });
  }
}
