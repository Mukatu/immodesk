import { test, expect } from '@playwright/test';

/**
 * Parcours phase 2 : cycle de vie complet d'un bail (création → activation →
 * encaissement du dépôt → génération de contrat → contrat signé rattaché →
 * résiliation → restitution du dépôt) sur une organisation fraîchement créée.
 * Tourne contre le mock MSW (voir src/mocks/handlers.ts et leases-handlers.ts) :
 * les données de démo "Résidence Mpila" sont isolées sous DEMO_ORG_ID, jamais
 * atteintes ici, donc cette organisation démarre avec un portefeuille vide et
 * doit créer elle-même son bailleur, son immeuble, ses lots et son locataire
 * (même enchaînement condensé que phase1-portfolio.spec.ts).
 *
 * Les écrans /app/baux et /app/depots ne sont pas (encore) présents dans la
 * navigation principale (voir src/components/layout/app-shell.tsx) : on y
 * accède par URL directe plutôt que par un lien de menu.
 */

const DEV_OTP_CODE = '000000';

// Numéros distincts de ceux de phase1-portfolio.spec.ts : l'état du mock MSW
// (voir playwright.config.ts, commentaire sur msw/node) est partagé par tout
// le process serveur pendant la suite e2e, et un numéro de téléphone déjà
// utilisé retrouve l'utilisateur (et son organisation) existants au lieu
// d'en créer de nouveaux — deux specs sur le même numéro perdraient l'isolation.
const LOGIN_PHONE = '069000401';
const ORG_CONTACT_PHONE = '069000402';
const LANDLORD_PHONE = '069000403';
const TENANT_PHONE = '069000404';

test.describe('Baux phase 2 : création → activation → contrat → résiliation → restitution', () => {
  test('cycle de vie complet', async ({ page }) => {
    // Beaucoup d'étapes séquentielles + une attente volontaire du polling de
    // statut de contrat (toutes les 2 s) : dépasse le timeout par défaut de
    // 30 s défini dans playwright.config.ts.
    test.setTimeout(90_000);

    // --- Connexion OTP + création d'organisation fraîche ---
    await page.goto('/login');
    await page.getByPlaceholder('06 xxx xx xx').fill(LOGIN_PHONE);
    await page.getByRole('button', { name: 'Recevoir le code' }).click();

    await expect(page.getByText(/Code envoyé au/)).toBeVisible();
    const otpInput = page.locator('#otp-input');
    await otpInput.click();
    await page.keyboard.type(DEV_OTP_CODE);
    await page.getByRole('button', { name: 'Valider le code' }).click();

    await expect(page).toHaveURL(/\/onboarding\/organisation/);
    await page.getByRole('button', { name: 'Suivant' }).click();

    await page.getByLabel('Raison sociale').fill('Agence Baux E2E');
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Suivant' }).click();

    await page.locator('#contact-phone').fill(ORG_CONTACT_PHONE);
    await page.getByRole('button', { name: 'Créer l’organisation' }).click();

    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole('heading', { name: /Agence Baux E2E/ })).toBeVisible();

    // --- Portefeuille minimal : bailleur → immeuble → lots → locataire ---
    // (données de démo hors de portée, cf. commentaire d'en-tête ; même
    // enchaînement que phase1-portfolio.spec.ts, condensé)
    await page.getByRole('link', { name: 'Bailleurs' }).click();
    await expect(page).toHaveURL(/\/app\/bailleurs$/);
    await page.getByRole('button', { name: 'Nouveau bailleur' }).click();
    // "Nom" est un piège : substring de "Prénom" côté accessible name.
    await page.getByLabel('Nom', { exact: true }).fill('Ossebi');
    await page.getByLabel('Téléphone', { exact: true }).fill(LANDLORD_PHONE);
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Créer le bailleur' }).click();
    await expect(page).toHaveURL(/\/app\/bailleurs\/[^/]+$/);
    await expect(page.getByRole('heading', { name: 'Ossebi', level: 1 })).toBeVisible();

    await page.getByRole('link', { name: 'Immeubles' }).click();
    await page.getByRole('link', { name: 'Nouvel immeuble' }).click();
    await page.getByLabel('Bailleur', { exact: true }).click();
    await page.getByRole('option', { name: 'Ossebi' }).click();
    await page.getByLabel("Nom de l'immeuble", { exact: true }).fill('Résidence Baux Test');
    await page.getByLabel('Adresse', { exact: true }).fill('Avenue de la Corniche');
    await page.getByLabel('Quartier', { exact: true }).fill('Bacongo');
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: "Créer l'immeuble", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/immeubles\/[^/]+$/);
    await expect(
      page.getByRole('heading', { name: 'Résidence Baux Test', level: 1 }),
    ).toBeVisible();

    // Trois lots suffisent (un seul sera utilisé pour le bail).
    await page.getByRole('button', { name: 'Créer des lots en série' }).click();
    await page.getByLabel('Préfixe', { exact: true }).fill('B');
    // "De" / "À" sont des pièges : substrings de "Type de lot" / "Loyer de base".
    await page.getByLabel('De', { exact: true }).fill('1');
    await page.getByLabel('À', { exact: true }).fill('3');
    await page.getByLabel('Loyer de base', { exact: true }).fill('150000');
    await page.getByRole('button', { name: 'Créer les lots', exact: true }).click();
    await expect(page.locator('table tbody tr')).toHaveCount(3);
    await expect(page.getByRole('link', { name: 'B01' })).toBeVisible();

    await page.getByRole('link', { name: 'Locataires' }).click();
    await page.getByRole('link', { name: 'Nouveau locataire' }).click();
    await page.getByLabel('Nom', { exact: true }).fill('Bakala');
    await page.getByLabel('Téléphone principal', { exact: true }).fill(TENANT_PHONE);
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Créer le locataire', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/locataires\/[^/]+$/);
    await expect(page.getByRole('heading', { name: 'Bakala', level: 1 })).toBeVisible();

    // --- Création du bail : assistant en 3 étapes depuis /app/baux ---
    // "Baux" n'est pas dans la navigation principale (voir commentaire d'en-tête) :
    // on y accède par URL directe.
    await page.goto('/app/baux');
    await expect(page.getByRole('heading', { name: 'Baux', level: 1 })).toBeVisible();
    await page.getByRole('link', { name: 'Nouveau bail' }).click();
    await expect(page).toHaveURL(/\/app\/baux\/nouveau$/);

    // Étape 1 : immeuble, lot disponible, locataire (recherche + sélection), date de début.
    await page.getByLabel('Immeuble', { exact: true }).click();
    await page.getByRole('option', { name: 'Résidence Baux Test' }).click();
    await expect(page.getByLabel('Lot disponible', { exact: true })).toBeVisible();
    await page.getByLabel('Lot disponible', { exact: true }).click();
    await page.getByRole('option', { name: 'B01', exact: true }).click();
    // TenantPicker : recherche texte + clic sur le résultat (pas un Select).
    await page.getByPlaceholder('Rechercher un locataire par nom ou numéro').fill('Bakala');
    await expect(page.getByRole('button', { name: /Bakala/ })).toBeVisible();
    await page.getByRole('button', { name: /Bakala/ }).click();
    const startDate = new Date().toISOString().slice(0, 10);
    await page.getByLabel('Date de début', { exact: true }).fill(startDate);
    await page.getByRole('button', { name: 'Suivant' }).click();

    // Étape 2 : conditions financières (loyer, charges, périodicité, jour d'échéance).
    await page.getByLabel('Loyer', { exact: true }).fill('150000');
    await page.getByLabel('Charges (optionnel)', { exact: true }).fill('10000');
    await page.getByLabel('Périodicité', { exact: true }).click();
    await page.getByRole('option', { name: 'Mensuel' }).click();
    await page.getByLabel("Jour d'échéance", { exact: true }).fill('10');
    await page.getByRole('button', { name: 'Suivant' }).click();

    // Étape 3 : dépôt et parties — locataire fraîchement créé, sans colocataire
    // ni garant existant : on valide directement.
    await expect(page.getByText('Aucun garant enregistré')).toBeVisible();
    await page.getByRole('button', { name: 'Créer le bail' }).click();

    await expect(page).toHaveURL(/\/app\/baux\/[^/]+$/);
    await expect(page.getByRole('heading', { name: 'Bail brouillon', level: 1 })).toBeVisible();
    await expect(page.getByText('Brouillon', { exact: true })).toBeVisible();
    const leaseUrl = page.url();

    // --- Activation : le lot passe occupé, le dépôt de garantie est créé ---
    await expect(page.getByText("Le dépôt sera créé à l'activation du bail.")).toBeVisible();
    await page.getByRole('button', { name: 'Activer' }).click();
    await expect(page.getByText('Activer le bail')).toBeVisible();
    await page.getByRole('button', { name: 'Confirmer l’activation' }).click();

    await expect(page.getByText('Actif', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: /BAIL-\d{4}-\d+/ })).toBeVisible();
    // Le placeholder disparaît, la card affiche désormais le solde du dépôt.
    await expect(page.getByText('Encaissé', { exact: true })).toBeVisible();

    // --- Encaissement du dépôt : nécessaire pour une vraie restitution plus
    // loin. Règle métier (leases-handlers.ts) : une restitution (REFUND) exige
    // un solde détenu positif et un bail résilié/expiré — sans encaissement
    // préalable, le solde détenu resterait à 0 et la restitution finale serait
    // rejetée ou vide de sens.
    await page.goto('/app/depots');
    await expect(page.getByRole('heading', { name: 'Dépôts de garantie', level: 1 })).toBeVisible();
    const depositRow = page.locator('tr', { hasText: 'Bakala' });
    await depositRow.getByRole('button', { name: 'Saisir un mouvement' }).click();
    await expect(page.getByText('Saisir un mouvement de dépôt')).toBeVisible();
    // Le type "Encaissement" (COLLECTION) est déjà sélectionné par défaut.
    await page.getByLabel('Montant', { exact: true }).fill('300000');
    await page.getByRole('button', { name: 'Enregistrer le mouvement' }).click();
    await expect(page.getByText('Mouvement enregistré.')).toBeVisible();
    await expect(depositRow.getByText('Détenu', { exact: true })).toBeVisible();

    // --- Génération du contrat : job asynchrone interrogé toutes les 2 s ---
    await page.goto(leaseUrl);
    await expect(page.getByRole('heading', { level: 1, name: /BAIL-\d{4}-\d+/ })).toBeVisible();
    await page.getByRole('button', { name: 'Générer le contrat' }).click();
    // Progression du job avant l'état final (QUEUED "En file" ou RUNNING
    // "Génération en cours" selon la vitesse à laquelle Playwright observe l'état).
    await expect(page.getByText(/En attente|En file|Génération en cours/)).toBeVisible();
    await expect(page.getByText('Contrat généré')).toBeVisible({ timeout: 15_000 });

    // --- Contrat signé rattaché via le DocumentUploader de la card "Contrat" ---
    // Un seul input[type=file] sur cette fiche (voir document-uploader.tsx,
    // input sr-only associé à un <label> cliquable) : même technique que
    // phase1-portfolio.spec.ts.
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'contrat-signe-bakala.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('contenu-pdf-factice'),
    });
    await expect(page.getByText('contrat-signe-bakala.pdf')).toBeVisible();
    await expect(page.getByText('Signé', { exact: true })).toBeVisible();

    // --- Résiliation du bail ---
    const todayStr = new Date().toISOString().slice(0, 10);
    await page.getByRole('button', { name: 'Résilier', exact: true }).click();
    await expect(page.getByText('Résilier le bail')).toBeVisible();
    await page.getByLabel("Date d'effet", { exact: true }).fill(todayStr);
    await page.getByLabel('Motif', { exact: true }).fill('Départ du locataire');
    // Aperçu du solde de dépôt restituable avant confirmation.
    const balancePreview = page.getByText(/Solde du dépôt restituable après résiliation/);
    await expect(balancePreview).toBeVisible();
    await expect(balancePreview).toContainText(/300\D*000/);
    await page.getByRole('button', { name: 'Confirmer la résiliation' }).click();

    await expect(page.getByText('Résilié', { exact: true })).toBeVisible();

    // --- Restitution du dépôt depuis /app/depots ---
    await page.goto('/app/depots');
    const depositRowAfter = page.locator('tr', { hasText: 'Bakala' });
    await depositRowAfter.getByRole('button', { name: 'Saisir un mouvement' }).click();
    await expect(page.getByText('Saisir un mouvement de dépôt')).toBeVisible();
    await page.getByLabel('Type', { exact: true }).click();
    await page.getByRole('option', { name: 'Restitution' }).click();
    await page.getByLabel('Montant', { exact: true }).fill('300000');
    await page.getByRole('button', { name: 'Enregistrer le mouvement' }).click();
    await expect(page.getByText('Mouvement enregistré.')).toBeVisible();
    await expect(depositRowAfter.getByText('Restitué', { exact: true })).toBeVisible();
  });
});
