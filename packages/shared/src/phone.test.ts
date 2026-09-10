import { describe, expect, it } from "vitest";
import {
  getCongoOperator,
  isValidCongoMobile,
  normalizePhoneCongo,
} from "./phone.js";

const EXPECTED_E164 = "+242066000001";

describe("normalizePhoneCongo", () => {
  it("normalise une entrée avec espace interne", () => {
    expect(normalizePhoneCongo("06 6000001")).toBe(EXPECTED_E164);
  });

  it("normalise 9 chiffres locaux sans indicatif", () => {
    expect(normalizePhoneCongo("066000001")).toBe(EXPECTED_E164);
  });

  it("normalise l'indicatif sans le +", () => {
    expect(normalizePhoneCongo("242066000001")).toBe(EXPECTED_E164);
  });

  it("normalise le 0 d'accès national suivi de l'indicatif", () => {
    expect(normalizePhoneCongo("0242066000001")).toBe(EXPECTED_E164);
  });

  it("est idempotent sur une entrée déjà normalisée", () => {
    expect(normalizePhoneCongo("+242066000001")).toBe(EXPECTED_E164);
  });

  it("normalise un numéro Airtel (préfixe 05)", () => {
    expect(normalizePhoneCongo("055000001")).toBe("+242055000001");
  });

  it("tolère les tirets et points", () => {
    expect(normalizePhoneCongo("06.6000001")).toBe(EXPECTED_E164);
    expect(normalizePhoneCongo("06-6000001")).toBe(EXPECTED_E164);
  });

  it("rejette un numéro trop court", () => {
    expect(() => normalizePhoneCongo("0660001")).toThrow(Error);
  });

  it("rejette un numéro d'un autre pays (France)", () => {
    expect(() => normalizePhoneCongo("+33612345678")).toThrow(Error);
  });

  it("rejette un préfixe congolais non mobile (ni 05 ni 06)", () => {
    expect(() => normalizePhoneCongo("+242012345678")).toThrow(Error);
  });

  it("rejette une chaîne vide", () => {
    expect(() => normalizePhoneCongo("")).toThrow(Error);
  });

  it("rejette une chaîne non numérique", () => {
    expect(() => normalizePhoneCongo("abcdefghi")).toThrow(Error);
  });
});

describe("isValidCongoMobile", () => {
  it("retourne true pour un numéro MTN valide", () => {
    expect(isValidCongoMobile("+242066000001")).toBe(true);
  });

  it("retourne true pour un numéro Airtel valide", () => {
    expect(isValidCongoMobile("+242055000001")).toBe(true);
  });

  it("retourne false pour un préfixe invalide", () => {
    expect(isValidCongoMobile("+242012345678")).toBe(false);
  });

  it("retourne false pour une longueur incorrecte", () => {
    expect(isValidCongoMobile("+24206600000")).toBe(false);
    expect(isValidCongoMobile("+2420660000011")).toBe(false);
  });

  it("ne lève jamais d'erreur, même sur une entrée absurde", () => {
    expect(() => isValidCongoMobile("not-a-phone")).not.toThrow();
    expect(isValidCongoMobile("not-a-phone")).toBe(false);
  });
});

describe("getCongoOperator", () => {
  it("retourne MTN pour un numéro 06", () => {
    expect(getCongoOperator("+242066000001")).toBe("MTN");
  });

  it("retourne AIRTEL pour un numéro 05", () => {
    expect(getCongoOperator("+242055000001")).toBe("AIRTEL");
  });

  it("retourne null pour un numéro non reconnu", () => {
    expect(getCongoOperator("+242012345678")).toBeNull();
  });

  it("retourne null (sans lever d'erreur) pour une entrée invalide", () => {
    expect(() => getCongoOperator("+33612345678")).not.toThrow();
    expect(getCongoOperator("+33612345678")).toBeNull();
  });
});
