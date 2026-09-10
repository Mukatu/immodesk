import 'package:freezed_annotation/freezed_annotation.dart';

part 'otp_request_result.freezed.dart';
part 'otp_request_result.g.dart';

/// Réponse de `POST /v1/auth/otp/request`.
@freezed
abstract class OtpRequestResult with _$OtpRequestResult {
  const factory OtpRequestResult({
    required String requestId,
    required String channel,
    required int expiresInSeconds,
    required int resendAfterSeconds,
  }) = _OtpRequestResult;

  factory OtpRequestResult.fromJson(Map<String, dynamic> json) =>
      _$OtpRequestResultFromJson(json);
}
