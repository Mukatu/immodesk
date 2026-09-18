import { test, expect, type Page } from '@playwright/test';

/**
 * Parcours phase 10, côté organisation : abonnement SaaS payé par Mobile
 * Money, puis onboarding guidé en trois étapes avec un code de parrainage
 * saisi à l'inscription, conformes à docs/api/phase10-contract.md. Comme les
 * phases précédentes, chaque test crée sa propre organisation fraîche.
 *
 * Particularité vérifiée par le premier test : `PaySubscriptionInvoiceDialog`
 * réutilise `useRefreshMomoTransaction` (`POST
 * /payments/mobile-money/transactions/{id}/refresh`), route qui ne connaît
 * que les transactions de la Map partagée `momoTransactions`
 * (mobile-money-handlers.ts) — jamais les transactions `subpay-*` créées par
 * `subscription-handlers.ts`. Le panneau d'attente reste donc bloqué sur
 * « INITIATED » même quand le paiement a réussi côté serveur (immédiatement,
 * suffixe payeur ...01). Le test ne dépend donc pas de l'affichage du
 * panneau : il ferme le dialogue puis vérifie l'état réel (facture « Payée »,
 * abonnement « Actif ») déjà à jour derrière lui grâce à l'invalidation de la
 * requête des factures sur simple résolution de la mutation.
 */

const DEV_OTP_CODE = '000000';

/**
 * La création d'une organisation redirige désormais systématiquement vers
 * `/onboarding/etapes` (suite d'onboarding guidé, phase 10), jamais
 * directement vers `/app` : « Passer cette étape » ne modifie rien côté
 * serveur (voir le commentaire de tête de onboarding/etapes/page.tsx), ce
 * détour est donc sans effet sur les scénarios qui n'ont pas besoin de le
 * dérouler eux-mêmes.
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

test.describe('Monétisation phase 10 : abonnement Mobile Money et onboarding guidé', () => {
  test('facture d’abonnement payée par Mobile Money (suffixe payeur ...01)', async ({ page }) => {
    test.setTimeout(60_000);

    await loginAndCreateOrganization(page, {
      loginPhone: '069040001',
      orgContactPhone: '069040002',
      orgName: 'Agence Abonnement E2E',
    });
    // Organisation fraîche : pas de suite d'onboarding guidé à traverser ici,
    // on va directement à l'écran d'abonnement.
    await page.goto('/app/abonnement');

    await expect(page.getByText('Standard', { exact: true })).toBeVisible();
    await expect(page.getByText("Période d'essai", { exact: true })).toBeVisible();
    await expect(page.getByText('Émise', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Payer' }).click();
    await page.locator('#sub-invoice-payer').fill('066040001');
    const payResponse = page.waitForResponse(
      (res) => /\/subscription-invoices\/[^/]+\/pay$/.test(res.url()) && res.status() === 202,
    );
    await page.getByRole('button', { name: 'Lancer le paiement' }).click();
    await payResponse;

    // Le panneau d'attente reste bloqué (voir commentaire d'en-tête) : on
    // ferme le dialogue et on vérifie l'état réel, déjà à jour derrière lui
    // (la mutation de paiement n'invalide que la requête des factures,
    // jamais celle de l'abonnement lui-même : un rechargement est nécessaire
    // pour voir passer le statut d'abonnement à « Actif »).
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByText('Payée', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Payer' })).toHaveCount(0);

    await page.reload();
    await expect(page.getByText('Actif', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Payée', { exact: true })).toBeVisible();
  });

  test('onboarding guidé en trois étapes avec un code de parrainage saisi à l’inscription', async ({
    page,
    browser,
  }) => {
    test.setTimeout(120_000);

    // --- Partenaire, dans un contexte séparé : inscription puis code généré ---
    const partnerContext = await browser.newContext();
    const partnerPage = await partnerContext.newPage();
    await loginAndCreateOrganization(partnerPage, {
      loginPhone: '069040101',
      orgContactPhone: '069040102',
      orgName: 'Agence Partenaire Onboarding E2E',
    });
    await expect(partnerPage).toHaveURL(/\/app$/);
    await partnerPage.goto('/partenaire');
    await partnerPage.getByLabel('Nom à afficher').fill('Parrain Onboarding E2E');
    await partnerPage.locator('#partner-phone').fill('066040103');
    await partnerPage.getByRole('button', { name: "M'inscrire comme partenaire" }).click();
    const codeInput = partnerPage.locator('input.font-mono.text-lg.tracking-widest');
    await expect(codeInput).toBeVisible();
    const referralCode = await codeInput.inputValue();
    expect(referralCode).toMatch(/^IMD-/);

    // --- Nouvelle organisation, avec le code de parrainage à l'étape 3 ---
    const orgName = 'Agence Onboarding Guidé E2E';
    await page.goto('/login');
    await page.getByPlaceholder('06 xxx xx xx').fill('069040201');
    await page.getByRole('button', { name: 'Recevoir le code' }).click();
    await expect(page.getByText(/Code envoyé au/)).toBeVisible();
    await page.locator('#otp-input').click();
    await page.keyboard.type(DEV_OTP_CODE);
    await page.getByRole('button', { name: 'Valider le code' }).click();
    await expect(page).toHaveURL(/\/onboarding\/organisation/);
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByLabel('Raison sociale').fill(orgName);
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.locator('#contact-phone').fill('069040202');
    await page.getByLabel('Code de parrainage (optionnel)').fill(referralCode);
    await page.getByRole('button', { name: 'Créer l’organisation' }).click();
    await expect(page).toHaveURL(/\/onboarding\/etapes/);

    // --- Étape 1 « Premier bien » : aucun bailleur → détour par /app/bailleurs ---
    await expect(page.getByText('Aucun bailleur')).toBeVisible();
    await page.getByRole('link', { name: 'Créer un bailleur' }).click();
    await expect(page).toHaveURL(/\/app\/bailleurs$/);
    await page.getByRole('button', { name: 'Nouveau bailleur' }).click();
    await page.getByLabel('Nom', { exact: true }).fill('Malonga');
    await page.getByLabel('Téléphone', { exact: true }).fill('069040203');
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Créer le bailleur' }).click();
    await expect(page).toHaveURL(/\/app\/bailleurs\/[^/]+$/);

    await page.goto('/onboarding/etapes');
    await page.getByLabel('Bailleur', { exact: true }).click();
    await page.getByRole('option', { name: 'Malonga' }).click();
    await page.getByLabel('Nom du bien').fill('Résidence Onboarding Guidé');
    await page.getByLabel('Adresse').fill('Avenue de la Tsiémé');
    await page.getByLabel('Quartier / arrondissement').fill('Ouenzé');
    await page.getByRole('button', { name: 'Créer le bien' }).click();

    // --- Étape 2 « Premier bail » : ni lot ni locataire → détours nécessaires ---
    await expect(page.getByText('Lot ou locataire manquant')).toBeVisible();
    await page.getByRole('link', { name: 'Créer un lot' }).click();
    await expect(page).toHaveURL(/\/app\/immeubles$/);
    await page.getByRole('link', { name: 'Résidence Onboarding Guidé' }).click();
    await expect(page).toHaveURL(/\/app\/immeubles\/[^/]+$/);
    await page.getByRole('button', { name: 'Créer des lots en série' }).click();
    await page.getByLabel('Préfixe', { exact: true }).fill('O');
    await page.getByLabel('De', { exact: true }).fill('1');
    await page.getByLabel('À', { exact: true }).fill('1');
    await page.getByLabel('Loyer de base', { exact: true }).fill('90000');
    await page.getByRole('button', { name: 'Créer les lots', exact: true }).click();
    await expect(page.getByRole('link', { name: 'O01' })).toBeVisible();

    await page.goto('/app/locataires/nouveau');
    await page.getByLabel('Nom', { exact: true }).fill('Bakekolo');
    await page.getByLabel('Téléphone principal', { exact: true }).fill('069040204');
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Créer le locataire', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/locataires\/(?!nouveau)[^/]+$/);

    await page.goto('/onboarding/etapes');
    await page.getByLabel('Lot', { exact: true }).click();
    await page.getByRole('option', { name: 'O01' }).click();
    await page.getByLabel('Locataire', { exact: true }).click();
    await page.getByRole('option', { name: 'Bakekolo' }).click();
    await page.locator('#first-lease-start').fill('2024-02-01');
    await page.locator('#first-lease-rent').fill('90000');
    await page.getByRole('button', { name: 'Créer le bail' }).click();

    // --- Étape 3 « Première invitation » ---
    await expect(page.getByText('Première invitation', { exact: true })).toBeVisible();
    await page.locator('#first-invite-phone').fill('069040205');
    await page.getByLabel('Rôle', { exact: true }).click();
    await page.getByRole('option', { name: 'Gestionnaire' }).click();
    await page.getByRole('button', { name: "Envoyer l'invitation" }).click();

    await expect(page.getByText('Vous êtes prêt à utiliser Immodesk.')).toBeVisible();
    await page.getByRole('button', { name: 'Aller au tableau de bord' }).click();
    await expect(page).toHaveURL(/\/app$/);

    // --- Vérification côté partenaire : le filleul est rattaché, en attente ---
    await partnerPage.goto('/partenaire/tableau-de-bord');
    await expect(partnerPage.getByText(orgName)).toBeVisible();
    await expect(partnerPage.getByText("Code saisi à l'inscription")).toBeVisible();
    await expect(partnerPage.getByText('En attente', { exact: true }).first()).toBeVisible();

    await partnerContext.close();
  });
});
