import { test, expect } from '@playwright/test';

/**
 * Parcours phase 10 : import de portefeuille en masse (arbitrage n°3 du
 * contrat, docs/api/phase10-contract.md), avec un rapport comportant des
 * lignes rejetées visibles. Le mock (`portfolio-import-handlers.ts`) renvoie
 * un rapport déterministe (`buildDeterministicImportReport`, pas de vrai
 * parsing CSV) : 42 lignes lues, 38 créées, 4 rejetées — un contenu de
 * fichier plausible suffit donc à déclencher le job.
 */

const DEV_OTP_CODE = '000000';

test.describe('Import de portefeuille phase 10 : rapport avec lignes rejetées', () => {
  test('téléversement du fichier → rapport avec 4 lignes rejetées motivées', async ({ page }) => {
    test.setTimeout(60_000);

    await page.goto('/login');
    await page.getByPlaceholder('06 xxx xx xx').fill('069050001');
    await page.getByRole('button', { name: 'Recevoir le code' }).click();
    await expect(page.getByText(/Code envoyé au/)).toBeVisible();
    await page.locator('#otp-input').click();
    await page.keyboard.type(DEV_OTP_CODE);
    await page.getByRole('button', { name: 'Valider le code' }).click();

    await expect(page).toHaveURL(/\/onboarding\/organisation/);
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByLabel('Raison sociale').fill('Agence Import E2E');
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.locator('#contact-phone').fill('069050002');
    await page.getByRole('button', { name: 'Créer l’organisation' }).click();
    // La création redirige désormais vers l'onboarding guidé (phase 10) :
    // sans intérêt pour ce scénario, on le passe entièrement.
    await expect(page).toHaveURL(/\/onboarding\/etapes/);
    await page.getByRole('button', { name: 'Passer cette étape' }).click();
    await page.getByRole('button', { name: 'Passer cette étape' }).click();
    await page.getByRole('button', { name: 'Passer cette étape' }).click();
    await page.getByRole('button', { name: 'Aller au tableau de bord' }).click();
    await expect(page).toHaveURL(/\/app$/);

    await page.goto('/app/parametres/import-portefeuille');
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: 'portefeuille-e2e.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(
          'BAILLEUR;Ngoma;069050003;Brazzaville\nBIEN;Résidence Import;Avenue de la Paix\n',
        ),
      });

    await expect(page.getByText('Terminé', { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('42 lignes lues, 38 créées, 4 rejetées')).toBeVisible();

    // --- Quatre lignes rejetées, motivées en français, un type d'entité par ligne ---
    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(4);
    await expect(page.getByText("Adresse manquante pour l'immeuble.")).toBeVisible();
    await expect(
      page.getByText('Référence locale de bien introuvable dans le fichier.'),
    ).toBeVisible();
    await expect(page.getByText('Numéro de téléphone principal invalide.')).toBeVisible();
    await expect(page.getByText('Montant du loyer manquant ou non numérique.')).toBeVisible();

    // --- Téléchargement du CSV des rejets, puis nouvel import possible ---
    await expect(page.getByRole('button', { name: 'Télécharger les rejets (CSV)' })).toBeVisible();
    await page.getByRole('button', { name: 'Nouvel import' }).click();
    await expect(page.getByRole('heading', { name: 'Téléverser le fichier' })).toBeVisible();
  });
});
