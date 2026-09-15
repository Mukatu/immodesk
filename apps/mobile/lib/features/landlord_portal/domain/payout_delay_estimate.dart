import 'entities/payment_method.dart';

/// Délai estimé affiché à un bailleur en diaspora pour son mode de
/// reversement (`docs/04_plan_de_phases.md` §7.3, épic 7.E : « communication
/// proactive du délai estimé »). Aucune valeur « virement international »
/// n'existe côté contrat (arbitrage 6) : un reversement à l'étranger est un
/// `BANK_TRANSFER` classique, dont le délai réel dépend de la banque
/// correspondante.
String estimatedPayoutDelayLabel(PaymentMethod method) {
  return switch (method) {
    PaymentMethod.bankTransfer => '3 à 7 jours ouvrés (virement international)',
    PaymentMethod.mobileMoney => '1 à 3 jours ouvrés (Mobile Money)',
    PaymentMethod.cash =>
      'Non applicable à distance : privilégiez le virement.',
    PaymentMethod.bankCheck =>
      'Non applicable à distance : privilégiez le virement.',
  };
}
