-- =====================================================================
-- Partie 11a : Technique — documents (Cloudflare R2) et FK différées
-- =====================================================================

CREATE TABLE documents (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    kind                   document_kind NOT NULL DEFAULT 'OTHER',
    storage_provider       storage_provider NOT NULL DEFAULT 'R2',
    bucket                 TEXT NOT NULL,
    object_key             TEXT NOT NULL,
    file_name              TEXT NOT NULL,
    mime_type              TEXT NOT NULL,
    size_bytes             BIGINT NOT NULL CHECK (size_bytes >= 0),
    checksum_sha256        TEXT,
    width_px               INTEGER CHECK (width_px IS NULL OR width_px > 0),
    height_px              INTEGER CHECK (height_px IS NULL OR height_px > 0),
    pages_count            SMALLINT CHECK (pages_count IS NULL OR pages_count > 0),
    is_public              BOOLEAN NOT NULL DEFAULT false,
    is_encrypted           BOOLEAN NOT NULL DEFAULT false,
    related_entity_type    TEXT,
    related_entity_id      UUID,
    uploaded_by_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    retention_until        DATE,
    metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
    client_ref             TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at             TIMESTAMPTZ,
    CONSTRAINT documents_object_uk UNIQUE (bucket, object_key),
    CONSTRAINT documents_client_ref_uk UNIQUE (organization_id, client_ref)
);
COMMENT ON TABLE documents IS 'Fichier stocké sur Cloudflare R2 (compatible S3), servi par URL signée. Référencé par toutes les entités porteuses de pièces jointes.';
COMMENT ON COLUMN documents.object_key IS 'Clé d''objet dans le bucket, préfixée par organization_id pour cloisonner le stockage.';
COMMENT ON COLUMN documents.checksum_sha256 IS 'Empreinte du contenu : intégrité des signatures, photos d''état des lieux et relevés bancaires.';
COMMENT ON COLUMN documents.is_public IS 'true uniquement pour les quittances vérifiables par QR code, servies sans authentification.';
COMMENT ON COLUMN documents.retention_until IS 'Date de purge autorisée au titre de la politique de conservation.';

CREATE INDEX documents_org_kind_idx ON documents (organization_id, kind, uploaded_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX documents_entity_idx ON documents (organization_id, related_entity_type, related_entity_id);

-- FK différées vers documents (colonnes déclarées dans les parties précédentes).
ALTER TABLE organizations ADD CONSTRAINT organizations_logo_fk FOREIGN KEY (logo_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE users ADD CONSTRAINT users_avatar_fk FOREIGN KEY (avatar_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE landlords ADD CONSTRAINT landlords_id_document_fk FOREIGN KEY (id_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE tenants ADD CONSTRAINT tenants_id_document_fk FOREIGN KEY (id_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE guarantors ADD CONSTRAINT guarantors_id_document_fk FOREIGN KEY (id_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE properties ADD CONSTRAINT properties_cover_fk FOREIGN KEY (cover_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE meter_readings ADD CONSTRAINT meter_readings_photo_fk FOREIGN KEY (photo_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE management_mandates ADD CONSTRAINT management_mandates_signature_fk FOREIGN KEY (signature_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE management_mandates ADD CONSTRAINT management_mandates_document_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE leases ADD CONSTRAINT leases_signature_fk FOREIGN KEY (signature_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE leases ADD CONSTRAINT leases_contract_fk FOREIGN KEY (contract_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE lease_parties ADD CONSTRAINT lease_parties_signature_fk FOREIGN KEY (signature_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE lease_documents ADD CONSTRAINT lease_documents_document_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE RESTRICT;
ALTER TABLE inspections ADD CONSTRAINT inspections_signature_fk FOREIGN KEY (signature_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE inspections ADD CONSTRAINT inspections_report_fk FOREIGN KEY (report_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE inspection_photos ADD CONSTRAINT inspection_photos_document_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE RESTRICT;
ALTER TABLE rent_invoices ADD CONSTRAINT rent_invoices_document_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE cash_remittances ADD CONSTRAINT cash_remittances_slip_fk FOREIGN KEY (deposit_slip_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE cash_remittances ADD CONSTRAINT cash_remittances_signature_fk FOREIGN KEY (signature_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE cash_receipts ADD CONSTRAINT cash_receipts_signature_fk FOREIGN KEY (signature_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE cash_receipts ADD CONSTRAINT cash_receipts_document_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE bank_transfer_declarations ADD CONSTRAINT bank_transfer_declarations_proof_fk FOREIGN KEY (proof_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE bank_checks ADD CONSTRAINT bank_checks_image_fk FOREIGN KEY (image_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE bank_statements ADD CONSTRAINT bank_statements_document_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE receipts ADD CONSTRAINT receipts_document_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD CONSTRAINT expenses_invoice_document_fk FOREIGN KEY (invoice_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE owner_statements ADD CONSTRAINT owner_statements_document_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE owner_payouts ADD CONSTRAINT owner_payouts_proof_fk FOREIGN KEY (proof_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE maintenance_updates ADD CONSTRAINT maintenance_updates_photo_fk FOREIGN KEY (photo_document_id) REFERENCES documents(id) ON DELETE SET NULL;
