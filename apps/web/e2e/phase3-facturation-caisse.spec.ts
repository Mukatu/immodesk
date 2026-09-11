import { test, expect } from '@playwright/test';

/**
 * Parcours phase 3 : facture émise → encaissement partiel au comptoir →
 * second encaissement (solde) → quittance créée → journal de message →
 * vérification publique sans authentification. Sur une organisation
 * fraîchement créée (mêmes raisons d'isolation que phase1/phase2 : les
 * données de démo "Résidence Mpila" vivent sous DEMO_ORG_ID, jamais atteint
 * ici), donc on reconstitue un portefeuille minimal (bailleur → immeuble →
 * lot → locataire → bail actif) avant de créer la facture manuellement.
 */

const DEV_OTP_CODE = '000000';

// Numéros distincts des autres specs (voir leur commentaire d'en-tête sur le
// partage de l'état MSW entre tous les tests du process serveur e2e).
const LOGIN_PHONE = '069000501';
const ORG_CONTACT_PHONE = '069000502';
const LANDLORD_PHONE = '069000503';
const TENANT_PHONE = '069000504';

test.describe('Facturation et caisse phase 3 : facture → encaissements → quittance → vérification publique', () => {
  test('parcours complet', async ({ page, browser }) => {
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
    await page.getByLabel('Raison sociale').fill('Agence Facturation E2E');
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.locator('#contact-phone').fill(ORG_CONTACT_PHONE);
    await page.getByRole('button', { name: 'Créer l’organisation' }).click();
    await expect(page).toHaveURL(/\/app$/);

    // --- Portefeuille minimal : bailleur → immeuble → lot → locataire ---
    await page.getByRole('link', { name: 'Bailleurs' }).click();
    await page.getByRole('button', { name: 'Nouveau bailleur' }).click();
    await page.getByLabel('Nom', { exact: true }).fill('Malonga');
    await page.getByLabel('Téléphone', { exact: true }).fill(LANDLORD_PHONE);
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Créer le bailleur' }).click();
    await expect(page).toHaveURL(/\/app\/bailleurs\/[^/]+$/);

    await page.getByRole('link', { name: 'Immeubles' }).click();
    await page.getByRole('link', { name: 'Nouvel immeuble' }).click();
    await page.getByLabel('Bailleur', { exact: true }).click();
    await page.getByRole('option', { name: 'Malonga' }).click();
    await page.getByLabel("Nom de l'immeuble", { exact: true }).fill('Résidence Facturation Test');
    await page.getByLabel('Adresse', { exact: true }).fill('Avenue des Trois Martyrs');
    await page.getByLabel('Quartier', { exact: true }).fill('Bacongo');
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

    await page.getByRole('link', { name: 'Locataires' }).click();
    await page.getByRole('link', { name: 'Nouveau locataire' }).click();
    await page.getByLabel('Nom', { exact: true }).fill('Nkodia');
    await page.getByLabel('Téléphone principal', { exact: true }).fill(TENANT_PHONE);
    await page.getByLabel('Ville', { exact: true }).fill('Brazzaville');
    await page.getByRole('button', { name: 'Créer le locataire', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/locataires\/[^/]+$/);
    await expect(page.getByRole('heading', { name: 'Nkodia', level: 1 })).toBeVisible();

    // --- Bail actif (nécessaire pour émettre une facture) ---
    await page.goto('/app/baux');
    await page.getByRole('link', { name: 'Nouveau bail' }).click();
    await page.getByLabel('Immeuble', { exact: true }).click();
    await page.getByRole('option', { name: 'Résidence Facturation Test' }).click();
    await page.getByLabel('Lot disponible', { exact: true }).click();
    await page.getByRole('option', { name: 'C01', exact: true }).click();
    await page.getByPlaceholder('Rechercher un locataire par nom ou numéro').fill('Nkodia');
    await page.getByRole('button', { name: /Nkodia/ }).click();
    const startDate = new Date().toISOString().slice(0, 10);
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

    // --- Facture manuelle émise directement (100 000 XAF de loyer) ---
    await page.goto('/app/factures/nouvelle');
    await page
      .getByLabel('Bail')
      .selectOption({ label: 'Nkodia — Résidence Facturation Test (C01)' });
    const periodStart = `${startDate.slice(0, 8)}01`;
    // Échéance fixée loin dans le futur : le mock ne calcule aucune grâce par
    // défaut (graceUntilDate = dueDate), une échéance proche ferait basculer
    // la facture en "En retard" avant même le premier encaissement.
    const dueDateFuture = new Date();
    dueDateFuture.setUTCDate(dueDateFuture.getUTCDate() + 30);
    await page.locator('#periodStart').fill(periodStart);
    await page.locator('#periodEnd').fill(startDate);
    await page.locator('#dueDate').fill(dueDateFuture.toISOString().slice(0, 10));
    await page.getByLabel('Libellé de la ligne').fill('Loyer septembre');
    await page.getByLabel('Montant de la ligne').fill('100000');
    await page.getByText('Émettre immédiatement').click();
    await page.getByRole('button', { name: 'Créer la facture' }).click();
    await expect(page).toHaveURL(/\/app\/factures\/[^/]+$/);
    await expect(page.getByText('Émise', { exact: true })).toBeVisible();

    // --- Premier encaissement au comptoir : partiel (60 000 / 100 000) ---
    await page.goto('/app/paiements/nouveau');
    await page.getByPlaceholder('Rechercher un locataire…').fill('Nkodia');
    await page.getByRole('button', { name: /Nkodia/ }).click();
    await page.getByLabel('Mode de paiement', { exact: true }).click();
    await page.getByRole('option', { name: 'Espèces' }).click();
    await page.getByLabel('Montant encaissé', { exact: true }).fill('60000');
    await expect(page.getByText(/60\D*000/)).toBeVisible();
    await page.getByRole('button', { name: "Enregistrer l'encaissement" }).click();
    await expect(page).toHaveURL(/\/app\/paiements\/[^/]+$/);

    // La facture est désormais partiellement payée.
    await page.goto('/app/factures');
    await expect(page.getByText('Partiellement payée')).toBeVisible();

    // --- Second encaissement : solde restant (40 000) → facture PAID ---
    await page.goto('/app/paiements/nouveau');
    await page.getByPlaceholder('Rechercher un locataire…').fill('Nkodia');
    await page.getByRole('button', { name: /Nkodia/ }).click();
    await page.getByLabel('Mode de paiement', { exact: true }).click();
    await page.getByRole('option', { name: 'Espèces' }).click();
    await page.getByLabel('Montant encaissé', { exact: true }).fill('40000');
    await page.getByRole('button', { name: "Enregistrer l'encaissement" }).click();
    await expect(page).toHaveURL(/\/app\/paiements\/[^/]+$/);

    await page.goto('/app/factures');
    await expect(page.getByText('Payée', { exact: true })).toBeVisible();

    // --- Quittance créée automatiquement au règlement complet ---
    await page.getByRole('link', { name: /LOY-/ }).click();
    await page.getByRole('link', { name: /QUI-/ }).click();
    await expect(page).toHaveURL(/\/app\/quittances\/[^/]+$/);
    await expect(page.getByRole('heading', { name: /QUI-/ })).toBeVisible();

    // Le lien de vérification publique (/verifier/{jeton}) est affiché en
    // toutes lettres sur la fiche, dans le bloc "Statut d'envoi" (span.font-mono
    // ciblé précisément : le <p> englobant matcherait aussi le texte en substring).
    const verificationLinkText = await page.locator('span.font-mono.text-xs').innerText();
    const tokenMatch = verificationLinkText.match(/\/verifier\/([A-Za-z0-9-]+)/);
    expect(tokenMatch).not.toBeNull();
    const token = tokenMatch![1];

    // --- Journal de messages : une entrée WhatsApp "Envoyé" liée à la quittance ---
    await page.goto('/app/messages');
    await expect(page.getByText('Receipt #', { exact: false })).toBeVisible();
    await expect(page.getByText('Envoyé', { exact: true })).toBeVisible();

    // --- Vérification publique, dans un contexte navigateur neuf (sans
    // cookies ni session) : preuve que la route ne requiert aucune auth. ---
    const publicContext = await browser.newContext();
    const publicPage = await publicContext.newPage();
    await publicPage.goto(`/verifier/${token}`);
    await expect(publicPage.getByText('Quittance authentique')).toBeVisible();
    await expect(publicPage.getByText('Malonga')).toBeVisible();
    await expect(publicPage.getByText('Agence Facturation E2E')).toBeVisible();
    await publicContext.close();

    // --- 404 stylée pour un jeton inconnu ---
    const strangerContext = await browser.newContext();
    const strangerPage = await strangerContext.newPage();
    await strangerPage.goto('/verifier/jeton-inconnu-000');
    await expect(strangerPage.getByText('Lien de vérification invalide')).toBeVisible();
    await strangerContext.close();
  });
});
