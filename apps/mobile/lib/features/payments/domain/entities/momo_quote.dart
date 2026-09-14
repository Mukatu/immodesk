import 'package:freezed_annotation/freezed_annotation.dart';

part 'momo_quote.freezed.dart';
part 'momo_quote.g.dart';

/// `feeBearer` du devis et de la transaction agrégateur : qui supporte les
/// frais Mobile Money (`organization_settings.paymentMethods`).
enum MomoFeeBearer {
  @JsonValue('TENANT')
  tenant,
  @JsonValue('ORGANIZATION')
  organization,
}

/// `MomoQuote` du contrat de phase 4 (`POST /v1/payments/mobile-money/quote`) :
/// montant, frais estimés et total débité, affichés avant validation.
@freezed
abstract class MomoQuote with _$MomoQuote {
  const factory MomoQuote({
    required int amount,
    required int feeAmount,
    required int totalDebited,
    required int netReceived,
    required MomoFeeBearer feeBearer,
  }) = _MomoQuote;

  factory MomoQuote.fromJson(Map<String, dynamic> json) =>
      _$MomoQuoteFromJson(json);
}

/// Montant total affiché au locataire avant validation. Toujours
/// `totalDebited` : le contrat (§« Frais ») garantit
/// `totalDebited = amount + feeAmount` quand `feeBearer = TENANT` et
/// `totalDebited = amount` quand `feeBearer = ORGANIZATION` (les frais
/// restent alors informatifs, prélevés sur le net reçu).
int momoQuoteDisplayTotal(MomoQuote quote) => quote.totalDebited;
