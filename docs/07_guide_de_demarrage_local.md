# Immodesk — Guide de démarrage local : voir et tester l'application

Ce document répond à une question pratique : **comment regarder et essayer les écrans**
quand on travaille depuis le terminal d'un IDE, sans être développeur front.

Il décrit la charte graphique retenue, les trois façons de lancer le dashboard web,
les comptes de démonstration, et le lancement de l'application mobile.

Toutes les commandes ci-dessous ont été relevées dans le dépôt, pas inventées : les sources
sont citées à chaque fois.

---

## 1. Ce que contient le dashboard web

70 écrans au 16 septembre 2026, répartis par métier. Le compte se vérifie par
`find apps/web/src/app -name "page.tsx" | wc -l`.

| Domaine                | Écrans principaux                                                            |
| :--------------------- | :--------------------------------------------------------------------------- |
| Portefeuille           | Bailleurs, locataires, immeubles, lots                                       |
| Baux                   | Liste, fiche, création, contrat imprimable, dépôts de garantie               |
| Facturation            | Factures, création manuelle, campagnes mensuelles, quittances                |
| Encaissements          | Paiements, déclarations, Mobile Money, vérification publique d'une quittance |
| Caisse des démarcheurs | Encours, reçus, remises                                                      |
| Banque                 | Relevés importés, rapprochement, chèques                                     |
| Gérance                | Mandats, dépenses, commissions, relevés de gérance, reversements             |
| Terrain                | Comparaison d'états des lieux entrée/sortie                                  |
| Exploitation           | Synchronisation, conflits, appareils, journal des messages                   |
| Réglages               | Facturation, paiements, rapprochement, contrat, messages, webhooks, équipe   |
| Hors agence            | Connexion, invitation, onboarding, portail bailleur, accès refusé            |

---

## 2. La charte graphique

Source unique : `apps/web/src/styles/tokens.css`. Les couleurs y sont déclarées en HSL,
sans unité, pour être consommées par Tailwind. Le thème sombre est défini intégralement
sous la classe `.dark`.

| Rôle          | Thème clair   | Thème sombre  | Usage                                                                                             |
| :------------ | :------------ | :------------ | :------------------------------------------------------------------------------------------------ |
| Primaire      | `330 81% 60%` | `330 81% 60%` | Rose : couleur dominante, actions principales, en-têtes                                           |
| Accent        | `217 91% 60%` | `217 91% 60%` | Bleu : usage discret, mises en avant secondaires et anneaux de focus                              |
| Secondaire    | `36 32% 94%`  | `150 12% 16%` | Beige très clair : fonds de tableaux                                                              |
| Fond          | `150 10% 97%` | `150 20% 7%`  | Page (gris très léger en clair, pour que le rose s'affirme au lieu de s'écraser sur du blanc pur) |
| Carte         | `0 0% 100%`   | `150 16% 10%` | Cartes/panneaux, plus claires que le fond pour ressortir                                          |
| Texte         | `150 18% 12%` | `150 8% 94%`  | Lecture courante                                                                                  |
| Danger        | `0 68% 42%`   | `0 62% 52%`   | Suppression, impayé                                                                               |
| Succès        | `152 42% 30%` | `152 40% 48%` | Paiement confirmé, bail actif (reste vert, indicateur fonctionnel)                                |
| Avertissement | `36 82% 44%`  | `36 75% 55%`  | Échéance proche, plafond de caisse atteint                                                        |

Quatre partis pris :

- **Le rose est la couleur dominante, le bleu reste discret.** Le rose porte les actions
  principales et les en-têtes ; le bleu n'apparaît que sur les mises en avant secondaires
  et les anneaux de focus, jamais en grande surface. Ces deux teintes sont fixées et ne se
  discutent pas : `#EC4899` (rose) et `#3B82F6` (bleu).
- **Le corps de l'interface est légèrement grisé, pas blanc pur.** Sur un fond blanc à
  100 %, le rose et le bleu de marque s'écrasent visuellement. Un gris très léger
  (`150 10% 97%` en clair) laisse le rose s'affirmer, pendant que les cartes restent en
  blanc pur pour ressortir sur ce fond.
- **Sur un aplat de couleur, le texte blanc est en gras.** Du texte blanc fin sur le rose
  ou le bleu de marque n'atteint que 3,56:1 et 3,63:1 (calculé), sous le seuil de 4,5:1
  exigé pour du texte courant. Le gras fait basculer ce texte dans la catégorie « grand
  texte » du WCAG, où le seuil tombe à 3,0:1 — nos deux couleurs passent alors. La règle
  est posée une fois pour toutes dans `apps/web/src/app/globals.css`, sur les jetons
  `.text-primary-foreground` et `.text-accent-foreground`.
- **Aucune police n'est téléchargée.** La pile `--font-sans` utilise la police du système.
  Une police web coûterait plusieurs centaines de kilooctets avant le premier affichage,
  ce qui est pénalisant sur les connexions lentes.

Le rayon des angles est unique, `--radius: 0.6rem`, pour une cohérence visuelle sans
réglage au cas par cas.

Les montants s'affichent en francs CFA entiers, sans décimale, via le composant `MoneyXaf`.

---

## 3. Trois façons de voir les écrans

### 3.1 Mode simulé : aucun backend, aucune base de données

C'est la voie la plus rapide pour regarder l'interface. Les réponses de l'API sont
simulées en mémoire par MSW, activé par la variable `E2E_MOCK`. C'est exactement le
dispositif utilisé par les tests de bout en bout, décrit dans `apps/web/playwright.config.ts`.

Depuis la racine du dépôt, en PowerShell, poser d'abord les trois variables :

```powershell
$env:E2E_MOCK="1"
$env:NEXT_PUBLIC_API_URL="http://localhost:3100/api/proxy"
$env:API_INTERNAL_URL="https://mock.immodesk.internal/v1"
```

Puis, dans le même terminal, au choix. Voie rapide, sans compilation préalable :

```powershell
pnpm --filter @immodesk/web dev -p 3100
```

Voie fidèle à la production, environ 40 secondes de compilation :

```powershell
pnpm --filter @immodesk/web build
pnpm --filter @immodesk/web start -p 3100
```

Ouvrir ensuite `http://localhost:3100/login`. Identifiants en section 5.

Les deux voies ont été vérifiées le 16 septembre 2026 : `/login` répond bien. Une page
interne ouverte sans être connecté renvoie vers `/login`, ce qui est le comportement
attendu et non une panne. Il faut donc toujours commencer par l'écran de connexion.

Les trois variables sont indispensables et solidaires. Le navigateur appelle un proxy de
même origine, `src/app/api/proxy/[...path]/route.ts`, qui relaie côté serveur vers
l'adresse interne interceptée par MSW. C'est ce qui garantit un état simulé unique,
partagé par toutes les requêtes. Sans `E2E_MOCK`, le proxy répond 404.

> **Attention : `NEXT_PUBLIC_API_URL` est figée à la compilation.** Next remplace les
> variables `NEXT_PUBLIC_*` par leur valeur littérale dans le bundle au moment du `build` ;
> le navigateur ne les relit pas au démarrage. Si l'on modifie cette variable alors qu'une
> compilation existe déjà, relancer le serveur ne suffit pas : il faut **recompiler**.
> Symptôme caractéristique, la console du navigateur affiche des erreurs CORS visant
> `http://localhost:3000/v1/...`, qui est la valeur par défaut restée gravée (voir
> `src/lib/api/client.ts` et `portal-client.ts`). Le piège est d'autant plus sournois qu'un
> autre projet peut occuper le port 3000 et répondre 404 au lieu de rien, ce qui déguise la
> panne en erreur d'API.

### 3.2 Mode réel : avec l'API et la base de données

Nécessite Docker Desktop démarré. Quatre terminaux, ou trois si l'on lance la pile une
seule fois. La procédure de l'API est celle de `apps/api/README.md`.

```powershell
pnpm db:up
pnpm --filter @immodesk/api prisma:generate
pnpm --filter @immodesk/api seed
pnpm --filter @immodesk/api dev
```

Puis, dans un autre terminal, le web sur un port différent de celui de l'API :

```powershell
$env:NEXT_PUBLIC_API_URL="http://localhost:3000/v1"
$env:API_INTERNAL_URL="http://localhost:3000/v1"
pnpm --filter @immodesk/web dev -p 3001
```

Le dashboard est sur `http://localhost:3001`, l'API sur `http://localhost:3000/v1`, et sa
documentation interactive sur `http://localhost:3000/v1/docs`.

Pour inspecter la base directement, `pnpm --filter @immodesk/api prisma:studio` ouvre une
console web sur les tables.

### 3.3 Rejouer les parcours avec Playwright

Le mode interface de Playwright déroule un scénario complet pas à pas, avec retour arrière
possible. Il démarre le serveur simulé tout seul, aucune variable à poser :

```powershell
pnpm --filter @immodesk/web exec playwright test --ui
```

Pour voir le navigateur défiler sans l'interface de pilotage, remplacer `--ui` par `--headed`.
Après une exécution, le rapport HTML se trouve dans `apps/web/playwright-report/index.html`.

Neuf scénarios existent, un par phase livrée, de la connexion jusqu'au portail bailleur.
La liste détaillée est dans `apps/web/README.md`.

---

## 4. Ports et adresses

| Service            | Port | Défini par                          |
| :----------------- | :--- | :---------------------------------- |
| API                | 3000 | `PORT` dans `apps/api/.env.example` |
| Dashboard web      | 3001 | Choisi au lancement avec `-p`       |
| Dashboard simulé   | 3100 | `apps/web/playwright.config.ts`     |
| PostgreSQL         | 5440 | `infra/docker/docker-compose.yml`   |
| Redis              | 6390 | `infra/docker/docker-compose.yml`   |
| MinIO, stockage    | 9010 | `infra/docker/docker-compose.yml`   |
| MinIO, console     | 9011 | `infra/docker/docker-compose.yml`   |
| Mailpit, courriels | 8025 | `infra/docker/docker-compose.yml`   |

Les deux dernières adresses sont des consoles web à ouvrir directement dans un navigateur.
Celle de Mailpit affiche les courriels envoyés en développement, qui ne partent jamais réellement.

> La valeur par défaut du web vise désormais le port 3000 de l'API, en accord avec le port d'écoute
> réel de l'API. Le dashboard de développement doit être lancé sur un autre port (par défaut 3001)
> pour ne pas entrer en collision avec le serveur Next qui réclamerait le port 3000 lui-même.

---

## 5. Comptes de démonstration

Créés par `apps/api/prisma/seed.ts` dans l'organisation `agence-mpila-immo`.

| Rôle      | Nom            | Téléphone       | Ce qu'il voit                    |
| :-------- | :------------- | :-------------- | :------------------------------- |
| OWNER     | Jean Mabiala   | `+242066000001` | Toute l'agence                   |
| COLLECTOR | Alphonse Ngoma | `+242066000002` | Sa tournée, ses reçus, sa caisse |

La connexion se fait par code à usage unique. En développement, aucun message n'est
réellement envoyé : le code est écrit dans les journaux de l'API par `FakeSmsProvider`, et
le code fixe `000000` est accepté, valeur de `OTP_DEV_CODE`.

**En mode simulé, c'est différent et plus permissif.** Il n'y a ni base ni utilisateur
préexistant : n'importe quel numéro valide est accepté et le compte est créé à la volée.
Seul le code est figé, à `000000`. Les scénarios de test utilisent le numéro `066000099`,
qui constitue un point de départ commode. Ces valeurs sont définies dans
`apps/web/src/mocks/handlers.ts`.

---

## 6. L'application mobile

L'application Flutter cible **Android et iOS uniquement**. Elle ne peut pas s'ouvrir dans
Chrome : la base locale chiffrée, l'appareil photo et la signature tactile reposent sur des
composants natifs. Ajouter une cible web n'est pas souhaitable.

Android Studio n'est pas nécessaire : la chaîne d'outils est déjà complète sur le poste,
et deux émulateurs sont déjà créés.

```powershell
flutter emulators --launch Pixel_10_Pro
cd apps/mobile
flutter pub get
dart run build_runner build --delete-conflicting-outputs
flutter run
```

Par défaut l'application vise `http://10.0.2.2:3000/v1`, qui est la façon dont un émulateur
Android atteint le port 3000 du poste hôte. L'API doit donc tourner, comme en section 3.2.

Sur un téléphone physique branché en USB avec le débogage activé, il faut indiquer l'adresse
de la machine sur le réseau local :

```powershell
flutter run --dart-define=API_BASE_URL=http://192.168.1.42:3000/v1 --dart-define=OTP_DEV_CODE=000000
```

Pour créer un émulateur supplémentaire, `flutter emulators --create --name mon_emulateur`.
La prise de photo exige une caméra virtuelle activée dans les réglages de l'émulateur.

---

## 7. Dépannage

- **`turbo` échoue avec `spawn UNKNOWN errno -4094`.** L'outil est bloqué par la sécurité
  Windows sur ce poste. Ne jamais lancer `pnpm dev`, `pnpm build` ou `pnpm test` depuis la
  racine : toujours cibler une application avec `pnpm --filter @immodesk/web <script>`.
- **`ERR_PNPM_IGNORED_BUILDS`.** pnpm a inséré une ligne à confirmer dans
  `pnpm-workspace.yaml`. La repérer avec `grep "set this" pnpm-workspace.yaml` et trancher.
- **Le port est déjà occupé.** L'API et le serveur Next réclament tous deux le port 3000 par
  défaut. Donner un port explicite au web avec `-p`.
- **Un ancien serveur traîne sur le port 3100.** Un lancement précédent mal refermé continue
  de répondre et sert d'anciens écrans, ce qui donne l'impression que les modifications ne
  prennent pas. Repérer le processus avec `Get-NetTCPConnection -LocalPort 3100`, puis
  l'arrêter avec `Stop-Process -Id <PID>` avant de relancer.
- **Les écrans sont vides en mode simulé.** Une des trois variables d'environnement manque.
  Les poser dans le même terminal que la commande de démarrage, avant le `build` et avant le `start`.
