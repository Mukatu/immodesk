import { describe, expect, it } from 'vitest';
import { formatXaf, parseXaf } from './money.js';

describe('formatXaf', () => {
  it('formate un montant nominal avec séparateur de milliers', () => {
    expect(formatXaf(150000)).toBe('150 000 XAF');
  });

  it('formate un grand montant avec plusieurs groupes de milliers', () => {
    expect(formatXaf(1000000)).toBe('1 000 000 XAF');
  });

  it('formate un montant à sept chiffres', () => {
    expect(formatXaf(1234567)).toBe('1 234 567 XAF');
  });

  it('formate zéro', () => {
    expect(formatXaf(0)).toBe('0 XAF');
  });

  it('formate un montant négatif entier avec le signe avant les chiffres', () => {
    expect(formatXaf(-150000)).toBe('-150 000 XAF');
  });

  it('accepte un bigint directement', () => {
    expect(formatXaf(1000000n)).toBe('1 000 000 XAF');
  });

  it('rejette un montant number comportant une décimale', () => {
    expect(() => formatXaf(150000.5)).toThrow(Error);
  });

  it("le message d'erreur mentionne l'absence de décimale pour le XAF", () => {
    expect(() => formatXaf(150000.5)).toThrow(/décimale/i);
  });
});

describe('parseXaf', () => {
  it('round-trip nominal avec formatXaf', () => {
    const amount = 150000;
    expect(parseXaf(formatXaf(amount))).toBe(amount);
  });

  it('round-trip pour un grand montant', () => {
    const amount = 1000000;
    expect(parseXaf(formatXaf(amount))).toBe(amount);
  });

  it('parse une chaîne sans séparateurs ni suffixe', () => {
    expect(parseXaf('150000')).toBe(150000);
  });

  it('parse une chaîne avec suffixe XAF', () => {
    expect(parseXaf('150 000 XAF')).toBe(150000);
  });

  it('parse zéro avec suffixe', () => {
    expect(parseXaf('0 XAF')).toBe(0);
  });

  it('parse un montant avec plusieurs groupes de milliers', () => {
    expect(parseXaf('1 000 000 XAF')).toBe(1000000);
  });

  it("tolère l'espace insécable (U+00A0) comme séparateur de milliers", () => {
    const nbsp = String.fromCharCode(0x00a0);
    expect(parseXaf(`150${nbsp}000${nbsp}XAF`)).toBe(150000);
  });

  it("tolère l'espace fine insécable (U+202F) comme séparateur de milliers", () => {
    const nnbsp = String.fromCharCode(0x202f);
    expect(parseXaf(`150${nnbsp}000${nnbsp}XAF`)).toBe(150000);
  });

  it('rejette une chaîne avec une décimale (point)', () => {
    expect(() => parseXaf('150000.5')).toThrow(Error);
  });

  it('rejette une chaîne avec une décimale (virgule)', () => {
    expect(() => parseXaf('150 000,50 XAF')).toThrow(Error);
  });

  it('rejette une chaîne non numérique', () => {
    expect(() => parseXaf('abc')).toThrow(Error);
  });

  it('rejette une chaîne vide', () => {
    expect(() => parseXaf('')).toThrow(Error);
  });
});
