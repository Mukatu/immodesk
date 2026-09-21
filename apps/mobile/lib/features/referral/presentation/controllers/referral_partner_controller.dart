import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/network/api_exception.dart';
import '../../data/referral_providers.dart';
import '../../domain/entities/referral_partner.dart';

part 'referral_partner_controller.g.dart';

/// État de l'écran « Devenir partenaire ». [partner] reste `null` tant que
/// l'utilisateur courant n'a pas encore de compte partenaire
/// (`REFERRALS.PARTNER_NOT_FOUND` sur `GET /v1/referral-partners/me`, un
/// refus attendu et non une erreur à afficher).
class ReferralPartnerState {
  const ReferralPartnerState({
    this.partner,
    this.isRegistering = false,
    this.errorMessage,
  });

  final ReferralPartner? partner;
  final bool isRegistering;
  final String? errorMessage;

  ReferralPartnerState copyWith({
    ReferralPartner? partner,
    bool? isRegistering,
    String? errorMessage,
    bool clearError = false,
  }) {
    return ReferralPartnerState(
      partner: partner ?? this.partner,
      isRegistering: isRegistering ?? this.isRegistering,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

@riverpod
class ReferralPartnerController extends _$ReferralPartnerController {
  @override
  Future<ReferralPartnerState> build() async {
    try {
      final ReferralPartner partner = await ref
          .watch(referralRepositoryProvider)
          .fetchMe();
      return ReferralPartnerState(partner: partner);
    } on ApiException catch (e) {
      if (e.code == 'REFERRALS.PARTNER_NOT_FOUND') {
        return const ReferralPartnerState();
      }
      rethrow;
    }
  }

  Future<void> register({String? displayName}) async {
    final ReferralPartnerState current =
        state.value ?? const ReferralPartnerState();
    state = AsyncData(current.copyWith(isRegistering: true, clearError: true));
    try {
      final ReferralPartner partner = await ref
          .read(referralRepositoryProvider)
          .register(displayName: displayName);
      state = AsyncData(
        ReferralPartnerState(partner: partner, isRegistering: false),
      );
    } on ApiException catch (e) {
      state = AsyncData(
        current.copyWith(isRegistering: false, errorMessage: e.message),
      );
    }
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }
}
