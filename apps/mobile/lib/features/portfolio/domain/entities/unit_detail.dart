import '../../../documents/domain/entities/document.dart';
import 'property_summary.dart';
import 'unit.dart';

/// `UnitDetail` du contrat de phase 1 : lot + immeuble parent + documents.
/// Parsing manuel : `Unit.fromJson` lit les champs plats du lot, le reste
/// est décodé séparément.
class UnitDetail {
  const UnitDetail({
    required this.unit,
    required this.property,
    required this.documents,
  });

  final Unit unit;
  final PropertySummary property;
  final List<Document> documents;

  factory UnitDetail.fromJson(Map<String, dynamic> json) {
    return UnitDetail(
      unit: Unit.fromJson(json),
      property: PropertySummary.fromJson(
        json['property'] as Map<String, dynamic>,
      ),
      documents: (json['documents'] as List<dynamic>? ?? const [])
          .map((dynamic e) => Document.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
