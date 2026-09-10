# ADR-0008 — Authentification par téléphone + OTP

- **Statut** : Accepté
- **Date** : 2026-09-10
- **Décideurs** : Équipe technique fondatrice
- **Phase concernée** : Phase 0

## Contexte

Au Congo-Brazzaville, le numéro de téléphone est l'identité numérique réelle : l'adresse électronique est peu utilisée, souvent inexistante chez les locataires et les démarcheurs, et les mots de passe forts sont mal adoptés sur des téléphones d'entrée de gamme partagés. Le canal WhatsApp est déjà présent pour l'acheminement des messages.

## Décision

Téléphone (E.164, +242…) + code OTP à 6 chiffres, envoyé par WhatsApp en priorité et par SMS en repli. Courriel optionnel, mot de passe optionnel pour les utilisateurs web qui le souhaitent. Session : JWT access de 15 minutes + refresh token rotatif de 30 jours, avec détection de réutilisation entraînant la révocation de toute la famille de jetons.

## Conséquences

### Positives

- Inscription sans friction, alignée sur l'usage réel.
- Pas de base de mots de passe à protéger pour la majorité des comptes.
- Le même canal sert l'authentification et les notifications.

### Négatives / dette acceptée

- Coût par OTP envoyé (atténué par la priorité WhatsApp).
- Dépendance à la disponibilité de la passerelle SMS.
- Exposition à l'échange de SIM, traitée par un second facteur sur les actions sensibles et un délai de 24 h sur tout changement de coordonnées bancaires.
- Changement de numéro à traiter par une procédure de récupération assistée.

### Réversibilité

Bonne. L'ajout de TOTP ou de passkeys se greffe sans remettre en cause le modèle de session.

## Garde-fous non négociables

- Code haché en Argon2id, TTL de 5 minutes, 5 tentatives puis verrouillage progressif.
- Limitation à 5 envois par minute et par numéro.
- OTP exclus des quiet hours et du plafond de fréquence.

## Alternatives écartées

| Option               | Pourquoi écartée                                           |
| -------------------- | ---------------------------------------------------------- |
| Email + mot de passe | Peu adopté sur la cible, base de mots de passe à protéger. |
