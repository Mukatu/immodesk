import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TariffRow, tariffPrimaryAmount } from './tariff-row';
import type { UtilityTariff } from '@/lib/api/types';

/** Dates ancrées explicitement : jamais `new Date()` dans un jeu d'essai. */
const baseTariff: UtilityTariff = {
  id: 'tariff-1',
  meterType: 'WATER_LCDE',
  basis: 'PER_UNIT_CONSUMED',
  label: 'Eau LCDE — Résidence Mpila',
  unitPriceAmount: 450,
  flatAmount: 0,
  standingChargeAmount: 1500,
  minimumAmount: 5000,
  measurementUnit: 'm3',
  invoiceLineType: 'WATER_CHARGE',
  effectiveFrom: '2026-01-01',
  effectiveTo: undefined,
  isActive: true,
  currency: 'XAF',
};

describe('tariffPrimaryAmount', () => {
  it('retient le prix unitaire pour une base au volume consommé', () => {
    expect(tariffPrimaryAmount(baseTariff)).toEqual({ label: 'Prix unitaire', amount: 450 });
  });

  it('retient le forfait pour une base forfaitaire mensuelle', () => {
    expect(
      tariffPrimaryAmount({ basis: 'FLAT_MONTHLY', unitPriceAmount: 999, flatAmount: 12000 }),
    ).toEqual({ label: 'Forfait', amount: 12000 });
  });

  it('retient le forfait pour une base par occupant', () => {
    expect(
      tariffPrimaryAmount({ basis: 'PER_OCCUPANT', unitPriceAmount: 0, flatAmount: 3000 }),
    ).toEqual({ label: 'Forfait', amount: 3000 });
  });
});

describe('TariffRow', () => {
  it('affiche le libellé, la base, les montants et la période de validité, sans date de fin', () => {
    render(<TariffRow tariff={baseTariff} isOwner={false} />);

    expect(screen.getByText('Eau LCDE — Résidence Mpila')).toBeInTheDocument();
    expect(screen.getByText('Au volume consommé')).toBeInTheDocument();
    expect(screen.getByText('Depuis le 01/01/2026')).toBeInTheDocument();
    expect(screen.getByText('Actif')).toBeInTheDocument();
  });

  it('affiche une période bornée quand une date de fin est fixée', () => {
    render(
      <TariffRow
        tariff={{ ...baseTariff, effectiveFrom: '2026-01-01', effectiveTo: '2026-06-30' }}
        isOwner={false}
      />,
    );

    expect(screen.getByText('Du 01/01/2026 au 30/06/2026')).toBeInTheDocument();
  });

  it('affiche "Inactif" pour un tarif désactivé', () => {
    render(<TariffRow tariff={{ ...baseTariff, isActive: false }} isOwner={false} />);
    expect(screen.getByText('Inactif')).toBeInTheDocument();
  });

  it('ne montre aucune action pour un rôle non OWNER', () => {
    render(<TariffRow tariff={baseTariff} isOwner={false} />);
    expect(screen.queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Désactiver' })).not.toBeInTheDocument();
  });

  it('propose modifier et désactiver au rôle OWNER, et déclenche les callbacks', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onToggleActive = vi.fn();
    render(
      <TariffRow tariff={baseTariff} isOwner onEdit={onEdit} onToggleActive={onToggleActive} />,
    );

    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    expect(onEdit).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Désactiver' }));
    expect(onToggleActive).toHaveBeenCalledTimes(1);
  });

  it('propose "Activer" pour un tarif inactif', () => {
    render(<TariffRow tariff={{ ...baseTariff, isActive: false }} isOwner />);
    expect(screen.getByRole('button', { name: 'Activer' })).toBeInTheDocument();
  });
});
