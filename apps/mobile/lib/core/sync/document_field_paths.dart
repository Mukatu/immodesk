/// Résolution générique d'un `documentId` de pièce jointe dans un payload
/// imbriqué (`docs/api/phase5-contract.md`, section « Pièces jointes hors
/// ligne ») : une opération dépendante déclare, sous la clé technique
/// `_documentFieldPaths` de son payload (jamais envoyée au serveur — retirée
/// par `SyncEngine._buildBatchInput` avant l'appel), la correspondance entre
/// le `clientRef` d'une opération `DOCUMENT` et le chemin où inscrire
/// l'identifiant obtenu une fois celle-ci téléversée.
///
/// Généralisation du mécanisme introduit en phase 5 pour l'encaissement
/// (`paperReceiptDocumentId`, un seul champ possible) : la phase 8 a besoin
/// de plusieurs pièces jointes par écriture (signatures, photos par poste),
/// d'où un chemin plutôt qu'un nom de champ fixe.
///
/// Un chemin est une suite de segments séparés par `.` : un segment
/// numérique indexe une liste déjà dimensionnée (avec des `null` en
/// attente), tout autre segment une clé de map. Exemple :
/// `items.0.photoDocumentIds.1`.
void setDocumentFieldPath(
  Map<String, dynamic> payload,
  String path,
  String documentId,
) {
  final List<String> segments = path.split('.');
  dynamic current = payload;
  for (int i = 0; i < segments.length - 1; i++) {
    current = _step(current, segments[i]);
  }
  _setLast(current, segments.last, documentId);
}

dynamic _step(dynamic node, String segment) {
  final int? index = int.tryParse(segment);
  if (index != null && node is List) return node[index];
  if (node is Map) return node[segment];
  throw StateError('Chemin de document invalide : segment "$segment".');
}

void _setLast(dynamic node, String segment, String value) {
  final int? index = int.tryParse(segment);
  if (index != null && node is List) {
    node[index] = value;
    return;
  }
  if (node is Map) {
    node[segment] = value;
    return;
  }
  throw StateError('Chemin de document invalide : segment final "$segment".');
}
