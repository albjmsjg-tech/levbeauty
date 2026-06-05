-- 020: Add UNIQUE constraint on subscriptions.owner_id
-- Required for the webhook upsert (onConflict: "owner_id") to work correctly.
-- Without this, PostgreSQL rejects INSERT ... ON CONFLICT (owner_id) silently.

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_owner_id_key UNIQUE (owner_id);
