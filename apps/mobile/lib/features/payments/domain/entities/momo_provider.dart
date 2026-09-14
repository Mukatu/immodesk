import 'package:json_annotation/json_annotation.dart';

/// `MomoProvider` du contrat de phase 4 (`docs/api/phase4-contract.md`).
/// Le mode déclaré n'utilise que `MTN_MOMO` et `AIRTEL_MONEY` ; les autres
/// valeurs n'apparaissent que côté agrégateur (`aggregator`).
enum MomoProvider {
  @JsonValue('MTN_MOMO')
  mtnMomo,
  @JsonValue('AIRTEL_MONEY')
  airtelMoney,
  @JsonValue('CINETPAY')
  cinetPay,
  @JsonValue('PAWAPAY')
  pawaPay,
  @JsonValue('OTHER')
  other,
}

extension MomoProviderLabel on MomoProvider {
  String get label => switch (this) {
    MomoProvider.mtnMomo => 'MTN Mobile Money',
    MomoProvider.airtelMoney => 'Airtel Money',
    MomoProvider.cinetPay => 'CinetPay',
    MomoProvider.pawaPay => 'PawaPay',
    MomoProvider.other => 'Autre',
  };
}

const Map<String, MomoProvider> _momoProviderByApiValue = {
  'MTN_MOMO': MomoProvider.mtnMomo,
  'AIRTEL_MONEY': MomoProvider.airtelMoney,
  'CINETPAY': MomoProvider.cinetPay,
  'PAWAPAY': MomoProvider.pawaPay,
  'OTHER': MomoProvider.other,
};

const Map<MomoProvider, String> _momoProviderToApiValue = {
  MomoProvider.mtnMomo: 'MTN_MOMO',
  MomoProvider.airtelMoney: 'AIRTEL_MONEY',
  MomoProvider.cinetPay: 'CINETPAY',
  MomoProvider.pawaPay: 'PAWAPAY',
  MomoProvider.other: 'OTHER',
};

/// Convertit la valeur API (`SCREAMING_SNAKE_CASE`) en [MomoProvider].
/// Repli sur [MomoProvider.other] pour une valeur inconnue (nouvel
/// opérateur agrégateur ajouté côté API sans mise à jour mobile).
MomoProvider momoProviderFromApiValue(String value) =>
    _momoProviderByApiValue[value] ?? MomoProvider.other;

/// Valeur API correspondant à ce fournisseur.
String momoProviderToApiValue(MomoProvider provider) =>
    _momoProviderToApiValue[provider]!;
