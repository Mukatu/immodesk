import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import {
  AllocationPreview,
  computeAllocationPreview,
  type OpenInvoiceForAllocation,
} from '@/components/business/allocation-preview';

const invoiceA: OpenInvoiceForAllocation = {
  id: 'inv-a',
  invoiceNumber: 'LOY-202608-00001',
  dueDate: '2026-08-05',
  balanceAmount: 100000,
};
const invoiceB: OpenInvoiceForAllocation = {
  id: 'inv-b',
  invoiceNumber: 'LOY-202609-00002',
  dueDate: '2026-09-05',
  balanceAmount: 120000,
};

describe('computeAllocationPreview', () => {
  it('alloue tout le montant sur une seule facture sans reliquat', () => {
    const result = computeAllocationPreview(60000, [invoiceA]);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.allocatedAmount).toBe(60000);
    expect(result.lines[0]?.remainingAfter).toBe(40000);
    expect(result.creditAmount).toBe(0);
  });

  it('sert la facture la plus ancienne en premier puis répartit sur plusieurs factures', () => {
    const result = computeAllocationPreview(150000, [invoiceB, invoiceA]);
    expect(result.lines.map((l) => l.invoiceId)).toEqual(['inv-a', 'inv-b']);
    expect(result.lines[0]?.allocatedAmount).toBe(100000);
    expect(result.lines[1]?.allocatedAmount).toBe(50000);
    expect(result.creditAmount).toBe(0);
  });

  it('crédite le reliquat non affecté quand le montant dépasse les factures ouvertes', () => {
    const result = computeAllocationPreview(250000, [invoiceA, invoiceB]);
    expect(result.totalAllocated).toBe(220000);
    expect(result.creditAmount).toBe(30000);
  });

  it('ne produit aucune allocation pour un montant nul ou absent', () => {
    expect(computeAllocationPreview(0, [invoiceA]).lines).toHaveLength(0);
    expect(computeAllocationPreview(null, [invoiceA]).lines).toHaveLength(0);
  });
});

describe('AllocationPreview', () => {
  it('invite à saisir un montant quand il est absent', () => {
    render(<AllocationPreview amount={null} openInvoices={[invoiceA]} />);
    expect(screen.getByText(/Saisissez un montant/)).toBeInTheDocument();
  });

  it('affiche le reliquat crédité quand le montant dépasse le solde', () => {
    render(<AllocationPreview amount={250000} openInvoices={[invoiceA, invoiceB]} />);
    expect(screen.getByText(/sera crédité au locataire/)).toBeInTheDocument();
  });

  it("signale l'absence de facture ouverte", () => {
    render(<AllocationPreview amount={50000} openInvoices={[]} />);
    expect(screen.getByText(/aucune facture ouverte/)).toBeInTheDocument();
  });
});
