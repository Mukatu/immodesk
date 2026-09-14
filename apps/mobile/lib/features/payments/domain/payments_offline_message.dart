/// Message affiché hors connexion pour tous les modes de paiement de la
/// phase 4 : Mobile Money (déclaré ou agrégateur) et virement déclaré ne
/// sont jamais disponibles hors ligne, comme l'encaissement en espèces de
/// la phase 3 (`EncaissementState.offlineMessage`).
abstract final class PaymentsOfflineMessage {
  static const String text =
      'Connexion requise pour ce mode de paiement. Réessayez une fois en ligne.';
}
