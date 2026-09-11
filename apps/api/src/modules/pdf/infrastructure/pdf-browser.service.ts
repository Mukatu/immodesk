import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { Browser } from 'puppeteer';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { locateBrowser, type BrowserLocation } from './browser-locator';
import { loadPuppeteer } from './puppeteer-loader';

/**
 * Chromium partagé du worker PDF.
 *
 * LANCÉ UNE SEULE FOIS, puis réutilisé : démarrer un navigateur coûte une à
 * deux secondes et une centaine de mégaoctets. Le relancer à chaque contrat
 * mettrait le VPS à genoux dès la deuxième agence — c'est précisément le
 * risque « worker Puppeteer coûteux en mémoire » du plan de phases (§ 2.10).
 * La concurrence est bornée à `PDF_WORKER_CONCURRENCY` (2 par défaut) : ce
 * sont des ONGLETS du même navigateur, pas des processus distincts.
 *
 * Chaque rendu ouvre et FERME sa page, y compris en cas d'erreur : une page
 * oubliée est une fuite mémoire qui ne se voit qu'au bout de plusieurs jours.
 */
@Injectable()
export class PdfBrowserService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfBrowserService.name);
  private browser: Browser | null = null;
  private launching: Promise<Browser> | null = null;
  private locating: Promise<BrowserLocation> | null = null;

  constructor(private readonly config: AppConfigService) {}

  /**
   * Résout le navigateur UNE FOIS et mémorise le résultat.
   *
   * `puppeteer.executablePath()` est asynchrone depuis la v23 : la recherche
   * ne peut pas se faire dans le constructeur. Elle est donc paresseuse et
   * partagée — le premier appelant paie la recherche, les suivants lisent la
   * même promesse.
   */
  async location(): Promise<BrowserLocation> {
    this.locating ??= locateBrowser(this.config.get('PUPPETEER_EXECUTABLE_PATH'), async () =>
      (await loadPuppeteer()).executablePath(),
    ).then((found) => {
      if (found.candidates.length === 0) {
        this.logger.warn(
          'Aucun navigateur de rendu trouvé : la génération de contrats PDF est indisponible. ' +
            'Renseignez PUPPETEER_EXECUTABLE_PATH ou installez Chrome.',
        );
      } else {
        const summary = found.candidates.map((c) => `${c.source}:${c.executablePath}`).join(', ');
        this.logger.log(`Navigateurs de rendu candidats : ${summary}`);
      }
      return found;
    });
    return this.locating;
  }

  /** Vrai si au moins un navigateur est disponible. La génération répond 503 sinon. */
  async available(): Promise<boolean> {
    return (await this.location()).candidates.length > 0;
  }

  async onModuleDestroy(): Promise<void> {
    const browser = this.browser;
    this.browser = null;
    this.launching = null;
    await browser?.close().catch(() => undefined);
  }

  /**
   * Rend un HTML en PDF A4.
   *
   * `footerText` porte la date de génération : elle est imprimée par le pied
   * de page de Chromium et n'appartient donc PAS au HTML source, dont
   * l'empreinte doit rester stable d'un rendu à l'autre.
   */
  async renderPdf(html: string, footerText: string): Promise<Buffer> {
    const browser = await this.browserOrFail();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'load' });
      await page.emulateMediaType('print');
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate:
          '<div style="width:100%;font-size:7.5pt;color:#666;font-family:Arial,sans-serif;' +
          'padding:0 16mm;display:flex;justify-content:space-between;">' +
          `<span>${escapeHtml(footerText)}</span>` +
          '<span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>' +
          '</div>',
      });
      return Buffer.from(pdf);
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  private async browserOrFail(): Promise<Browser> {
    if (this.browser?.connected) return this.browser;

    // Deux jobs concurrents ne doivent pas lancer deux navigateurs : la
    // promesse de lancement est partagée.
    this.launching ??= this.launch();
    try {
      this.browser = await this.launching;
      return this.browser;
    } finally {
      this.launching = null;
    }
  }

  /**
   * Essaie les candidats DANS L'ORDRE et retient le premier qui démarre.
   *
   * Qu'un exécutable existe ne prouve pas qu'il se lance : Edge, présent sur
   * tout poste Windows, se termine immédiatement avec certaines versions de
   * Puppeteer. Abandonner au premier échec rendrait la génération
   * indisponible là où un autre navigateur est pourtant installé.
   */
  private async launch(): Promise<Browser> {
    const { candidates } = await this.location();
    if (candidates.length === 0) {
      throw new DomainError('LEASES.CONTRACT_UNAVAILABLE', { reason: 'NO_BROWSER' });
    }

    const args = this.config
      .get('PUPPETEER_LAUNCH_ARGS')
      .split(',')
      .map((arg) => arg.trim())
      .filter((arg) => arg.length > 0);

    const puppeteer = await loadPuppeteer();
    const failures: string[] = [];

    for (const candidate of candidates) {
      try {
        const browser = await puppeteer.launch({
          headless: true,
          executablePath: candidate.executablePath,
          args,
        });
        this.logger.log(
          `Navigateur de rendu retenu (${candidate.source}) : ${candidate.executablePath}`,
        );
        return browser;
      } catch (error) {
        const reason = (error as Error).message.split(/\r?\n/)[0];
        failures.push(`${candidate.executablePath} : ${reason}`);
      }
    }

    this.logger.error(`Aucun navigateur n'a pu démarrer : ${failures.join(' | ')}`);
    throw new DomainError('LEASES.CONTRACT_UNAVAILABLE', {
      reason: 'LAUNCH_FAILED',
      attempted: candidates.length,
    });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
