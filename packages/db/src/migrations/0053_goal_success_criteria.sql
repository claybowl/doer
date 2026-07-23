-- Add success_criteria column to goals table
ALTER TABLE goals ADD COLUMN IF NOT EXISTS success_criteria text;
