# Immodesk — Dossier de cadrage et d'architecture

SaaS de gestion locative multi-canale (espèces, Mobile Money, virement, chèque) pour le Congo-Brazzaville et la zone CEMAC.

## Comment lire ce dossier

| Ordre | Document                                                         | Public                          | Contenu                                                                                                                                                                                                                |
| :---- | :--------------------------------------------------------------- | :------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | [_DECISIONS_COMMUNES.md](_DECISIONS_COMMUNES.md)                 | Tous                            | Référentiel des décisions tranchées : acteurs, stack, règles financières, liste canonique des tables, numérotation des phases. Toute divergence entre un document et ce référentiel se règle en faveur du référentiel. |
| 1     | [01_lettre_de_cadrage.md](01_lettre_de_cadrage.md)               | Sponsor, comité de pilotage, PO | Contexte, vision, objectifs, périmètre et hors-périmètre, gouvernance, risques, budget, macro-planning, plan de pilote.                                                                                                |
| 2     | [02_architecture_technique.md](02_architecture_technique.md)     | Lead tech, développeurs         | Composants, monorepo, modules NestJS, multi-tenant, auth, moteur de facturation, encaissements par mode, offline mobile, sécurité, infra, tests, ADR.                                                                  |
| 3     | [03_modele_de_donnees.md](03_modele_de_donnees.md)               | Développeurs, DBA               | Toutes les tables, énumérations, contraintes, index, machines à états, flux financiers chiffrés, RLS, volumétrie, conventions Prisma.                                                                                  |
| 3b    | [schema/schema.sql](schema/schema.sql)                           | Développeurs, DBA               | DDL PostgreSQL 16 exécutable : types, tables, triggers, séquences, RLS, vues.                                                                                                                                          |
| 4     | [04_plan_de_phases.md](04_plan_de_phases.md)                     | PO, lead tech, équipe           | Phases 0 à 11 : epics, user stories, critères d'acceptation, endpoints, écrans, tests, Definition of Done, checklist de démarrage.                                                                                     |
| 5     | [05_prompts_de_developpement.md](05_prompts_de_developpement.md) | Développeurs                    | Bibliothèque de prompts pour assistant de code en IDE, un par module ou tranche testable, alignés sur le référentiel.                                                                                                  |

| 6 | [06_besoins_externes.md](06_besoins_externes.md) | Sponsor, PO | Comptes à ouvrir, équipements, prestations et décisions attendues, avec ce que chacun débloque. À tenir à jour. |
| API | [api/](api/) | Développeurs | Contrats d'API par phase (avant génération OpenAPI) et `openapi.json` exporté par l'API. |

## Règles de maintenance du dossier

- Une décision structurante nouvelle s'inscrit d'abord dans le référentiel, puis se propage aux autres documents.
- Les choix d'architecture sont tracés par des ADR (modèle dans le document 02).
- Le fichier `schema/schema.sql` est la source de vérité du schéma jusqu'à la première migration Prisma ; ensuite, ce sont les migrations. Il est généré par concaténation des fichiers de `schema/parts/` (`cat parts/*.sql > schema.sql`) : modifier les parties, puis régénérer et rejouer le script sur une base vide.
- Le document 05 ne duplique pas les spécifications : il fournit le prompt système, un gabarit et quelques prompts transverses ; les stories et critères d'acceptation vivent dans le document 04.
- L'ancien brouillon `output_Prompts_Developpement_SaaS_Immobilier.md` à la racine est conservé pour mémoire et n'a plus valeur de référence.
