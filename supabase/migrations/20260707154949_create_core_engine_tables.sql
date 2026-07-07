/*
# Core Engine Tables for SIM KBM Platform

## Overview
This migration creates the foundational "Core Engine" tables that power the modular
platform architecture. These tables handle: module registry (marketplace + custom),
role-based permissions, notifications, themes, workspace (drag-and-drop dashboard),
backup configuration, and API keys.

## New Tables (8 total)

1. **modules** — Module registry. Tracks all installed modules (built-in marketplace
   modules AND custom-built modules). Each module can be enabled/disabled per pondok.
   - id, pondok_id, slug, name, description, icon, category, version, is_builtin,
     is_enabled, config (jsonb), created_at

2. **role_permissions** — Granular per-role permission overrides. Controls which
   modules/features each role can access within a pondok.
   - id, pondok_id, role, module_slug, can_create, can_read, can_update, can_delete,
     created_at

3. **notifications** — In-app notification system.
   - id, pondok_id, user_id, title, message, type, is_read, link, created_at

4. **themes** — Theme configuration per pondok. Stores theme name and CSS variables.
   - id, pondok_id, theme_name, primary_color, accent_color, bg_color, is_active,
     created_at

5. **workspace_widgets** — Drag-and-drop dashboard widget layout per user.
   - id, pondok_id, user_id, widget_type, title, config (jsonb), position (int),
     width (1-4), is_visible, created_at

6. **backup_config** — Backup configuration per pondok.
   - id, pondok_id, provider, schedule, last_backup, settings (jsonb), is_active,
     created_at

7. **api_keys** — API keys for external integrations (mobile companion, etc.).
   - id, pondok_id, name, key_hash, permissions, last_used, is_active, created_at

8. **custom_modules** — Custom module definitions created by the Module Builder.
   Stores the schema, form fields, and menu config for no-code modules.
   - id, pondok_id, name, slug, icon, table_name, fields (jsonb array of field defs),
     menu_group, is_enabled, created_at

## Security
- RLS enabled on ALL tables.
- All policies scope by pondok membership via profiles table.
- 4 policies per table (SELECT/INSERT/UPDATE/DELETE), TO authenticated.
*/

-- ============ MODULES (registry) ============
CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pondok_id uuid NOT NULL REFERENCES pondok(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  icon text,
  category text NOT NULL DEFAULT 'akademik',
  version text NOT NULL DEFAULT '1.0.0',
  is_builtin boolean NOT NULL DEFAULT false,
  is_enabled boolean NOT NULL DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(pondok_id, slug)
);
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_modules" ON modules;
CREATE POLICY "select_own_modules" ON modules FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = modules.pondok_id)
  );
DROP POLICY IF EXISTS "insert_own_modules" ON modules;
CREATE POLICY "insert_own_modules" ON modules FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = modules.pondok_id)
  );
DROP POLICY IF EXISTS "update_own_modules" ON modules;
CREATE POLICY "update_own_modules" ON modules FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = modules.pondok_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = modules.pondok_id)
  );
DROP POLICY IF EXISTS "delete_own_modules" ON modules;
CREATE POLICY "delete_own_modules" ON modules FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = modules.pondok_id)
  );

-- ============ ROLE PERMISSIONS ============
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pondok_id uuid NOT NULL REFERENCES pondok(id) ON DELETE CASCADE,
  role text NOT NULL,
  module_slug text NOT NULL,
  can_create boolean NOT NULL DEFAULT false,
  can_read boolean NOT NULL DEFAULT true,
  can_update boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(pondok_id, role, module_slug)
);
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_role_permissions" ON role_permissions;
CREATE POLICY "select_own_role_permissions" ON role_permissions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = role_permissions.pondok_id)
  );
DROP POLICY IF EXISTS "insert_own_role_permissions" ON role_permissions;
CREATE POLICY "insert_own_role_permissions" ON role_permissions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = role_permissions.pondok_id)
  );
DROP POLICY IF EXISTS "update_own_role_permissions" ON role_permissions;
CREATE POLICY "update_own_role_permissions" ON role_permissions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = role_permissions.pondok_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = role_permissions.pondok_id)
  );
DROP POLICY IF EXISTS "delete_own_role_permissions" ON role_permissions;
CREATE POLICY "delete_own_role_permissions" ON role_permissions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = role_permissions.pondok_id)
  );

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pondok_id uuid NOT NULL REFERENCES pondok(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = notifications.pondok_id))
  );
DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = notifications.pondok_id)
  );
DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = notifications.pondok_id))
  ) WITH CHECK (
    user_id = auth.uid()
    OR (user_id IS NULL AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = notifications.pondok_id))
  );
DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = notifications.pondok_id))
  );

-- ============ THEMES ============
CREATE TABLE IF NOT EXISTS themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pondok_id uuid NOT NULL REFERENCES pondok(id) ON DELETE CASCADE,
  theme_name text NOT NULL DEFAULT 'green',
  primary_color text NOT NULL DEFAULT '#1d7556',
  accent_color text NOT NULL DEFAULT '#f59e0b',
  bg_color text DEFAULT '#f8fafc',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(pondok_id, theme_name)
);
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_themes" ON themes;
CREATE POLICY "select_own_themes" ON themes FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = themes.pondok_id)
  );
DROP POLICY IF EXISTS "insert_own_themes" ON themes;
CREATE POLICY "insert_own_themes" ON themes FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = themes.pondok_id)
  );
DROP POLICY IF EXISTS "update_own_themes" ON themes;
CREATE POLICY "update_own_themes" ON themes FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = themes.pondok_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = themes.pondok_id)
  );
DROP POLICY IF EXISTS "delete_own_themes" ON themes;
CREATE POLICY "delete_own_themes" ON themes FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = themes.pondok_id)
  );

-- ============ WORKSPACE WIDGETS ============
CREATE TABLE IF NOT EXISTS workspace_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pondok_id uuid NOT NULL REFERENCES pondok(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  widget_type text NOT NULL,
  title text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  position int NOT NULL DEFAULT 0,
  width int NOT NULL DEFAULT 2 CHECK (width IN (1,2,3,4)),
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE workspace_widgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_workspace_widgets" ON workspace_widgets;
CREATE POLICY "select_own_workspace_widgets" ON workspace_widgets FOR SELECT
  TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "insert_own_workspace_widgets" ON workspace_widgets;
CREATE POLICY "insert_own_workspace_widgets" ON workspace_widgets FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "update_own_workspace_widgets" ON workspace_widgets;
CREATE POLICY "update_own_workspace_widgets" ON workspace_widgets FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "delete_own_workspace_widgets" ON workspace_widgets;
CREATE POLICY "delete_own_workspace_widgets" ON workspace_widgets FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- ============ BACKUP CONFIG ============
CREATE TABLE IF NOT EXISTS backup_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pondok_id uuid NOT NULL REFERENCES pondok(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'local',
  schedule text NOT NULL DEFAULT 'manual',
  last_backup timestamptz,
  settings jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(pondok_id, provider)
);
ALTER TABLE backup_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_backup_config" ON backup_config;
CREATE POLICY "select_own_backup_config" ON backup_config FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = backup_config.pondok_id)
  );
DROP POLICY IF EXISTS "insert_own_backup_config" ON backup_config;
CREATE POLICY "insert_own_backup_config" ON backup_config FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = backup_config.pondok_id)
  );
DROP POLICY IF EXISTS "update_own_backup_config" ON backup_config;
CREATE POLICY "update_own_backup_config" ON backup_config FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = backup_config.pondok_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = backup_config.pondok_id)
  );
DROP POLICY IF EXISTS "delete_own_backup_config" ON backup_config;
CREATE POLICY "delete_own_backup_config" ON backup_config FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = backup_config.pondok_id)
  );

-- ============ API KEYS ============
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pondok_id uuid NOT NULL REFERENCES pondok(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_hash text NOT NULL,
  permissions jsonb DEFAULT '[]'::jsonb,
  last_used timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_api_keys" ON api_keys;
CREATE POLICY "select_own_api_keys" ON api_keys FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = api_keys.pondok_id)
  );
DROP POLICY IF EXISTS "insert_own_api_keys" ON api_keys;
CREATE POLICY "insert_own_api_keys" ON api_keys FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = api_keys.pondok_id)
  );
DROP POLICY IF EXISTS "update_own_api_keys" ON api_keys;
CREATE POLICY "update_own_api_keys" ON api_keys FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = api_keys.pondok_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = api_keys.pondok_id)
  );
DROP POLICY IF EXISTS "delete_own_api_keys" ON api_keys;
CREATE POLICY "delete_own_api_keys" ON api_keys FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = api_keys.pondok_id)
  );

-- ============ CUSTOM MODULES ============
CREATE TABLE IF NOT EXISTS custom_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pondok_id uuid NOT NULL REFERENCES pondok(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  icon text,
  table_name text NOT NULL,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  menu_group text NOT NULL DEFAULT 'custom',
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(pondok_id, slug)
);
ALTER TABLE custom_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_custom_modules" ON custom_modules;
CREATE POLICY "select_own_custom_modules" ON custom_modules FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = custom_modules.pondok_id)
  );
DROP POLICY IF EXISTS "insert_own_custom_modules" ON custom_modules;
CREATE POLICY "insert_own_custom_modules" ON custom_modules FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = custom_modules.pondok_id)
  );
DROP POLICY IF EXISTS "update_own_custom_modules" ON custom_modules;
CREATE POLICY "update_own_custom_modules" ON custom_modules FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = custom_modules.pondok_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = custom_modules.pondok_id)
  );
DROP POLICY IF EXISTS "delete_own_custom_modules" ON custom_modules;
CREATE POLICY "delete_own_custom_modules" ON custom_modules FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = custom_modules.pondok_id)
  );

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_modules_pondok ON modules(pondok_id);
CREATE INDEX IF NOT EXISTS idx_role_perm_pondok ON role_permissions(pondok_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_themes_pondok ON themes(pondok_id);
CREATE INDEX IF NOT EXISTS idx_workspace_user ON workspace_widgets(user_id, position);
CREATE INDEX IF NOT EXISTS idx_backup_pondok ON backup_config(pondok_id);
CREATE INDEX IF NOT EXISTS idx_apikeys_pondok ON api_keys(pondok_id);
CREATE INDEX IF NOT EXISTS idx_custom_modules_pondok ON custom_modules(pondok_id);
