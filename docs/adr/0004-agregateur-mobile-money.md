# ADR-0004 — Agrégateur Mobile Money derrière l'interface MobileMoneyProvider

- **Statut** : Accepté
- **Date** : 2026-09-10
- **Décideurs** : Équipe technique fondatrice
- **Phase concernée** : Phase 4

## Contexte

MTN MoMo et Airtel Money couvrent l'essentiel des paiements électroniques au Congo. L'intégration directe suppose une négociation opérateur par opérateur, longue de plusieurs mois, deux API, deux signatures et deux modèles d'état. Un agrégateur ouvre un compte marchand en quelques jours, au prix d'une marge par transaction et d'une dépendance commerciale.

## Décision

Démarrer par un agrégateur (première implémentation CinetPay), mais systématiquement derrière l'interface MobileMoneyProvider, activable par organisation via feature_flags. PawaPay et les connexions directes MTN/Airtel seront de nouvelles implémentations de la même interface.

## Conséquences

### Positives

- Mise en marché rapide.
- Une seule surface d'intégration.
- Frais explicites dans la réponse donc réconciliables.
- Couverture CEMAC immédiate pour l'expansion.

### Négatives / dette acceptée

- Marge par transaction.
- Point de défaillance unique commercial.
- Dépendance à la qualité des webhooks de l'agrégateur.

### Réversibilité

Élevée par construction. La bascule vers du direct devient rentable au-delà d'un seuil de volume mensuel et ne modifiera pas une ligne du domaine payments-mobile-money.

## Garde-fous non négociables

Un paiement n'est jamais confirmé sur la seule foi d'un webhook : le webhook réveille un job qui re-interroge le statut auprès du fournisseur. Un job de rattrapage traite en outre tous les paiements PENDING de plus de 15 minutes, ce qui rend le système correct même si tous les webhooks sont perdus.

## Alternatives écartées

| Option | Pourquoi écartée |
| --- | --- |
| Intégration directe MTN/Airtel dès la phase 0 | Délai de plusieurs mois par opérateur, incompatible avec le calendrier. |
