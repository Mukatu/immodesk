import { test, expect } from '@playwright/test';

/**
 * Parcours phase 10 : portail locataire (docs/api/phase10-contract.md,
 * section « Portail locataire »). Session et jeton isolés de l'agence
 * (tenant-auth-context, cookie propre au portail) : comme le portail bailleur
 * (phase 7) et la vérification publique de quittance (phase 3), la connexion
 * se fait dans un contexte navigateur neuf. L'agence reconstitue d'abord un
 * portefeuille minimal (bailleur avec compte bancaire → immeuble → lot →
 * locataire → bail actif → facture émise), condition requise pour que le
 * numéro du locataire soit reconnu par `POST /tenant-auth/otp/verify` et pour
 * que le formulaire de virement propose un compte bancaire de destination.
 */

const DEV_OTP_CODE = '000000';
const TENANT_PHONE = '069060004';

test.describe('Portail locataire phase 10 : facture, paiement Mobile Money, quittance, virement', () => {
  test('connexion OTP → paiement Mobile Money → quittance téléchargée → virement déclaré', async ({
    page,
    browser,
  }) => {
    test.setTimeout(90_000);

    // --- Agence : organisation, bailleur + compte bancaire, immeuble, lot ---
    await page.goto('/login');
    await page.getByPlaceholder('06 xxx xx xx').fill('069060001');
    await page.getByRole('button', { name: 'Recevoir le code' }).click();
    await expect(page.getByText(/Code envoyé au/)).toBeVisible();
    await page.locator('#otp-input').click();
    await page.keyboard.type(DEV_OTP_CODE);
    await page.getByRole('button', { name: 'Valider le code' }).click();

    await expect(page).toHaveURL(/\/onboarding\/organisation/);
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByLabel('Raison sociale').fill('Agence Portail Locataire E2E');
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.locator('#contact-phone').fill('069060002');
    await page.getByRole('button', { name: 'Créer l’organisation' }).click();
    // La création redirige désormais vers l'onboarding guidé (phase 10) :
    // sans intérêt pour ce scénario, on le passe entièrement.
    await expect(page).toHaveURL(/\/onboarding\/etapes/);
    await page.getByRole('button', { name: 'Passer cette étape' }).click();
    await page.getByRole('button', { name: 'Passer cette étape' }).click();
    await page.getByRole('button', { name: 'Passer cette étape' }).click();
    await page.getByRole('button', { name: 'Aller au tableau de bord' }).click();
    await expect(page).toHaveURL(/\/app$/);

    await page.getByRole('link', { name: 'Bailleurs' }).click();
    await page.getByRole('button', { name: 'Nouveau bailleur' }).click();
    await page.getByLabel('Nom', { exact: true }).fill('Ossebi');
    await page.getByLabel('Téléphone', { exact: true }).fill('069060003');
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Créer le bailleur' }).click();
    await expect(page).toHaveURL(/\/app\/bailleurs\/[^/]+$/);

    await page.getByRole('button', { name: 'Ajouter un compte' }).click();
    await page.getByLabel('Libellé').fill('Compte principal');
    await page.getByLabel('Code banque').fill('BGFI');
    await page.getByLabel('Nom de la banque').fill('BGFIBank Congo');
    await page.getByLabel('Titulaire du compte').fill('Ossebi');
    await page.getByLabel('Numéro de compte (optionnel)').fill('04987654321');
    await page.getByRole('button', { name: 'Ajouter le compte' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByText('BGFIBank Congo')).toBeVisible();

    await page.getByRole('link', { name: 'Immeubles' }).click();
    await page.getByRole('link', { name: 'Nouvel immeuble' }).click();
    await page.getByLabel('Bailleur', { exact: true }).click();
    await page.getByRole('option', { name: 'Ossebi' }).click();
    await page.getByLabel("Nom de l'immeuble", { exact: true }).fill('Résidence Portail Locataire');
    await page.getByLabel('Adresse', { exact: true }).fill('Rue de la Likouala');
    await page.getByLabel('Quartier', { exact: true }).fill('Poto-Poto');
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: "Créer l'immeuble", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/immeubles\/[^/]+$/);

    await page.getByRole('button', { name: 'Créer des lots en série' }).click();
    await page.getByLabel('Préfixe', { exact: true }).fill('T');
    await page.getByLabel('De', { exact: true }).fill('1');
    await page.getByLabel('À', { exact: true }).fill('1');
    await page.getByLabel('Loyer de base', { exact: true }).fill('80000');
    await page.getByRole('button', { name: 'Créer les lots', exact: true }).click();
    await expect(page.getByRole('link', { name: 'T01' })).toBeVisible();

    // --- Locataire (téléphone servant de connexion au portail) et bail actif ---
    await page.getByRole('link', { name: 'Locataires' }).click();
    await page.getByRole('link', { name: 'Nouveau locataire' }).click();
    await page.getByLabel('Nom', { exact: true }).fill('Mafoula');
    await page.getByLabel('Téléphone principal', { exact: true }).fill(TENANT_PHONE);
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Créer le locataire', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/locataires\/(?!nouveau)[^/]+$/);

    await page.goto('/app/baux');
    await page.getByRole('link', { name: 'Nouveau bail' }).click();
    await page.getByLabel('Immeuble', { exact: true }).click();
    await page.getByRole('option', { name: 'Résidence Portail Locataire' }).click();
    await page.getByLabel('Lot disponible', { exact: true }).click();
    await page.getByRole('option', { name: 'T01', exact: true }).click();
    await page.getByPlaceholder('Rechercher un locataire par nom ou numéro').fill('Mafoula');
    await page.getByRole('button', { name: /Mafoula/ }).click();
    await page.getByLabel('Date de début', { exact: true }).fill('2024-01-15');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByLabel('Loyer', { exact: true }).fill('80000');
    await page.getByLabel('Périodicité', { exact: true }).click();
    await page.getByRole('option', { name: 'Mensuel' }).click();
    await page.getByLabel("Jour d'échéance", { exact: true }).fill('5');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByRole('button', { name: 'Créer le bail' }).click();
    await expect(page).toHaveURL(/\/app\/baux\/[^/]+$/);
    await page.getByRole('button', { name: 'Activer' }).click();
    await page.getByRole('button', { name: 'Confirmer l’activation' }).click();
    await expect(page.getByText('Actif', { exact: true })).toBeVisible();

    // --- Facture émise (80 000 XAF), échéance lointaine pour rester "Émise" ---
    await page.goto('/app/factures/nouvelle');
    await page
      .getByLabel('Bail')
      .selectOption({ label: 'Mafoula — Résidence Portail Locataire (T01)' });
    await page.locator('#periodStart').fill('2024-01-01');
    await page.locator('#periodEnd').fill('2024-01-31');
    await page.locator('#dueDate').fill('2099-12-31');
    await page.getByLabel('Libellé de la ligne').fill('Loyer du mois');
    await page.getByLabel('Montant de la ligne').fill('80000');
    await page.getByText('Émettre immédiatement').click();
    await page.getByRole('button', { name: 'Créer la facture' }).click();
    await expect(page).toHaveURL(/\/app\/factures\/[^/]+$/);
    await expect(page.getByText('Émise', { exact: true })).toBeVisible();

    // --- Portail locataire : session isolée, contexte navigateur neuf ---
    const tenantContext = await browser.newContext();
    const tenantPage = await tenantContext.newPage();
    await tenantPage.goto('/locataire/connexion');
    await tenantPage.getByLabel('Numéro de téléphone').fill(TENANT_PHONE);
    await tenantPage.getByRole('button', { name: 'Recevoir le code' }).click();
    await expect(tenantPage.getByText(/Code envoyé au/)).toBeVisible();
    await tenantPage.locator('#tenant-otp-input').click();
    await tenantPage.keyboard.type(DEV_OTP_CODE);
    await tenantPage.getByRole('button', { name: 'Se connecter' }).click();
    await expect(tenantPage).toHaveURL(/\/locataire$/);
    await expect(tenantPage.getByRole('heading', { name: /Bonjour Mafoula/ })).toBeVisible();
    await expect(tenantPage.getByText('Émise', { exact: true })).toBeVisible();

    // --- Paiement Mobile Money (numéro payeur se terminant par ...01) ---
    await tenantPage.getByText('Résidence Portail Locataire').click();
    await expect(tenantPage).toHaveURL(/\/locataire\/factures\/[^/]+$/);
    await tenantPage.locator('#tenant-payer-phone').fill('066060001');
    await tenantPage.getByRole('button', { name: 'Demander le paiement' }).click();
    // Suffixe ...01 : succès immédiat. Le panneau d'attente est transitoire —
    // dès que la facture repasse PAID, `canPay` devient faux et le panneau
    // disparaît du DOM avec le reste du formulaire de paiement ; seul l'état
    // métier final (facture « Payée », quittance disponible) est donc vérifié.
    await expect(tenantPage.getByText('Payée', { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });

    // --- Quittance : ouverture dans un nouvel onglet (lien à durée limitée).
    // Le domaine mocké (mock.immodesk.internal) n'existe pas réellement, donc
    // pas de navigation observable côté onglet : on vérifie la mécanique
    // (requête `GET /tenant/receipts/{id}`, nouvel onglet ouvert) plutôt que
    // l'URL finale d'une page qui ne se chargera jamais.
    const receiptRequest = tenantPage.waitForResponse((res) =>
      /\/tenant\/receipts\/[^/]+$/.test(res.url()),
    );
    const [popup] = await Promise.all([
      tenantContext.waitForEvent('page'),
      tenantPage.getByRole('button', { name: 'Télécharger la quittance' }).click(),
    ]);
    const receiptResponse = await receiptRequest;
    expect(receiptResponse.ok()).toBe(true);
    const receiptBody = (await receiptResponse.json()) as { downloadUrl: string };
    expect(receiptBody.downloadUrl).toMatch(/\/documents\/.+\.pdf$/);
    await popup.close();

    // --- Déclaration de virement : formulaire, compte de destination réel et
    // contrôle client (preuve obligatoire) d'abord, sans fichier joint.
    await tenantPage.goto('/locataire/virement');
    await tenantPage.locator('#transfer-amount').fill('80000');
    await tenantPage.locator('#transfer-date').fill('2024-02-03');
    await tenantPage.locator('#transfer-payer').fill('Mafoula');
    await tenantPage.getByLabel('Compte bancaire de destination').click();
    await expect(tenantPage.getByRole('option', { name: /BGFIBank Congo/ })).toBeVisible();
    await tenantPage.getByRole('option', { name: /BGFIBank Congo/ }).click();
    await tenantPage.getByRole('button', { name: 'Envoyer la déclaration' }).click();
    await expect(
      tenantPage.getByText('La preuve du virement (capture ou photo) est obligatoire.'),
    ).toBeVisible();

    // --- Puis avec la preuve jointe : `uploadTenantProof`
    // (src/app/locataire/virement/_lib/upload-tenant-proof.ts) appelle
    // `/tenant/documents/upload-url` puis `/tenant/documents`
    // (mocks/tenant-portal-handlers.ts), une extension du contrat scopée par
    // bail ACTIF du locataire connecté — les routes génériques `/documents/*`
    // exigent `X-Organization-Id`, que le client locataire n'envoie jamais.
    await tenantPage.locator('input[type="file"]').setInputFiles({
      name: 'preuve-virement.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('preuve de virement e2e'),
    });
    await tenantPage.getByRole('button', { name: 'Envoyer la déclaration' }).click();
    await expect(tenantPage.getByText('Déclaration envoyée.')).toBeVisible();

    await tenantContext.close();
  });
});
