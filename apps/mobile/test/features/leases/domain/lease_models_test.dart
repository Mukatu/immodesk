import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/features/leases/domain/entities/deposit_status.dart';
import 'package:immodesk_mobile/features/leases/domain/entities/lease_detail.dart';
import 'package:immodesk_mobile/features/leases/domain/entities/lease_document.dart';
import 'package:immodesk_mobile/features/leases/domain/entities/lease_document_kind.dart';
import 'package:immodesk_mobile/features/leases/domain/entities/lease_party_role.dart';
import 'package:immodesk_mobile/features/leases/domain/entities/lease_status.dart';
import 'package:immodesk_mobile/features/leases/domain/entities/lease_summary.dart';

const Map<String, dynamic> _unitRefJson = {
  'id': 'unit-1',
  'code': 'A01',
  'label': 'Appartement A01',
};

const Map<String, dynamic> _propertyRefJson = {
  'id': 'prop-1',
  'name': 'Résidence Malonga',
};

const Map<String, dynamic> _tenantRefJson = {
  'id': 'tenant-1',
  'displayName': 'Alice Ndongo',
  'primaryPhone': '+242066000002',
};

const Map<String, dynamic> _leaseSummaryJson = {
  'id': 'lease-1',
  'reference': 'BAIL-2026-00042',
  'status': 'ACTIVE',
  'unit': _unitRefJson,
  'property': _propertyRefJson,
  'tenant': _tenantRefJson,
  'startDate': '2026-01-01',
  'endDate': null,
  'rentAmount': 150000,
  'chargesAmount': 10000,
  'paymentDueDay': 5,
};

const Map<String, dynamic> _depositJson = {
  'id': 'deposit-1',
  'leaseId': 'lease-1',
  'tenantId': 'tenant-1',
  'status': 'HELD',
  'requiredAmount': 300000,
  'collectedAmount': 300000,
  'deductedAmount': 0,
  'refundedAmount': 0,
  'heldAmount': 300000,
  'currency': 'XAF',
};

const Map<String, dynamic> _partyJson = {
  'id': 'party-1',
  'leaseId': 'lease-1',
  'role': 'PRIMARY_TENANT',
  'displayName': 'Alice Ndongo',
  'shareBps': 10000,
  'isSolidary': true,
};

const Map<String, dynamic> _leaseDocumentJson = {
  'id': 'lease-doc-1',
  'leaseId': 'lease-1',
  'kind': 'CONTRACT',
  'documentId': 'doc-1',
  'version': 1,
  'title': 'Contrat de bail BAIL-2026-00042 v1',
  'isSigned': true,
  'signedAt': '2026-01-02T10:00:00Z',
};

const Map<String, dynamic> _rentRevisionJson = {
  'id': 'revision-1',
  'leaseId': 'lease-1',
  'effectiveDate': '2027-01-01',
  'previousRentAmount': 150000,
  'newRentAmount': 155000,
  'previousChargesAmount': 10000,
  'newChargesAmount': 10500,
  'reason': 'Indexation annuelle',
};

void main() {
  group('LeaseSummary', () {
    test('fromJson lit le contrat de phase 2', () {
      final LeaseSummary summary = LeaseSummary.fromJson(_leaseSummaryJson);
      expect(summary.id, 'lease-1');
      expect(summary.reference, 'BAIL-2026-00042');
      expect(summary.status, LeaseStatus.active);
      expect(summary.unit.code, 'A01');
      expect(summary.property.name, 'Résidence Malonga');
      expect(summary.tenant.displayName, 'Alice Ndongo');
      expect(summary.rentAmount, 150000);
      expect(summary.rentAmount, isA<int>());
      expect(summary.chargesAmount, 10000);
      expect(summary.paymentDueDay, 5);
      expect(summary.endDate, isNull);
    });

    test('chargesAmount vaut 0 par défaut si absent', () {
      final Map<String, dynamic> json = {..._leaseSummaryJson}
        ..remove('chargesAmount');
      final LeaseSummary summary = LeaseSummary.fromJson(json);
      expect(summary.chargesAmount, 0);
    });
  });

  group('LeaseStatus.isActive', () {
    test('ACTIVE et NOTICE_GIVEN sont considérés en cours', () {
      expect(LeaseStatus.active.isActive, isTrue);
      expect(LeaseStatus.noticeGiven.isActive, isTrue);
    });

    test('les autres statuts ne sont pas actifs', () {
      for (final LeaseStatus status in [
        LeaseStatus.draft,
        LeaseStatus.pendingSignature,
        LeaseStatus.terminated,
        LeaseStatus.expired,
        LeaseStatus.cancelled,
      ]) {
        expect(
          status.isActive,
          isFalse,
          reason: '$status ne doit pas être actif',
        );
      }
    });
  });

  group('LeaseDetail', () {
    test('fromJson combine parties, dépôt, documents et révisions', () {
      final Map<String, dynamic> json = {
        ..._leaseSummaryJson,
        'graceDays': 5,
        'rentPeriod': 'MONTHLY',
        'parties': [_partyJson],
        'deposit': _depositJson,
        'documents': [_leaseDocumentJson],
        'rentRevisions': [_rentRevisionJson],
      };
      final LeaseDetail detail = LeaseDetail.fromJson(json);

      expect(detail.id, 'lease-1');
      expect(detail.status, LeaseStatus.active);
      expect(detail.currency, 'XAF');
      expect(detail.graceDays, 5);

      expect(detail.parties, hasLength(1));
      expect(detail.parties.single.role, LeasePartyRole.primaryTenant);
      expect(detail.parties.single.displayName, 'Alice Ndongo');

      expect(detail.deposit, isNotNull);
      expect(detail.deposit!.status, DepositStatus.held);
      expect(detail.deposit!.requiredAmount, isA<int>());

      expect(detail.documents, hasLength(1));
      expect(detail.documents.single.kind, LeaseDocumentKind.contract);
      expect(detail.documents.single.isSigned, isTrue);
      expect(detail.documents.single.versionLabel, 'Contrat v1 (signé)');

      expect(detail.rentRevisions, hasLength(1));
      expect(detail.rentRevisions.single.newRentAmount, 155000);
    });

    test('fromJson tolère l\'absence de parties/dépôt/documents/révisions', () {
      final LeaseDetail detail = LeaseDetail.fromJson(_leaseSummaryJson);
      expect(detail.parties, isEmpty);
      expect(detail.deposit, isNull);
      expect(detail.documents, isEmpty);
      expect(detail.rentRevisions, isEmpty);
    });

    test('toJson/fromJson est stable (utilisé pour le cache Drift)', () {
      final Map<String, dynamic> json = {
        ..._leaseSummaryJson,
        'deposit': _depositJson,
        'documents': [_leaseDocumentJson],
      };
      final LeaseDetail original = LeaseDetail.fromJson(json);
      final LeaseDetail roundTripped = LeaseDetail.fromJson(original.toJson());
      expect(roundTripped.id, original.id);
      expect(roundTripped.status, original.status);
      expect(roundTripped.deposit?.heldAmount, original.deposit?.heldAmount);
      expect(roundTripped.documents.single.id, original.documents.single.id);
    });
  });
}
