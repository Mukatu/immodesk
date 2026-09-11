import type { PaymentMethod, RentPeriod } from '@/lib/api/types';

export interface WizardCoTenant {
  id: string;
  displayName: string;
}

export interface WizardData {
  propertyId: string;
  unitId: string;
  unitCode: string;
  depositMonths: number;
  tenantId: string;
  tenantName: string;
  startDate: string;
  endDate: string;
  rentAmount: number | null;
  chargesAmount: number | null;
  rentPeriod: RentPeriod;
  paymentDueDay: number;
  preferredPaymentMethod: PaymentMethod | '';
  depositAmount: number | null;
  depositManuallyEdited: boolean;
  coTenants: WizardCoTenant[];
  includedGuarantorIds: string[];
}

export const DEFAULT_WIZARD_DATA: WizardData = {
  propertyId: '',
  unitId: '',
  unitCode: '',
  depositMonths: 2,
  tenantId: '',
  tenantName: '',
  startDate: '',
  endDate: '',
  rentAmount: null,
  chargesAmount: null,
  rentPeriod: 'MONTHLY',
  paymentDueDay: 5,
  preferredPaymentMethod: '',
  depositAmount: null,
  depositManuallyEdited: false,
  coTenants: [],
  includedGuarantorIds: [],
};

export type WizardErrors = Record<string, string>;
