import 'dart:convert';

import '../../../core/db/app_database.dart';
import '../../../core/format/text_normalize.dart';
import '../domain/entities/property_summary.dart';
import '../domain/entities/tenant.dart';
import '../domain/entities/unit.dart';

/// Conversions entre les entités du domaine et les lignes Drift mises en
/// cache (référentiels properties/units/tenants).
abstract final class PortfolioCacheMapper {
  static CachedPropertyRow toPropertyRow(
    String organizationId,
    PropertySummary property,
  ) {
    return CachedPropertyRow(
      id: property.id,
      organizationId: organizationId,
      name: property.name,
      city: property.city,
      payload: jsonEncode(property.toJson()),
      cachedAt: DateTime.now(),
    );
  }

  static PropertySummary propertyFromRow(CachedPropertyRow row) {
    return PropertySummary.fromJson(
      jsonDecode(row.payload) as Map<String, dynamic>,
    );
  }

  static CachedUnitRow toUnitRow(
    String organizationId,
    String propertyId,
    Unit unit,
  ) {
    return CachedUnitRow(
      id: unit.id,
      organizationId: organizationId,
      propertyId: propertyId,
      payload: jsonEncode(unit.toJson()),
      cachedAt: DateTime.now(),
    );
  }

  static Unit unitFromRow(CachedUnitRow row) {
    return Unit.fromJson(jsonDecode(row.payload) as Map<String, dynamic>);
  }

  static CachedTenantRow toTenantRow(String organizationId, Tenant tenant) {
    return CachedTenantRow(
      id: tenant.id,
      organizationId: organizationId,
      displayName: tenant.displayName,
      phone: tenant.primaryPhone,
      normalizedSearchText: normalizeSearchText(
        '${tenant.displayName} ${tenant.primaryPhone} ${tenant.whatsappPhone ?? ''}',
      ),
      payload: jsonEncode(tenant.toJson()),
      cachedAt: DateTime.now(),
    );
  }

  static Tenant tenantFromRow(CachedTenantRow row) {
    return Tenant.fromJson(jsonDecode(row.payload) as Map<String, dynamic>);
  }
}
