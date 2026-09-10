# ADR-0011 — WhatsApp d'abord, SMS passerelle Android en repli

- **Statut** : Accepté
- **Date** : 2026-09-10
- **Décideurs** : Équipe technique fondatrice
- **Phase concernée** : Phase 0 / 3

## Contexte

À Brazzaville, WhatsApp est déjà le canal de communication dominant (ADR-0003), mais deux zones d'incertitude subsistent une fois ce choix acté. D'une part, un intermédiaire commercial type Twilio ajoute une marge par message sur une API à laquelle Meta donne un accès direct : rien ne justifie de payer ce relais pour un compte Business vérifié. D'autre part, WhatsApp Cloud API ne couvre pas les numéros sans WhatsApp installé ni les échecs ponctuels de remise, ce qui impose un canal de repli pour ne jamais bloquer un OTP, une quittance ou une relance. Enfin, la vérification d'un compte Meta Business (identité de l'entreprise, numéro dédié, approbation des templates) suit un délai externe de plusieurs jours à plusieurs semaines, incompressible et hors du contrôle de l'équipe.

## Décision

Meta WhatsApp Cloud API en accès direct (sans Twilio ni aucun intermédiaire) est le canal de messagerie principal pour les OTP (templates d'authentification), les quittances et les relances. En repli automatique, une passerelle SMS open source installée sur un téléphone Android (carte SIM MTN, forfait SMS illimité) prend le relais pour les numéros sans WhatsApp ou en cas d'échec de remise. L'interface `SmsProvider` est conservée dans le domaine pour permettre de brancher plus tard une passerelle SMS commerciale sans modifier le code applicatif.

Conséquence structurante : le compte Meta Business et le numéro WhatsApp dédié deviennent un prérequis de la **Phase 0** (et non plus de la Phase 3), à lancer dès le jour 1 du projet compte tenu du délai de vérification Meta. Le téléphone Android faisant office de passerelle SMS est un équipement matériel du pilote, au même titre qu'un serveur ou un nom de domaine.

## Conséquences

### Positives

- Coût réduit : aucune marge d'intermédiaire sur le canal principal.
- Contrôle direct de la bibliothèque de templates approuvés (versionnée dans le dépôt, cf. ADR-0003).
- Cohérence avec le principe « open source d'abord » : la passerelle SMS de repli est un logiciel libre auto-hébergé sur un terminal possédé, pas un abonnement API tiers.

### Négatives / dette acceptée

- Dépendance à un unique téléphone Android physique comme point de défaillance du canal de repli en pilote ; mitigée par une procédure de redondance (téléphone de secours préconfiguré, prêt à substitution).
- Supervision opérationnelle de cette passerelle à assurer (batterie, connectivité, solde SMS, santé du processus), absente d'un service géré.
- Risque de fiabilité de la passerelle SMS Android (défaillance matérielle, blocage opérateur) ; mitigé par la même redondance et par un suivi des échecs dans `message_logs`.
- Risque de lenteur de la vérification Meta Business, capable de retarder l'ouverture du canal principal ; mitigé en lançant la démarche dès le jour 1 de la Phase 0, en parallèle du reste du cadrage.

### Réversibilité

Bonne au niveau du code : l'interface `SmsProvider` isole le choix de la passerelle de repli, ce qui permet de basculer vers une passerelle SMS commerciale sans réécrire le domaine. Le canal WhatsApp principal suit la réversibilité déjà actée en ADR-0003.

## Alternatives écartées

| Option                                   | Pourquoi écartée                                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Twilio ou autre intermédiaire commercial | Marge ajoutée sans valeur pour un accès à WhatsApp Cloud API déjà possible en direct auprès de Meta. |
| SMS comme canal principal                | Coût élevé à l'unité à l'échelle de la volumétrie visée, expérience moins engageante que WhatsApp.   |
| Passerelle SMS commerciale dès le pilote | Coût récurrent non justifié tant que le volume de repli reste faible et que le pilote est en rodage. |
