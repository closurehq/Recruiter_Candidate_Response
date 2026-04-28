-- Drop existing constraint first so the data migration is not blocked
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_status_check;

-- Map legacy 'closed' status to 'closed-sent' before applying new constraint
UPDATE candidates SET status = 'closed-sent' WHERE status = 'closed';

ALTER TABLE candidates ADD CONSTRAINT candidates_status_check CHECK (status IN ('active', 'pending-review', 'closed-pending', 'closed-sent'));
