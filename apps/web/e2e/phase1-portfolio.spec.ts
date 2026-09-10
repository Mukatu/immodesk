import { test, expect } from '@playwright/test';

/**
 * Parcours phase 1 : portefeuille complet (bailleur → immeuble → lots en série →
 * locataire → garant → document) sur une organisation fraîchement créée.
 * Tourne contre le mock MSW (voir src/mocks/handlers.ts) : les données de démo
 * congolaises sont isolées sous une organisation fixe jamais atteinte ici, donc
 * cette nouvelle organisation démarre avec un portefeuille vide.
 */

const DEV_OTP_CODE = '000000';

const LOGIN_PHONE = '066000199';
const ORG_CONTACT_PHONE = '066000198';
const LANDLORD_PHONE = '055100001';
const TENANT_PHONE = '055100002';
const GUARANTOR_PHONE = '055100003';

test.describe('Portefeuille phase 1 : bailleur → immeuble → lots → locataire → garant → document', () => {
  test('parcours complet', async ({ page }) => {
    // --- Connexion OTP + création d'organisation (réutilise le flux d'onboarding) ---
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

    await page.getByLabel('Raison sociale').fill('Agence Portefeuille E2E');
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Suivant' }).click();

    await page.locator('#contact-phone').fill(ORG_CONTACT_PHONE);
    await page.getByRole('button', { name: 'Créer l’organisation' }).click();

    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole('heading', { name: /Agence Portefeuille E2E/ })).toBeVisible();

    // --- Bailleur : création via le panneau (Sheet) depuis /app/bailleurs ---
    await page.getByRole('link', { name: 'Bailleurs' }).click();
    await expect(page).toHaveURL(/\/app\/bailleurs$/);

    await page.getByRole('button', { name: 'Nouveau bailleur' }).click();
    // "Nom" est un piège : substring de "Prénom" côté accessible name → exact requis.
    await page.getByLabel('Nom', { exact: true }).fill('Ngouabi');
    await page.getByLabel('Téléphone', { exact: true }).fill(LANDLORD_PHONE);
    // "Ville" est aussi un piège : substring de l'aria-label "Filtrer par ville"
    // du filtre de la liste, resté dans le DOM derrière le panneau ouvert.
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Créer le bailleur' }).click();

    await expect(page).toHaveURL(/\/app\/bailleurs\/[^/]+$/);
    await expect(page.getByRole('heading', { name: 'Ngouabi', level: 1 })).toBeVisible();

    // --- Immeuble : création rattachée au bailleur, puis lots en série ---
    await page.getByRole('link', { name: 'Immeubles' }).click();
    await expect(page).toHaveURL(/\/app\/immeubles$/);

    await page.getByRole('link', { name: 'Nouvel immeuble' }).click();
    await expect(page).toHaveURL(/\/app\/immeubles\/nouveau$/);

    // Select Radix (role combobox exposé via le label "Bailleur") : ouverture
    // puis choix de l'option par son libellé (displayName du bailleur créé).
    await page.getByLabel('Bailleur', { exact: true }).click();
    await page.getByRole('option', { name: 'Ngouabi' }).click();
    await page.getByLabel("Nom de l'immeuble", { exact: true }).fill('Résidence Test');
    await page.getByLabel('Adresse', { exact: true }).fill('Avenue de la Paix');
    await page.getByLabel('Quartier', { exact: true }).fill('Bacongo');
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    // Apostrophe droite : c'est le texte exact du bouton dans nouveau/page.tsx.
    await page.getByRole('button', { name: "Créer l'immeuble", exact: true }).click();

    await expect(page).toHaveURL(/\/app\/immeubles\/[^/]+$/);
    await expect(page.getByRole('heading', { name: 'Résidence Test', level: 1 })).toBeVisible();

    // Création en série : préfixe "A", de 1 à 12, gabarit avec loyer de référence.
    await page.getByRole('button', { name: 'Créer des lots en série' }).click();
    await page.getByLabel('Préfixe', { exact: true }).fill('A');
    // "De" / "À" sont des pièges : substrings de "Type de lot" / "Loyer de base".
    await page.getByLabel('De', { exact: true }).fill('1');
    await page.getByLabel('À', { exact: true }).fill('12');
    await page.getByLabel('Loyer de base', { exact: true }).fill('75000');
    await page.getByRole('button', { name: 'Créer les lots', exact: true }).click();

    // Padding par défaut = 2 → codes générés A01…A12.
    await expect(page.locator('table tbody tr')).toHaveCount(12);
    await expect(page.getByRole('link', { name: 'A01' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'A12' })).toBeVisible();

    // --- Locataire : création, puis garant et document depuis sa fiche ---
    await page.getByRole('link', { name: 'Locataires' }).click();
    await expect(page).toHaveURL(/\/app\/locataires$/);

    await page.getByRole('link', { name: 'Nouveau locataire' }).click();
    await expect(page).toHaveURL(/\/app\/locataires\/nouveau$/);

    await page.getByLabel('Nom', { exact: true }).fill('Massamba');
    await page.getByLabel('Téléphone principal', { exact: true }).fill(TENANT_PHONE);
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Créer le locataire', exact: true }).click();

    await expect(page).toHaveURL(/\/app\/locataires\/[^/]+$/);
    await expect(page.getByRole('heading', { name: 'Massamba', level: 1 })).toBeVisible();

    // Garant : le bouton d'ouverture du panneau ("Ajouter un garant") reste dans
    // le DOM derrière le panneau → "Ajouter" (bouton de soumission) exige exact.
    await page.getByRole('button', { name: 'Ajouter un garant' }).click();
    await page.getByLabel('Nom', { exact: true }).fill('Okemba');
    await page.getByLabel('Téléphone', { exact: true }).fill(GUARANTOR_PHONE);
    await page.getByLabel('Lien avec le locataire', { exact: true }).fill('Frère');
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();

    await expect(page.getByText('Okemba')).toBeVisible();
    await expect(page.getByText('Frère')).toBeVisible();

    // Document (pièce d'identité) : upload direct PUT vers l'URL mockée par MSW,
    // aucun mock Playwright — voir le handler dédié dans src/mocks/handlers.ts.
    // Un seul input[type=file] sur cette fiche (section Documents) : voir
    // DocumentUploader (apps/web/src/components/business/document-uploader.tsx),
    // l'input est sr-only et associé à un <label> cliquable.
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'cni-massamba.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('donnee-image-factice'),
    });

    await expect(page.getByText('cni-massamba.jpg')).toBeVisible();
  });
});
