import 'package:json_annotation/json_annotation.dart';

/// `RentPeriod` du contrat d'API (`docs/api/phase2-contract.md`).
enum RentPeriod {
  @JsonValue('MONTHLY')
  monthly,
  @JsonValue('QUARTERLY')
  quarterly,
  @JsonValue('SEMI_ANNUAL')
  semiAnnual,
  @JsonValue('ANNUAL')
  annual,
}

extension RentPeriodLabel on RentPeriod {
  String get label => switch (this) {
    RentPeriod.monthly => 'Mensuel',
    RentPeriod.quarterly => 'Trimestriel',
    RentPeriod.semiAnnual => 'Semestriel',
    RentPeriod.annual => 'Annuel',
  };
}

const Map<String, RentPeriod> _rentPeriodByApiValue = {
  'MONTHLY': RentPeriod.monthly,
  'QUARTERLY': RentPeriod.quarterly,
  'SEMI_ANNUAL': RentPeriod.semiAnnual,
  'ANNUAL': RentPeriod.annual,
};

/// Convertit la valeur API en [RentPeriod] (parsing manuel de `LeaseDetail`).
RentPeriod rentPeriodFromApiValue(String value) {
  final RentPeriod? period = _rentPeriodByApiValue[value];
  if (period == null) {
    throw FormatException('Périodicité de loyer inconnue : $value');
  }
  return period;
}
