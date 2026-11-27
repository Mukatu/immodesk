# ADR-0014 — Stockage objet auto-hébergé : Garage

- **Statut** : Accepté
- **Date** : 2026-11-26
- **Décideurs** : Équipe technique fondatrice
- **Phase concernée** : Phase 0 (recette), avant le pilote

## Contexte

Le pilote va stocker de vraies pièces d'identité, photos d'états des lieux, signatures et PDF. Le cadrage retenait MinIO auto-hébergé (principe « open source d'abord »). Or MinIO ne distribue plus d'images librement, et son édition communautaire est passée en simple maintenance. La pile utilisait donc l'image archivée `bitnamilegacy/minio` (juillet 2025), sans aucun correctif de sécurité depuis (docs/10 § 17).

Ce que le code attend du stockage (module `documents`, `@aws-sdk/client-s3` v3) :

- **URL signées SigV4** par paramètres de requête : envoi `PUT` (10 min, `S3_UPLOAD_URL_TTL_SECONDS`) et lecture `GET` (10 min, avec `response-content-disposition`), ouvertes directement par le mobile et le navigateur ;
- en-têtes signés `host` et `content-type` : le stockage doit refuser un envoi dont le type diffère de celui déclaré ;
- appels serveur : `HeadObject` (taille réelle avant enregistrement), `GetObject` (relevés bancaires), `PutObject` (PDF engendrés), `DeleteObject` (purge) ;
- adressage par chemin (`forcePathStyle`), région de signature `us-east-1`, adresse interne (`S3_ENDPOINT`) et adresse publique de signature (`S3_PUBLIC_ENDPOINT`) ;
- bucket privé unique `immodesk`, clé de l'API limitée à ce bucket ; création scriptable.

## Décision

**Garage** (Deuxfleurs), image officielle `dxflrs/garage` épinglée (v2.5.0), en nœud unique, métadonnées SQLite, sur la même configuration en développement, en CI et en recette. La préparation (rôle du nœud, bucket, clé importée avec les droits lecture et écriture sur ce seul bucket) passe par l'API d'administration v2, dans un script idempotent (`infra/deploy/scripts/garage-init.sh`) exécuté par une tâche ponctuelle.

Deux ajustements de l'API, utiles quel que soit le fournisseur :

- `requestChecksumCalculation: 'WHEN_REQUIRED'` : sinon le SDK place dans l'URL d'envoi le CRC32 d'un corps vide, que Garage 2.5 vérifie et refuse (400) ;
- `content-type` ajouté aux en-têtes signés : le SDK ne le signait pas, contrairement à ce qu'affirmait le commentaire du module.

## Options comparées

| Critère                                 | Garage                                                                                   | SeaweedFS                                             | MinIO compilé par nous                                 |
| --------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------ |
| URL signées SigV4 (PUT, GET, en-têtes)  | Oui, vérifié en local et en CI                                                           | Oui                                                   | Oui                                                    |
| Maintenance, correctifs                 | Versions régulières (2.4 à 2.6 en trois mois), association Deuxfleurs financée par NLnet | Très actif, un mainteneur principal                   | Dépôt communautaire en maintenance ; à nous de suivre  |
| Licence                                 | AGPL-3.0 (service séparé, non modifié)                                                   | Apache-2.0                                            | AGPL-3.0                                               |
| Mémoire sur le VPS de 8 Go              | Quelques dizaines de Mo (Rust)                                                           | Plusieurs centaines de Mo (maître, volume, filer, S3) | 300 Mo et plus                                         |
| Exploitation par un non-spécialiste     | Un binaire, un fichier de config, deux volumes                                           | Quatre rôles, filer à sauvegarder à part              | Simple, mais chaîne de compilation à maintenir         |
| Image officielle épinglable, multi-arch | Oui (amd64, arm64)                                                                       | Oui                                                   | Non : image à construire, signer et publier nous-mêmes |

Écartés aussi : Ceph RGW (bien trop lourd pour un VPS), Zenko CloudServer (Node.js, plus gourmand), RustFS (encore jeune).

## Conséquences

### Positives

- Correctifs de sécurité publiés par l'amont, montées de version par simple changement d'étiquette.
- Empreinte mémoire minime ; `mem_limit` ramené de 1 Go à 512 Mo.
- Aucun accès anonyme possible : Garage n'en offre qu'en mode site web, ni activé ni configuré.
- Variables d'environnement de l'API inchangées (`S3_*`).

### Négatives / dette acceptée

- Image sans shell : l'initialisation passe par l'API d'administration (curl), la sauvegarde par un conteneur outil qui monte les volumes.
- Un secret de clé doit faire 16 caractères au moins (le défaut de développement change : `immodesk-dev-secret`) et ne peut jamais être modifié : une rotation crée une nouvelle clé.
- Pas de console web en v2.5 ; le binaire `garage` dans le conteneur la remplace (`docker exec … /garage bucket info immodesk`).
- Pas de migration de données : rien n'était encore déployé ; en développement, les pièces de test de l'ancien MinIO ne sont pas reprises.

### Réversibilité

Le code ne parle que S3 derrière le port `ObjectStorage` : passer à SeaweedFS, à un S3 managé ou à Cloudflare R2 ne change que la configuration et les scripts d'exploitation. Les objets se copient avec un outil S3 standard (rclone).
