import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:yutaka/category_deduplication.dart';
import 'package:yutaka/data_merge.dart';

Map<String, dynamic> change(String type, String id, Map<String, dynamic> payload,
    {String operation = 'upsert'}) => {
  'entityType': type, 'entityId': id, 'operation': operation, 'payload': payload,
};

void main() {
  test('empty and merely seeded accounts still need setup', () {
    expect(syncAccountHasCompletedSetup([]), isFalse);
    expect(syncAccountHasCompletedSetup([
      change('categories', 'food', {'name': 'Food'}),
      change('preferences', 'yutaka', {'currencyCode': 'BDT'}),
    ]), isFalse);
  });

  test('explicit pending setup wins over partially entered finance records', () {
    expect(syncAccountHasCompletedSetup([
      change('accounts', 'cash', {'amount': 1000}),
      change('preferences', 'yutaka', {'accountSetupCompleted': false}),
    ]), isFalse);
  });

  test('completed setup survives even when all finance records are empty', () {
    expect(syncAccountHasCompletedSetup([
      change('preferences', 'yutaka', {'accountSetupCompleted': true}),
    ]), isTrue);
  });

  test('returning legacy accounts with finance data bypass setup', () {
    expect(syncAccountHasCompletedSetup([
      change('accounts', 'cash', {'amount': 1000}),
    ]), isTrue);
    expect(syncAccountHasCompletedSetup([
      change('accounts', 'cash', {'amount': 1000}),
      change('accounts', 'cash', {}, operation: 'delete'),
    ]), isFalse);
  });

  test('an unfinished device cannot downgrade a completed setup marker', () {
    final merged = mergeFinancePreferences(
      {'accountSetupCompleted': true}, {'accountSetupCompleted': false}, CategoryMergePlan.empty);
    expect(merged['accountSetupCompleted'], isTrue);
  });

  test('login, restart and UI completion require evidence of configured setup', () {
    final source = File('lib/main.dart').readAsStringSync();
    expect(source, contains('!onboardingCompleted && accountSetupCompleted && cloudSyncError == null'));
    expect(source, contains("await prefs.getBool('accountSetupCompleted', false)"));
    expect(source, contains('Navigator.pop(context, !state.onboardingCompleted)'));
    final screen = source.split('class _MultiDeviceSyncScreenState')[1];
    expect(screen, isNot(contains('await state.completeOnboarding();')));
    final completion = source.split('Future<void> completeOnboarding() async {')[1].split('Account? accountOf')[0];
    expect(completion.indexOf('onboardingCompleted = true'),
        lessThan(completion.indexOf('await resolveNewSyncAccountWithLocalSetup()')));
  });
}
