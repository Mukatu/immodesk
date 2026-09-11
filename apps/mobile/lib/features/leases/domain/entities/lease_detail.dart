import 'deposit.dart';
import 'lease_document.dart';
import 'lease_party.dart';
import 'lease_status.dart';
import 'lease_summary.dart';
import 'rent_period.dart';
import 'rent_revision.dart';

/// `LeaseDetail` du contrat de phase 2 : bail complet (parties, dépôt,
/// documents, révisions de loyer). Parsing manuel (comme `PropertyDetail`
/// et `UnitDetail`) car le type combine plusieurs objets imbriqués de
/// forme différente.
///
/// Hors ligne, une ligne de cache alimentée par un simple `LeaseSummary`
/// (jamais consultée en détail) reproduit un `LeaseDetail` dégradé : les
/// listes `parties`/`documents`/`rentRevisions` sont vides et `deposit` est
/// `null`, faute d'avoir jamais été chargés.
class LeaseDetail {
  const LeaseDetail({
    required this.id,
    this.reference,
    required this.status,
    required this.unit,
    required this.property,
    required this.tenant,
    required this.startDate,
    this.endDate,
    required this.rentAmount,
    required this.chargesAmount,
    required this.paymentDueDay,
    this.currency = 'XAF',
    this.graceDays,
    this.rentPeriod,
    this.parties = const [],
    this.deposit,
    this.documents = const [],
    this.rentRevisions = const [],
  });

  final String id;
  final String? reference;
  final LeaseStatus status;
  final LeaseUnitRef unit;
  final LeasePropertyRef property;
  final LeaseTenantRef tenant;
  final String startDate;
  final String? endDate;
  final int rentAmount;
  final int chargesAmount;
  final int paymentDueDay;
  final String currency;
  final int? graceDays;
  final RentPeriod? rentPeriod;
  final List<LeaseParty> parties;
  final Deposit? deposit;
  final List<LeaseDocument> documents;
  final List<RentRevision> rentRevisions;

  factory LeaseDetail.fromJson(Map<String, dynamic> json) {
    final String? rentPeriodApiValue = json['rentPeriod'] as String?;
    return LeaseDetail(
      id: json['id'] as String,
      reference: json['reference'] as String?,
      status: leaseStatusFromApiValue(json['status'] as String),
      unit: LeaseUnitRef.fromJson(json['unit'] as Map<String, dynamic>),
      property: LeasePropertyRef.fromJson(
        json['property'] as Map<String, dynamic>,
      ),
      tenant: LeaseTenantRef.fromJson(json['tenant'] as Map<String, dynamic>),
      startDate: json['startDate'] as String,
      endDate: json['endDate'] as String?,
      rentAmount: json['rentAmount'] as int,
      chargesAmount: json['chargesAmount'] as int? ?? 0,
      paymentDueDay: json['paymentDueDay'] as int,
      currency: json['currency'] as String? ?? 'XAF',
      graceDays: json['graceDays'] as int?,
      rentPeriod: rentPeriodApiValue != null
          ? rentPeriodFromApiValue(rentPeriodApiValue)
          : null,
      parties: (json['parties'] as List<dynamic>? ?? const [])
          .map((dynamic e) => LeaseParty.fromJson(e as Map<String, dynamic>))
          .toList(),
      deposit: json['deposit'] != null
          ? Deposit.fromJson(json['deposit'] as Map<String, dynamic>)
          : null,
      documents: (json['documents'] as List<dynamic>? ?? const [])
          .map((dynamic e) => LeaseDocument.fromJson(e as Map<String, dynamic>))
          .toList(),
      rentRevisions: (json['rentRevisions'] as List<dynamic>? ?? const [])
          .map((dynamic e) => RentRevision.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  /// Sérialisation utilisée pour la mise en cache Drift (`payload` JSON).
  Map<String, dynamic> toJson() => {
    'id': id,
    'reference': reference,
    'status': leaseStatusToApiValue(status),
    'unit': unit.toJson(),
    'property': property.toJson(),
    'tenant': tenant.toJson(),
    'startDate': startDate,
    'endDate': endDate,
    'rentAmount': rentAmount,
    'chargesAmount': chargesAmount,
    'paymentDueDay': paymentDueDay,
    'currency': currency,
    'graceDays': graceDays,
    'parties': parties.map((p) => p.toJson()).toList(),
    'deposit': deposit?.toJson(),
    'documents': documents.map((d) => d.toJson()).toList(),
    'rentRevisions': rentRevisions.map((r) => r.toJson()).toList(),
  };
}
