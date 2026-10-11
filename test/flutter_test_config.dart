import 'dart:async';

import 'package:google_fonts/google_fonts.dart';

Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  // Exercise the bundled fonts and fail on missing assets rather than fetch
  // fonts over the network in widget tests.
  GoogleFonts.config.allowRuntimeFetching = false;
  await testMain();
}
