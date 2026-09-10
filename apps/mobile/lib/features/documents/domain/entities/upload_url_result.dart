import 'package:freezed_annotation/freezed_annotation.dart';

part 'upload_url_result.freezed.dart';
part 'upload_url_result.g.dart';

/// Réponse de `POST /v1/documents/upload-url` : URL signée pour un envoi
/// direct au stockage, sans transiter par l'API.
@freezed
abstract class UploadUrlResult with _$UploadUrlResult {
  const factory UploadUrlResult({
    required String uploadUrl,
    required String objectKey,
    required String expiresAt,
    required int maxSizeBytes,
  }) = _UploadUrlResult;

  factory UploadUrlResult.fromJson(Map<String, dynamic> json) =>
      _$UploadUrlResultFromJson(json);
}

/// Réponse de `GET /v1/documents/{id}/download-url`.
@freezed
abstract class DownloadUrlResult with _$DownloadUrlResult {
  const factory DownloadUrlResult({
    required String downloadUrl,
    required String expiresAt,
  }) = _DownloadUrlResult;

  factory DownloadUrlResult.fromJson(Map<String, dynamic> json) =>
      _$DownloadUrlResultFromJson(json);
}
