import { test, expect } from '@playwright/test';

/**
 * Parcours phase 5 : file des lots de synchronisation → conflit de
 * synchronisation (facture annulée pendant que l'appareil était hors ligne) →
 * résolution en appliquant sur une autre facture → disparition du conflit de
 * la liste des conflits non résolus (contrat, docs/api/phase5-contract.md).
 * Organisation fraîche, comme les autres specs : le mock rattache
 * paresseusement le conflit de démonstration à la première facture non
 * annulée de l'organisation dès qu'elle en compte une (voir
 * `linkConflictToOrgInvoice` dans src/mocks/sync-seed.ts), donc on construit
 * un portefeuille minimal avec deux factures émises avant d'ouvrir l'écran.
 */

const DEV_OTP_CODE = '000000';

const LOGIN_PHONE = '069000801';
const ORG_CONTACT_PHONE = '069000802';
const LANDLORD_PHONE = '069000803';
const TENANT_PHONE = '069000804';

test.describe('Synchronisation phase 5 : file des lots, conflit, résolution', () => {
  test('résoudre un conflit en appliquant sur une autre facture le fait disparaître de la liste', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    // --- Connexion OTP + création d'organisation fraîche ---
    await page.goto('/login');
    await page.getByPlaceholder('06 xxx xx xx').fill(LOGIN_PHONE);
    await page.getByRole('button', { name: 'Recevoir le code' }).click();
    await expect(page.getByText(/Code envoyé au/)).toBeVisible();
    const otpInput = page.locator('#otp-input');
    await otpInput.click();
    await page.keyboard.type(DEV_OTP_CODE);
    await page.getByRole('button', { name: 'Valider le code' }).click();

    await expect(page).toHaveURL(/\/onboarding\/organisation/);
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByLabel('Raison sociale').fill('Agence Synchronisation E2E');
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

    // --- Portefeuille minimal : bailleur → immeuble → lot → locataire → bail ---
    // Groupe « Patrimoine » fermé par défaut (sidebar-nav.tsx) : à ouvrir avant le
    // premier clic sur un de ses liens.
    await page.getByRole('button', { name: 'Patrimoine' }).click();
    await page.getByRole('link', { name: 'Bailleurs' }).click();
    await page.getByRole('button', { name: 'Nouveau bailleur' }).click();
    await page.getByLabel('Nom', { exact: true }).fill('Mabiala');
    await page.getByLabel('Téléphone', { exact: true }).fill(LANDLORD_PHONE);
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Créer le bailleur' }).click();
    await expect(page).toHaveURL(/\/app\/bailleurs\/[^/]+$/);

    await page.getByRole('link', { name: 'Immeubles' }).click();
    await page.getByRole('link', { name: 'Nouvel immeuble' }).click();
    await page.getByLabel('Bailleur', { exact: true }).click();
    await page.getByRole('option', { name: 'Mabiala' }).click();
    await page.getByLabel("Nom de l'immeuble", { exact: true }).fill('Résidence Synchro Test');
    await page.getByLabel('Adresse', { exact: true }).fill('Avenue de la Synchro');
    await page.getByLabel('Quartier', { exact: true }).fill('Bacongo');
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: "Créer l'immeuble", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/immeubles\/[^/]+$/);

    await page.getByRole('button', { name: 'Créer des lots en série' }).click();
    await page.getByLabel('Préfixe', { exact: true }).fill('S');
    await page.getByLabel('De', { exact: true }).fill('1');
    await page.getByLabel('À', { exact: true }).fill('1');
    await page.getByLabel('Loyer de base', { exact: true }).fill('100000');
    await page.getByRole('button', { name: 'Créer les lots', exact: true }).click();
    await expect(page.getByRole('link', { name: 'S01' })).toBeVisible();

    await page.getByRole('link', { name: 'Locataires' }).click();
    await page.getByRole('link', { name: 'Nouveau locataire' }).click();
    await page.getByLabel('Nom', { exact: true }).fill('Ondongo');
    await page.getByLabel('Téléphone principal', { exact: true }).fill(TENANT_PHONE);
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Créer le locataire', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/locataires\/[^/]+$/);

    await page.goto('/app/baux');
    await page.getByRole('link', { name: 'Nouveau bail' }).click();
    await page.getByLabel('Immeuble', { exact: true }).click();
    await page.getByRole('option', { name: 'Résidence Synchro Test' }).click();
    await page.getByLabel('Lot disponible', { exact: true }).click();
    await page.getByRole('option', { name: 'S01', exact: true }).click();
    await page.getByPlaceholder('Rechercher un locataire par nom ou numéro').fill('Ondongo');
    await page.getByRole('button', { name: /Ondongo/ }).click();
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

    // --- Deux factures émises : la première deviendra la cible du conflit ---
    const periodStart = `${startDate.slice(0, 8)}01`;
    // Échéance ancrée loin dans le futur (recalcInvoiceStatus compare
    // graceUntilDate = dueDate à la date système réelle, billing-seed.ts) :
    // une date fixe très éloignée garantit « dans le futur » sans dépendre de
    // l'horloge du poste qui exécute le test.
    const dueDateStr = '2099-12-31';

    for (let i = 0; i < 2; i += 1) {
      await page.goto('/app/factures/nouvelle');
      await page
        .getByLabel('Bail')
        .selectOption({ label: 'Ondongo — Résidence Synchro Test (S01)' });
      await page.locator('#periodStart').fill(periodStart);
      await page.locator('#periodEnd').fill(startDate);
      await page.locator('#dueDate').fill(dueDateStr);
      await page.getByLabel('Libellé de la ligne').fill('Loyer');
      await page.getByLabel('Montant de la ligne').fill('100000');
      await page.getByText('Émettre immédiatement').click();
      await page.getByRole('button', { name: 'Créer la facture' }).click();
      await expect(page).toHaveURL(/\/app\/factures\/[^/]+$/);
      await expect(page.getByText('Émise', { exact: true })).toBeVisible();
    }

    // --- Conflit de synchronisation : la facture la plus ancienne a été annulée ---
    await page.goto('/app/synchronisation/conflits');
    const conflictRow = page.getByRole('row', { name: /encaissement non appliqué/ });
    await expect(conflictRow).toBeVisible();
    await conflictRow.getByRole('button').click();

    await expect(page.getByRole('heading', { name: /^Conflit clientref-/ })).toBeVisible();
    await page.getByRole('button', { name: 'Résoudre ce conflit' }).click();

    // Décision par défaut : Appliquer. On redirige explicitement vers l'autre facture.
    await page.getByLabel('Facture visée', { exact: true }).click();
    await page.getByRole('option').nth(1).click();
    await page.getByRole('button', { name: "Confirmer l'application" }).click();

    // Le conflit disparaît de la liste des conflits non résolus.
    await expect(page.getByText('Aucun conflit en attente')).toBeVisible();
  });
});
