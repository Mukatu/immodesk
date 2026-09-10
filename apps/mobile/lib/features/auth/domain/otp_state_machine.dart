/// Étapes du parcours de connexion par téléphone + OTP.
enum OtpPhase {
  enteringPhone,
  requestingCode,
  codeSent,
  verifyingCode,
  verified,
  locked,
  rateLimited,
  invalidCode,
}

/// Machine à états pure du parcours OTP.
///
/// Ne dépend d'aucun framework (ni Riverpod, ni Flutter) : testable
/// unitairement sans base, sans widget, sans provider. La couche
/// présentation (`OtpLoginController`) délègue ses transitions à cette
/// classe puis reflète `phase` dans son état d'UI.
class OtpStateMachine {
  OtpPhase _phase = OtpPhase.enteringPhone;

  OtpPhase get phase => _phase;

  /// Démarre une demande de code (bouton « Envoyer le code », ou renvoi).
  void startRequest() {
    _requireOneOf(const <OtpPhase>[
      OtpPhase.enteringPhone,
      OtpPhase.invalidCode,
      OtpPhase.locked,
      OtpPhase.rateLimited,
      OtpPhase.codeSent,
    ], 'demander un code');
    _phase = OtpPhase.requestingCode;
  }

  void requestSucceeded() {
    _requireOneOf(const <OtpPhase>[OtpPhase.requestingCode], "confirmer l'envoi du code");
    _phase = OtpPhase.codeSent;
  }

  /// [errorCode] est un code stable du contrat d'API (`IAM.RATE_LIMITED`…).
  void requestFailed(String errorCode) {
    _requireOneOf(const <OtpPhase>[OtpPhase.requestingCode], "signaler l'echec d'une demande");
    _phase = errorCode == 'IAM.RATE_LIMITED'
        ? OtpPhase.rateLimited
        : OtpPhase.enteringPhone;
  }

  /// Démarre la vérification du code à 6 chiffres saisi par l'utilisateur.
  void startVerification() {
    _requireOneOf(const <OtpPhase>[
      OtpPhase.codeSent,
      OtpPhase.invalidCode,
    ], 'verifier le code');
    _phase = OtpPhase.verifyingCode;
  }

  void verificationSucceeded() {
    _requireOneOf(const <OtpPhase>[OtpPhase.verifyingCode], 'confirmer la verification');
    _phase = OtpPhase.verified;
  }

  /// [errorCode] : `IAM.OTP_INVALID`, `IAM.OTP_LOCKED` ou `IAM.RATE_LIMITED`.
  void verificationFailed(String errorCode) {
    _requireOneOf(const <OtpPhase>[OtpPhase.verifyingCode], "signaler l'echec d'une verification");
    switch (errorCode) {
      case 'IAM.OTP_LOCKED':
        _phase = OtpPhase.locked;
      case 'IAM.RATE_LIMITED':
        _phase = OtpPhase.rateLimited;
      default:
        _phase = OtpPhase.invalidCode;
    }
  }

  void reset() {
    _phase = OtpPhase.enteringPhone;
  }

  void _requireOneOf(List<OtpPhase> allowed, String action) {
    if (!allowed.contains(_phase)) {
      throw StateError(
        "Transition invalide : impossible de $action depuis l'etat $_phase.",
      );
    }
  }
}
