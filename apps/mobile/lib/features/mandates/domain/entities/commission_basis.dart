import 'package:json_annotation/json_annotation.dart';

/// `CommissionBasis` du contrat de phase 7. Défaut d'une organisation
/// `INDEPENDENT_MANAGER` : `RATE_BPS_ON_RENT_COLLECTED` à 1000 bps (10 %),
/// modifiable par mandat (référentiel commun, section « Démarcheurs »).
enum CommissionBasis {
  @JsonValue('RATE_BPS_ON_RENT_COLLECTED')
  rateBpsOnRentCollected,
  @JsonValue('RATE_BPS_ON_RENT_DUE')
  rateBpsOnRentDue,
  @JsonValue('FLAT_AMOUNT_PER_MONTH')
  flatAmountPerMonth,
  @JsonValue('FLAT_AMOUNT_PER_LEASE')
  flatAmountPerLease,
}

extension CommissionBasisLabel on CommissionBasis {
  String get label => switch (this) {
    CommissionBasis.rateBpsOnRentCollected => 'Taux sur loyers encaissés',
    CommissionBasis.rateBpsOnRentDue => 'Taux sur loyers facturés',
    CommissionBasis.flatAmountPerMonth => 'Forfait mensuel',
    CommissionBasis.flatAmountPerLease => 'Forfait par bail',
  };

  /// Valeur attendue par l'API.
  String get apiValue => switch (this) {
    CommissionBasis.rateBpsOnRentCollected => 'RATE_BPS_ON_RENT_COLLECTED',
    CommissionBasis.rateBpsOnRentDue => 'RATE_BPS_ON_RENT_DUE',
    CommissionBasis.flatAmountPerMonth => 'FLAT_AMOUNT_PER_MONTH',
    CommissionBasis.flatAmountPerLease => 'FLAT_AMOUNT_PER_LEASE',
  };
}

/// Commission par défaut d'un mandat de gestionnaire indépendant
/// (`AGENCY_DEFAULT_COMMISSION_RATE_BPS`, `docs/api/phase7-contract.md`) :
/// 10 % du loyer encaissé, jamais du montant facturé.
const CommissionBasis defaultIndependentManagerCommissionBasis =
    CommissionBasis.rateBpsOnRentCollected;
const int defaultIndependentManagerCommissionRateBps = 1000;
const int defaultCommissionVatRateBps = 1800;
