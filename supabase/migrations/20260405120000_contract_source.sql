CREATE TYPE contract_source AS ENUM ('external_form', 'manual');

ALTER TABLE contracts
  ADD COLUMN source contract_source NOT NULL DEFAULT 'manual';

CREATE INDEX idx_contracts_source ON contracts(source);
