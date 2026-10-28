import type { AppConfigService } from '../../../shared/config/config.module';
import type { PortfolioImportsService } from '../application/portfolio-imports.service';
import { ImportWorker } from './import-worker';

/**
 * Régression : `status()` lisait `returnvalue` sur un instantané du travail pris
 * AVANT `getState()`. Si le travail se terminait entre les deux, l'état était
 * `completed` mais le résultat vide (`totalRows` indéfini côté API).
 */
describe('ImportWorker.status', () => {
  const result = { totalRows: 6, createdCount: 5, rejectedCount: 1, rejected: [] };

  it('relit le travail une fois terminé pour renvoyer son résultat', async () => {
    const stale = {
      data: { organizationId: 'org-1' },
      returnvalue: undefined,
      getState: jest.fn().mockResolvedValue('completed'),
    };
    const fresh = { data: { organizationId: 'org-1' }, returnvalue: result };
    const getJob = jest.fn().mockResolvedValueOnce(stale).mockResolvedValueOnce(fresh);

    const worker = new ImportWorker({} as AppConfigService, {} as PortfolioImportsService);
    (worker as unknown as { queue: unknown }).queue = { getJob };

    await expect(worker.status('job-1')).resolves.toEqual({
      organizationId: 'org-1',
      status: 'COMPLETED',
      result,
    });
  });
});
