// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'verify_otp_result.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_VerifyOtpResult _$VerifyOtpResultFromJson(Map<String, dynamic> json) =>
    _VerifyOtpResult(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      user: AppUser.fromJson(json['user'] as Map<String, dynamic>),
      organizations: (json['organizations'] as List<dynamic>)
          .map(
            (e) => OrganizationMembership.fromJson(e as Map<String, dynamic>),
          )
          .toList(),
    );

Map<String, dynamic> _$VerifyOtpResultToJson(_VerifyOtpResult instance) =>
    <String, dynamic>{
      'accessToken': instance.accessToken,
      'refreshToken': instance.refreshToken,
      'user': instance.user,
      'organizations': instance.organizations,
    };
