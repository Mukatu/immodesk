// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'upload_url_result.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_UploadUrlResult _$UploadUrlResultFromJson(Map<String, dynamic> json) =>
    _UploadUrlResult(
      uploadUrl: json['uploadUrl'] as String,
      objectKey: json['objectKey'] as String,
      expiresAt: json['expiresAt'] as String,
      maxSizeBytes: (json['maxSizeBytes'] as num).toInt(),
    );

Map<String, dynamic> _$UploadUrlResultToJson(_UploadUrlResult instance) =>
    <String, dynamic>{
      'uploadUrl': instance.uploadUrl,
      'objectKey': instance.objectKey,
      'expiresAt': instance.expiresAt,
      'maxSizeBytes': instance.maxSizeBytes,
    };

_DownloadUrlResult _$DownloadUrlResultFromJson(Map<String, dynamic> json) =>
    _DownloadUrlResult(
      downloadUrl: json['downloadUrl'] as String,
      expiresAt: json['expiresAt'] as String,
    );

Map<String, dynamic> _$DownloadUrlResultToJson(_DownloadUrlResult instance) =>
    <String, dynamic>{
      'downloadUrl': instance.downloadUrl,
      'expiresAt': instance.expiresAt,
    };
