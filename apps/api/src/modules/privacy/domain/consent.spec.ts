import { deriveConsentState, type ConsentAuditRow } from './consent';

describe('deriveConsentState', () => {
  it('exige le consentement en l’absence de toute acceptation', () => {
    const state = deriveConsentState([], '2026-09');
    expect(state).toEqual({ acceptedVersion: null, acceptedAt: null, consentRequired: true });
  });

  it('reprend la dernière version acceptée quand elle est à jour', () => {
    // Une ligne par organisation (déjà la plus récente de chacune) : ici, une
    // seule organisation, dont la dernière acceptation est la version courante.
    const rows: ConsentAuditRow[] = [
      {
        occurredAt: new Date('2026-09-01T00:00:00Z'),
        legalVersion: '2026-09',
        acceptedAt: '2026-09-01T00:00:00Z',
      },
    ];
    const state = deriveConsentState(rows, '2026-09');
    expect(state.acceptedVersion).toBe('2026-09');
    expect(state.acceptedAt).toBe('2026-09-01T00:00:00Z');
    expect(state.consentRequired).toBe(false);
  });

  it('redemande le consentement si la dernière acceptation est une version périmée', () => {
    const rows: ConsentAuditRow[] = [
      {
        occurredAt: new Date('2026-01-01T00:00:00Z'),
        legalVersion: '2025-06',
        acceptedAt: '2026-01-01T00:00:00Z',
      },
    ];
    const state = deriveConsentState(rows, '2026-09');
    expect(state.acceptedVersion).toBe('2025-06');
    expect(state.consentRequired).toBe(true);
  });

  it('un locataire multi-organisations reste en attente si une seule organisation n’a pas la version courante', () => {
    const rows: ConsentAuditRow[] = [
      {
        occurredAt: new Date('2026-09-01T00:00:00Z'),
        legalVersion: '2026-09',
        acceptedAt: '2026-09-01T00:00:00Z',
      },
      {
        occurredAt: new Date('2026-02-01T00:00:00Z'),
        legalVersion: '2025-06',
        acceptedAt: '2026-02-01T00:00:00Z',
      },
    ];
    const state = deriveConsentState(rows, '2026-09');
    expect(state.consentRequired).toBe(true);
  });

  it('ne se laisse pas abuser par l’ordre d’arrivée des lignes : retient la plus récente par date', () => {
    const rows: ConsentAuditRow[] = [
      {
        occurredAt: new Date('2026-09-01T00:00:00Z'),
        legalVersion: '2026-09',
        acceptedAt: '2026-09-01T00:00:00Z',
      },
      {
        occurredAt: new Date('2026-01-01T00:00:00Z'),
        legalVersion: '2025-06',
        acceptedAt: '2026-01-01T00:00:00Z',
      },
    ];
    const state = deriveConsentState(rows, '2026-09');
    expect(state.acceptedVersion).toBe('2026-09');
  });
});
