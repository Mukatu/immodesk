import 'package:freezed_annotation/freezed_annotation.dart';

import 'lease_document_kind.dart';

part 'lease_document.freezed.dart';
part 'lease_document.g.dart';

/// `LeaseDocument` du contrat de phase 2 : une version d'un document
/// attaché au bail (contrat généré, contrat signé, avenant, etc.).
@freezed
abstract class LeaseDocument with _$LeaseDocument {
  const factory LeaseDocument({
    required String id,
    required String leaseId,
    required LeaseDocumentKind kind,
    required String documentId,
    @Default(1) int version,
    required String title,
    String? effectiveDate,
    @Default(false) bool isSigned,
    String? signedAt,
    String? createdAt,
  }) = _LeaseDocument;

  factory LeaseDocument.fromJson(Map<String, dynamic> json) =>
      _$LeaseDocumentFromJson(json);
}

extension LeaseDocumentDisplay on LeaseDocument {
  /// Ex. `Contrat v1 (signé)` ou `Contrat v2`.
  String get versionLabel =>
      '${kind.label} v$version${isSigned ? ' (signé)' : ''}';
}
