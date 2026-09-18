import { test, expect } from '@playwright/test';

/**
 * Parcours phase 7 (agence) : mandat de gestion actif → campagne mensuelle
 * produisant un relevé brouillon → émission du relevé → création du
 * reversement → exécution avec preuve, conformes à docs/api/phase7-contract.md.
 * Organisation fraîche (voir le commentaire des specs précédentes sur
 * l'isolation vis-à-vis de DEMO_ORG_ID) : bailleur + compte bancaire + immeuble
 * + lot + locataire + bail actif + facture payée intégralement au comptoir,
 * pour qu'un paiement CONFIRMED du mois courant existe avant de lancer la
 * campagne (la commission ne se calcule que sur l'encaissé, arbitrage n°3).
 */

const DEV_OTP_CODE = '000000';

const LOGIN_PHONE = '069001001';
const ORG_CONTACT_PHONE = '069001002';
const LANDLORD_PHONE = '069001003';
const TENANT_PHONE = '069001004';

test.describe('Gérance d’agence phase 7 : campagne → relevé → reversement', () => {
  test('lancer la campagne, émettre le relevé, créer et exécuter le reversement', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    // --- Connexion OTP → organisation fraîche ---
    await page.goto('/login');
    await page.getByPlaceholder('06 xxx xx xx').fill(LOGIN_PHONE);
    await page.getByRole('button', { name: 'Recevoir le code' }).click();
    await expect(page.getByText(/Code envoyé au/)).toBeVisible();
    await page.locator('#otp-input').click();
    await page.keyboard.type(DEV_OTP_CODE);
    await page.getByRole('button', { name: 'Valider le code' }).click();

    await expect(page).toHaveURL(/\/onboarding\/organisation/);
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByLabel('Raison sociale').fill('Agence Gérance E2E');
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

    // --- Bailleur + compte bancaire (nécessaire pour le reversement) ---
    await page.getByRole('link', { name: 'Bailleurs' }).click();
    await page.getByRole('button', { name: 'Nouveau bailleur' }).click();
    await page.getByLabel('Nom', { exact: true }).fill('Mavoungou');
    await page.getByLabel('Téléphone', { exact: true }).fill(LANDLORD_PHONE);
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Créer le bailleur' }).click();
    await expect(page).toHaveURL(/\/app\/bailleurs\/[^/]+$/);

    await page.getByRole('button', { name: 'Ajouter un compte' }).click();
    await page.getByLabel('Libellé').fill('Compte principal');
    await page.getByLabel('Code banque').fill('BGFI');
    await page.getByLabel('Nom de la banque').fill('BGFIBank Congo');
    await page.getByLabel('Titulaire du compte').fill('Mavoungou');
    await page.getByRole('button', { name: 'Ajouter le compte' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    // --- Immeuble + lot + locataire ---
    await page.getByRole('link', { name: 'Immeubles' }).click();
    await page.getByRole('link', { name: 'Nouvel immeuble' }).click();
    await page.getByLabel('Bailleur', { exact: true }).click();
    await page.getByRole('option', { name: 'Mavoungou' }).click();
    await page.getByLabel("Nom de l'immeuble", { exact: true }).fill('Résidence Gérance Test');
    await page.getByLabel('Adresse', { exact: true }).fill('Avenue de la Paix');
    await page.getByLabel('Quartier', { exact: true }).fill('Ouenzé');
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: "Créer l'immeuble", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/immeubles\/[^/]+$/);

    await page.getByRole('button', { name: 'Créer des lots en série' }).click();
    await page.getByLabel('Préfixe', { exact: true }).fill('G');
    await page.getByLabel('De', { exact: true }).fill('1');
    await page.getByLabel('À', { exact: true }).fill('1');
    await page.getByLabel('Loyer de base', { exact: true }).fill('100000');
    await page.getByRole('button', { name: 'Créer les lots', exact: true }).click();
    await expect(page.getByRole('link', { name: 'G01' })).toBeVisible();

    await page.getByRole('link', { name: 'Locataires' }).click();
    await page.getByRole('link', { name: 'Nouveau locataire' }).click();
    await page.getByLabel('Nom', { exact: true }).fill('Loubaki');
    await page.getByLabel('Téléphone principal', { exact: true }).fill(TENANT_PHONE);
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Créer le locataire', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/locataires\/[^/]+$/);

    // --- Bail actif ---
    await page.goto('/app/baux');
    await page.getByRole('link', { name: 'Nouveau bail' }).click();
    await page.getByLabel('Immeuble', { exact: true }).click();
    await page.getByRole('option', { name: 'Résidence Gérance Test' }).click();
    await page.getByLabel('Lot disponible', { exact: true }).click();
    await page.getByRole('option', { name: 'G01', exact: true }).click();
    await page.getByPlaceholder('Rechercher un locataire par nom ou numéro').fill('Loubaki');
    await page.getByRole('button', { name: /Loubaki/ }).click();
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

    // --- Facture émise et payée intégralement au comptoir (paiement CONFIRMED du jour) ---
    await page.goto('/app/factures/nouvelle');
    await page.getByLabel('Bail').selectOption({ label: 'Loubaki — Résidence Gérance Test (G01)' });
    const periodStart = `${startDate.slice(0, 8)}01`;
    // Échéance ancrée loin dans le futur (recalcInvoiceStatus compare
    // graceUntilDate = dueDate à la date système réelle, billing-seed.ts) :
    // une date fixe très éloignée garantit « dans le futur » sans dépendre de
    // l'horloge du poste qui exécute le test.
    const dueDateFuture = '2099-12-31';
    await page.locator('#periodStart').fill(periodStart);
    await page.locator('#periodEnd').fill(startDate);
    await page.locator('#dueDate').fill(dueDateFuture);
    await page.getByLabel('Libellé de la ligne').fill('Loyer du mois');
    await page.getByLabel('Montant de la ligne').fill('100000');
    await page.getByText('Émettre immédiatement').click();
    await page.getByRole('button', { name: 'Créer la facture' }).click();
    await expect(page).toHaveURL(/\/app\/factures\/[^/]+$/);
    await expect(page.getByText('Émise', { exact: true })).toBeVisible();

    await page.goto('/app/paiements/nouveau');
    await page.getByPlaceholder('Rechercher un locataire…').fill('Loubaki');
    await page.getByRole('button', { name: /Loubaki/ }).click();
    await page.getByLabel('Mode de paiement', { exact: true }).click();
    await page.getByRole('option', { name: 'Espèces' }).click();
    await page.getByLabel('Montant encaissé', { exact: true }).fill('100000');
    await page.getByRole('button', { name: "Enregistrer l'encaissement" }).click();
    await expect(page).toHaveURL(/\/app\/paiements\/[^/]+$/);

    // --- Mandat de gestion actif sur ce bien ---
    await page.goto('/app/gerance/mandats/nouveau');
    await page.getByLabel('Bailleur', { exact: true }).click();
    await page.getByRole('option', { name: 'Mavoungou' }).click();
    await page.getByLabel('Résidence Gérance Test', { exact: false }).check();
    await page.getByRole('button', { name: 'Créer le mandat' }).click();
    await expect(page).toHaveURL(/\/app\/gerance\/mandats\/[^/]+$/);
    await page.getByRole('button', { name: 'Activer' }).click();
    await expect(page.getByText('Actif', { exact: true })).toBeVisible();

    // --- Campagne mensuelle : relevé brouillon ---
    // ATTENTION, cas volontairement laissé relatif au présent : l'encaissement
    // comptoir ci-dessus n'expose aucun champ de date (voir le formulaire
    // /app/paiements/nouveau) donc le mock timestampe paymentDate sur l'horloge
    // système réelle (`now`, payments-handlers.ts, POST /payments). La campagne
    // ne retient que les paiements CONFIRMED dont paymentDate tombe dans le mois
    // demandé (runCampaignForOrg, agency-handlers.ts) : ancrer cette période sur
    // un mois fixe casserait le test dès que le mois réel change. currentPeriod
    // doit donc rester calculé à partir de la date système réelle, en écho exact
    // du paymentDate implicite du paiement qui vient d'être créé.
    await page.goto('/app/gerance/releves');
    const currentPeriod = new Date().toISOString().slice(0, 7);
    await page.locator('#statement-run-period').fill(currentPeriod);
    await page.getByRole('button', { name: 'Lancer la campagne' }).click();
    await expect(page.getByText(/Rapport de campagne — terminée/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('link', { name: /REL-/ })).toBeVisible();
    await page.getByRole('link', { name: /REL-/ }).click();
    await expect(page).toHaveURL(/\/app\/gerance\/releves\/[^/]+$/);
    await expect(page.getByText('Brouillon', { exact: true })).toBeVisible();

    // --- Émission puis reversement ---
    await page.getByRole('button', { name: 'Émettre le relevé' }).click();
    await expect(page.getByText('Émis', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Créer le reversement' }).click();
    await expect(page).toHaveURL(/\/app\/gerance\/reversements/);

    await page.getByRole('button', { name: 'Approuver' }).click();
    await page.getByRole('button', { name: 'Exécuter' }).click();
    await page.setInputFiles('input[type="file"]', {
      name: 'preuve-reversement.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 preuve reversement'),
    });
    await expect(page.getByText('Preuve ajoutée.')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Confirmer l’exécution' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByText('Reversé', { exact: true })).toBeVisible();
  });
});
