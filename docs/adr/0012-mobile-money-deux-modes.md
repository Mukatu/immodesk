# ADR-0012 — Mobile Money à deux modes : déclaré et agrégateur

- **Statut** : Accepté
- **Date** : 2026-09-10
- **Décideurs** : Équipe technique fondatrice
- **Phase concernée** : Phase 4

## Contexte

Ouvrir un compte marchand agrégateur (ADR-0004) suppose une négociation contractuelle et bancaire (KYC entreprise, zone CEMAC) dont le délai est long et imprévisible, hors du contrôle de l'équipe. Faire dépendre le démarrage du pilote de la signature de ce contrat exposerait le calendrier à un risque externe non maîtrisable. Or de nombreux bailleurs et agences pratiquent déjà, sans aucun outil, la réception de paiements Mobile Money directement sur leur propre numéro : le locataire transfère et communique la référence de transaction. Cette pratique existante mérite d'être outillée dès le pilote, indépendamment du sort du contrat agrégateur.

## Décision

Deux modes de paiement Mobile Money sont proposés au choix de chaque organisation, activables ensemble ou séparément via `organization_settings` :

1. **Mode déclaré**, sur le numéro Mobile Money du bailleur ou de l'agence : le locataire saisit la référence de transaction de l'opérateur (capture d'écran facultative en pièce jointe), enregistrée dans `mobile_money_transactions` avec `channel = DECLARED` (référence opérateur dans `provider_transaction_id`, capture dans `proof_document_id`). Statut `DECLARED` jusqu'à validation manuelle par le gestionnaire ou rapprochement avec le relevé opérateur, aboutissant à `CONFIRMED` ou `REJECTED`. Zéro commission.
2. **Mode agrégateur**, via l'interface `MobileMoneyProvider` (CinetPay en première implémentation, cf. ADR-0004), avec confirmation systématique par re-interrogation du statut auprès du fournisseur, enregistrée dans `mobile_money_transactions`. Commission par transaction.

Le mode déclaré est livré en priorité en Phase 4. Le mode agrégateur reste prévu dans la même phase mais peut glisser si le contrat n'est pas signé à temps, sans bloquer le lancement du pilote.

## Conséquences

### Positives

- Le pilote peut démarrer sans attendre la signature d'un contrat d'agrégateur.
- Zéro commission sur le mode déclaré, un argument commercial direct pour les organisations sensibles au coût.
- Adoption plus naturelle pour des organisations qui opèrent déjà ainsi hors de tout outil.

### Négatives / dette acceptée

- Validation manuelle du mode déclaré plus lente et plus sujette à erreur humaine qu'une confirmation automatique par webhook et re-interrogation.
- Risque de déclaration frauduleuse ou d'erreur de référence ; mitigé par la validation manuelle du gestionnaire et par le rapprochement avec le relevé opérateur lorsqu'il est disponible.

### Réversibilité

Les deux modes coexistent durablement : ce n'est pas une étape transitoire vers un mode unique. Chaque organisation active ou désactive chacun indépendamment dans `organization_settings`, sans migration de données lourde ni impact sur l'autre mode.

## Garde-fous non négociables

Comme pour tout paiement Mobile Money agrégateur (ADR-0004), aucune confirmation ne repose sur la seule foi d'un webhook : le statut est re-interrogé auprès du fournisseur. Pour le mode déclaré, symétriquement, aucun passage à `CONFIRMED` ne repose sur la seule déclaration du locataire : il exige une action explicite du gestionnaire ou un rapprochement avec le relevé opérateur.

## Alternatives écartées

| Option                                                             | Pourquoi écartée                                                                                                        |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Agrégateur uniquement dès la Phase 4                               | Bloquerait le lancement du pilote en cas de retard contractuel, hors du contrôle de l'équipe.                           |
| Mode déclaré uniquement, sans agrégateur                           | Prive les organisations plus digitalisées d'une confirmation automatique et d'une expérience locataire fluide.          |
| Intégration directe MTN Mobile Money / Airtel Money dès la Phase 4 | Délai et complexité technique disproportionnés pour un pilote, sans passer ni par un agrégateur ni par un mode déclaré. |
