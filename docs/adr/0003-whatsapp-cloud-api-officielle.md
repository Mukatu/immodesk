# ADR-0003 — WhatsApp Cloud API officielle

- **Statut** : Accepté
- **Date** : 2026-09-10
- **Décideurs** : Équipe technique fondatrice
- **Phase concernée** : Phase 0 / 3

## Contexte

WhatsApp est le canal de communication dominant au Congo-Brazzaville. La quittance de loyer est une pièce à valeur probante et son acheminement conditionne la valeur perçue du produit. Deux voies : l'API officielle Meta (facturée, templates soumis à approbation, délai de mise en route de 1 à 3 semaines) ou un pont non officiel de type Evolution API, quasi gratuit mais reposant sur l'automatisation d'un client WhatsApp Web.

## Décision

Meta WhatsApp Cloud API exclusivement, avec compte Business vérifié et bibliothèque de templates approuvés versionnée dans le dépôt. Passerelle SMS locale en repli, derrière l'interface SmsProvider.

## Conséquences

### Positives

- Aucun risque de bannissement coupant le canal de quittance de toute la clientèle.
- Statuts de livraison normalisés exploitables dans message_logs.
- Pièces jointes PDF natives.
- Conformité aux CGU.

### Négatives / dette acceptée

- Coût par conversation, refacturé dans le modèle SaaS avec un quota par plan.
- Contrainte de la fenêtre de service de 24 h, absorbée par les templates.
- Délai d'approbation à anticiper dès la Phase 0.

### Réversibilité

Bonne au niveau du code (l'envoi passe par une interface de canal), nulle au niveau du risque : revenir à un pont non officiel réintroduirait le risque de bannissement.

## Alternatives écartées

| Option | Pourquoi écartée |
| --- | --- |
| Evolution API et bridges WhatsApp Web | Violation des CGU Meta, dépendance à un téléphone appairé, aucun SLA. |
