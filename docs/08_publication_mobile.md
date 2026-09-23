# Immodesk — Publication mobile : signer et publier l'application

Ce document décrit la procédure pour publier `apps/mobile` sur le Play Store et l'App
Store : créer les clés de signature, les renseigner sans les versionner, compiler une
version de publication, et déposer l'application sur chaque store.

**Personne n'a encore exécuté cette procédure.** Aucun keystore, aucun certificat, aucun
compte développeur n'existe à ce jour pour Immodesk. Ce document prépare le terrain ; il ne
remplace pas la prudence au moment de le faire pour de vrai.

---

## 1. Android — créer le keystore

Le keystore est le fichier qui prouve, de version en version, que les mises à jour
proviennent bien de l'éditeur d'origine. Il se crée une seule fois avec `keytool`, fourni
avec le JDK (donc déjà présent si Android Studio ou Flutter sont installés).

Depuis un dossier **hors du dépôt** (le keystore ne doit jamais être commité) :

```powershell
keytool -genkey -v -keystore immodesk-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias immodesk
```

`keytool` demande un mot de passe pour le magasin, un mot de passe pour la clé (peut être
le même), puis une identité (nom, organisation, ville, pays) qui apparaît dans le certificat
public — sans conséquence fonctionnelle, mais visible.

> **`-validity 10000`** (environ 27 ans) est volontaire : un certificat expiré empêche de
> publier de nouvelles mises à jour sous la même application. Google recommande une validité
> dépassant largement la durée de vie prévue de l'application.

Conserver `immodesk-release.jks` et ses deux mots de passe dans un gestionnaire de secrets
de l'équipe (pas dans un fichier texte, pas dans un canal de discussion). Une copie de
sauvegarde chiffrée, hors du poste qui a servi à le créer, est recommandée.

---

## 2. Android — renseigner `key.properties`

`apps/mobile/android/app/build.gradle.kts` lit désormais ses secrets de signature depuis
`apps/mobile/android/key.properties`, un fichier **non versionné** (déjà exclu par
`apps/mobile/android/.gitignore`, qui ignorait déjà `key.properties` et `**/*.jks` avant ce
changement).

Créer `apps/mobile/android/key.properties` :

```properties
storePassword=<mot de passe du magasin>
keyPassword=<mot de passe de la clé>
keyAlias=immodesk
storeFile=C:/chemin/absolu/vers/immodesk-release.jks
```

`storeFile` accepte un chemin absolu ou relatif au dossier `android/`. Un chemin absolu
évite toute ambiguïté si le fichier vit hors du dépôt, ce qui est la situation recommandée.

**Sans ce fichier**, `signingConfigs.create("release")` n'est pas défini et
`buildTypes.release` retombe sur la clé de débogage — c'est le comportement voulu pour que
`flutter run --release` continue de fonctionner sur un poste de développement qui n'a pas
les secrets de publication.

---

## 3. Android — compiler et publier

Générer l'App Bundle signé (format attendu par le Play Store depuis 2021, remplace l'APK) :

```powershell
cd apps/mobile
flutter build appbundle --release
```

Le fichier produit est `apps/mobile/build/app/outputs/bundle/release/app-release.aab`.

Sur la [Play Console](https://play.google.com/console) :

1. Créer un compte développeur (25 $ US, paiement unique, une seule fois pour tous les
   projets futurs).
2. Créer l'application, remplir la fiche store (description, captures d'écran, icône
   1024×1024 — utiliser `apps/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-1024x1024@1x.png`,
   déjà à cette taille), et répondre au questionnaire de classification du contenu.
3. Déposer l'App Bundle sur une piste de test interne d'abord (quelques minutes de revue),
   puis sur la piste de production (revue de quelques heures à quelques jours pour une
   première soumission).

---

## 4. iOS — certificats et profils

iOS exige une adhésion payante à l'Apple Developer Program (99 $ US **par an**, renouvelable)
avant de pouvoir signer une version de publication ou la déposer sur TestFlight/l'App Store.

Depuis un Mac avec Xcode installé (la signature iOS ne se fait pas depuis Windows) :

1. Ouvrir `apps/mobile/ios/Runner.xcworkspace` (pas `.xcodeproj`) dans Xcode.
2. Dans l'onglet **Signing & Capabilities** de la cible `Runner`, sélectionner l'équipe du
   compte développeur. Avec **Automatically manage signing** coché, Xcode crée lui-même le
   certificat de distribution et le profil de provisionnement associés à l'identifiant déjà
   réservé `cg.immodesk.immodeskMobile`.
3. Vérifier le numéro de version et de build (`CFBundleShortVersionString`,
   `CFBundleVersion`), alignés sur `pubspec.yaml` (`1.0.0+1` → version `1.0.0`, build `1`).

Compiler et déposer :

```bash
flutter build ipa --release
```

Le fichier produit est `apps/mobile/build/ios/ipa/immodesk_mobile.ipa`. Le déposer avec
Xcode (**Window → Organizer**, bouton **Distribute App**) ou en ligne de commande avec
`xcrun altool` / Transporter. Sur [App Store Connect](https://appstoreconnect.apple.com),
créer la fiche de l'application, l'associer à la version déposée, puis la soumettre pour
revue (généralement 24 à 48 heures, parfois plus).

---

## 5. Pièges à connaître

- **La perte du keystore Android est irréversible.** Sans lui, impossible de publier une
  mise à jour de l'application existante : Google impose la même signature d'une version à
  l'autre. La seule issue est de publier une application entièrement nouvelle, avec un
  nouvel identifiant, perdant l'historique d'installations et les avis. Sauvegarder le
  keystore et ses mots de passe est donc aussi critique que sauvegarder une base de
  production.
- **Les deux comptes développeur sont payants et distincts.** 25 $ US une fois pour Google,
  99 $ US chaque année pour Apple. Aucun des deux n'est remboursable en cas d'abandon du
  projet.
- **Les délais de revue ne sont pas garantis.** Une première soumission peut être refusée
  pour des raisons de forme (politique de confidentialité manquante, captures d'écran non
  conformes) qui rallongent le délai réel. Prévoir cette marge avant toute date de
  lancement communiquée.
- **`ios/` ne se compile pas en publication depuis ce poste.** `flutter build ipa` exige
  Xcode, donc un Mac. La CI (`.github/workflows/ci.yml`, job `mobile`) ne compile que
  l'APK de débogage sur Linux, pour détecter les régressions Android — elle ne remplace pas
  une compilation iOS avant publication.
- **Le numéro de build (`+1` dans `1.0.0+1`) doit être incrémenté à chaque dépôt**, sur les
  deux stores, même pour une version identique par ailleurs. Un dépôt avec un numéro déjà
  utilisé est rejeté.
