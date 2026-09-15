/// Chemins de navigation `go_router`, centralisés pour éviter les chaînes
/// de caractères dupliquées entre écrans.
abstract final class RoutePaths {
  static const String splash = '/splash';
  static const String loginPhone = '/login';
  static const String loginOtp = '/login/otp';
  static const String organizationSelect = '/organizations';
  static const String organizationCreate = '/organizations/new';
  static const String home = '/home';
  static const String diagnostics = '/diagnostics';

  /// Onglet « Immeubles » : liste, puis détail par identifiant.
  static const String properties = '/properties';
  static String propertyDetail(String id) => '$properties/$id';

  /// Détail d'un lot, accessible depuis le détail d'un immeuble.
  static const String unitDetailPattern = '/units/:id';
  static String unitDetail(String id) => '/units/$id';

  /// Onglet « Locataires » : liste, puis fiche par identifiant.
  static const String tenants = '/tenants';
  static String tenantDetail(String id) => '$tenants/$id';

  /// Baux : liste (filtrable par statut), puis fiche par identifiant.
  static const String leases = '/leases';
  static String leaseDetail(String id) => '$leases/$id';

  /// Onglet « Plus » (diagnostic, déconnexion).
  static const String more = '/more';

  /// Écran Outbox (phase 5) : liste des écritures créées hors ligne, avec
  /// statut, détail et nouvelle tentative.
  static const String outbox = '/outbox';

  /// Écran de préchargement de tournée (phase 5).
  static const String preload = '/preload';

  /// Tournée du démarcheur (`feature collection`) : factures dues
  /// regroupées par immeuble, puis encaissement et confirmation d'un reçu.
  static const String collectionRound = '/collection';
  static const String collectionEncaissementPattern =
      '$collectionRound/encaissement/:invoiceId';
  static String collectionEncaissement(String invoiceId) =>
      '$collectionRound/encaissement/$invoiceId';
  static const String collectionConfirmationPattern =
      '$collectionRound/confirmation';
  static const String collectionConfirmation = '$collectionRound/confirmation';

  /// Caisse du démarcheur (`feature cash`) : encours, remises.
  static const String cashHome = '/cash';
  static const String cashRemittanceNew = '$cashHome/remittances/new';
  static const String cashRemittances = '$cashHome/remittances';

  /// Paiements numériques de la phase 4 (`feature payments`) : choix du
  /// mode de paiement depuis une facture de la tournée, puis déclaration
  /// Mobile Money, déclaration de virement ou Mobile Money par agrégateur.
  static const String paymentMethodChoicePattern =
      '$collectionRound/payer/:invoiceId';
  static String paymentMethodChoice(String invoiceId) =>
      '$collectionRound/payer/$invoiceId';

  static const String momoDeclarationPattern =
      '$collectionRound/payer/:invoiceId/momo-declare';
  static String momoDeclaration(String invoiceId) =>
      '$collectionRound/payer/$invoiceId/momo-declare';

  static const String bankTransferDeclarationPattern =
      '$collectionRound/payer/:invoiceId/virement';
  static String bankTransferDeclaration(String invoiceId) =>
      '$collectionRound/payer/$invoiceId/virement';

  static const String momoAggregatorPattern =
      '$collectionRound/payer/:invoiceId/momo-agregateur';
  static String momoAggregator(String invoiceId) =>
      '$collectionRound/payer/$invoiceId/momo-agregateur';

  /// Espace bailleur (`feature landlord_portal`, phase 7) : distinct de
  /// l'espace agence, atteint après connexion par code lorsque le compte
  /// est rattaché à un `landlord` (`GET /v1/portal/me`).
  static const String landlordHome = '/bailleur';
  static const String landlordStatements = '/bailleur/releves';
  static const String landlordPayouts = '/bailleur/reversements';
  static const String landlordMore = '/bailleur/plus';
  static const String landlordCollections = '/bailleur/plus/encaissements';
  static const String landlordReceipts = '/bailleur/plus/quittances';

  /// Onboarding du gestionnaire indépendant (`feature onboarding`, phase 7).
  static const String managerOnboarding = '/onboarding/gestionnaire';

  /// Fiche mandat (`feature mandates`, phase 7) : invitation du bailleur.
  static const String mandateDetailPattern = '/mandats/:id';
  static String mandateDetail(String id) => '/mandats/$id';
}
