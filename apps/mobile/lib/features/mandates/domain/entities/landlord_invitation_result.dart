import 'package:freezed_annotation/freezed_annotation.dart';

part 'landlord_invitation_result.freezed.dart';
part 'landlord_invitation_result.g.dart';

/// Réponse de `POST /v1/management-mandates/{id}/landlord-invitation`.
@freezed
abstract class LandlordInvitationResult with _$LandlordInvitationResult {
  const factory LandlordInvitationResult({
    required String notificationId,
    required String invitationStatus,
  }) = _LandlordInvitationResult;

  factory LandlordInvitationResult.fromJson(Map<String, dynamic> json) =>
      _$LandlordInvitationResultFromJson(json);
}
