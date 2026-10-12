import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yutaka/app_config.dart';
import 'package:yutaka/main.dart';
import 'package:yutaka/sync_models.dart';
import 'package:yutaka/worker_deployment.dart';

class GuidanceCredentialStore extends WorkerDeploymentCredentialStore {
  GuidanceCredentialStore({this.profile, this.gate});

  final WorkerDeploymentProfile? profile;
  final Completer<WorkerDeploymentProfile?>? gate;

  @override
  Future<WorkerDeploymentProfile?> read({String workerUrl = ''}) async =>
      gate == null ? profile : await gate!.future;
}

const savedDeployment = WorkerDeploymentProfile(
  workerName: 'existing-worker',
  cloudflareAccountId: '0123456789abcdef0123456789abcdef',
  cloudflareApiToken: 'test-token',
  tursoDatabaseUrl: 'libsql://test.turso.io',
  tursoAuthToken: 'test-token',
  jwtSecret: '0123456789abcdef0123456789abcdef',
  workerUrl: 'https://existing-worker.workers.dev',
  workerVersion: '1.0.1290',
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() => SharedPreferences.setMockInitialValues({}));

  Finder button(String label) => find.ancestor(
    of: find.text(label),
    matching: find.byWidgetPredicate((widget) => widget is ButtonStyleButton),
  );

  Future<void> open(
    WidgetTester tester,
    AppController controller, {
    GuidanceCredentialStore? store,
    String video = '',
    bool largeText = false,
  }) async {
    addTearDown(controller.dispose);
    await tester.binding.setSurfaceSize(const Size(360, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(ChangeNotifierProvider<AppController>.value(
      value: controller,
      child: MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(largeText ? 1.4 : 1),
          ),
          child: child!,
        ),
        home: WorkerDeploymentScreen(
          credentialStore: store ?? GuidanceCredentialStore(),
          videoUrl: video,
        ),
      ),
    ));
    await tester.pumpAndSettle();
  }

  testWidgets('first deployment offers guidance and Skip does not mark success', (tester) async {
    final controller = AppController();
    await open(tester, controller, video: 'https://youtu.be/walkthrough', largeText: true);
    expect(find.text('Before you deploy'), findsOneWidget);
    expect(find.text('Read README'), findsOneWidget);
    final video = tester.widget<ButtonStyleButton>(button('Watch YouTube'));
    expect(video.onPressed, isNotNull);
    await tester.tap(find.text('Skip'));
    await tester.pumpAndSettle();
    expect(find.text('Before you deploy'), findsNothing);
    expect(find.text('Deploy Worker'), findsOneWidget);
    expect(await controller.prefs.getBool(kWorkerDeploymentCompletedPreferenceKey, false), isFalse);
    expect(tester.takeException(), isNull);
  });

  testWidgets('missing video is unavailable while README and Skip remain enabled', (tester) async {
    await open(tester, AppController());
    final video = tester.widget<ButtonStyleButton>(button('Watch YouTube'));
    expect(video.onPressed, isNull);
    expect(find.text('Video guide is not available in this build.'), findsOneWidget);
    expect(tester.widget<ButtonStyleButton>(button('Read README')).onPressed, isNotNull);
    await tester.tap(find.text('Skip'));
    await tester.pumpAndSettle();
    expect(find.text('Before you deploy'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  for (final existing in ['credentials', 'validated Worker', 'saved Worker', 'completed deployment']) {
    testWidgets('$existing bypasses guidance and retains deployment history', (tester) async {
      final controller = AppController();
      final store = GuidanceCredentialStore(
        profile: existing == 'credentials' ? savedDeployment : null,
      );
      if (existing == 'validated Worker') {
        controller.selfHostedSyncApiBaseUrl = savedDeployment.workerUrl;
        controller.selfHostedSyncEndpointValidated = true;
      } else if (existing == 'saved Worker') {
        controller.savedSyncWorkers = [
          SavedSyncWorker(id: 'worker', url: savedDeployment.workerUrl, lastUsedAt: 1),
        ];
      } else if (existing == 'completed deployment') {
        SharedPreferences.setMockInitialValues({kWorkerDeploymentCompletedPreferenceKey: true});
      }
      await open(tester, controller, store: store);
      expect(find.text('Before you deploy'), findsNothing);
      expect(find.text('Deploy Worker'), findsOneWidget);
      expect(await controller.prefs.getBool(kWorkerDeploymentCompletedPreferenceKey, false), isTrue);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('an unvalidated URL does not count as an existing deployment', (tester) async {
    final controller = AppController()..selfHostedSyncApiBaseUrl = 'https://not-ready.workers.dev';
    await open(tester, controller);
    expect(find.text('Before you deploy'), findsOneWidget);
    await tester.tap(find.text('Skip'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('leaving before credentials load never opens a late popup', (tester) async {
    final gate = Completer<WorkerDeploymentProfile?>();
    await open(tester, AppController(), store: GuidanceCredentialStore(gate: gate));
    expect(find.text('Before you deploy'), findsNothing);
    await tester.pumpWidget(const SizedBox.shrink());
    gate.complete(null);
    await tester.pumpAndSettle();
    expect(find.text('Before you deploy'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  test('walkthrough URLs must be HTTPS YouTube links', () {
    for (final url in [
      'https://youtu.be/walkthrough',
      ' https://www.youtube.com/watch?v=walkthrough ',
      'https://m.youtube.com/shorts/walkthrough',
    ]) {
      expect(workerDeploymentVideoUri(url), isNotNull);
    }
    for (final url in [
      '', 'not a URL', 'http://youtu.be/walkthrough',
      'https://youtube.com.evil.test/watch?v=walkthrough',
      'https://user@youtube.com/watch?v=walkthrough',
      'https://youtube.com:444/watch?v=walkthrough',
      'https://youtube.com/',
    ]) {
      expect(workerDeploymentVideoUri(url), isNull);
    }
  });

  test('every release embeds the Actions video variable and successful deployment marker', () {
    for (final platform in ['android-apks', 'windows', 'linux', 'macos']) {
      final workflow = File('.github/workflows/build-$platform.yml').readAsStringSync();
      expect(workflow, contains(r'vars.YUTAKA_DEPLOYMENT_VIDEO_URL'));
      expect(workflow, contains(r'vars.YUTAKA_DEPLOYMENT_VIDEO_URL || secrets.YUTAKA_DEPLOYMENT_VIDEO_URL'));
      expect(workflow, contains('--dart-define=YUTAKA_DEPLOYMENT_VIDEO_URL='));
    }
    final android = File('.github/workflows/build-android-apks.yml').readAsStringSync();
    expect(RegExp('--dart-define=YUTAKA_DEPLOYMENT_VIDEO_URL=').allMatches(android), hasLength(2));
    final main = File('lib/main.dart').readAsStringSync();
    final deploy = main.substring(main.indexOf('  Future<void> _deploy() async {'),
        main.indexOf("      final profile = WorkerDeploymentProfile(", main.indexOf('  Future<void> _deploy() async {')));
    expect(deploy.indexOf('await service.deploy('), lessThan(deploy.indexOf('await state.prefs.setBool(kWorkerDeploymentCompletedPreferenceKey, true)')));
  });
}

