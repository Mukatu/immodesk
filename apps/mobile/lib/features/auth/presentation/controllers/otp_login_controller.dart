import 'dart:async';

import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/format/phone_number.dart';
import '../../../../core/network/api_exception.dart';
import '../../data/auth_providers.dart';
import '../../domain/otp_state_machine.dart';
import 'auth_session_controller.dart';

part 'otp_login_controller.g.dart';

/// Étape ayant produit la dernière erreur, afin que chaque écran
/// (téléphone / code) n'affiche que les erreurs qui le concernent — les
/// deux écrans restent montés simultanément dans la pile de navigation
/// (`context.push`), et partagent le même contrôleur.
enum OtpErrorOrigin { none, request, verify }

class OtpLoginState {
  const OtpLoginState({
    this.phase = OtpPhase.enteringPhone,
    this.phone,
    this.errorMessage,
    this.errorCode,
    this.errorOrigin = OtpErrorOrigin.none,
    this.resendAfterSeconds = 60,
    this.secondsUntilResend = 0,
  });

  final OtpPhase phase;
  final String? phone;
  final String? errorMessage;
  final String? errorCode;
  final OtpErrorOrigin errorOrigin;
  final int resendAfterSeconds;
  final int secondsUntilResend;

  bool get canResend => secondsUntilResend <= 0;

  OtpLoginState copyWith({
    OtpPhase? phase,
    String? phone,
    String? errorMessage,
    bool clearError = false,
    String? errorCode,
    OtpErrorOrigin? errorOrigin,
    int? resendAfterSeconds,
    int? secondsUntilResend,
  }) {
    return OtpLoginState(
      phase: phase ?? this.phase,
      phone: phone ?? this.phone,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      errorCode: clearError ? null : (errorCode ?? this.errorCode),
      errorOrigin: clearError
          ? OtpErrorOrigin.none
          : (errorOrigin ?? this.errorOrigin),
      resendAfterSeconds: resendAfterSeconds ?? this.resendAfterSeconds,
      secondsUntilResend: secondsUntilResend ?? this.secondsUntilResend,
    );
  }
}

/// Contrôleur du parcours « connexion OTP » : demande de code, décompte de
/// renvoi (60 s), vérification. Délègue les transitions à
/// [OtpStateMachine] (testée isolément) et déclenche la mise à jour de la
/// session globale via [AuthSessionController] une fois le code vérifié.
@riverpod
class OtpLoginController extends _$OtpLoginController {
  final OtpStateMachine _machine = OtpStateMachine();
  Timer? _resendTimer;

  @override
  OtpLoginState build() {
    ref.onDispose(() => _resendTimer?.cancel());
    return const OtpLoginState();
  }

  Future<void> requestCode(String rawPhone) async {
    final String? phone = normalizeCongoPhone(rawPhone);
    if (phone == null) {
      state = state.copyWith(
        errorMessage:
            'Numéro invalide. Utilisez le format +242 06 XXX XX XX.',
        errorCode: 'PHONE.INVALID',
        errorOrigin: OtpErrorOrigin.request,
      );
      return;
    }

    _machine.startRequest();
    state = state.copyWith(
      phase: _machine.phase,
      phone: phone,
      clearError: true,
    );

    try {
      final result = await ref
          .read(authRepositoryProvider)
          .requestOtp(phone: phone);
      _machine.requestSucceeded();
      state = state.copyWith(
        phase: _machine.phase,
        resendAfterSeconds: result.resendAfterSeconds,
        secondsUntilResend: result.resendAfterSeconds,
        clearError: true,
      );
      _startResendTimer();
    } on ApiException catch (e) {
      _machine.requestFailed(e.code);
      state = state.copyWith(
        phase: _machine.phase,
        errorMessage: e.message,
        errorCode: e.code,
        errorOrigin: OtpErrorOrigin.request,
      );
    }
  }

  Future<bool> verifyCode(String code) async {
    final String? phone = state.phone;
    if (phone == null) return false;

    _machine.startVerification();
    state = state.copyWith(phase: _machine.phase, clearError: true);

    try {
      final result = await ref
          .read(authRepositoryProvider)
          .verifyOtp(phone: phone, code: code, deviceName: 'Flutter mobile');
      _machine.verificationSucceeded();
      state = state.copyWith(phase: _machine.phase, clearError: true);
      await ref
          .read(authSessionControllerProvider.notifier)
          .setSession(result.user, result.organizations);
      return true;
    } on ApiException catch (e) {
      _machine.verificationFailed(e.code);
      state = state.copyWith(
        phase: _machine.phase,
        errorMessage: e.message,
        errorCode: e.code,
        errorOrigin: OtpErrorOrigin.verify,
      );
      return false;
    }
  }

  void _startResendTimer() {
    _resendTimer?.cancel();
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      final int remaining = state.secondsUntilResend - 1;
      if (remaining <= 0) {
        state = state.copyWith(secondsUntilResend: 0);
        timer.cancel();
      } else {
        state = state.copyWith(secondsUntilResend: remaining);
      }
    });
  }

  void reset() {
    _resendTimer?.cancel();
    _machine.reset();
    state = const OtpLoginState();
  }
}
