import {
  mergePrivacySettings,
  readPrivacySettings,
  type PrivacySettings,
} from './privacy-settings';

const DEFAULTS: PrivacySettings = {
  identityMonths: 60,
  messageLogsDays: 365,
  notificationsDays: 365,
  auditLogsMonths: 120,
  financialYears: 10,
  dpoName: null,
  dpoContact: null,
  legalVersion: '2026-09',
};

describe('readPrivacySettings', () => {
  it('reprend les valeurs par défaut quand settings_json est vide', () => {
    expect(readPrivacySettings(null, DEFAULTS)).toEqual(DEFAULTS);
    expect(readPrivacySettings({}, DEFAULTS)).toEqual(DEFAULTS);
  });

  it('lit les valeurs posées sous la clé privacy', () => {
    const json = { privacy: { identityMonths: 24, dpoName: 'Awa Bemba' } };
    const settings = readPrivacySettings(json, DEFAULTS);
    expect(settings.identityMonths).toBe(24);
    expect(settings.dpoName).toBe('Awa Bemba');
    expect(settings.financialYears).toBe(10); // non renseigné : valeur par défaut
  });

  it('ignore une valeur mal typée et reprend le défaut', () => {
    const json = { privacy: { identityMonths: 'douze', auditLogsMonths: -5 } };
    const settings = readPrivacySettings(json, DEFAULTS);
    expect(settings.identityMonths).toBe(60);
    expect(settings.auditLogsMonths).toBe(120);
  });
});

describe('mergePrivacySettings', () => {
  it('fusionne sans effacer les autres sections de settings_json', () => {
    const json = { contractTemplate: { foo: 'bar' }, privacy: { identityMonths: 60 } };
    const merged = mergePrivacySettings(json, { identityMonths: 36 }, DEFAULTS);
    expect(merged.contractTemplate).toEqual({ foo: 'bar' });
    expect((merged.privacy as PrivacySettings).identityMonths).toBe(36);
  });

  it('ne touche pas les clés non fournies dans le correctif', () => {
    const json = { privacy: { dpoName: 'Awa Bemba', dpoContact: '+242060000000' } };
    const merged = mergePrivacySettings(json, { dpoName: 'Nouveau DPO' }, DEFAULTS);
    const privacy = merged.privacy as PrivacySettings;
    expect(privacy.dpoName).toBe('Nouveau DPO');
    expect(privacy.dpoContact).toBe('+242060000000');
  });

  it('ignore explicitement les valeurs undefined du correctif', () => {
    const json = { privacy: { legalVersion: '2025-01' } };
    const merged = mergePrivacySettings(json, { legalVersion: undefined }, DEFAULTS);
    expect((merged.privacy as PrivacySettings).legalVersion).toBe('2025-01');
  });
});
