// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'payment_instructions.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_BankAccountSummary _$BankAccountSummaryFromJson(Map<String, dynamic> json) =>
    _BankAccountSummary(
      id: json['id'] as String,
      bankName: json['bankName'] as String,
      accountHolderName: json['accountHolderName'] as String,
      accountNumber: json['accountNumber'] as String?,
      ribKey: json['ribKey'] as String?,
      iban: json['iban'] as String?,
    );

Map<String, dynamic> _$BankAccountSummaryToJson(_BankAccountSummary instance) =>
    <String, dynamic>{
      'id': instance.id,
      'bankName': instance.bankName,
      'accountHolderName': instance.accountHolderName,
      'accountNumber': instance.accountNumber,
      'ribKey': instance.ribKey,
      'iban': instance.iban,
    };

_MobileMoneyNumber _$MobileMoneyNumberFromJson(Map<String, dynamic> json) =>
    _MobileMoneyNumber(
      bankAccountId: json['bankAccountId'] as String,
      provider: $enumDecode(_$MomoProviderEnumMap, json['provider']),
      msisdn: json['msisdn'] as String,
      holderName: json['holderName'] as String,
    );

Map<String, dynamic> _$MobileMoneyNumberToJson(_MobileMoneyNumber instance) =>
    <String, dynamic>{
      'bankAccountId': instance.bankAccountId,
      'provider': _$MomoProviderEnumMap[instance.provider]!,
      'msisdn': instance.msisdn,
      'holderName': instance.holderName,
    };

const _$MomoProviderEnumMap = {
  MomoProvider.mtnMomo: 'MTN_MOMO',
  MomoProvider.airtelMoney: 'AIRTEL_MONEY',
  MomoProvider.cinetPay: 'CINETPAY',
  MomoProvider.pawaPay: 'PAWAPAY',
  MomoProvider.other: 'OTHER',
};

_PaymentInstructionsInvoiceRef _$PaymentInstructionsInvoiceRefFromJson(
  Map<String, dynamic> json,
) => _PaymentInstructionsInvoiceRef(
  id: json['id'] as String,
  invoiceNumber: json['invoiceNumber'] as String?,
  balanceAmount: (json['balanceAmount'] as num).toInt(),
);

Map<String, dynamic> _$PaymentInstructionsInvoiceRefToJson(
  _PaymentInstructionsInvoiceRef instance,
) => <String, dynamic>{
  'id': instance.id,
  'invoiceNumber': instance.invoiceNumber,
  'balanceAmount': instance.balanceAmount,
};

_PaymentInstructions _$PaymentInstructionsFromJson(Map<String, dynamic> json) =>
    _PaymentInstructions(
      transferReference: json['transferReference'] as String?,
      invoice: json['invoice'] == null
          ? null
          : PaymentInstructionsInvoiceRef.fromJson(
              json['invoice'] as Map<String, dynamic>,
            ),
      bankAccounts: (json['bankAccounts'] as List<dynamic>)
          .map((e) => BankAccountSummary.fromJson(e as Map<String, dynamic>))
          .toList(),
      mobileMoneyNumbers: (json['mobileMoneyNumbers'] as List<dynamic>)
          .map((e) => MobileMoneyNumber.fromJson(e as Map<String, dynamic>))
          .toList(),
      aggregatorAvailable: json['aggregatorAvailable'] as bool,
    );

Map<String, dynamic> _$PaymentInstructionsToJson(
  _PaymentInstructions instance,
) => <String, dynamic>{
  'transferReference': instance.transferReference,
  'invoice': instance.invoice,
  'bankAccounts': instance.bankAccounts,
  'mobileMoneyNumbers': instance.mobileMoneyNumbers,
  'aggregatorAvailable': instance.aggregatorAvailable,
};
