import '../../domain/entities/momo_quote.dart';
import '../../domain/entities/momo_transaction.dart';
import '../../domain/entities/payment_instructions.dart';
import '../../domain/entities/transfer_declaration_result.dart';
import '../../domain/repositories/payments_repository.dart';
import '../datasources/payments_remote_data_source.dart';

/// Paiements de la phase 4 : aucun cache local, en ligne uniquement (voir
/// `PaymentsOfflineMessage`) — contrairement au portefeuille et à la
/// tournée, ces écritures ne doivent jamais rejouer une copie locale.
class PaymentsRepositoryImpl implements PaymentsRepository {
  PaymentsRepositoryImpl(this._remote);

  final PaymentsRemoteDataSource _remote;

  @override
  Future<PaymentInstructions> fetchPaymentInstructions({
    required String organizationId,
    required String invoiceId,
  }) {
    return _remote.fetchPaymentInstructions(organizationId, invoiceId);
  }

  @override
  Future<MomoTransaction> declareMobileMoney({
    required String organizationId,
    required String tenantId,
    String? leaseId,
    String? invoiceId,
    required String provider,
    required String operatorReference,
    required String payerMsisdn,
    required String payeeMsisdn,
    required int amount,
    String? proofDocumentId,
    required String clientRef,
  }) {
    return _remote.declareMobileMoney(organizationId, <String, dynamic>{
      'tenantId': tenantId,
      'leaseId': ?leaseId,
      'invoiceId': ?invoiceId,
      'provider': provider,
      'operatorReference': operatorReference,
      'payerMsisdn': payerMsisdn,
      'payeeMsisdn': payeeMsisdn,
      'amount': amount,
      'proofDocumentId': ?proofDocumentId,
      'clientRef': clientRef,
    });
  }

  @override
  Future<TransferDeclarationResult> declareBankTransfer({
    required String organizationId,
    required String tenantId,
    String? leaseId,
    String? invoiceId,
    required int declaredAmount,
    required String transferDate,
    String? transferReference,
    required String payerName,
    String? payerBankName,
    String? payerAccountNumber,
    required String beneficiaryBankAccountId,
    required String proofDocumentId,
    required String clientRef,
  }) {
    return _remote.declareBankTransfer(organizationId, <String, dynamic>{
      'tenantId': tenantId,
      'leaseId': ?leaseId,
      'invoiceId': ?invoiceId,
      'declaredAmount': declaredAmount,
      'transferDate': transferDate,
      'transferReference': ?transferReference,
      'payerName': payerName,
      'payerBankName': ?payerBankName,
      'payerAccountNumber': ?payerAccountNumber,
      'beneficiaryBankAccountId': beneficiaryBankAccountId,
      'proofDocumentId': proofDocumentId,
      'clientRef': clientRef,
    });
  }

  @override
  Future<MomoQuote> quoteMobileMoney({
    required String organizationId,
    String? invoiceId,
    required int amount,
  }) {
    return _remote.quoteMobileMoney(organizationId, <String, dynamic>{
      'invoiceId': ?invoiceId,
      'amount': amount,
    });
  }

  @override
  Future<MomoTransaction> initiateMobileMoney({
    required String organizationId,
    String? invoiceId,
    required String tenantId,
    required int amount,
    required String payerMsisdn,
    required String clientRef,
  }) {
    return _remote.initiateMobileMoney(organizationId, <String, dynamic>{
      'invoiceId': ?invoiceId,
      'tenantId': tenantId,
      'amount': amount,
      'payerMsisdn': payerMsisdn,
      'clientRef': clientRef,
    });
  }

  @override
  Future<MomoTransaction> fetchMomoTransaction({
    required String organizationId,
    required String transactionId,
  }) {
    return _remote.fetchMomoTransaction(organizationId, transactionId);
  }
}
