# PATCH 6 - Refresh Tokens Table Migration

## Overview
This SQL migration creates the `refresh_tokens` table needed for login token management. This is a **critical** migration required for the authentication system to function properly.

## SQL to Run in Supabase SQL Editor

Execute the following SQL in your Supabase dashboard (SQL Editor):

```sql
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token    ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id  ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires  ON refresh_tokens(expires_at)
  WHERE revoked_at IS NULL;
```

## What This Migration Does

1. **Creates `refresh_tokens` table** with:
   - `id`: UUID primary key (auto-generated)
   - `user_id`: Foreign key reference to users (cascade delete)
   - `token`: Unique refresh token string
   - `expires_at`: Token expiration timestamp
   - `revoked_at`: Optional revocation timestamp (NULL = active)
   - `created_at`: Creation timestamp (auto-set to now)

2. **Creates three indexes** for performance:
   - Token lookup (fast token validation)
   - User ID lookup (find all tokens for a user)
   - Expiration lookup (find expired tokens, only non-revoked)

## Status
- ✅ PATCH 1: crucialCases SELECT fields enhanced
- ✅ PATCH 2: crucialCases order changed to priority_score DESC
- ✅ PATCH 3: crucialCases limit confirmed at 8
- ✅ PATCH 4: analytics endpoint added to president.controller.js
- ✅ PATCH 5: analytics route registered in president.routes.js
- ⏳ PATCH 6: **Run SQL migration in Supabase** (manual step)

## Instructions
1. Go to Supabase Dashboard → Your Project
2. Click "SQL Editor" on the left sidebar
3. Click "New Query"
4. Paste the SQL above
5. Click "Run" (or press Ctrl+Enter)
6. Verify: Table should appear in "Authentication" schema
