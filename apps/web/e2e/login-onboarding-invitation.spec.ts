import { test, expect } from '@playwright/test';

/**
 * Parcours critique phase 0 : connexion OTP → création d'organisation → invitation.
 * Tourne intégralement contre le mock MSW (voir src/mocks/handlers.ts, intercepté côté
 * serveur par msw/node) : aucune dépendance à un backend réel. Les appels directs du
 * navigateur passent par le proxy same-origin /api/proxy/* (voir playwright.config.ts)
 * afin de partager le même état mocké que les route handlers /api/auth/*.
 */

const DEV_OTP_CODE = '000000';

test.describe('Connexion OTP → création d’organisation → invitation', () => {
  test('parcours complet', async ({ page }) => {
    await page.goto('/login');

    // Étape 1 : numéro de téléphone
    await page.getByPlaceholder('06 xxx xx xx').fill('066000099');
    await page.getByRole('button', { name: 'Recevoir le code' }).click();

    // Étape 2 : code OTP
    await expect(page.getByText(/Code envoyé au/)).toBeVisible();
    const otpInput = page.locator('#otp-input');
    await otpInput.click();
    await page.keyboard.type(DEV_OTP_CODE);
    await page.getByRole('button', { name: 'Valider le code' }).click();

    // Redirigé vers l'assistant de création d'organisation (nouvel utilisateur)
    await expect(page).toHaveURL(/\/onboarding\/organisation/);

    // Étape 1 : type d'organisation (AGENCY présélectionné) → Suivant
    await page.getByRole('button', { name: 'Suivant' }).click();

    // Étape 2 : identité
    await page.getByLabel('Raison sociale').fill('Agence Test E2E');
    await page.getByLabel('Ville').fill('Brazzaville');
    await page.getByRole('button', { name: 'Suivant' }).click();

    // Étape 3 : contact
    await page.locator('#contact-phone').fill('066000098');
    await page.getByRole('button', { name: 'Créer l’organisation' }).click();

    // Tableau de bord
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole('heading', { name: /Agence Test E2E/ })).toBeVisible();

    // Équipe → invitation
    await page.getByRole('link', { name: 'Gérer l’équipe' }).click();
    await expect(page).toHaveURL(/\/app\/equipe/);

    await page.getByRole('button', { name: 'Inviter un collaborateur' }).click();
    await page.locator('#invite-phone').fill('066000097');
    await page.getByRole('button', { name: 'Envoyer l’invitation' }).click();

    await expect(page.getByText('06 600 00 97')).toBeVisible();
    await expect(page.getByText('En attente', { exact: true })).toBeVisible();
  });
});
