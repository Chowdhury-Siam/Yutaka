import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('self-hosted authentication uses username without in-app password recovery', () {
    final app = File('lib/main.dart').readAsStringSync();
    final api = File('lib/sync_services.dart').readAsStringSync();
    final models = File('lib/sync_models.dart').readAsStringSync();

    expect(app, contains("labelText: 'Username'"));
    expect(app, isNot(contains("Text('Forgot password?')")));
    expect(app, isNot(contains('class _AccountRecoveryPopup')));
    expect(app, isNot(contains('class _RecoveryKeyPopup')));
    expect(app, isNot(contains('recoverSyncAccount(')));
    expect(app, isNot(contains('rotateSyncRecoveryKey()')));
    expect(api, contains("'username': username"));
    expect(api, isNot(contains("'/v1/auth/recover'")));
    expect(api, isNot(contains("'/v1/auth/recovery-key'")));
    expect(models, contains('final String username;'));
    expect(models, isNot(contains('recoveryKey')));
  });

  test('center popups keep fixed content with a bounded scrollable interest form', () {
    final app = File('lib/main.dart').readAsStringSync();
    final loans = File('lib/loans/loan_sheets.dart').readAsStringSync();
    final profile = File('lib/profile/profile_ui.dart').readAsStringSync();

    expect(app, contains('class YutakaPopupContent extends StatelessWidget'));
    expect(app, contains('fit: BoxFit.scaleDown'));

    final popupStart = app.indexOf('class YutakaPopupContent extends StatelessWidget');
    final popupEnd = app.indexOf('// -----------------------------------------------------------------------------\n// Onboarding', popupStart);
    final popupBody = app.substring(popupStart, popupEnd);
    expect(popupBody, isNot(contains('SingleChildScrollView(')));
    final interestStart = loans.indexOf('Future<LoanInterestConfiguration?> showLoanInterestConfiguration(');
    final interestEnd = loans.indexOf('Future<void> showLoanEditorSheet', interestStart);
    expect(interestStart, greaterThanOrEqualTo(0));
    expect(interestEnd, greaterThan(interestStart));
    final interest = loans.substring(interestStart, interestEnd);
    expect(interest, contains('Flexible('));
    expect(interest, contains('SingleChildScrollView('));
    expect(interest, isNot(contains('YutakaPopupContent(')));
    final loanEditors = loans.substring(0, interestStart) +
        loans.substring(interestEnd, loans.indexOf('Future<void> showLoanPreferencesSheet'));
    expect(loanEditors, isNot(contains('SingleChildScrollView(')));
    expect(profile, isNot(contains('SingleChildScrollView(')));
  });
}
