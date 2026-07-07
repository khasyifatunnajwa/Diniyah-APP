-- Add config jsonb column to pondok for storage selection and notification settings
ALTER TABLE public.pondok
ADD COLUMN IF NOT EXISTS config jsonb DEFAULT '{}'::jsonb;
