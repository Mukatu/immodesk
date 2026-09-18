import { test, expect, type Page } from '@playwright/test';

/**
 * Parcours phase 4 : paiements Mobile Money déclarés et virements déclarés,
 * conformes à docs/api/phase4-contract.md. Comme phase1/phase2/phase3, les
 * données de démo "Résidence Mpila" vivent sous DEMO_ORG_ID et ne sont jamais
 * atteintes ici (voir le commentaire de seedPhase1DemoData dans handlers.ts) :
 * chaque test crée sa propre organisation fraîche, puis reconstitue un
 * portefeuille minimal (bailleur → compte bancaire → immeuble → lot →
 * locataire → bail actif → facture émise) avant de déclarer un paiement.
 *
 * RÈGLE CENTRALE vérifiée par les deux scénarios : une déclaration ne crée
 * jamais de paiement — seule la validation (approve) en crée un, un rejet
 * n'en laisse aucun.
 */

const DEV_OTP_CODE = '000000';

interface SetupOptions {
  loginPhone: string;
  orgContactPhone: string;
  orgName: string;
  landlordPhone: string;
  landlordName: string;
  tenantPhone: string;
  tenantName: string;
  buildingName: string;
  unitPrefix: string;
  momoMsisdnLocal: string;
}

/**
 * Connexion OTP → création d'organisation fraîche → bailleur (avec un compte
 * bancaire portant à la fois un numéro de compte et un numéro Mobile Money,
 * requis pour peupler les instructions de paiement de la facture : une
 * organisation fraîche ne démarre avec aucun compte bancaire par défaut) →
 * immeuble → lot → locataire → bail actif → facture émise (100 000 XAF).
 * Retourne l'URL de la fiche facture créée.
 */
async function setupOrgWithInvoice(page: Page, opts: SetupOptions): Promise<string> {
  const {
    loginPhone,
    orgContactPhone,
    orgName,
    landlordPhone,
    landlordName,
    tenantPhone,
    tenantName,
    buildingName,
    unitPrefix,
    momoMsisdnLocal,
  } = opts;

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
  await page.getByLabel('Raison sociale').fill(orgName);
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

  // --- Bailleur + compte bancaire (numéro de compte + Mobile Money) ---
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
  await page.getByLabel('Opérateur Mobile Money (optionnel)').click();
  await page.getByRole('option', { name: 'MTN Mobile Money' }).click();
  await page.getByLabel('Numéro Mobile Money').fill(momoMsisdnLocal);
  await page.getByRole('button', { name: 'Ajouter le compte' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText('BGFIBank Congo')).toBeVisible();

  // --- Immeuble → lot ---
  await page.getByRole('link', { name: 'Immeubles' }).click();
  await page.getByRole('link', { name: 'Nouvel immeuble' }).click();
  await page.getByLabel('Bailleur', { exact: true }).click();
  await page.getByRole('option', { name: landlordName }).click();
  await page.getByLabel("Nom de l'immeuble", { exact: true }).fill(buildingName);
  await page.getByLabel('Adresse', { exact: true }).fill('Avenue des Trois Martyrs');
  await page.getByLabel('Quartier', { exact: true }).fill('Bacongo');
  await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
  await page.getByRole('button', { name: "Créer l'immeuble", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/immeubles\/[^/]+$/);

  await page.getByRole('button', { name: 'Créer des lots en série' }).click();
  await page.getByLabel('Préfixe', { exact: true }).fill(unitPrefix);
  await page.getByLabel('De', { exact: true }).fill('1');
  await page.getByLabel('À', { exact: true }).fill('1');
  await page.getByLabel('Loyer de base', { exact: true }).fill('100000');
  await page.getByRole('button', { name: 'Créer les lots', exact: true }).click();
  await expect(page.getByRole('link', { name: `${unitPrefix}01` })).toBeVisible();

  // --- Locataire ---
  await page.getByRole('link', { name: 'Locataires' }).click();
  await page.getByRole('link', { name: 'Nouveau locataire' }).click();
  await page.getByLabel('Nom', { exact: true }).fill(tenantName);
  await page.getByLabel('Téléphone principal', { exact: true }).fill(tenantPhone);
  await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
  await page.getByRole('button', { name: 'Créer le locataire', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/locataires\/[^/]+$/);
  await expect(page.getByRole('heading', { name: tenantName, level: 1 })).toBeVisible();

  // --- Bail actif ---
  await page.goto('/app/baux');
  await page.getByRole('link', { name: 'Nouveau bail' }).click();
  await page.getByLabel('Immeuble', { exact: true }).click();
  await page.getByRole('option', { name: buildingName }).click();
  await page.getByLabel('Lot disponible', { exact: true }).click();
  await page.getByRole('option', { name: `${unitPrefix}01`, exact: true }).click();
  await page.getByPlaceholder('Rechercher un locataire par nom ou numéro').fill(tenantName);
  await page.getByRole('button', { name: new RegExp(tenantName) }).click();
  // Date ancrée (comme phase8-patrimoine.spec.ts) : sert uniquement à fabriquer
  // le jeu d'essai, aucune règle métier n'exige que le bail débute « aujourd'hui ».
  const startDate = '2024-01-15';
  await page.getByLabel('Date de début', { exact: true }).fill(startDate);
  await page.getByRole('button', { name: 'Suivant' }).click();
  await page.getByLabel('Loyer', { exact: true }).fill('100000');
  await page.getByLabel('Périodicité', { exact: true }).click();
  await page.getByRole('option', { name: 'Mensuel' }).click();
  await page.getByLabel("Jour d'échéance", { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Suivant' }).click();
  await page.getByRole('button', { name: 'Créer le bail' }).click();
  await expect(page).toHaveURL(/\/app\/baux\/[^/]+$/);
  await page.getByRole('button', { name: 'Activer' }).click();
  await page.getByRole('button', { name: 'Confirmer l’activation' }).click();
  await expect(page.getByText('Actif', { exact: true })).toBeVisible();

  // --- Facture émise immédiatement (100 000 XAF) ---
  await page.goto('/app/factures/nouvelle');
  await page
    .getByLabel('Bail')
    .selectOption({ label: `${tenantName} — ${buildingName} (${unitPrefix}01)` });
  const periodStart = `${startDate.slice(0, 8)}01`;
  // Échéance ancrée loin dans le futur (recalcInvoiceStatus compare
  // graceUntilDate = dueDate à la date système réelle, billing-seed.ts) :
  // une date fixe très éloignée garantit « dans le futur » sans dépendre de
  // l'horloge du poste qui exécute le test.
  const dueDateFuture = '2099-12-31';
  await page.locator('#periodStart').fill(periodStart);
  await page.locator('#periodEnd').fill(startDate);
  await page.locator('#dueDate').fill(dueDateFuture);
  await page.getByLabel('Libellé de la ligne').fill('Loyer');
  await page.getByLabel('Montant de la ligne').fill('100000');
  await page.getByText('Émettre immédiatement').click();
  await page.getByRole('button', { name: 'Créer la facture' }).click();
  await expect(page).toHaveURL(/\/app\/factures\/[^/]+$/);
  await expect(page.getByText('Émise', { exact: true })).toBeVisible();

  return page.url();
}

test.describe('Paiements phase 4 : Mobile Money et virement déclarés', () => {
  test('déclarer un paiement Mobile Money → le valider → facture PAID et quittance', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const invoiceUrl = await setupOrgWithInvoice(page, {
      loginPhone: '069000601',
      orgContactPhone: '069000602',
      orgName: 'Agence Paiements E2E Momo',
      landlordPhone: '069000603',
      landlordName: 'Loemba',
      tenantPhone: '069000604',
      tenantName: 'Bakala',
      buildingName: 'Résidence Paiement Momo',
      unitPrefix: 'M',
      momoMsisdnLocal: '066000699',
    });

    // --- Déclarer un paiement Mobile Money (numéro payeur se terminant par
    // 01, comme le pilote le simulateur agrégateur — ici sans effet, le canal
    // déclaré n'appelle jamais le simulateur, mais on suit la même convention
    // de numérotation) ---
    await page.getByRole('button', { name: 'Déclarer un paiement Mobile Money' }).click();
    await page.getByLabel('Opérateur', { exact: true }).click();
    await page.getByRole('option', { name: 'MTN Mobile Money' }).click();
    await page.getByLabel('Référence opérateur').fill('MP240914.0001.E2E01');
    await page.getByLabel('Numéro payeur').fill('066000601');
    await page.getByLabel('Numéro de réception').selectOption({ index: 1 });
    await page.getByLabel('Montant').fill('100000');
    await page.getByRole('button', { name: 'Déclarer' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    // --- La facture n'est pas encore payée : une déclaration ne crée jamais
    // de paiement (arbitrage 1 du contrat phase 4). ---
    await expect(page.getByText('Émise', { exact: true })).toBeVisible();

    // --- File des déclarations, onglet Mobile Money : valider ---
    await page.goto('/app/paiements/declarations');
    await page.getByRole('tab', { name: 'Mobile Money' }).click();
    await page.getByRole('button', { name: /MMD-/ }).click();
    await page.getByRole('button', { name: 'Valider' }).click();
    const approveResponse = page.waitForResponse(
      (res) =>
        /\/declarations\/[^/]+\/approve$/.test(res.url()) && res.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Confirmer la validation' }).click();
    await approveResponse;

    // --- Retour sur la facture : PAYÉE + quittance disponible ---
    await page.goto(invoiceUrl);
    await expect(page.getByText('Payée', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /QUI-/ })).toBeVisible();
  });

  test('déclarer un virement → le rejeter avec motif → aucun paiement', async ({ page }) => {
    test.setTimeout(90_000);

    const invoiceUrl = await setupOrgWithInvoice(page, {
      loginPhone: '069000701',
      orgContactPhone: '069000702',
      orgName: 'Agence Paiements E2E Virement',
      landlordPhone: '069000703',
      landlordName: 'Ossebi',
      tenantPhone: '069000704',
      tenantName: 'Ngoma',
      buildingName: 'Résidence Paiement Virement',
      unitPrefix: 'V',
      momoMsisdnLocal: '066000799',
    });

    // --- Déclarer un virement, avec preuve (obligatoire) ---
    await page.getByRole('button', { name: 'Déclarer un virement' }).click();
    await page.getByLabel('Montant déclaré').fill('100000');
    await page.getByLabel('Nom du payeur').fill('Client Ngoma');
    await page.getByLabel('Compte bénéficiaire').selectOption({ index: 1 });
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: 'preuve-virement.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('preuve de virement e2e'),
      });
    // Le nom du fichier disparaît une fois l'envoi terminé (aperçu réinitialisé) :
    // signal fiable que proofDocumentId a été renseigné avant de déclarer.
    await expect(page.getByText('preuve-virement.pdf')).toBeHidden();
    await page.getByRole('button', { name: 'Déclarer' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    await expect(page.getByText('Émise', { exact: true })).toBeVisible();

    // --- File des déclarations, onglet Virement : rejeter avec motif ---
    await page.goto('/app/paiements/declarations');
    await page.getByRole('tab', { name: 'Virement' }).click();
    await page.getByRole('button', { name: /LOY-/ }).click();
    await page.getByRole('button', { name: 'Rejeter' }).click();
    await page.getByLabel(/Motif/).fill('Référence introuvable sur le relevé bancaire.');
    const rejectResponse = page.waitForResponse(
      (res) =>
        /\/bank-transfer-declarations\/[^/]+\/reject$/.test(res.url()) &&
        res.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Confirmer le rejet' }).click();
    await rejectResponse;

    // --- Aucun paiement créé : solde inchangé, facture toujours "Émise" ---
    await page.goto(invoiceUrl);
    await expect(page.getByText('Émise', { exact: true })).toBeVisible();
    await expect(page.getByText("Aucun paiement affecté pour l'instant.")).toBeVisible();
  });
});
