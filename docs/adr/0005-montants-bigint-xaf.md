# ADR-0005 — Montants en BIGINT XAF, sans décimale

- **Statut** : Accepté
- **Date** : 2026-09-10
- **Décideurs** : Équipe technique fondatrice
- **Phase concernée** : Phase 0

## Contexte

Le franc CFA BEAC n'a pas de sous-unité en usage : les loyers s'expriment en unités entières, de 45 000 à plusieurs millions. Les erreurs d'arrondi en virgule flottante sont la première source d'anomalies comptables dans les logiciels de gestion locative.

## Décision

Tout montant est un BIGINT en XAF, accompagné d'une colonne currency CHAR(3) DEFAULT 'XAF'. Aucun FLOAT, aucun NUMERIC, aucune décimale. Un value object Money (TypeScript dans packages/shared, Dart dans core_domain) encapsule les opérations ; les colonnes sont suffixées _xaf ; les répartitions (commissions, prorata) appliquent une règle d'arrondi documentée avec imputation explicite du reste à une ligne désignée, de sorte qu'aucun franc ne se perde.

## Conséquences

### Positives

- Exactitude arithmétique garantie.
- Comparaisons et sommes SQL triviales.
- Invariants financiers vérifiables par simple égalité entière.

### Négatives / dette acceptée

- L'ouverture à une devise à sous-unité (EUR, USD) exigera d'introduire une échelle par devise. Le champ currency est déjà présent pour préparer ce jour.

### Réversibilité

Migration lourde mais mécanique (passage en montants exprimés en plus petite unité).

## Contrôle invariant

Un test de métadonnée du schéma échoue si une colonne monétaire est déclarée dans un autre type que BIGINT (invariant I10).

## Alternatives écartées

| Option | Pourquoi écartée |
| --- | --- |
| NUMERIC/DECIMAL | Arrondi correct mais coût de conversion et de comparaison inutile pour une devise sans sous-unité. |
| FLOAT/DOUBLE | Erreurs d'arrondi inacceptables sur des montants financiers. |
