<!--
Merci de compléter ce template avant d'ouvrir la Pull Request.
Toute section non applicable doit être explicitement marquée "N/A" avec une courte justification,
plutôt que supprimée.
-->

## 1. Contexte

<!-- Pourquoi cette PR existe-t-elle ? Quel problème résout-elle ? -->
<!-- Lien vers le ticket / l'issue : -->

Ticket/Issue : #

Description :

## 2. Portée (scope)

**Inclus dans cette PR :**
-

**Explicitement exclu (hors périmètre) :**
-

## 3. Comment tester

<!-- Étapes précises, reproductibles, que le reviewer peut suivre (manuel et/ou automatisé). -->

1.
2.
3.

**Commandes / tests automatisés associés :**

```bash

```

## 4. Captures d'écran

> Obligatoire pour tout changement d'interface utilisateur (UI). Marquer "N/A" si cette PR ne modifie aucune UI.

| Avant | Après |
| ----- | ----- |
|       |       |

## 5. Procédure de retour arrière (rollback)

> Obligatoire pour toute migration (base de données, changement de schéma, migration de données).
> Marquer "N/A" si cette PR ne contient aucune migration.

- **Type de changement** : (down-migration / feature flag / backfill de données / autre)
- **Étapes de rollback** : 1. 2.
- **Impact sur les données existantes en cas de retour arrière** :
- **Feature flag associé (le cas échéant)** :

## 6. Checklist des invariants financiers

> **Section obligatoire** dès que la PR touche des tables ou de la logique liée à l'argent :
> `payments`, `invoices`, `allocations` / `payment_allocations`, `cash_receipts`, `remittances`,
> `deposits`, `commissions`, `owner_statements` (ou logique métier financière équivalente).
>
> Si cette PR ne touche **aucune** logique financière, cocher directement :
>
> - [ ] **N/A — cette PR ne touche pas de logique financière**
>
> Sinon, compléter intégralement ce qui suit.

### 6.1 Invariants concernés

Cocher chaque invariant impacté ou dont la préservation doit être garantie par cette PR, et préciser en une phrase comment il est préservé :

- [ ] **I1** — la somme des allocations = le montant du paiement
      _Justification :_
- [ ] **I2** — le solde d'une facture (invoice) doit rester ≥ 0
      _Justification :_
- [ ] **I3** — (décrire l'invariant concerné)
      _Justification :_
- [ ] **I4** — (décrire l'invariant concerné)
      _Justification :_
- [ ] **I5** — la remise de caisse (remittance) = la somme des reçus (receipts) associés
      _Justification :_
- [ ] **I6** — (décrire l'invariant concerné)
      _Justification :_
- [ ] **I7** — (décrire l'invariant concerné)
      _Justification :_
- [ ] **I8** — (décrire l'invariant concerné)
      _Justification :_
- [ ] **I9** — toute correction est une contre-passation (reversal / compensating entry), JAMAIS un UPDATE direct sur `payments` ou `receipts`
      _Justification :_
- [ ] **I10** — les montants sont toujours des BIGINT en XAF (Franc CFA), jamais de FLOAT ni de NUMERIC/DECIMAL
      _Justification :_
- [ ] **I11** — (décrire l'invariant concerné)
      _Justification :_
- [ ] **I12** — (décrire l'invariant concerné)
      _Justification :_
- [ ] **I13** — (décrire l'invariant concerné)
      _Justification :_
- [ ] **I14** — (décrire l'invariant concerné)
      _Justification :_

### 6.2 Test de non-régression (obligatoire)

> Un test qui **échoue sans** le correctif/la modification et **passe avec**.

- **Fichier de test / cas de test** : `chemin/vers/le/test.spec.ts` — `nom du test`
- **Comportement avant** (échec attendu) :
- **Comportement après** (succès attendu) :

### 6.3 Rappels obligatoires (à confirmer)

- [ ] Les montants sont toujours en **BIGINT XAF**, sans décimale — jamais de `float`/`decimal`/`numeric`.
- [ ] **Aucun** `UPDATE` ni `DELETE` sur les tables `payments`, `receipts`, `audit_logs`, `payment_allocations` — uniquement des contre-passations (compensating/reversal entries).
- [ ] **RLS (Row-Level Security)** activé et testé sur toute nouvelle table portant une colonne `organization_id`.
- [ ] Clés primaires en **UUID v7** pour toute nouvelle table.

## 7. Checklist finale

- [ ] Les tests passent en local
- [ ] Lint / typecheck OK
- [ ] Documentation mise à jour si nécessaire
- [ ] Aucun secret commité
