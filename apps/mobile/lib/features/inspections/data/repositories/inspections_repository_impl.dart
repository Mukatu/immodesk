import 'dart:io';
import 'dart:typed_data';

import '../../../documents/domain/entities/document_kind.dart';
import '../../../documents/domain/repositories/documents_repository.dart';
import '../../domain/entities/charged_to.dart';
import '../../domain/entities/inspection_condition.dart';
import '../../domain/entities/inspection_draft.dart';
import '../../domain/entities/inspection_item_draft.dart';
import '../../domain/entities/inspection_submit_result.dart';
import '../../domain/entities/inspection_type.dart';
import '../../domain/repositories/inspections_repository.dart';
import '../datasources/inspections_remote_data_source.dart';

/// Orchestre la séquence en ligne du contrat (création, postes, photos,
/// signature — voir `docs/api/phase8-contract.md`). Chaque photo et
/// signature suit le chemin déjà en place du module documents (URL signée,
/// PUT, enregistrement) avant d'être référencée par son `documentId`.
class InspectionsRepositoryImpl implements InspectionsRepository {
  InspectionsRepositoryImpl(this._remote, this._documents);

  final InspectionsRemoteDataSource _remote;
  final DocumentsRepository _documents;

  Future<String> _uploadFile({
    required String organizationId,
    required String filePath,
    required DocumentKind kind,
    required String fileName,
  }) async {
    final File file = File(filePath);
    final int sizeBytes = await file.length();
    final upload = await _documents.requestUploadUrl(
      organizationId: organizationId,
      fileName: fileName,
      mimeType: 'image/jpeg',
      sizeBytes: sizeBytes,
      kind: kind,
    );
    await _documents.putFile(
      uploadUrl: upload.uploadUrl,
      file: file,
      mimeType: 'image/jpeg',
    );
    final document = await _documents.registerDocument(
      organizationId: organizationId,
      objectKey: upload.objectKey,
      fileName: fileName,
      mimeType: 'image/jpeg',
      sizeBytes: sizeBytes,
      kind: kind,
    );
    return document.id;
  }

  Future<String> _uploadBytes({
    required String organizationId,
    required Uint8List bytes,
    required DocumentKind kind,
    required String fileName,
  }) async {
    final Directory tmp = await Directory.systemTemp.createTemp('immodesk_edl');
    final File file = File('${tmp.path}/$fileName');
    await file.writeAsBytes(bytes);
    return _uploadFile(
      organizationId: organizationId,
      filePath: file.path,
      kind: kind,
      fileName: fileName,
    );
  }

  @override
  Future<InspectionSubmitResult> submitOnline({
    required String organizationId,
    required InspectionDraft draft,
    required String clientRef,
    Uint8List? tenantSignaturePngBytes,
    required Uint8List agentSignaturePngBytes,
  }) async {
    String? tenantSignatureDocumentId;
    if (tenantSignaturePngBytes != null) {
      tenantSignatureDocumentId = await _uploadBytes(
        organizationId: organizationId,
        bytes: tenantSignaturePngBytes,
        kind: DocumentKind.signature,
        fileName: 'signature_locataire_$clientRef.png',
      );
    }
    final String agentSignatureDocumentId = await _uploadBytes(
      organizationId: organizationId,
      bytes: agentSignaturePngBytes,
      kind: DocumentKind.signature,
      fileName: 'signature_agence_$clientRef.png',
    );

    final String inspectionId = await _remote
        .createInspection(organizationId, <String, dynamic>{
          'unitId': draft.unitId,
          'leaseId': ?draft.leaseId,
          'tenantId': ?draft.tenantId,
          'inspectionType': draft.inspectionType.apiValue,
          'tenantPresent': draft.tenantPresent,
          'notes': ?draft.notes,
          'clientRef': clientRef,
        });

    for (final InspectionItemDraft item in draft.items) {
      final String itemId = await _remote.addItem(
        organizationId,
        inspectionId,
        _itemBody(item),
      );
      int photoIndex = 0;
      for (final String path in item.photoPaths) {
        photoIndex++;
        final String documentId = await _uploadFile(
          organizationId: organizationId,
          filePath: path,
          kind: DocumentKind.inspectionPhoto,
          fileName: '${item.localId}_$photoIndex.jpg',
        );
        await _remote.addPhoto(
          organizationId,
          inspectionId,
          itemId,
          documentId,
        );
      }
    }

    final Map<String, dynamic> result = await _remote
        .sign(organizationId, inspectionId, <String, dynamic>{
          'tenantSignatureDocumentId': ?tenantSignatureDocumentId,
          'agentSignatureDocumentId': agentSignatureDocumentId,
          'tenantPresent': draft.tenantPresent,
          'absenceReason': ?draft.absenceReason,
        });

    return InspectionSubmitResult(
      id: result['id'] as String,
      reference: result['reference'] as String,
      status: result['status'] as String,
    );
  }

  Map<String, dynamic> _itemBody(InspectionItemDraft item) => <String, dynamic>{
    'roomLabel': item.roomLabel,
    'elementLabel': item.elementLabel,
    'elementCategory': ?item.elementCategory,
    'condition': item.condition.apiValue,
    'isDamaged': item.condition.requiresPhoto,
    'damageDescription': ?item.damageDescription,
    'repairAmount': ?item.repairAmount,
    'chargedTo': ?item.chargedTo?.apiValue,
  };
}
