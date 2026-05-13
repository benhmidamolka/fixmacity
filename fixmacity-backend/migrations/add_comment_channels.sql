-- Migration: Add 'channel' column to internal_comments for tiered communication
-- Run this in Supabase SQL Editor

-- Add the channel column with default 'president_chef' for backward compatibility
ALTER TABLE internal_comments
  ADD COLUMN IF NOT EXISTS channel VARCHAR(30) NOT NULL DEFAULT 'president_chef';

-- Add a check constraint to ensure valid channel values
ALTER TABLE internal_comments
  DROP CONSTRAINT IF EXISTS internal_comments_channel_check;

ALTER TABLE internal_comments
  ADD CONSTRAINT internal_comments_channel_check
  CHECK (channel IN ('president_chef', 'chef_agent', 'agent_citizen'));

-- Create an index for fast channel-based filtering
CREATE INDEX IF NOT EXISTS idx_internal_comments_channel
  ON internal_comments(declaration_id, channel);

-- Update existing comments to default channel (president_chef)
UPDATE internal_comments
  SET channel = 'president_chef'
  WHERE channel IS NULL;
