import type { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { DomainError } from '../../src/shared/errors/domain-error';
import type { TenantLeaseRow } from '../../src/shared/prisma/tenant-directory.service';
import { TenantPortalGuard } from '../../src/modules/tenant-portal/presentation/tenant-portal.guard';
import {
  groupLeasesByOrganization,
  requireLeaseInScope,
} from '../../src/modules/tenant-portal/application/tenant-portal-scope';
import { TenantDocumentsService } from '../../src/modules/tenant-portal/application/tenant-documents.service';
import { TenantBankTransfersService } from '../../src/modules/tenant-portal/application/tenant-bank-transfers.service';

/**
 * Tests unitaires purs (`jest.unit.config.js`, aucun accès base) : les
 * services applicatifs de `tenant-portal` sont instanciés directement par
 * `new`, sans conteneur Nest — leurs dépendances lourdes (`PrismaService`,
 * `DATABASE_ADMIN_URL`) rendraient une compilation `Test.createTestingModule`
 * du module entier aussi coûteuse qu'un test d'intégration, pour ne
 * vérifier que le câblage. Le comportement bout en bout (base réelle) est
 * couvert par `test/integration/phase10-tenant-portal.int-spec.ts`.
 */
function fakeReflector(returns: boolean): Reflector {
  return { getAllAndOverride: jest.fn().mockReturnValue(returns) } as unknown as Reflector;
}

describe('TenantPortalGuard', () => {
  it('laisse passer une route sans @TenantPortal()', async () => {
    const directory = { listActiveTenantLeases: jest.fn() };
    const guard = new TenantPortalGuard(fakeReflector(false), directory as never);
    const context = { getType: () => 'http', getHandler: () => null, getClass: () => null };
    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(directory.listActiveTenantLeases).not.toHaveBeenCalled();
  });

  it('refuse sans utilisateur authentifié', async () => {
    const directory = { listActiveTenantLeases: jest.fn() };
    const guard = new TenantPortalGuard(fakeReflector(true), directory as never);
    const request = {} as Request & { user?: unknown };
    const context = {
      getType: () => 'http',
      getHandler: () => null,
      getClass: () => null,
      switchToHttp: () => ({ getRequest: () => request }),
    };
    await expect(guard.canActivate(context as never)).rejects.toMatchObject({
      code: 'IAM.UNAUTHENTICATED',
    });
  });

  it('refuse sans bail actif (PARTIES.PORTAL_NO_ACTIVE_LEASE)', async () => {
    const directory = { listActiveTenantLeases: jest.fn().mockResolvedValue([]) };
    const guard = new TenantPortalGuard(fakeReflector(true), directory as never);
    const request = { user: { userId: 'u1' } } as Request & { user?: { userId: string } };
    const context = {
      getType: () => 'http',
      getHandler: () => null,
      getClass: () => null,
      switchToHttp: () => ({ getRequest: () => request }),
    };
    await expect(guard.canActivate(context as never)).rejects.toMatchObject({
      code: 'PARTIES.PORTAL_NO_ACTIVE_LEASE',
    });
  });

  it('pose request.tenantLeases avec les baux actifs', async () => {
    const leases: TenantLeaseRow[] = [{ leaseId: 'l1', organizationId: 'o1', tenantId: 't1' }];
    const directory = { listActiveTenantLeases: jest.fn().mockResolvedValue(leases) };
    const guard = new TenantPortalGuard(fakeReflector(true), directory as never);
    const request = { user: { userId: 'u1' } } as Request & {
      user?: { userId: string };
      tenantLeases?: TenantLeaseRow[];
    };
    const context = {
      getType: () => 'http',
      getHandler: () => null,
      getClass: () => null,
      switchToHttp: () => ({ getRequest: () => request }),
    };
    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(request.tenantLeases).toEqual(leases);
  });
});

const LEASES: TenantLeaseRow[] = [
  { leaseId: 'lease-1', organizationId: 'org-1', tenantId: 'tenant-1' },
  { leaseId: 'lease-2', organizationId: 'org-2', tenantId: 'tenant-2' },
];

describe('groupLeasesByOrganization / requireLeaseInScope', () => {
  it('regroupe les baux par organisation', () => {
    const grouped = groupLeasesByOrganization(LEASES);
    expect([...grouped.keys()]).toEqual(['org-1', 'org-2']);
    expect(grouped.get('org-1')).toEqual([LEASES[0]]);
  });

  it('retrouve un bail du périmètre', () => {
    expect(requireLeaseInScope(LEASES, 'lease-2')).toEqual(LEASES[1]);
  });

  it('refuse un bail hors périmètre avec PARTIES.PORTAL_OUT_OF_SCOPE (404)', () => {
    expect.assertions(2);
    try {
      requireLeaseInScope(LEASES, 'lease-inconnu');
    } catch (error) {
      expect((error as DomainError).code).toBe('PARTIES.PORTAL_OUT_OF_SCOPE');
      expect((error as DomainError).status).toBe(404);
    }
  });
});

describe('TenantDocumentsService — restriction au bail de la session', () => {
  it('refuse un type de rattachement autre que `lease` (422)', async () => {
    const documents = { createUploadUrl: jest.fn(), register: jest.fn() };
    const service = new TenantDocumentsService(documents as never);
    await expect(
      service.createUploadUrl(LEASES, 'u1', {
        fileName: 'preuve.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 10,
        kind: 'TRANSFER_PROOF' as never,
        relatedEntityType: 'tenant' as never,
        relatedEntityId: 'tenant-1',
      }),
    ).rejects.toMatchObject({ code: 'PARTIES.PORTAL_RELATED_ENTITY_INVALID', status: 422 });
    expect(documents.createUploadUrl).not.toHaveBeenCalled();
  });

  it('refuse un bail hors périmètre (422)', async () => {
    const documents = { createUploadUrl: jest.fn(), register: jest.fn() };
    const service = new TenantDocumentsService(documents as never);
    await expect(
      service.createUploadUrl(LEASES, 'u1', {
        fileName: 'preuve.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 10,
        kind: 'TRANSFER_PROOF' as never,
        relatedEntityType: 'lease' as never,
        relatedEntityId: 'lease-inconnu',
      }),
    ).rejects.toMatchObject({ code: 'PARTIES.PORTAL_RELATED_ENTITY_INVALID', status: 422 });
  });

  it("délègue à DocumentsService avec l'organisation du bail", async () => {
    const documents = {
      createUploadUrl: jest.fn().mockResolvedValue({ uploadUrl: 'x' }),
      register: jest.fn(),
    };
    const service = new TenantDocumentsService(documents as never);
    await service.createUploadUrl(LEASES, 'u1', {
      fileName: 'preuve.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 10,
      kind: 'TRANSFER_PROOF' as never,
      relatedEntityType: 'lease' as never,
      relatedEntityId: 'lease-2',
    });
    expect(documents.createUploadUrl).toHaveBeenCalledWith(
      'org-2',
      'u1',
      expect.objectContaining({ relatedEntityId: 'lease-2' }),
    );
  });
});

describe('TenantBankTransfersService.declare — restriction au bail de la session', () => {
  it('refuse un bail hors périmètre (404)', async () => {
    const declarations = { declare: jest.fn() };
    const service = new TenantBankTransfersService(
      { withTenant: jest.fn() } as never,
      { get: () => 'secret' } as never,
      declarations as never,
    );
    await expect(
      service.declare(LEASES, 'u1', {
        leaseId: 'lease-inconnu',
        declaredAmount: 1000n,
        transferDate: new Date(),
        payerName: 'Jean',
        beneficiaryBankAccountId: 'b1',
        proofDocumentId: 'd1',
        clientRef: 'ref-1',
      }),
    ).rejects.toMatchObject({ code: 'PARTIES.PORTAL_OUT_OF_SCOPE' });
    expect(declarations.declare).not.toHaveBeenCalled();
  });
});
