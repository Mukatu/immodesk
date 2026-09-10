'use client';

import { useEffect, useId, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { FileText, Image as ImageIcon, Trash2, UploadCloud } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/business/empty-state';
import { ApiError } from '@/lib/api/errors';
import {
  fetchDocumentDownloadUrl,
  useCreateDocument,
  useDeleteDocument,
  useDocuments,
  useRequestUploadUrl,
} from '@/lib/api/hooks/use-documents';
import type { Document, DocumentKind, RelatedEntityType } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
] as const;

const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024;
const MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024;

const GENERIC_UPLOAD_ERROR = "Échec de l'envoi. Veuillez réessayer.";

/** Valide un fichier avant envoi : type MIME autorisé et taille selon le contrat API. */
export function validateDocumentFile(file: {
  name: string;
  type: string;
  size: number;
}): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return 'Format de fichier non pris en charge (jpeg, png, webp, heic ou pdf uniquement).';
  }
  const maxSize = file.type === 'application/pdf' ? MAX_PDF_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
  if (file.size > maxSize) {
    return 'Fichier trop volumineux (maximum 15 Mo pour une image, 25 Mo pour un PDF).';
  }
  return null;
}

/** Envoie le fichier en PUT direct vers l'URL signée, avec suivi de progression. */
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
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(GENERIC_UPLOAD_ERROR));
      }
    };
    xhr.onerror = () => reject(new Error(GENERIC_UPLOAD_ERROR));
    xhr.send(file);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} Ko`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}

export interface DocumentUploaderProps {
  relatedEntityType: RelatedEntityType;
  relatedEntityId: string;
  kind: DocumentKind;
  onUploaded?: (doc: Document) => void;
}

type UploadState = 'idle' | 'uploading' | 'error';

export function DocumentUploader({
  relatedEntityType,
  relatedEntityId,
  kind,
  onUploaded,
}: DocumentUploaderProps) {
  const inputId = useId();
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const requestUploadUrl = useRequestUploadUrl();
  const createDocument = useCreateDocument();

  useEffect(() => {
    if (!previewFile || previewFile.type === 'application/pdf') {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(previewFile);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [previewFile]);

  function resetState() {
    setState('idle');
    setProgress(0);
    setError(null);
    setPreviewFile(null);
  }

  async function handleFile(file: File) {
    const validationError = validateDocumentFile(file);
    if (validationError) {
      setPreviewFile(null);
      setError(validationError);
      setState('error');
      return;
    }

    setError(null);
    setPreviewFile(file);
    setState('uploading');
    setProgress(0);

    try {
      const { uploadUrl, objectKey } = await requestUploadUrl.mutateAsync({
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        kind,
        relatedEntityType,
        relatedEntityId,
      });

      await putFileWithProgress(uploadUrl, file, setProgress);

      const document = await createDocument.mutateAsync({
        objectKey,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        kind,
        relatedEntityType,
        relatedEntityId,
      });

      onUploaded?.(document);
      resetState();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : GENERIC_UPLOAD_ERROR);
      setState('error');
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void handleFile(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
    if (state === 'uploading') return;
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  const isUploading = state === 'uploading';

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!isUploading) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'rounded-lg border-2 border-dashed p-6 text-center transition-colors',
          isDragOver ? 'border-primary bg-muted' : 'border-border',
        )}
      >
        <input
          id={inputId}
          type="file"
          className="sr-only"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          onChange={handleInputChange}
          disabled={isUploading}
        />
        <label
          htmlFor={inputId}
          className={cn(
            'flex flex-col items-center gap-2',
            isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          )}
        >
          <UploadCloud className="size-8 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm font-medium text-foreground">
            Glissez-déposez un fichier ou cliquez pour choisir
          </span>
          <span className="text-xs text-muted-foreground">
            jpeg, png, webp, heic ou pdf — 15 Mo max (25 Mo pour un pdf)
          </span>
        </label>
      </div>

      {previewFile ? (
        <div className="flex items-center gap-3 rounded-md border border-border p-3">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="size-12 rounded object-cover" />
          ) : (
            <FileText className="size-8 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <span className="truncate text-sm text-foreground">{previewFile.name}</span>
        </div>
      ) : null}

      {isUploading ? (
        <div className="space-y-1" aria-live="polite">
          <Progress value={progress} />
          <span className="text-xs text-muted-foreground">{progress}%</span>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface DocumentListProps {
  relatedEntityType: RelatedEntityType;
  relatedEntityId: string;
  kind?: DocumentKind;
}

export function DocumentList({ relatedEntityType, relatedEntityId, kind }: DocumentListProps) {
  const { data, isLoading } = useDocuments({ relatedEntityType, relatedEntityId, kind });
  const deleteDocument = useDeleteDocument();
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const documents = data?.items ?? [];

  async function handleDownload(id: string) {
    try {
      const { downloadUrl } = await fetchDocumentDownloadUrl(id);
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setDownloadError(err instanceof ApiError ? err.message : GENERIC_UPLOAD_ERROR);
    }
  }

  if (!isLoading && documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Aucun document"
        description="Aucun document n'a encore été ajouté."
      />
    );
  }

  return (
    <div className="space-y-2">
      {downloadError ? (
        <p role="alert" className="text-sm text-destructive">
          {downloadError}
        </p>
      ) : null}
      <ul className="divide-y divide-border rounded-md border border-border">
        {documents.map((doc) => (
          <li key={doc.id} className="flex items-center gap-3 p-3">
            {doc.mimeType.startsWith('image/') ? (
              <ImageIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            ) : (
              <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{doc.fileName}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(doc.sizeBytes)}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void handleDownload(doc.id)}>
              Télécharger
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Supprimer ${doc.fileName}`}
              onClick={() => deleteDocument.mutate(doc.id)}
              disabled={deleteDocument.isPending}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
