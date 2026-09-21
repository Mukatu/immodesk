import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/network/api_exception.dart';
import '../../../auth/domain/otp_state_machine.dart';
import '../../data/referral_providers.dart';
import '../../domain/entities/referral.dart';

part 'property_lead_confirmation_controller.g.dart';

/// État de l'écran PUBLIC de confirmation, par le bailleur, de l'apport
/// d'affaires déclaré par un partenaire (`POST
/// /v1/referral-partners/me/properties/{id}/confirm-otp`). Le bailleur n'a
/// ni compte ni session : seul le code à usage unique reçu par SMS/WhatsApp
/// est demandé, sur le modèle exact d'`OtpStateMachine`.
class PropertyLeadConfirmationState {
  const PropertyLeadConfirmationState({
    required this.phase,
    this.code = '',
    this.errorMessage,
    this.referral,
  });

  final OtpPhase phase;
  final String code;
  final String? errorMessage;
  final Referral? referral;

  bool get canSubmit =>
      (phase == OtpPhase.codeSent || phase == OtpPhase.invalidCode) &&
      code.trim().length >= 4;

  PropertyLeadConfirmationState copyWith({
    OtpPhase? phase,
    String? code,
    String? errorMessage,
    bool clearError = false,
    Referral? referral,
  }) {
    return PropertyLeadConfirmationState(
      phase: phase ?? this.phase,
      code: code ?? this.code,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      referral: referral ?? this.referral,
    );
  }
}

@riverpod
class PropertyLeadConfirmationController
    extends _$PropertyLeadConfirmationController {
  final OtpStateMachine _machine = OtpStateMachine();

  @override
  PropertyLeadConfirmationState build(String propertyLeadId) {
    // Le code a déjà été envoyé par le partenaire (`POST .../properties`) :
    // l'écran démarre directement au stade « code reçu », sans demande.
    _machine.startRequest();
    _machine.requestSucceeded();
    return PropertyLeadConfirmationState(phase: _machine.phase);
  }

  void setCode(String value) =>
      state = state.copyWith(code: value, clearError: true);

  Future<void> submit() async {
    if (!state.canSubmit) return;
    _machine.startVerification();
    state = state.copyWith(phase: _machine.phase, clearError: true);
    try {
      final Referral referral = await ref
          .read(referralRepositoryProvider)
          .confirmPropertyLead(
            propertyLeadId: propertyLeadId,
            code: state.code.trim(),
          );
      _machine.verificationSucceeded();
      state = state.copyWith(phase: _machine.phase, referral: referral);
    } on ApiException catch (e) {
      _machine.verificationFailed(e.code);
      state = state.copyWith(phase: _machine.phase, errorMessage: e.message);
    }
  }
}
