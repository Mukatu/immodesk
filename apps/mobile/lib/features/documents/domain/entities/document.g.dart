// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'document.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Document _$DocumentFromJson(Map<String, dynamic> json) => _Document(
  id: json['id'] as String,
  kind: $enumDecode(_$DocumentKindEnumMap, json['kind']),
  fileName: json['fileName'] as String,
  mimeType: json['mimeType'] as String,
  sizeBytes: (json['sizeBytes'] as num).toInt(),
  relatedEntityType: json['relatedEntityType'] as String?,
  relatedEntityId: json['relatedEntityId'] as String?,
  uploadedAt: json['uploadedAt'] as String,
);

Map<String, dynamic> _$DocumentToJson(_Document instance) => <String, dynamic>{
  'id': instance.id,
  'kind': _$DocumentKindEnumMap[instance.kind]!,
  'fileName': instance.fileName,
  'mimeType': instance.mimeType,
  'sizeBytes': instance.sizeBytes,
  'relatedEntityType': instance.relatedEntityType,
  'relatedEntityId': instance.relatedEntityId,
  'uploadedAt': instance.uploadedAt,
};

const _$DocumentKindEnumMap = {
  DocumentKind.idDocument: 'ID_DOCUMENT',
  DocumentKind.leaseContract: 'LEASE_CONTRACT',
  DocumentKind.mandate: 'MANDATE',
  DocumentKind.receiptPdf: 'RECEIPT_PDF',
  DocumentKind.invoicePdf: 'INVOICE_PDF',
  DocumentKind.cashReceiptPdf: 'CASH_RECEIPT_PDF',
  DocumentKind.transferProof: 'TRANSFER_PROOF',
  DocumentKind.checkImage: 'CHECK_IMAGE',
  DocumentKind.bankStatement: 'BANK_STATEMENT',
  DocumentKind.inspectionReport: 'INSPECTION_REPORT',
  DocumentKind.inspectionPhoto: 'INSPECTION_PHOTO',
  DocumentKind.maintenancePhoto: 'MAINTENANCE_PHOTO',
  DocumentKind.signature: 'SIGNATURE',
  DocumentKind.ownerStatementPdf: 'OWNER_STATEMENT_PDF',
  DocumentKind.expenseInvoice: 'EXPENSE_INVOICE',
  DocumentKind.propertyPhoto: 'PROPERTY_PHOTO',
  DocumentKind.other: 'OTHER',
};
