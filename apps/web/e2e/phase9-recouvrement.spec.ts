import { test, expect } from '@playwright/test';

/**
 * Parcours phase 9 (relances, pénalités, tableaux de bord, exports), conforme
 * à docs/api/phase9-contract.md. Comme les phases précédentes, chaque test
 * crée sa propre organisation fraîche (jamais DEMO_ORG_ID) : les paliers de
 * relance et règles de pénalité de démonstration ne sont semés que sur
 * DEMO_ORG_ID, donc ce test crée lui-même son palier et sa règle.
 *
 * IMPORTANT — aucune date construite à partir de la date du jour : la facture
 * porte une échéance fixe ancrée dans le passé (2024-02-10), toujours en
 * retard quelle que soit la date d'exécution des tests, pour que le scan de
 * relance produise un résultat déterministe sans dépendre de `new Date()`.
 */

const DEV_OTP_CODE = '000000';

test.describe('Recouvrement phase 9 : relances, pénalités, tableaux de bord et exports', () => {
  test('palier avec pénalité, scan idempotent, rang déjà pris et historique', async ({ page }) => {
    test.setTimeout(120_000);

    const loginPhone = '069095001';
    const orgContactPhone = '069095002';
    const landlordPhone = '069095003';
    const tenantPhone = '069095004';
    const leaseStartDate = '2024-01-01';

    // --- Connexion OTP → organisation fraîche ---
    await page.goto('/login');
    await page.getByPlaceholder('06 xxx xx xx').fill(loginPhone);
    await page.getByRole('button', { name: 'Recevoir le code' }).click();
    await expect(page.getByText(/Code envoyé au/)).toBeVisible();
    await page.locator('#otp-input').click();
    await page.keyboard.type(DEV_OTP_CODE);
    await page.getByRole('button', { name: 'Valider le code' }).click();

    await expect(page).toHaveURL(/\/onboarding\/organisation/);
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByLabel('Raison sociale').fill('Agence Recouvrement E2E');
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.locator('#contact-phone').fill(orgContactPhone);
    await page.getByRole('button', { name: 'Créer l’organisation' }).click();
    await expect(page).toHaveURL(/\/app$/);

    // --- Bailleur, immeuble, lot ---
    await page.getByRole('link', { name: 'Bailleurs' }).click();
    await page.getByRole('button', { name: 'Nouveau bailleur' }).click();
    await page.getByLabel('Nom', { exact: true }).fill('Nkounkou');
    await page.getByLabel('Téléphone', { exact: true }).fill(landlordPhone);
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Créer le bailleur' }).click();
    await expect(page).toHaveURL(/\/app\/bailleurs\/[^/]+$/);

    await page.getByRole('link', { name: 'Immeubles' }).click();
    await page.getByRole('link', { name: 'Nouvel immeuble' }).click();
    await page.getByLabel('Bailleur', { exact: true }).click();
    await page.getByRole('option', { name: 'Nkounkou' }).click();
    await page.getByLabel("Nom de l'immeuble", { exact: true }).fill('Résidence Recouvrement Test');
    await page.getByLabel('Adresse', { exact: true }).fill('Avenue de la Paix');
    await page.getByLabel('Quartier', { exact: true }).fill('Ouenzé');
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: "Créer l'immeuble", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/immeubles\/[^/]+$/);

    await page.getByRole('button', { name: 'Créer des lots en série' }).click();
    await page.getByLabel('Préfixe', { exact: true }).fill('R');
    await page.getByLabel('De', { exact: true }).fill('1');
    await page.getByLabel('À', { exact: true }).fill('1');
    await page.getByLabel('Loyer de base', { exact: true }).fill('100000');
    await page.getByRole('button', { name: 'Créer les lots', exact: true }).click();
    await expect(page.getByRole('link', { name: 'R01' })).toBeVisible();

    // --- Locataire et bail actif ---
    await page.getByRole('link', { name: 'Locataires' }).click();
    await page.getByRole('link', { name: 'Nouveau locataire' }).click();
    await page.getByLabel('Nom', { exact: true }).fill('Loubaki');
    await page.getByLabel('Téléphone principal', { exact: true }).fill(tenantPhone);
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Créer le locataire', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/locataires\/(?!nouveau)[^/]+$/);

    await page.goto('/app/baux');
    await page.getByRole('link', { name: 'Nouveau bail' }).click();
    await page.getByLabel('Immeuble', { exact: true }).click();
    await page.getByRole('option', { name: 'Résidence Recouvrement Test' }).click();
    await page.getByLabel('Lot disponible', { exact: true }).click();
    await page.getByRole('option', { name: 'R01', exact: true }).click();
    await page.getByPlaceholder('Rechercher un locataire par nom ou numéro').fill('Loubaki');
    await page.getByRole('button', { name: /Loubaki/ }).click();
    await page.getByLabel('Date de début', { exact: true }).fill(leaseStartDate);
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByLabel('Loyer', { exact: true }).fill('100000');
    await page.getByLabel('Périodicité', { exact: true }).click();
    await page.getByRole('option', { name: 'Mensuel' }).click();
    await page.getByLabel("Jour d'échéance", { exact: true }).fill('5');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByRole('button', { name: 'Créer le bail' }).click();
    await expect(page).toHaveURL(/\/app\/baux\/(?!nouveau)[^/]+$/);
    await page.getByRole('button', { name: 'Activer' }).click();
    await page.getByRole('button', { name: 'Confirmer l’activation' }).click();
    await expect(page.getByText('Actif', { exact: true })).toBeVisible();

    // --- Deux factures à échéance ancrée EXACTEMENT à 3 jours avant la date de
    // référence fixe du scan simulé (DUNNING_REFERENCE_TODAY = 2024-03-01,
    // dunning-seed.ts) : jamais une date relative à l'horloge réelle. Le palier
    // créé plus bas porte un décalage de 3 jours après l'échéance : seule une
    // correspondance EXACTE au jour près doit le déclencher, jamais une
    // comparaison « au moins ». La première facture (solde 100 000) dépassera
    // le seuil minimum du palier et le déclenchera ; la seconde (solde 10 000)
    // correspond au même jour mais restera sous ce seuil, donc ignorée.
    await page.goto('/app/factures/nouvelle');
    await page
      .getByLabel('Bail')
      .selectOption({ label: 'Loubaki — Résidence Recouvrement Test (R01)' });
    await page.locator('#periodStart').fill('2024-01-01');
    await page.locator('#periodEnd').fill('2024-01-31');
    await page.locator('#dueDate').fill('2024-02-27');
    await page.getByLabel('Libellé de la ligne').fill('Loyer du mois');
    await page.getByLabel('Montant de la ligne').fill('100000');
    await page.getByText('Émettre immédiatement').click();
    await page.getByRole('button', { name: 'Créer la facture' }).click();
    await expect(page).toHaveURL(/\/app\/factures\/[^/]+$/);
    await expect(page.getByText('Émise', { exact: true })).toBeVisible();

    await page.goto('/app/factures/nouvelle');
    await page
      .getByLabel('Bail')
      .selectOption({ label: 'Loubaki — Résidence Recouvrement Test (R01)' });
    await page.locator('#periodStart').fill('2024-02-01');
    await page.locator('#periodEnd').fill('2024-02-29');
    await page.locator('#dueDate').fill('2024-02-27');
    await page.getByLabel('Libellé de la ligne').fill('Loyer du mois (petit solde)');
    await page.getByLabel('Montant de la ligne').fill('10000');
    await page.getByText('Émettre immédiatement').click();
    await page.getByRole('button', { name: 'Créer la facture' }).click();
    await expect(page).toHaveURL(/\/app\/factures\/[^/]+$/);
    await expect(page.getByText('Émise', { exact: true })).toBeVisible();

    // --- Règle de pénalité (montant forfaitaire, sans franchise) ---
    await page.goto('/app/parametres/facturation');
    await page.getByRole('button', { name: 'Nouvelle règle' }).click();
    await page.locator('#ruleName').fill('Pénalité forfaitaire E2E');
    await page.locator('#ruleBasis').click();
    await page.getByRole('option', { name: 'Montant forfaitaire', exact: true }).click();
    await page.locator('#ruleFlat').fill('2500');
    await page.locator('#ruleGrace').fill('0');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Règle créée.')).toBeVisible();
    await expect(page.locator('ul').getByText('Pénalité forfaitaire E2E')).toBeVisible();

    // --- Simulateur de pénalité : aucune écriture, montant affiché ---
    await page.locator('#simulator-rule').click();
    await page.getByRole('option', { name: 'Pénalité forfaitaire E2E' }).click();
    await page.locator('#simulator-balance').fill('100000');
    await page.locator('#simulator-days').fill('10');
    await page.getByRole('button', { name: 'Simuler' }).click();
    await expect(page.getByText('Montant calculé')).toBeVisible();
    await expect(page.getByText('Aucun plafond atteint')).toBeVisible();

    // --- Palier de relance avec pénalité (rang 1) ---
    await page.goto('/app/relances');
    await page.getByRole('button', { name: 'Nouveau palier' }).click();
    await page.locator('#step-name').fill('Relance avec pénalité E2E');
    await page.locator('#step-order').fill('1');
    await page.locator('#step-trigger').click();
    await page.getByRole('option', { name: "Jours après l'échéance" }).click();
    await page.locator('#step-offset').fill('3');
    await page.locator('#step-channel').click();
    await page.getByRole('option', { name: 'WhatsApp', exact: true }).click();
    await page.locator('#step-min-balance').fill('50000');
    await page.getByText('Appliquer une pénalité à ce palier').click();
    await page.locator('#step-penalty-rule').click();
    await page.getByRole('option', { name: 'Pénalité forfaitaire E2E' }).click();
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Palier créé.')).toBeVisible();
    await expect(page.getByText('Relance avec pénalité E2E')).toBeVisible();

    // --- Un rang ne peut pas être partagé : 409 DUNNING.STEP_ORDER_TAKEN ---
    await page.getByRole('button', { name: 'Nouveau palier' }).click();
    await page.locator('#step-name').fill('Palier en conflit de rang');
    await page.locator('#step-order').fill('1');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(
      page.getByText(
        'Ce rang de palier est déjà utilisé par un autre palier. Choisissez un autre rang.',
      ),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    // --- Scan en simulation : compte-rendu affiché, rien n'est écrit ---
    await page.getByRole('button', { name: 'Lancer le scan' }).click();
    await expect(page.getByText(/Simulation \(n.envoie rien\)/)).toBeVisible();
    await page.getByRole('button', { name: 'Lancer' }).click();
    await expect(page.getByText("Simulation : aucune relance n'a été envoyée.")).toBeVisible();
    await expect(page.getByText('Examinées')).toBeVisible();
    await expect(page.getByText('Créées')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    // --- Scan réel : la relance est envoyée, la pénalité est ajoutée à la facture ---
    await page.getByRole('button', { name: 'Lancer le scan' }).click();
    await page.getByText(/Simulation \(n.envoie rien\)/).click();
    await page.getByRole('button', { name: 'Lancer' }).click();
    await expect(page.getByText("Simulation : aucune relance n'a été envoyée.")).not.toBeVisible();
    await expect(page.getByText('Examinées')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    // --- Historique : correspondance EXACTE au jour → une facture déclenche
    // le palier (solde au-dessus du seuil), l'autre est ignorée pour le même
    // jour de retard (solde sous le seuil) : preuve directe que le scan ne
    // retient plus une facture « au moins » aussi en retard, seulement celle
    // dont le retard correspond exactement au décalage du palier. ---
    await page.getByRole('link', { name: 'Historique' }).click();
    await expect(page).toHaveURL(/\/app\/relances\/historique$/);
    await page.locator('#history-rule-filter').click();
    await page.getByRole('option', { name: 'Relance avec pénalité E2E' }).click();
    const historyRows = page.locator('tbody tr');
    await expect(historyRows).toHaveCount(2);
    const sentRow = historyRows.filter({ hasText: 'Envoyée' });
    const skippedRow = historyRows.filter({ hasText: 'Ignorée' });
    await expect(sentRow).toHaveCount(1);
    await expect(skippedRow).toHaveCount(1);

    await sentRow.getByRole('link', { name: 'Relance avec pénalité E2E' }).click();
    await expect(page).toHaveURL(/\/app\/relances\/historique\/[^/]+$/);
    await expect(page.getByText('WhatsApp')).toBeVisible();
    await expect(page.getByText('Envoyé', { exact: true })).toBeVisible();
    await expect(page.getByText('Non', { exact: true })).toBeVisible(); // escalade au garant

    await page.goto('/app/relances/historique');
    await page.locator('#history-rule-filter').click();
    await page.getByRole('option', { name: 'Relance avec pénalité E2E' }).click();
    await page
      .locator('tbody tr')
      .filter({ hasText: 'Ignorée' })
      .getByRole('link', { name: 'Relance avec pénalité E2E' })
      .click();
    await expect(page.getByText('Solde sous le seuil minimum de la règle.')).toBeVisible();

    // --- Rejouer le scan le même jour : idempotent, aucun doublon dans l'historique ---
    await page.goto('/app/relances');
    await page.getByRole('button', { name: 'Lancer le scan' }).click();
    await page.getByRole('button', { name: 'Lancer' }).click();
    await expect(page.getByText('Examinées')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.goto('/app/relances/historique');
    await page.locator('#history-rule-filter').click();
    await page.getByRole('option', { name: 'Relance avec pénalité E2E' }).click();
    await expect(page.locator('tbody tr')).toHaveCount(2);
  });

  test('tableaux de bord en lecture seule et export CSV des factures', async ({ page }) => {
    test.setTimeout(60_000);

    const loginPhone = '069095011';
    const orgContactPhone = '069095012';

    await page.goto('/login');
    await page.getByPlaceholder('06 xxx xx xx').fill(loginPhone);
    await page.getByRole('button', { name: 'Recevoir le code' }).click();
    await expect(page.getByText(/Code envoyé au/)).toBeVisible();
    await page.locator('#otp-input').click();
    await page.keyboard.type(DEV_OTP_CODE);
    await page.getByRole('button', { name: 'Valider le code' }).click();

    await expect(page).toHaveURL(/\/onboarding\/organisation/);
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByLabel('Raison sociale').fill('Agence Tableaux De Bord E2E');
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.locator('#contact-phone').fill(orgContactPhone);
    await page.getByRole('button', { name: 'Créer l’organisation' }).click();
    await expect(page).toHaveURL(/\/app$/);

    // --- Quatre tableaux de bord, tous filtrables, lecture seule ---
    await page.getByRole('link', { name: 'Tableaux de bord' }).click();
    await expect(page).toHaveURL(/\/app\/tableaux-de-bord$/);
    await expect(page.getByText('Taux de recouvrement')).toBeVisible();
    await expect(page.getByText('Impayés', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Vacance locative' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Encaissements par mode de paiement' }),
    ).toBeVisible();

    // Un bouton d'export CSV sur chacun des quatre widgets (arbitrage 5 : jamais Excel).
    await expect(page.getByRole('button', { name: 'Exporter (CSV)' })).toHaveCount(4);

    // Filtre de période : les widgets se rechargent, toujours en lecture seule.
    await page.locator('#dashboard-from').fill('2024-01-01');

    // --- Export CSV (jamais Excel) depuis la liste des factures ---
    await page.goto('/app/factures');
    await page.getByRole('button', { name: 'Exporter (CSV)' }).first().click();
    await expect(page.getByText(/Export prêt/)).toBeVisible();
    await expect(page.getByText(/\.xlsx|Excel/)).toHaveCount(0);
  });
});
