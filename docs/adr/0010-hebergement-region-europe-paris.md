# ADR-0010 — Hébergement en région Europe (Paris)

- **Statut** : Accepté
- **Date** : 2026-09-10
- **Décideurs** : Équipe technique fondatrice
- **Phase concernée** : Phase 0

## Contexte

Le produit sert Brazzaville et Pointe-Noire. Trois options : un datacenter local congolais (latence inférieure à 30 ms en théorie, mais alimentation électrique et connectivité irrégulières, écosystème managé quasi inexistant, coût élevé), l'Afrique australe ou de l'Est (latence de 180 à 260 ms, routage souvent via l'Europe), ou l'Europe de l'Ouest — Paris (130 à 180 ms via les câbles WACS/SAT-3, Tier III+, coût au vCPU le plus bas, proximité des API tierces Meta, agrégateur et R2).

## Décision

Hébergement en région Europe (Paris) sur VPS Hetzner ou OVH, avec sauvegardes chiffrées déposées chez un fournisseur distinct. La souveraineté des données est traitée par la conformité — consentement, finalité, durée de conservation, droit d'accès et portabilité au titre de la loi congolaise n° 29-2019 — et par la capacité d'exporter l'intégralité des données d'une organisation à tout moment, et non par la géographie du serveur.

## Conséquences

### Positives

- Disponibilité et exploitation éprouvées.
- Coût maîtrisé.
- Écosystème managé complet (sauvegardes, CDN, stockage objet).
- Cadre juridique lisible (RGPD comme socle exigeant).

### Négatives / dette acceptée

- Latence de 130 à 180 ms depuis Brazzaville.
- Transfert de données hors du territoire national, qui doit être déclaré aux clients dans les CGU et pourrait être contesté par une évolution réglementaire ou par un client institutionnel.

### Réversibilité

C'est la raison d'être de cet ADR. Toute l'infrastructure est décrite en Docker Compose et en scripts d'approvisionnement versionnés, la base est standard et les objets sont compatibles S3 ; un déménagement vers un hébergeur local, ou l'ajout d'une réplique en lecture au Congo, est un exercice d'exploitation, pas une réécriture. Le déclencheur serait une obligation légale de localisation ou un marché institutionnel l'exigeant.

## Atténuation de la latence

Elle n'est pas le facteur limitant de l'expérience : le terrain est gouverné par l'offline-first mobile (ADR-002), et le web est optimisé pour les connexions lentes par des budgets de bundle contrôlés en CI. Le cache statique Cloudflare et l'absence de frais de sortie R2 réduisent en outre le coût et le temps de téléchargement des quittances et des photos.

## Alternatives écartées

| Option                     | Pourquoi écartée                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| Datacenter local congolais | Alimentation et connectivité irrégulières, écosystème managé quasi inexistant, coût élevé. |
| Afrique australe/de l'Est  | Latence 180-260 ms, souvent routée via l'Europe de toute façon.                            |
