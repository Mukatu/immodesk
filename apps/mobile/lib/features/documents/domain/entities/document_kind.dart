import 'package:json_annotation/json_annotation.dart';

/// `DocumentKind` du contrat d'API (`docs/api/phase1-contract.md`).
enum DocumentKind {
  @JsonValue('ID_DOCUMENT')
  idDocument,
  @JsonValue('LEASE_CONTRACT')
  leaseContract,
  @JsonValue('MANDATE')
  mandate,
  @JsonValue('RECEIPT_PDF')
  receiptPdf,
  @JsonValue('INVOICE_PDF')
  invoicePdf,
  @JsonValue('CASH_RECEIPT_PDF')
  cashReceiptPdf,
  @JsonValue('TRANSFER_PROOF')
  transferProof,
  @JsonValue('CHECK_IMAGE')
  checkImage,
  @JsonValue('BANK_STATEMENT')
  bankStatement,
  @JsonValue('INSPECTION_REPORT')
  inspectionReport,
  @JsonValue('INSPECTION_PHOTO')
  inspectionPhoto,
  @JsonValue('MAINTENANCE_PHOTO')
  maintenancePhoto,
  @JsonValue('SIGNATURE')
  signature,
  @JsonValue('OWNER_STATEMENT_PDF')
  ownerStatementPdf,
  @JsonValue('EXPENSE_INVOICE')
  expenseInvoice,
  @JsonValue('PROPERTY_PHOTO')
  propertyPhoto,
  @JsonValue('OTHER')
  other,
}

extension DocumentKindApiValue on DocumentKind {
  String get apiValue => switch (this) {
    DocumentKind.idDocument => 'ID_DOCUMENT',
    DocumentKind.leaseContract => 'LEASE_CONTRACT',
    DocumentKind.mandate => 'MANDATE',
    DocumentKind.receiptPdf => 'RECEIPT_PDF',
    DocumentKind.invoicePdf => 'INVOICE_PDF',
    DocumentKind.cashReceiptPdf => 'CASH_RECEIPT_PDF',
    DocumentKind.transferProof => 'TRANSFER_PROOF',
    DocumentKind.checkImage => 'CHECK_IMAGE',
    DocumentKind.bankStatement => 'BANK_STATEMENT',
    DocumentKind.inspectionReport => 'INSPECTION_REPORT',
    DocumentKind.inspectionPhoto => 'INSPECTION_PHOTO',
    DocumentKind.maintenancePhoto => 'MAINTENANCE_PHOTO',
    DocumentKind.signature => 'SIGNATURE',
    DocumentKind.ownerStatementPdf => 'OWNER_STATEMENT_PDF',
    DocumentKind.expenseInvoice => 'EXPENSE_INVOICE',
    DocumentKind.propertyPhoto => 'PROPERTY_PHOTO',
    DocumentKind.other => 'OTHER',
  };
}
