import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/features/documents/domain/entities/document_kind.dart';
import 'package:immodesk_mobile/features/portfolio/domain/entities/occupancy.dart';
import 'package:immodesk_mobile/features/portfolio/domain/entities/property_detail.dart';
import 'package:immodesk_mobile/features/portfolio/domain/entities/property_summary.dart';
import 'package:immodesk_mobile/features/portfolio/domain/entities/property_type.dart';
import 'package:immodesk_mobile/features/portfolio/domain/entities/tenant.dart';
import 'package:immodesk_mobile/features/portfolio/domain/entities/unit.dart';
import 'package:immodesk_mobile/features/portfolio/domain/entities/unit_detail.dart';
import 'package:immodesk_mobile/features/portfolio/domain/entities/unit_status.dart';
import 'package:immodesk_mobile/features/portfolio/domain/entities/unit_type.dart';

const Map<String, dynamic> _landlordJson = {
  'id': 'landlord-1',
  'displayName': 'Jean Malonga',
  'primaryPhone': '+242066000001',
  'isSelf': false,
};

const Map<String, dynamic> _occupancyJson = {
  'unitsCount': 10,
  'occupiedCount': 8,
  'availableCount': 2,
  'occupancyRateBps': 8000,
};

const Map<String, dynamic> _propertySummaryJson = {
  'id': 'prop-1',
  'code': 'IMM-01',
  'name': 'Résidence Malonga',
  'propertyType': 'APARTMENT_BUILDING',
  'district': 'Bacongo',
  'city': 'Brazzaville',
  'landlord': _landlordJson,
  'occupancy': _occupancyJson,
  'coverDocumentId': null,
};

const Map<String, dynamic> _unitJson = {
  'id': 'unit-1',
  'propertyId': 'prop-1',
  'code': 'A01',
  'label': 'Appartement A01',
  'unitType': 'APARTMENT',
  'status': 'OCCUPIED',
  'floorNumber': 1,
  'roomsCount': 3,
  'bedroomsCount': 2,
  'bathroomsCount': 1,
  'areaSqm': 45.5,
  'isFurnished': false,
  'baseRentAmount': 150000,
  'baseChargesAmount': 10000,
};

void main() {
  test('PropertySummary.fromJson lit le contrat de phase 1', () {
    final PropertySummary property = PropertySummary.fromJson(
      _propertySummaryJson,
    );
    expect(property.id, 'prop-1');
    expect(property.name, 'Résidence Malonga');
    expect(property.propertyType, PropertyType.apartmentBuilding);
    expect(property.occupancy.unitsCount, 10);
    expect(property.occupancy.occupiedCount, 8);
    expect(property.occupancy.summaryLabel, '8/10 lots occupés');
    expect(property.landlord.displayName, 'Jean Malonga');
  });

  test('Unit.fromJson lit les caractéristiques et le loyer XAF (entier)', () {
    final Unit unit = Unit.fromJson(_unitJson);
    expect(unit.code, 'A01');
    expect(unit.unitType, UnitType.apartment);
    expect(unit.status, UnitStatus.occupied);
    expect(unit.baseRentAmount, 150000);
    expect(unit.baseRentAmount, isA<int>());
    expect(unit.areaSqm, 45.5);
  });

  test(
    'PropertyDetail.fromJson combine immeuble, bailleur, lots et occupation',
    () {
      final Map<String, dynamic> json = {
        ..._propertySummaryJson,
        'addressLine': '12 avenue de la Paix',
        'units': [_unitJson],
      };
      final PropertyDetail detail = PropertyDetail.fromJson(json);
      expect(detail.addressLine, '12 avenue de la Paix');
      expect(detail.units, hasLength(1));
      expect(detail.units.first.code, 'A01');
      expect(detail.occupancy.occupancyRateBps, 8000);
    },
  );

  test('UnitDetail.fromJson combine lot, immeuble et documents', () {
    final Map<String, dynamic> json = {
      ..._unitJson,
      'property': _propertySummaryJson,
      'documents': [
        {
          'id': 'doc-1',
          'kind': 'PROPERTY_PHOTO',
          'fileName': 'photo.jpg',
          'mimeType': 'image/jpeg',
          'sizeBytes': 204800,
          'relatedEntityType': 'unit',
          'relatedEntityId': 'unit-1',
          'uploadedAt': '2026-01-01T10:00:00.000Z',
        },
      ],
    };
    final UnitDetail detail = UnitDetail.fromJson(json);
    expect(detail.unit.id, 'unit-1');
    expect(detail.property.name, 'Résidence Malonga');
    expect(detail.documents, hasLength(1));
    expect(detail.documents.first.kind, DocumentKind.propertyPhoto);
  });

  test('Tenant.fromJson utilise le displayName calculé par le serveur', () {
    final Tenant tenant = Tenant.fromJson(const {
      'id': 'tenant-1',
      'displayName': 'Alice Ndongo',
      'primaryPhone': '+242066000002',
      'whatsappPhone': '+242066000002',
      'email': null,
      'city': 'Brazzaville',
    });
    expect(tenant.displayName, 'Alice Ndongo');
    expect(tenant.whatsappPhone, '+242066000002');
  });
}
