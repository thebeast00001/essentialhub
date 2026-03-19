-- Add AI Auto-Pilot fields to tasks table
ALTER TABLE tasks
ADD COLUMN duration_estimate INTEGER DEFAULT 30, -- Default estimated duration in minutes
ADD COLUMN scheduled_start TIMESTAMPTZ,
ADD COLUMN scheduled_end TIMESTAMPTZ,
ADD COLUMN is_auto_scheduled BOOLEAN DEFAULT false;

-- Add an index to speed up AI scheduling queries (which will heavily filter on these new columns)
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_start ON tasks(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_tasks_is_auto_scheduled ON tasks(is_auto_scheduled);
