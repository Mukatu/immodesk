# ADR-0006 — UUID v7 en clé primaire

- **Statut** : Accepté
- **Date** : 2026-09-10
- **Décideurs** : Équipe technique fondatrice
- **Phase concernée** : Phase 0

## Contexte

Les identifiants doivent être générés hors ligne sur le mobile (un reçu créé sans réseau existe avant d'atteindre le serveur), non devinables (un numéro de reçu séquentiel exposé permettrait d'énumérer les encaissements d'une agence), et compatibles avec un futur partitionnement ou une fusion de bases. Les BIGSERIAL échouent sur les deux premiers points ; les UUID v4 dégradent les index B-tree à l'insertion par leur aléa complet.

## Décision

UUID v7 en clé primaire de toutes les tables : généré par l'application (préfixe temporel + aléa), avec gen_random_uuid() comme valeur par défaut SQL de repli. Les identifiants d'écritures créées hors ligne portent en outre un client_ref ULID distinct, qui sert de clé d'idempotence et reste lisible dans les journaux de synchronisation.

## Conséquences

### Positives

- Ordonnancement temporel préservé donc index B-tree performants à l'insertion.
- Génération distribuée sans coordination.
- Aucune énumération possible.
- Fusion de jeux de données sans collision.

### Négatives / dette acceptée

- 16 octets contre 8, index plus volumineux.
- Identifiants illisibles à l'œil nu, d'où le maintien de numéros métier séparés (LOY-{YYYYMM}-{seq}, QUI-…, CASH-…) produits par la table sequences verrouillée en transaction.

### Réversibilité

Nulle en pratique. C'est une décision de fondation.

## Alternatives écartées

| Option | Pourquoi écartée |
| --- | --- |
| BIGSERIAL | Devinable/énumérable, ne peut pas être généré hors ligne sans collision. |
| UUID v4 | Dégrade les index B-tree à l'insertion massive. |
