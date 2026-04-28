ALTER TABLE roles ADD COLUMN IF NOT EXISTS greenhouse_job_id bigint unique;
