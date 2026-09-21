import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/network/api_exception.dart';
import '../../data/referral_providers.dart';
import '../../domain/entities/property_lead_result.dart';

part 'property_lead_controller.g.dart';

/// Formulaire « Enregistrer un immeuble démarché » (`POST
/// /v1/referral-partners/me/properties`). Aucune ligne `referrals` n'existe
/// tant que le bailleur n'a pas confirmé par OTP : [result] ne porte que
/// l'identifiant de l'apport et le numéro masqué destinataire du code.
class PropertyLeadFormState {
  const PropertyLeadFormState({
    this.landlordPhone = '',
    this.note = '',
    this.channel = 'WHATSAPP',
    this.isSubmitting = false,
    this.errorMessage,
    this.result,
  });

  final String landlordPhone;
  final String note;
  final String channel;
  final bool isSubmitting;
  final String? errorMessage;
  final PropertyLeadResult? result;

  bool get canSubmit => !isSubmitting && landlordPhone.trim().length >= 8;

  PropertyLeadFormState copyWith({
    String? landlordPhone,
    String? note,
    String? channel,
    bool? isSubmitting,
    String? errorMessage,
    bool clearError = false,
    PropertyLeadResult? result,
  }) {
    return PropertyLeadFormState(
      landlordPhone: landlordPhone ?? this.landlordPhone,
      note: note ?? this.note,
      channel: channel ?? this.channel,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      result: result ?? this.result,
    );
  }
}

@riverpod
class PropertyLeadController extends _$PropertyLeadController {
  @override
  PropertyLeadFormState build() => const PropertyLeadFormState();

  void setLandlordPhone(String value) =>
      state = state.copyWith(landlordPhone: value, clearError: true);

  void setNote(String value) => state = state.copyWith(note: value);

  void setChannel(String value) => state = state.copyWith(channel: value);

  Future<void> submit() async {
    if (!state.canSubmit) return;
    state = state.copyWith(isSubmitting: true, clearError: true);
    try {
      final PropertyLeadResult result = await ref
          .read(referralRepositoryProvider)
          .registerPropertyLead(
            landlordPhone: state.landlordPhone.trim(),
            note: state.note,
            channel: state.channel,
          );
      state = state.copyWith(isSubmitting: false, result: result);
    } on ApiException catch (e) {
      state = state.copyWith(isSubmitting: false, errorMessage: e.message);
    }
  }
}
