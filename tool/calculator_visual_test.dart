// Render the real calculator in both app themes and on a small phone.
// Run: flutter test --no-pub tool/calculator_visual_test.dart
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:yutaka/main.dart';

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

  for (final variant in ['dark', 'light', 'phone']) {
    testWidgets('calculator visual layout: $variant', (tester) async {
      final phone = variant == 'phone';
      final size = phone ? const Size(320, 568) : const Size(640, 660);
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
                onPressed: () => showYutakaPopup<void>(context,
                  maxWidth: 380, maxHeight: 560, child: const CalculatorPopup()),
                child: const Text('Open calculator'),
              )),
            )),
          );
        }),
      ));
      await tester.tap(find.text('Open calculator'));
      await tester.pumpAndSettle();
      for (final key in ['2', '4', '0', '0', '÷', '3']) {
        await tester.tap(find.widgetWithText(FilledButton, key));
        await tester.pump();
      }
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      final popup = tester.getRect(find.byType(CalculatorPopup));
      expect(popup.left, greaterThan(0));
      expect(popup.right, lessThan(size.width));
      expect(popup.top, greaterThan(0));
      expect(popup.bottom, lessThan(size.height));
      await tester.runAsync(() async {
        final boundary = captureKey.currentContext!.findRenderObject()! as RenderRepaintBoundary;
        final image = await boundary.toImage();
        final png = await image.toByteData(format: ui.ImageByteFormat.png);
        final directory = Directory('build/calculator-preview')..createSync(recursive: true);
        await File('${directory.path}/calculator-$variant.png').writeAsBytes(png!.buffer.asUint8List());
        image.dispose();
      });
      await tester.tap(find.widgetWithText(FilledButton, '='));
      await tester.pumpAndSettle();
      expect(tester.widget<Text>(find.byKey(const ValueKey('calculatorResult'))).data, '800');
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      controller.dispose();
    });
  }
}
