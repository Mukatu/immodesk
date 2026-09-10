import 'package:freezed_annotation/freezed_annotation.dart';

import 'document_kind.dart';

part 'document.freezed.dart';
part 'document.g.dart';

/// Document/photo enregistré côté API (`Document` du contrat de phase 1).
@freezed
abstract class Document with _$Document {
  const factory Document({
    required String id,
    required DocumentKind kind,
    required String fileName,
    required String mimeType,
    required int sizeBytes,
    String? relatedEntityType,
    String? relatedEntityId,
    required String uploadedAt,
  }) = _Document;

  factory Document.fromJson(Map<String, dynamic> json) =>
      _$DocumentFromJson(json);
}
