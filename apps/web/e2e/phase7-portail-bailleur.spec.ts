import { test, expect } from '@playwright/test';

/**
 * Parcours phase 7 (portail bailleur) : invitation par WhatsApp depuis un
 * mandat actif → activation par code reçu sur le téléphone → vérification
 * qu'aucune action d'écriture ni aucune navigation d'agence n'est proposée,
 * conforme à docs/api/phase7-contract.md (arbitrage n°7, rôle LANDLORD_PORTAL
 * en lecture seule). Session et jeton isolés de l'agence (portal-auth-context,
 * cookie `immodesk_portal_refresh_token`) : l'activation se fait dans un
 * contexte navigateur neuf, comme la vérification publique de quittance.
 */

const DEV_OTP_CODE = '000000';

const LOGIN_PHONE = '069001011';
const ORG_CONTACT_PHONE = '069001012';
const LANDLORD_PHONE = '069001013';

const WRITE_ACTION_NAMES =
  /Créer|Nouveau|Nouvelle|Activer|Suspendre|Résilier|Approuver|Exécuter|Rejeter|Valider|Soumettre|Ajouter|Modifier|Supprimer|Annuler le relevé|Marquer en échec/;

test.describe('Portail bailleur phase 7 : invitation → activation → lecture seule', () => {
  test('activer le portail depuis l’invitation et vérifier l’absence de toute action d’écriture', async ({
    page,
    browser,
  }) => {
    test.setTimeout(90_000);

    // --- Agence : organisation, bailleur, bien, mandat actif ---
    await page.goto('/login');
    await page.getByPlaceholder('06 xxx xx xx').fill(LOGIN_PHONE);
    await page.getByRole('button', { name: 'Recevoir le code' }).click();
    await expect(page.getByText(/Code envoyé au/)).toBeVisible();
    await page.locator('#otp-input').click();
    await page.keyboard.type(DEV_OTP_CODE);
    await page.getByRole('button', { name: 'Valider le code' }).click();

    await expect(page).toHaveURL(/\/onboarding\/organisation/);
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByLabel('Raison sociale').fill('Agence Portail E2E');
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.locator('#contact-phone').fill(ORG_CONTACT_PHONE);
    await page.getByRole('button', { name: 'Créer l’organisation' }).click();
    // La création redirige désormais vers l'onboarding guidé (phase 10) :
    // sans intérêt pour ce scénario, on le passe entièrement.
    await expect(page).toHaveURL(/\/onboarding\/etapes/);
    await page.getByRole('button', { name: 'Passer cette étape' }).click();
    await page.getByRole('button', { name: 'Passer cette étape' }).click();
    await page.getByRole('button', { name: 'Passer cette étape' }).click();
    await page.getByRole('button', { name: 'Aller au tableau de bord' }).click();
    await expect(page).toHaveURL(/\/app$/);

    // Groupe « Patrimoine » fermé par défaut (sidebar-nav.tsx) : à ouvrir avant le
    // premier clic sur un de ses liens.
    await page.getByRole('button', { name: 'Patrimoine' }).click();
    await page.getByRole('link', { name: 'Bailleurs' }).click();
    await page.getByRole('button', { name: 'Nouveau bailleur' }).click();
    await page.getByLabel('Nom', { exact: true }).fill('Ngoma');
    await page.getByLabel('Téléphone', { exact: true }).fill(LANDLORD_PHONE);
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Créer le bailleur' }).click();
    await expect(page).toHaveURL(/\/app\/bailleurs\/[^/]+$/);

    await page.getByRole('link', { name: 'Immeubles' }).click();
    await page.getByRole('link', { name: 'Nouvel immeuble' }).click();
    await page.getByLabel('Bailleur', { exact: true }).click();
    await page.getByRole('option', { name: 'Ngoma' }).click();
    await page.getByLabel("Nom de l'immeuble", { exact: true }).fill('Résidence Portail Test');
    await page.getByLabel('Adresse', { exact: true }).fill('Rue de la Paix');
    await page.getByLabel('Quartier', { exact: true }).fill('Moungali');
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: "Créer l'immeuble", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/immeubles\/[^/]+$/);

    await page.goto('/app/gerance/mandats/nouveau');
    await page.getByLabel('Bailleur', { exact: true }).click();
    await page.getByRole('option', { name: 'Ngoma' }).click();
    await page.getByLabel('Résidence Portail Test', { exact: false }).check();
    await page.getByRole('button', { name: 'Créer le mandat' }).click();
    await expect(page).toHaveURL(/\/app\/gerance\/mandats\/[^/]+$/);
    await page.getByRole('button', { name: 'Activer' }).click();
    await expect(page.getByText('Actif', { exact: true })).toBeVisible();

    const mandateId = page.url().split('/mandats/')[1];
    expect(mandateId).toBeTruthy();

    await page.getByRole('button', { name: 'Inviter le bailleur par WhatsApp' }).click();
    await expect(page.getByText('Invitation envoyée', { exact: true })).toBeVisible();

    // --- Activation du portail, dans un contexte navigateur neuf (sans session agence) ---
    const portalContext = await browser.newContext();
    const portalPage = await portalContext.newPage();
    await portalPage.goto(`/portail/activer/${mandateId}`);
    await portalPage.getByRole('button', { name: 'Recevoir le code' }).click();
    await expect(portalPage.getByText(/Code envoyé au/)).toBeVisible();
    await portalPage.locator('#portal-otp-input').click();
    await portalPage.keyboard.type(DEV_OTP_CODE);
    await portalPage.getByRole('button', { name: 'Activer mon accès' }).click();
    await expect(portalPage).toHaveURL(/\/portail$/);
    await expect(portalPage.getByRole('heading', { name: /Ngoma/ })).toBeVisible();

    // --- Lecture seule : aucune action d'écriture, aucune navigation d'agence ---
    for (const path of [
      '/portail',
      '/portail/releves',
      '/portail/reversements',
      '/portail/encaissements',
      '/portail/quittances',
    ]) {
      await portalPage.goto(path);
      await expect(portalPage.locator('a[href^="/app"]')).toHaveCount(0);
      const writeButtons = portalPage.getByRole('button', { name: WRITE_ACTION_NAMES });
      await expect(writeButtons).toHaveCount(0);
    }

    await portalContext.close();
  });
});
