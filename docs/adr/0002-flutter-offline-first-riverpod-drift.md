# ADR-0002 — Flutter offline-first : Riverpod + Drift

- **Statut** : Accepté
- **Date** : 2026-09-10
- **Décideurs** : Équipe technique fondatrice
- **Phase concernée** : Phase 0 / 5

## Contexte

Les démarcheurs encaissent en tournée dans des zones où la couverture tombe à zéro. Le mobile doit rester pleinement opérationnel hors ligne, avec des requêtes relationnelles locales (bail ↔ facture ↔ paiement, agrégats de tournée) et une garantie de non-perte des encaissements.

## Décision

Flutter 3.x, Drift (SQLite, chiffré par SQLCipher) comme base locale et source de vérité des écritures non synchronisées, Riverpod pour l'état, go_router pour la navigation, dio pour le transport. Outbox transactionnel avec client_ref ULID, moteur de synchronisation dédié dans core_sync.

## Conséquences

### Positives

- Jointures et agrégats en SQL local.
- L'UI se rafraîchit par streams Drift dès qu'une ligne d'outbox change.
- Migrations locales versionnées et testées.
- Chiffrement intégral au repos.

### Négatives / dette acceptée

- build_runner alourdit le cycle de compilation.
- La logique de conflit est un composant à part entière à tester.
- Une base locale chiffrée complique le débogage terrain.

### Réversibilité

Faible et assumée. Le modèle local et le moteur de synchronisation sont structurants, en changer équivaudrait à réécrire le mobile.

## Alternatives écartées

| Option      | Pourquoi écartée                                                                                                                                                                             |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BLoC + Hive | Hive est un store clé-valeur, les jointures se feraient en Dart, en mémoire, et les migrations manuelles risqueraient une perte de données terrain — inacceptable pour de l'argent encaissé. |
