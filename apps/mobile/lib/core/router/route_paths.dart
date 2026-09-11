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
}
