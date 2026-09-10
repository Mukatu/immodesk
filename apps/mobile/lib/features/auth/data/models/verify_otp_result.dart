import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../organizations/domain/entities/organization_membership.dart';
import '../../domain/entities/app_user.dart';

part 'verify_otp_result.freezed.dart';
part 'verify_otp_result.g.dart';

/// Réponse de `POST /v1/auth/otp/verify`.
@freezed
abstract class VerifyOtpResult with _$VerifyOtpResult {
  const factory VerifyOtpResult({
    required String accessToken,
    required String refreshToken,
    required AppUser user,
    required List<OrganizationMembership> organizations,
  }) = _VerifyOtpResult;

  factory VerifyOtpResult.fromJson(Map<String, dynamic> json) =>
      _$VerifyOtpResultFromJson(json);
}
