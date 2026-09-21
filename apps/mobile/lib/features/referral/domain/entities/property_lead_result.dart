import 'package:freezed_annotation/freezed_annotation.dart';

part 'property_lead_result.freezed.dart';
part 'property_lead_result.g.dart';

/// `RegisterPropertyLeadResponseDto` (`POST
/// /v1/referral-partners/me/properties`) : aucune ligne `referrals` n'existe
/// encore, seul l'identifiant de l'apport et le numéro masqué où le code de
/// confirmation a été envoyé au bailleur sont connus à ce stade.
@freezed
abstract class PropertyLeadResult with _$PropertyLeadResult {
  const factory PropertyLeadResult({
    required String id,
    required String confirmationSentTo,
  }) = _PropertyLeadResult;

  factory PropertyLeadResult.fromJson(Map<String, dynamic> json) =>
      _$PropertyLeadResultFromJson(json);
}
