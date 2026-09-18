import { test, expect, type Page } from '@playwright/test';

/**
 * Parcours phase 10 : apport d'affaires (parrainage), conforme à
 * docs/api/phase10-contract.md, section « Apport d'affaires » (arbitrages
 * n°5 à 7). `/partenaire` réutilise la session Immodesk normale (pas de
 * jeton séparé) : chaque « rôle » de ce scénario est donc une organisation
 * fraîche distincte, comme dans les autres phases.
 *
 * Le second test agit sur les données de démonstration seedées une seule
 * fois au démarrage du serveur mock (`seedReferralDemoData`, un partenaire
 * ACTIVE avec trois commissions ACCRUED/APPROVED/PAID) : aucune route du
 * contrat ne permet de créer une commission depuis le dashboard (elles
 * naissent du paiement réel d'un abonnement, hors périmètre de ce lot), ce
 * jeu de données est donc le seul moyen d'exercer réellement l'approbation
 * et le versement groupé de bout en bout.
 */

const DEV_OTP_CODE = '000000';

/**
 * La création d'une organisation redirige désormais systématiquement vers
 * `/onboarding/etapes` (suite d'onboarding guidé, phase 10), jamais
 * directement vers `/app` : « Passer cette étape » ne modifie rien côté
 * serveur, ce détour est donc sans effet sur les rôles de ce scénario, qui
 * n'ont besoin que d'une organisation existante (OWNER).
 */
async function skipOnboardingWizard(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/onboarding\/etapes/);
  await page.getByRole('button', { name: 'Passer cette étape' }).click();
  await page.getByRole('button', { name: 'Passer cette étape' }).click();
  await page.getByRole('button', { name: 'Passer cette étape' }).click();
  await page.getByRole('button', { name: 'Aller au tableau de bord' }).click();
  await expect(page).toHaveURL(/\/app$/);
}

async function loginAndCreateOrganization(
  page: Page,
  opts: { loginPhone: string; orgContactPhone: string; orgName: string },
): Promise<void> {
  await page.goto('/login');
  await page.getByPlaceholder('06 xxx xx xx').fill(opts.loginPhone);
  await page.getByRole('button', { name: 'Recevoir le code' }).click();
  await expect(page.getByText(/Code envoyé au/)).toBeVisible();
  await page.locator('#otp-input').click();
  await page.keyboard.type(DEV_OTP_CODE);
  await page.getByRole('button', { name: 'Valider le code' }).click();

  await expect(page).toHaveURL(/\/onboarding\/organisation/);
  await page.getByRole('button', { name: 'Suivant' }).click();
  await page.getByLabel('Raison sociale').fill(opts.orgName);
  await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
  await page.getByRole('button', { name: 'Suivant' }).click();
  await page.locator('#contact-phone').fill(opts.orgContactPhone);
  await page.getByRole('button', { name: 'Créer l’organisation' }).click();
  await skipOnboardingWizard(page);
}

test.describe('Parrainage phase 10 : partenaire, apport de bien confirmé par OTP, back-office', () => {
  test('inscription partenaire → apport d’un bien confirmé par OTP → filleul visible', async ({
    page,
    browser,
  }) => {
    test.setTimeout(120_000);

    // --- Partenaire : session Immodesk normale, inscription ---
    await loginAndCreateOrganization(page, {
      loginPhone: '069070001',
      orgContactPhone: '069070002',
      orgName: 'Agence Parrain Filleul E2E',
    });
    await page.goto('/partenaire');
    await page.getByLabel('Nom à afficher').fill('Ondongo Apporteur E2E');
    await page.locator('#partner-phone').fill('066070003');
    await page.getByRole('button', { name: "M'inscrire comme partenaire" }).click();
    await expect(page.getByText('Vérification en attente', { exact: true })).toBeVisible();

    await page.goto('/partenaire/tableau-de-bord');
    await expect(page.getByText("Aucun filleul pour l'instant")).toBeVisible();

    // --- Apport d'un bien : le bailleur ciblé n'a pas encore de compte Immodesk ---
    const landlordPhone = '069070101';
    await page.getByRole('button', { name: 'Apporter un bien' }).click();
    await page.getByLabel('Nom du bien').fill('Villa Apport E2E');
    await page.getByLabel('Ville', { exact: true }).fill('Pointe-Noire');
    await page.getByLabel('Adresse').fill('Avenue Charles de Gaulle');
    await page.getByLabel('Téléphone du bailleur').fill(landlordPhone);
    await page.getByRole('button', { name: 'Envoyer le code de confirmation' }).click();
    await expect(page.getByText(/Code envoyé à/)).toBeVisible();
    const confirmLinkInput = page.locator('input[readonly]').first();
    const confirmLink = await confirmLinkInput.inputValue();
    expect(confirmLink).toMatch(/\/partenaire\/confirmer\//);
    await page.getByRole('button', { name: 'Terminer' }).click();

    // --- Le bailleur crée son propre compte Immodesk (même numéro), condition
    // du rattachement (confirm-otp résout l'organisation par ce numéro) ---
    const landlordContext = await browser.newContext();
    const landlordPage = await landlordContext.newPage();
    const landlordOrgName = 'Villa Apport Bailleur E2E';
    await loginAndCreateOrganization(landlordPage, {
      loginPhone: landlordPhone,
      orgContactPhone: '069070102',
      orgName: landlordOrgName,
    });
    await landlordContext.close();

    // --- Confirmation par le bailleur : page publique, sans session ---
    const publicContext = await browser.newContext();
    const publicPage = await publicContext.newPage();
    await publicPage.goto(new URL(confirmLink).pathname);
    await publicPage.locator('#otp-input').click();
    await publicPage.keyboard.type(DEV_OTP_CODE);
    await publicPage.getByRole('button', { name: 'Confirmer' }).click();
    await expect(
      publicPage.getByText(`Rattachement confirmé pour ${landlordOrgName}.`),
    ).toBeVisible();
    await publicContext.close();

    // --- Le filleul apparaît côté partenaire, en attente de qualification ---
    await page.goto('/partenaire/tableau-de-bord');
    await expect(page.getByText(landlordOrgName)).toBeVisible();
    await expect(page.getByText('Bien enregistré par le partenaire')).toBeVisible();
    await expect(page.getByText('En attente', { exact: true })).toBeVisible();

    // --- Aucune commission pour l'instant : aucun abonnement payé côté filleul ---
    await page.getByRole('tab', { name: 'Commissions et versements' }).click();
    await expect(page.getByText("Aucune commission pour l'instant")).toBeVisible();
  });

  test('back-office : approbation d’une commission ACCRUED puis versement groupé', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await loginAndCreateOrganization(page, {
      loginPhone: '069070201',
      orgContactPhone: '069070202',
      orgName: 'Agence Back-office Parrainage E2E',
    });

    // --- Campagne d'approbation : la seule commission ACCRUED est celle du
    // partenaire de démonstration (seedReferralDemoData), jamais recréée ---
    await page.goto('/app/admin/commissions');
    await page.getByRole('button', { name: 'Approuver les commissions ACCRUED' }).click();
    await expect(page.getByText('Commissions approuvées')).toBeVisible();
    await expect(page.getByText('1', { exact: true }).first()).toBeVisible();

    // --- Versement groupé : regroupe cette commission avec celle déjà
    // APPROVED du même partenaire de démonstration (deux commissions, un seul
    // versement puisqu'un seul partenaire a des commissions approuvées) ---
    await page.goto('/app/admin/versements');
    await page.getByRole('button', { name: 'Lancer le versement groupé' }).click();
    await expect(page.getByText('1 versement(s) lancé(s).')).toBeVisible();

    const payoutRow = page.locator('tbody tr').first();
    await expect(payoutRow).toContainText('Reversé');
    await expect(payoutRow).toContainText('2');
  });
});
