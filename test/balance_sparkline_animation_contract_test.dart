import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yutaka/main.dart';

Future<List<int>> pixels(CustomPainter painter, Size size) async {
  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder)..scale(2);
  painter.paint(canvas, size);
  final picture = recorder.endRecording();
  final image = await picture.toImage((size.width * 2).round(), (size.height * 2).round());
  final data = await image.toByteData(format: ui.ImageByteFormat.rawRgba);
  final result = data!.buffer.asUint8List().toList();
  image.dispose();
  picture.dispose();
  return result;
}

void main() {
  for (final width in [280.0, 720.0]) {
    testWidgets('balance wave animates through a seamless loop at width $width', (tester) async {
      Widget app(bool reduced) => MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(disableAnimations: reduced),
          child: child!,
        ),
        home: Scaffold(body: Center(child: SizedBox(
          width: width,
          child: BalanceHeroCard(
            balance: '0', income: '0', expense: '0', subtitle: '0 accounts total',
            amountsHidden: false, onToggleAmounts: () {},
          ),
        ))),
      );
      await tester.pumpWidget(app(false));
      final wave = find.byKey(const ValueKey('balance-wave'));
      final painter = tester.widget<CustomPaint>(wave).painter!;
      final size = tester.getSize(wave);
      expect(size.height, 48);
      final initial = await tester.runAsync(() => pixels(painter, size));
      expect(initial, isNotNull);
      expect(initial!.any((value) => value != 0), isTrue);

      await tester.pump(const Duration(milliseconds: 900));
      expect(tester.widget<CustomPaint>(wave).painter, same(painter));
      expect(await tester.runAsync(() => pixels(painter, size)), isNot(equals(initial)));
      await tester.pump(const Duration(milliseconds: 2700));
      expect(await tester.runAsync(() => pixels(painter, size)), equals(initial));

      await tester.pumpWidget(app(true));
      final stillPainter = tester.widget<CustomPaint>(wave).painter!;
      final still = await tester.runAsync(() => pixels(stillPainter, size));
      await tester.pump(const Duration(seconds: 1));
      expect(await tester.runAsync(() => pixels(stillPainter, size)), equals(still));
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    });
  }
}
