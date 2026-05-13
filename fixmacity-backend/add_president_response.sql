-- add_president_response.sql
ALTER TABLE propositions ADD COLUMN IF NOT EXISTS president_response TEXT;
