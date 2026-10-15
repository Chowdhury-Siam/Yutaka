// Render the real loan interest dialog in both app themes and on a small phone.
// Run: flutter test --no-pub tool/loan_interest_visual_test.dart
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:yutaka/main.dart';
import 'package:yutaka/loans/loan_models.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    final bytes = await File('assets/fonts/Inter-Regular.ttf').readAsBytes();
    for (final family in ['Inter', 'Roboto', 'Ahem']) {
      await (FontLoader(family)
        ..addFont(Future.value(ByteData.sublistView(bytes)))).load();
    }
    await (FontLoader('MaterialIcons')
      ..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'))).load();
  });

  for (final variant in ['none', 'dark', 'light', 'phone']) {
    testWidgets('loan interest visual layout: $variant', (tester) async {
      final phone = variant == 'phone';
      final size = phone ? const Size(320, 568) : const Size(640, 800);
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = size;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final controller = AppController();
      final captureKey = GlobalKey();
      await tester.pumpWidget(ChangeNotifierProvider<AppController>.value(
        value: controller,
        child: Builder(builder: (context) {
          final app = const YutakaApp().build(context) as MaterialApp;
          return MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: variant == 'light' ? app.theme : app.darkTheme,
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context).copyWith(
                disableAnimations: true,
                textScaler: TextScaler.linear(phone ? 1.5 : 1),
              ),
              child: RepaintBoundary(key: captureKey, child: child!),
            ),
            home: Builder(builder: (context) => Scaffold(
              body: Center(child: TextButton(
                onPressed: () => showLoanInterestConfiguration(context,
                  type: variant == 'none' ? LoanInterestType.none : LoanInterestType.compound,
                  period: LoanInterestPeriod.monthly, rate: 12),
                child: const Text('Open interest'),
              )),
            )),
          );
        }),
      ));
      await tester.tap(find.text('Open interest'));
      await tester.pumpAndSettle();
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      final popup = tester.getRect(find.ancestor(of: find.text('Loan interest'), matching: find.byType(Column)).last);
      expect(popup.left, greaterThan(0));
      expect(popup.right, lessThan(size.width));
      expect(popup.top, greaterThan(0));
      expect(popup.bottom, lessThan(size.height));
      await tester.runAsync(() async {
        final boundary = captureKey.currentContext!.findRenderObject()! as RenderRepaintBoundary;
        final image = await boundary.toImage();
        final png = await image.toByteData(format: ui.ImageByteFormat.png);
        final directory = Directory('build/loan-interest-preview')..createSync(recursive: true);
        await File('${directory.path}/interest-$variant.png').writeAsBytes(png!.buffer.asUint8List());
        image.dispose();
      });
      await tester.tap(find.text('Save interest'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      controller.dispose();
    });
  }
}
