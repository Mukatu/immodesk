import { test, expect, type Page } from '@playwright/test';

/**
 * Parcours phase 8 (patrimoine avancé) : trois fils métier indépendants —
 * états des lieux et dépôt de garantie, compteurs/relevés et refacturation
 * des charges, maintenance de bout en bout — conformes à
 * docs/api/phase8-contract.md. Comme les phases précédentes, chaque test crée
 * sa propre organisation fraîche (jamais DEMO_ORG_ID).
 *
 * Particularité de cette phase : le dashboard web n'offre AUCUN écran de
 * création d'état des lieux ni de saisie de poste — ces constats sont
 * recueillis sur le terrain depuis l'application mobile (voir le commentaire
 * de sign-inspection-dialog.tsx : « le dashboard n'a aucun composant de
 * capture de signature »). Impossible donc de préparer un constat signé par
 * de simples clics dans le dashboard. Le test 1 sème ces constats via l'API
 * du mock (même route /api/proxy que le navigateur, exactement comme le
 * ferait l'app mobile), puis pilote exclusivement le dashboard pour les
 * vérifications et actions attendues. Les routes /inspections du mock ne
 * vérifient que l'en-tête X-Organization-Id (orgIdFromRequest, handlers.ts) :
 * aucun jeton d'accès n'est donc nécessaire pour ce semis.
 */

const DEV_OTP_CODE = '000000';

/** Sème une donnée via l'API du mock (même proxy que le navigateur), pour les besoins hors UI du dashboard. */
async function apiSeed<T>(
  page: Page,
  organizationId: string,
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  data?: unknown,
): Promise<T> {
  const response = await page.request.fetch(`/api/proxy${path}`, {
    method,
    headers: { 'X-Organization-Id': organizationId },
    data,
  });
  if (!response.ok()) {
    throw new Error(`Semis ${method} ${path} → ${response.status()} : ${await response.text()}`);
  }
  return (await response.json()) as T;
}

test.describe('Patrimoine phase 8 : états des lieux, compteurs et maintenance', () => {
  test('état des lieux signé figé, comparaison entrée/sortie et retenue exclusive sur le dépôt', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const loginPhone = '069030001';
    const orgContactPhone = '069030002';
    const landlordPhone = '069030003';
    const tenantPhone = '069030004';
    const leaseStartDate = '2024-01-10';

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
    await page.getByLabel('Raison sociale').fill('Agence Patrimoine E2E');
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.locator('#contact-phone').fill(orgContactPhone);
    await page.getByRole('button', { name: 'Créer l’organisation' }).click();
    await expect(page).toHaveURL(/\/app$/);

    const organizationId = await page.evaluate(() =>
      window.localStorage.getItem('immodesk:last-organization-id'),
    );
    if (!organizationId) {
      throw new Error('organizationId introuvable après la création de l’organisation.');
    }

    // --- Bailleur, immeuble et lot ---
    await page.getByRole('link', { name: 'Bailleurs' }).click();
    await page.getByRole('button', { name: 'Nouveau bailleur' }).click();
    await page.getByLabel('Nom', { exact: true }).fill('Ngoma');
    await page.getByLabel('Téléphone', { exact: true }).fill(landlordPhone);
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Créer le bailleur' }).click();
    await expect(page).toHaveURL(/\/app\/bailleurs\/[^/]+$/);

    await page.getByRole('link', { name: 'Immeubles' }).click();
    await page.getByRole('link', { name: 'Nouvel immeuble' }).click();
    await page.getByLabel('Bailleur', { exact: true }).click();
    await page.getByRole('option', { name: 'Ngoma' }).click();
    await page.getByLabel("Nom de l'immeuble", { exact: true }).fill('Résidence Patrimoine Test');
    await page.getByLabel('Adresse', { exact: true }).fill('Avenue des Trois Martyrs');
    await page.getByLabel('Quartier', { exact: true }).fill('Bacongo');
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: "Créer l'immeuble", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/immeubles\/[^/]+$/);

    await page.getByRole('button', { name: 'Créer des lots en série' }).click();
    await page.getByLabel('Préfixe', { exact: true }).fill('P');
    await page.getByLabel('De', { exact: true }).fill('1');
    await page.getByLabel('À', { exact: true }).fill('1');
    await page.getByLabel('Loyer de base', { exact: true }).fill('100000');
    const bulkResponsePromise = page.waitForResponse((r) => r.url().includes('/units/bulk'));
    await page.getByRole('button', { name: 'Créer les lots', exact: true }).click();
    const bulkPayload = (await (await bulkResponsePromise).json()) as {
      created: { id: string }[];
    };
    const unitId = bulkPayload.created[0]!.id;
    await expect(page.getByRole('link', { name: 'P01' })).toBeVisible();

    // --- Locataire ---
    await page.getByRole('link', { name: 'Locataires' }).click();
    await page.getByRole('link', { name: 'Nouveau locataire' }).click();
    await page.getByLabel('Nom', { exact: true }).fill('Bakala');
    await page.getByLabel('Téléphone principal', { exact: true }).fill(tenantPhone);
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Créer le locataire', exact: true }).click();
    // Exclut explicitement /app/locataires/nouveau : sinon la regex matcherait déjà l'URL
    // de l'assistant lui-même avant la redirection, et l'id extrait serait « nouveau ».
    await expect(page).toHaveURL(/\/app\/locataires\/(?!nouveau)[^/]+$/);
    const tenantId = page.url().split('/').pop()!;

    // --- Bail actif (dépôt requis = 2 × loyer, créé à l'activation) ---
    await page.goto('/app/baux');
    await page.getByRole('link', { name: 'Nouveau bail' }).click();
    await page.getByLabel('Immeuble', { exact: true }).click();
    await page.getByRole('option', { name: 'Résidence Patrimoine Test' }).click();
    await page.getByLabel('Lot disponible', { exact: true }).click();
    await page.getByRole('option', { name: 'P01', exact: true }).click();
    await page.getByPlaceholder('Rechercher un locataire par nom ou numéro').fill('Bakala');
    await page.getByRole('button', { name: /Bakala/ }).click();
    await page.getByLabel('Date de début', { exact: true }).fill(leaseStartDate);
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByLabel('Loyer', { exact: true }).fill('100000');
    await page.getByLabel('Périodicité', { exact: true }).click();
    await page.getByRole('option', { name: 'Mensuel' }).click();
    await page.getByLabel("Jour d'échéance", { exact: true }).fill('5');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByRole('button', { name: 'Créer le bail' }).click();
    // Même précaution que pour le locataire : exclut /app/baux/nouveau.
    await expect(page).toHaveURL(/\/app\/baux\/(?!nouveau)[^/]+$/);
    const leaseId = page.url().split('/').pop()!;
    await page.getByRole('button', { name: 'Activer' }).click();
    await page.getByRole('button', { name: 'Confirmer l’activation' }).click();
    await expect(page.getByText('Actif', { exact: true })).toBeVisible();

    // --- Dépôt de garantie intégralement encaissé (200 000 = 2 × loyer) ---
    await page.goto('/app/depots');
    await page.getByRole('button', { name: 'Saisir un mouvement' }).click();
    await page.locator('#movementAmount').fill('200000');
    await page.locator('#movementDate').fill(leaseStartDate);
    await page.getByRole('button', { name: 'Enregistrer le mouvement' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.locator('tbody').getByText('Détenu', { exact: true })).toBeVisible();

    // --- Semis des deux constats (entrée signée, sortie signée avec poste dégradé) ---
    const moveIn = await apiSeed<{ id: string; reference: string }>(
      page,
      organizationId,
      'POST',
      '/inspections',
      { unitId, leaseId, tenantId, inspectionType: 'MOVE_IN', tenantPresent: true },
    );
    await apiSeed(page, organizationId, 'POST', `/inspections/${moveIn.id}/items`, {
      roomLabel: 'Salon',
      elementLabel: 'Peinture murale',
      condition: 'GOOD',
      isDamaged: false,
    });
    await apiSeed(page, organizationId, 'POST', `/inspections/${moveIn.id}/sign`, {
      tenantPresent: true,
    });

    const moveOut = await apiSeed<{ id: string; reference: string }>(
      page,
      organizationId,
      'POST',
      '/inspections',
      { unitId, leaseId, tenantId, inspectionType: 'MOVE_OUT', tenantPresent: true },
    );
    const moveOutItem = await apiSeed<{ id: string }>(
      page,
      organizationId,
      'POST',
      `/inspections/${moveOut.id}/items`,
      {
        roomLabel: 'Salon',
        elementLabel: 'Peinture murale',
        condition: 'DAMAGED',
        isDamaged: true,
        damageDescription: 'Peinture tachée et cloquée après un dégât des eaux.',
        repairAmount: 50000,
        chargedTo: 'TENANT',
      },
    );
    await apiSeed(
      page,
      organizationId,
      'POST',
      `/inspections/${moveOut.id}/items/${moveOutItem.id}/photos`,
      { documentId: 'seed-doc-degradation-salon', caption: 'Mur du salon dégradé' },
    );
    await apiSeed(page, organizationId, 'POST', `/inspections/${moveOut.id}/sign`, {
      tenantPresent: true,
    });

    // --- Liste, filtrage puis ouverture du constat de sortie signé ---
    await page.goto('/app/etats-des-lieux');
    await page.locator('#type-filter').click();
    await page.getByRole('option', { name: 'État des lieux de sortie' }).click();
    await page.locator('#status-filter').click();
    await page.getByRole('option', { name: 'Signé' }).click();
    await expect(page.getByRole('link', { name: moveOut.reference })).toBeVisible();
    await page.getByRole('link', { name: moveOut.reference }).click();
    await expect(page).toHaveURL(new RegExp(`/app/etats-des-lieux/${moveOut.id}$`));
    await expect(page.getByText('Signé', { exact: true }).first()).toBeVisible();

    // Constat signé figé : aucune action de modification de poste n'est proposée.
    await expect(page.getByRole('button', { name: 'Ajouter un poste' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Modifier le poste' })).toHaveCount(0);

    // Les deux actions (retenue / conversion) restent offertes tant qu'aucune n'a été faite.
    await expect(page.getByRole('button', { name: 'Retenue sur dépôt' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Convertir en maintenance' })).toBeVisible();

    // --- Comparaison entrée/sortie et retenue sur le dépôt pour le poste dégradé ---
    await page.goto(`/app/etats-des-lieux/comparaison/${unitId}`);
    await expect(page.getByText('Comparaison entrée / sortie')).toBeVisible();
    const validateButton = page.getByRole('button', { name: 'Valider la retenue' });
    await expect(validateButton).toBeEnabled();
    await validateButton.click();
    await page.getByRole('button', { name: 'Confirmer la retenue' }).click();
    await expect(page.getByText('Retenue appliquée au dépôt de garantie.')).toBeVisible();
    await expect(page.getByText('Retenue déjà appliquée pour ce poste.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Valider la retenue' })).toHaveCount(0);

    // --- Exclusivité confirmée depuis le détail : plus aucune des deux actions n'est proposée ---
    await page.goto(`/app/etats-des-lieux/${moveOut.id}`);
    await expect(page.getByText('Retenue appliquée au dépôt', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retenue sur dépôt' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Convertir en maintenance' })).toHaveCount(0);
  });

  test('relevé de compteur avec passage par zéro puis campagne de refacturation', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const loginPhone = '069030101';
    const orgContactPhone = '069030102';
    const landlordPhone = '069030103';
    const tenantPhone = '069030104';
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
    await page.getByLabel('Raison sociale').fill('Agence Compteurs E2E');
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.locator('#contact-phone').fill(orgContactPhone);
    await page.getByRole('button', { name: 'Créer l’organisation' }).click();
    await expect(page).toHaveURL(/\/app$/);

    // --- Bailleur, immeuble et lot ---
    await page.getByRole('link', { name: 'Bailleurs' }).click();
    await page.getByRole('button', { name: 'Nouveau bailleur' }).click();
    await page.getByLabel('Nom', { exact: true }).fill('Malonga');
    await page.getByLabel('Téléphone', { exact: true }).fill(landlordPhone);
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Créer le bailleur' }).click();
    await expect(page).toHaveURL(/\/app\/bailleurs\/[^/]+$/);

    await page.getByRole('link', { name: 'Immeubles' }).click();
    await page.getByRole('link', { name: 'Nouvel immeuble' }).click();
    await page.getByLabel('Bailleur', { exact: true }).click();
    await page.getByRole('option', { name: 'Malonga' }).click();
    await page.getByLabel("Nom de l'immeuble", { exact: true }).fill('Résidence Compteurs Test');
    await page.getByLabel('Adresse', { exact: true }).fill('Rue de la Likouala');
    await page.getByLabel('Quartier', { exact: true }).fill('Poto-Poto');
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: "Créer l'immeuble", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/immeubles\/[^/]+$/);

    await page.getByRole('button', { name: 'Créer des lots en série' }).click();
    await page.getByLabel('Préfixe', { exact: true }).fill('C');
    await page.getByLabel('De', { exact: true }).fill('1');
    await page.getByLabel('À', { exact: true }).fill('1');
    await page.getByLabel('Loyer de base', { exact: true }).fill('100000');
    await page.getByRole('button', { name: 'Créer les lots', exact: true }).click();
    await expect(page.getByRole('link', { name: 'C01' })).toBeVisible();

    // --- Locataire et bail actif ---
    await page.getByRole('link', { name: 'Locataires' }).click();
    await page.getByRole('link', { name: 'Nouveau locataire' }).click();
    await page.getByLabel('Nom', { exact: true }).fill('Mboungou');
    await page.getByLabel('Téléphone principal', { exact: true }).fill(tenantPhone);
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Créer le locataire', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/locataires\/[^/]+$/);

    await page.goto('/app/baux');
    await page.getByRole('link', { name: 'Nouveau bail' }).click();
    await page.getByLabel('Immeuble', { exact: true }).click();
    await page.getByRole('option', { name: 'Résidence Compteurs Test' }).click();
    await page.getByLabel('Lot disponible', { exact: true }).click();
    await page.getByRole('option', { name: 'C01', exact: true }).click();
    await page.getByPlaceholder('Rechercher un locataire par nom ou numéro').fill('Mboungou');
    await page.getByRole('button', { name: /Mboungou/ }).click();
    await page.getByLabel('Date de début', { exact: true }).fill(leaseStartDate);
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

    // --- Facture ouverte (nécessaire pour recevoir la charge lors de la refacturation) ---
    await page.goto('/app/factures/nouvelle');
    await page
      .getByLabel('Bail')
      .selectOption({ label: 'Mboungou — Résidence Compteurs Test (C01)' });
    await page.locator('#periodStart').fill('2024-01-01');
    await page.locator('#periodEnd').fill('2024-01-31');
    await page.locator('#dueDate').fill('2024-02-10');
    await page.getByLabel('Libellé de la ligne').fill('Loyer du mois');
    await page.getByLabel('Montant de la ligne').fill('100000');
    await page.getByText('Émettre immédiatement').click();
    await page.getByRole('button', { name: 'Créer la facture' }).click();
    await expect(page).toHaveURL(/\/app\/factures\/[^/]+$/);
    await expect(page.getByText('Émise', { exact: true })).toBeVisible();

    // --- Grille tarifaire (eau, au volume consommé, valable depuis 2023) ---
    await page.goto('/app/parametres/tarifs');
    await page.getByRole('button', { name: 'Nouveau tarif' }).click();
    await page.locator('#tariff-meter-type').click();
    await page.getByRole('option', { name: 'Eau (LCDE)' }).click();
    await page.locator('#tariff-label').fill('Eau LCDE — Test E2E');
    await page.locator('#tariff-unit-price').fill('500');
    await page.locator('#tariff-effective-from').fill('2023-01-01');
    await page.getByRole('button', { name: 'Créer le tarif' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByText('Eau LCDE — Test E2E')).toBeVisible();

    // --- Compteur d'eau rattaché au lot ---
    await page.goto('/app/compteurs');
    await page.getByRole('button', { name: 'Nouveau compteur' }).click();
    await page.locator('#meter-property').click();
    await page.getByRole('option', { name: 'Résidence Compteurs Test' }).click();
    await page.locator('#meter-unit').click();
    await page.getByRole('option', { name: 'C01' }).click();
    await page.locator('#meter-type').click();
    await page.getByRole('option', { name: 'Eau (LCDE)' }).click();
    await page.locator('#meter-serial').fill('CPT-EAU-0001');
    await page.getByRole('button', { name: 'Créer', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByRole('link', { name: 'CPT-EAU-0001' })).toBeVisible();
    await page.getByRole('link', { name: 'CPT-EAU-0001' }).click();
    await expect(page).toHaveURL(/\/app\/compteurs\/[^/]+$/);

    // --- Premier relevé, puis second relevé en régression (index < précédent) ---
    await page.getByRole('button', { name: 'Saisir un relevé' }).click();
    await page.locator('#reading-date').fill('2024-02-01');
    await page.locator('#reading-index').fill('500');
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(page.getByText('Relevé enregistré.')).toBeVisible();

    await page.getByRole('button', { name: 'Saisir un relevé' }).click();
    await page.locator('#reading-date').fill('2024-02-15');
    await page.locator('#reading-index').fill('100');
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(page.getByText(/est inférieur au précédent/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Corriger la saisie' })).toBeVisible();
    const confirmRollover = page.getByRole('button', { name: 'Confirmer le passage par zéro' });
    await expect(confirmRollover).toBeVisible();
    await confirmRollover.click();
    await expect(page.getByText('Relevé enregistré.')).toBeVisible();
    await expect(page.getByText('Passage par zéro')).toBeVisible();

    // --- Campagne de refacturation : rapport en trois parties ---
    await page.goto('/app/facturation/refacturation');
    await page.locator('#run-period-start').fill('2024-01-01');
    await page.locator('#run-period-end').fill('2024-03-01');
    await page.getByRole('button', { name: 'Lancer la campagne' }).click();
    await expect(page.getByText('Campagne terminée')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Lignes de charge créées')).toBeVisible();
    await expect(page.getByText('2', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Lots ignorés/)).toBeVisible();
    await expect(page.getByText(/Erreurs/)).toBeVisible();
  });

  test('demande de maintenance de bout en bout, du signalement à la clôture', async ({ page }) => {
    test.setTimeout(120_000);

    const loginPhone = '069030201';
    const orgContactPhone = '069030202';
    const landlordPhone = '069030203';

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
    await page.getByLabel('Raison sociale').fill('Agence Maintenance E2E');
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.locator('#contact-phone').fill(orgContactPhone);
    await page.getByRole('button', { name: 'Créer l’organisation' }).click();
    await expect(page).toHaveURL(/\/app$/);

    // --- Bailleur, immeuble et lot ---
    await page.getByRole('link', { name: 'Bailleurs' }).click();
    await page.getByRole('button', { name: 'Nouveau bailleur' }).click();
    await page.getByLabel('Nom', { exact: true }).fill('Samba');
    await page.getByLabel('Téléphone', { exact: true }).fill(landlordPhone);
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Créer le bailleur' }).click();
    await expect(page).toHaveURL(/\/app\/bailleurs\/[^/]+$/);

    await page.getByRole('link', { name: 'Immeubles' }).click();
    await page.getByRole('link', { name: 'Nouvel immeuble' }).click();
    await page.getByLabel('Bailleur', { exact: true }).click();
    await page.getByRole('option', { name: 'Samba' }).click();
    await page.getByLabel("Nom de l'immeuble", { exact: true }).fill('Résidence Maintenance Test');
    await page.getByLabel('Adresse', { exact: true }).fill('Rue de la Bouenza');
    await page.getByLabel('Quartier', { exact: true }).fill('Talangaï');
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: "Créer l'immeuble", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/immeubles\/[^/]+$/);

    await page.getByRole('button', { name: 'Créer des lots en série' }).click();
    await page.getByLabel('Préfixe', { exact: true }).fill('M');
    await page.getByLabel('De', { exact: true }).fill('1');
    await page.getByLabel('À', { exact: true }).fill('1');
    await page.getByLabel('Loyer de base', { exact: true }).fill('100000');
    await page.getByRole('button', { name: 'Créer les lots', exact: true }).click();
    await expect(page.getByRole('link', { name: 'M01' })).toBeVisible();

    // --- Signalement de la demande ---
    await page.goto('/app/maintenance/nouveau');
    await page.locator('#maintenance-property').click();
    await page.getByRole('option', { name: 'Résidence Maintenance Test' }).click();
    await page.locator('#maintenance-unit').click();
    await page.getByRole('option', { name: 'M01' }).click();
    await page.getByLabel('Objet', { exact: true }).fill('Fuite sous l’évier de la cuisine');
    await page
      .getByLabel('Description', { exact: true })
      .fill('Fuite continue sous l’évier, eau stagnante au sol.');
    await page.locator('#maintenance-priority').click();
    await page.getByRole('option', { name: 'Haute' }).click();
    await page.locator('#maintenance-reporter').click();
    await page.getByRole('option', { name: 'Locataire' }).click();
    await page.getByRole('button', { name: 'Signaler la demande' }).click();
    await expect(page).toHaveURL(/\/app\/maintenance\/[^/]+$/);
    await expect(page.getByText('Signalée', { exact: true })).toBeVisible();

    // --- Le refus exige un motif : bloqué tant qu'il est vide ---
    await page.getByRole('button', { name: 'Refuser' }).click();
    await page.getByRole('button', { name: 'Confirmer le refus' }).click();
    await expect(page.getByText('Le motif de refus est requis.')).toBeVisible();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    // --- Prise en compte ---
    await page.getByRole('button', { name: 'Prendre en compte' }).click();
    await expect(page.getByText('Prise en compte', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Prendre en compte' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Refuser' })).toBeVisible();

    // --- Affectation : le refus n'est plus proposé une fois la demande affectée ---
    await page.getByRole('button', { name: 'Affecter' }).click();
    await page.locator('#assign-user').click();
    await page.getByRole('option').first().click();
    await page.getByRole('button', { name: 'Confirmer', exact: true }).click();
    await expect(page.getByText('Affectée', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Affecter' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Refuser' })).toHaveCount(0);

    // --- Mise à jour (passage en intervention) ---
    await page.getByRole('button', { name: 'Ajouter une mise à jour' }).click();
    await page.getByLabel(/Motif/).fill('Plombier envoyé sur place, diagnostic en cours.');
    await page.getByRole('button', { name: 'Confirmer', exact: true }).click();
    await expect(page.getByText('En intervention', { exact: true }).first()).toBeVisible();

    // --- Résolution ---
    await page.getByRole('button', { name: 'Résoudre' }).click();
    await page.locator('#resolve-amount').fill('35000');
    await page.getByRole('button', { name: 'Confirmer', exact: true }).click();
    await expect(page.getByText('Résolue', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Résoudre' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ajouter une mise à jour' })).toHaveCount(0);

    // --- Clôture ---
    await expect(page.getByRole('button', { name: 'Clôturer' })).toBeVisible();
    await page.getByRole('button', { name: 'Clôturer' }).click();
    await expect(page.getByText('Clôturée', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clôturer' })).toHaveCount(0);
  });
});
