import type {
  Document,
  TenantCreateDocumentBody,
  TenantUploadUrlRequest,
  UploadUrlResponse,
} from '@/lib/api/types';

/**
 * Téléversement de la preuve de virement depuis le portail locataire.
 *
 * Utilise `/tenant/documents/upload-url` puis `/tenant/documents`
 * (apps/web/src/mocks/tenant-portal-handlers.ts) plutôt que les routes
 * génériques `/documents/*` : celles-ci exigent un contexte d'organisation
 * (`orgIdFromRequest`, résolu depuis `X-Organization-Id`), jamais envoyé par
 * `tenant-client.ts` (jeton locataire seul). Le contrat phase 10 ne décrit
 * aucune route de téléversement propre au portail locataire — c'est un
 * silence, pas un choix explicite : `/tenant/documents/*` est donc une
 * extension raisonnable au contrat, à signaler à l'équipe API pour qu'elle
 * ajoute l'équivalent réel. Voir le commentaire détaillé dans
 * tenant-portal-handlers.ts.
 *
 * Les deux appels réseau sont injectés (`deps`) plutôt qu'importés
 * directement : ce sont des hooks React Query (`useRequestTenantUploadUrl`,
 * `useCreateTenantDocument`, voir use-tenant-portal.ts), utilisables
 * seulement depuis un composant. Cette fonction reste un utilitaire simple
 * appelable depuis un gestionnaire d'événement (declare-transfer-form.tsx).
 */
export interface UploadTenantProofDeps {
  requestUploadUrl: (body: TenantUploadUrlRequest) => Promise<UploadUrlResponse>;
  createDocument: (body: TenantCreateDocumentBody) => Promise<Document>;
}

function putFileWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error("Échec de l'envoi. Veuillez réessayer."));
    };
    xhr.onerror = () => reject(new Error("Échec de l'envoi. Veuillez réessayer."));
    xhr.send(file);
  });
}

export async function uploadTenantProof(
  file: File,
  leaseId: string,
  tenantId: string,
  onProgress: (percent: number) => void,
  deps: UploadTenantProofDeps,
): Promise<Document> {
  const { uploadUrl, objectKey } = await deps.requestUploadUrl({
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    kind: 'TRANSFER_PROOF',
    relatedEntityType: 'tenant',
    relatedEntityId: tenantId,
    leaseId,
  });

  await putFileWithProgress(uploadUrl, file, onProgress);

  return deps.createDocument({
    objectKey,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    kind: 'TRANSFER_PROOF',
    relatedEntityType: 'tenant',
    relatedEntityId: tenantId,
    leaseId,
  });
}
