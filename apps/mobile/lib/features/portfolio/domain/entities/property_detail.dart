import 'landlord_summary.dart';
import 'occupancy.dart';
import 'property_type.dart';
import 'unit.dart';

/// `PropertyDetail` du contrat de phase 1 : immeuble + bailleur + lots +
/// occupation. Parsing manuel (pas de `json_serializable`) car le type
/// combine plusieurs objets imbriqués de forme différente.
class PropertyDetail {
  const PropertyDetail({
    required this.id,
    this.code,
    required this.name,
    required this.propertyType,
    required this.addressLine,
    required this.district,
    required this.city,
    required this.landlord,
    required this.units,
    required this.occupancy,
  });

  final String id;
  final String? code;
  final String name;
  final PropertyType propertyType;
  final String addressLine;
  final String district;
  final String city;
  final LandlordSummary landlord;
  final List<Unit> units;
  final Occupancy occupancy;

  factory PropertyDetail.fromJson(Map<String, dynamic> json) {
    return PropertyDetail(
      id: json['id'] as String,
      code: json['code'] as String?,
      name: json['name'] as String,
      propertyType: $enumDecode(_propertyTypeByApiValue, json['propertyType']),
      addressLine: json['addressLine'] as String? ?? '',
      district: json['district'] as String? ?? '',
      city: json['city'] as String? ?? '',
      landlord: LandlordSummary.fromJson(
        json['landlord'] as Map<String, dynamic>,
      ),
      units: (json['units'] as List<dynamic>? ?? const [])
          .map((dynamic e) => Unit.fromJson(e as Map<String, dynamic>))
          .toList(),
      occupancy: Occupancy.fromJson(json['occupancy'] as Map<String, dynamic>),
    );
  }
}

const Map<String, PropertyType> _propertyTypeByApiValue = {
  'HOUSE': PropertyType.house,
  'VILLA': PropertyType.villa,
  'APARTMENT_BUILDING': PropertyType.apartmentBuilding,
  'COMPOUND': PropertyType.compound,
  'COMMERCIAL_BUILDING': PropertyType.commercialBuilding,
  'MIXED_USE': PropertyType.mixedUse,
  'LAND': PropertyType.land,
  'WAREHOUSE': PropertyType.warehouse,
  'OTHER': PropertyType.other,
};

T $enumDecode<T>(Map<String, T> byApiValue, Object? apiValue) {
  final T? value = byApiValue[apiValue];
  if (value == null) {
    throw FormatException('Valeur inconnue: $apiValue');
  }
  return value;
}
