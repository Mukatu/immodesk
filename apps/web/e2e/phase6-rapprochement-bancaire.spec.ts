import { test, expect } from '@playwright/test';

/**
 * Parcours phase 6 : import d'un relevé bancaire, rapprochement automatique
 * et suggéré, rapprochement manuel, cycle de vie d'un chèque, conformes à
 * docs/api/phase6-contract.md. Comme les autres phases, ce scénario crée sa
 * propre organisation fraîche (jamais DEMO_ORG_ID, voir le commentaire dans
 * handlers.ts) : bailleur + compte bancaire (compte crédité par les loyers)
 * et un locataire, sans bail ni facture — inutiles ici.
 *
 * Le mock d'import (`bank-statements-handlers.ts`) génère toujours, quel que
 * soit le fichier envoyé, 12 lignes déterministes libellées
 * "VIREMENT IMPORT LIGNE {n}" : 1-6 rapprochées automatiquement (EXACT),
 * 7-9 suggérées (scores 88/79/76), 10-12 non rapprochées (ancienneté
 * croissante, la ligne 12 dépassant 30 jours).
 */

const DEV_OTP_CODE = '000000';

test.describe('Rapprochement bancaire phase 6', () => {
  test('importer un relevé, valider une suggestion, rapprocher manuellement une ligne, déposer et compenser un chèque', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const loginPhone = '069000901';
    const orgContactPhone = '069000902';
    const landlordPhone = '069000903';
    const tenantPhone = '069000904';
    const landlordName = 'Mabiala';
    const tenantName = 'Kimbembe';
    // Littéral fixe : le doublon est détecté par organisation + banque + numéro
    // (bank-checks-handlers.ts), et chaque test crée sa propre organisation
    // fraîche, donc aucun besoin d'un suffixe rendu unique par l'horloge.
    const checkNumber = 'CHQ-E2E-000001';

    // --- Connexion OTP → organisation fraîche ---
    await page.goto('/login');
    await page.getByPlaceholder('06 xxx xx xx').fill(loginPhone);
    await page.getByRole('button', { name: 'Recevoir le code' }).click();
    await expect(page.getByText(/Code envoyé au/)).toBeVisible();
    const otpInput = page.locator('#otp-input');
    await otpInput.click();
    await page.keyboard.type(DEV_OTP_CODE);
    await page.getByRole('button', { name: 'Valider le code' }).click();

    await expect(page).toHaveURL(/\/onboarding\/organisation/);
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByLabel('Raison sociale').fill('Agence Rapprochement E2E');
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.locator('#contact-phone').fill(orgContactPhone);
    await page.getByRole('button', { name: 'Créer l’organisation' }).click();
    // La création redirige désormais vers l'onboarding guidé (phase 10) :
    // sans intérêt pour ce scénario, on le passe entièrement.
    await expect(page).toHaveURL(/\/onboarding\/etapes/);
    await page.getByRole('button', { name: 'Passer cette étape' }).click();
    await page.getByRole('button', { name: 'Passer cette étape' }).click();
    await page.getByRole('button', { name: 'Passer cette étape' }).click();
    await page.getByRole('button', { name: 'Aller au tableau de bord' }).click();
    await expect(page).toHaveURL(/\/app$/);

    // --- Bailleur + compte bancaire (compte crédité par les loyers) ---
    await page.getByRole('link', { name: 'Bailleurs' }).click();
    await page.getByRole('button', { name: 'Nouveau bailleur' }).click();
    await page.getByLabel('Nom', { exact: true }).fill(landlordName);
    await page.getByLabel('Téléphone', { exact: true }).fill(landlordPhone);
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Créer le bailleur' }).click();
    await expect(page).toHaveURL(/\/app\/bailleurs\/[^/]+$/);

    await page.getByRole('button', { name: 'Ajouter un compte' }).click();
    await page.getByLabel('Libellé').fill('Compte principal');
    await page.getByLabel('Code banque').fill('BGFI');
    await page.getByLabel('Nom de la banque').fill('BGFIBank Congo');
    await page.getByLabel('Titulaire du compte').fill(landlordName);
    await page.getByLabel('Numéro de compte (optionnel)').fill('04123456789');
    await page.getByRole('button', { name: 'Ajouter le compte' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByText('BGFIBank Congo')).toBeVisible();

    // --- Locataire (pour le chèque et la recherche manuelle) ---
    await page.getByRole('link', { name: 'Locataires' }).click();
    await page.getByRole('link', { name: 'Nouveau locataire' }).click();
    await page.getByLabel('Nom', { exact: true }).fill(tenantName);
    await page.getByLabel('Téléphone principal', { exact: true }).fill(tenantPhone);
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Créer le locataire', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/locataires\/[^/]+$/);

    // --- Chèque reçu, puis déposé (prérequis pour le rapprochement manuel) ---
    await page.goto('/app/banque/cheques');
    await page.getByRole('button', { name: 'Enregistrer un chèque reçu' }).click();
    await page.getByPlaceholder('Rechercher un locataire…').fill(tenantName);
    await page.getByRole('button', { name: tenantName }).click();
    await page.getByLabel('Numéro de chèque').fill(checkNumber);
    await page.getByLabel('Montant').fill('75000');
    await page.getByLabel('Nom du tireur').fill(tenantName);
    await page.getByLabel('Banque du tireur', { exact: true }).fill('LCB Bank');
    await page.getByLabel('Code banque du tireur').fill('LCB');
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByText(checkNumber)).toBeVisible();

    const checkRow = page.getByRole('row', { name: new RegExp(checkNumber) });
    await checkRow.getByRole('button', { name: 'Déposer' }).click();
    await page.getByLabel('Compte de dépôt').click();
    await page.getByRole('option', { name: /Compte principal/ }).click();
    await page.getByRole('button', { name: 'Confirmer le dépôt' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(checkRow).toContainText('Déposé');

    // --- Import du relevé (12 lignes générées par le mock) ---
    await page.goto('/app/banque/releves');
    await page.getByLabel('Compte').click();
    await page.getByRole('option', { name: /Compte principal/ }).click();
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: 'releve-bgfi-mars.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('date;libelle;montant;sens\n01/03/2026;VIREMENT;100000;CREDIT\n'),
      });
    await expect(page.getByText("Rapport d'import")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('12', { exact: true }).first()).toBeVisible();

    // --- Rapprochement : valider la suggestion de la ligne 7 (score 88) ---
    await page.getByRole('link', { name: 'Rapprochement' }).click();
    const line7Row = page.getByRole('row', { name: /LIGNE 7/ });
    await line7Row.getByRole('button', { name: 'Traiter' }).click();
    await page.getByRole('button', { name: 'Valider' }).click();
    await expect(page.getByText('Rapprochement confirmé.')).toBeVisible();
    await expect(line7Row).toContainText('Rapprochée');

    // --- Rapprochement manuel de la ligne 12 (non rapprochée, > 30 jours) ---
    const line12Row = page.getByRole('row', { name: /LIGNE 12/ });
    await expect(line12Row).toContainText("plus d'un mois");
    await line12Row.getByRole('button', { name: 'Traiter' }).click();

    await page.getByLabel('Type de cible').click();
    await page.getByRole('option', { name: 'Chèque' }).click();
    await page.getByPlaceholder('Rechercher un locataire…').fill(tenantName);
    await page.getByRole('button', { name: tenantName }).click();
    await page
      .locator('li')
      .filter({ hasText: checkNumber })
      .getByRole('button', { name: 'Choisir' })
      .click();
    await page.getByRole('button', { name: 'Rapprocher manuellement' }).click();
    await expect(page.getByText('Rapprochement manuel enregistré.')).toBeVisible();
    await expect(line12Row).toContainText('Rapprochée');

    // --- Compensation du chèque déposé ---
    await page.getByRole('link', { name: 'Chèques' }).click();
    await checkRow.getByRole('button', { name: 'Compenser' }).click();
    await expect(page.getByText('Chèque compensé.')).toBeVisible();
    await expect(checkRow).toContainText('Compensé');
  });
});
