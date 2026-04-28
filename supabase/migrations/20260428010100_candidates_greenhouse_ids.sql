ALTER TABLE candidates ADD COLUMN IF NOT EXISTS greenhouse_candidate_id bigint;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS greenhouse_application_id bigint unique;
