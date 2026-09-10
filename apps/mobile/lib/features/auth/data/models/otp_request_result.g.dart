// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'otp_request_result.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_OtpRequestResult _$OtpRequestResultFromJson(Map<String, dynamic> json) =>
    _OtpRequestResult(
      requestId: json['requestId'] as String,
      channel: json['channel'] as String,
      expiresInSeconds: (json['expiresInSeconds'] as num).toInt(),
      resendAfterSeconds: (json['resendAfterSeconds'] as num).toInt(),
    );

Map<String, dynamic> _$OtpRequestResultToJson(_OtpRequestResult instance) =>
    <String, dynamic>{
      'requestId': instance.requestId,
      'channel': instance.channel,
      'expiresInSeconds': instance.expiresInSeconds,
      'resendAfterSeconds': instance.resendAfterSeconds,
    };
