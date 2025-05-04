-- connection-fix.sql - Run this in your Supabase SQL Editor

-- 1. Terminate idle connections that have been open too long
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE 
  datname = current_database() AND
  pid <> pg_backend_pid() AND
  state = 'idle' AND
  state_change < current_timestamp - INTERVAL '30 minutes';

-- 2. Count remaining connections for information
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE datname = current_database();

-- 3. Set the app.supabase_service_key parameter globally
-- Get this value from your .env file's SUPABASE_SERVICE_ROLE_KEY
ALTER DATABASE postgres SET app.supabase_service_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzY2lmY2xqZ2t6bHRueHJsemxwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTY5OTI1MywiZXhwIjoyMDYxMjc1MjUzfQ.xUpl7YXjVbZvu8geJA6UlVOk6bE2SuVYP29YWHmfjJg';

-- 4. Run the updated trigger function to use the fallback approach during connection limits
-- Note: The fallback code is already in launch_trigger.sql
\i './supabase/migrations/launch_trigger.sql'

-- 5. Create basic sample checklists for projects already in prep_launch status
-- This will create checklists for any projects that should have them but don't
INSERT INTO checklist_items (id, project_id, title, is_complete, order, created_at, updated_at)
SELECT 
    gen_random_uuid(), p.id, items.title, false, items.ord, now(), now()
FROM "Project" p
CROSS JOIN (
    VALUES 
        ('Define your MVP scope', 0),
        ('Create landing page', 1),
        ('Set up analytics', 2),
        ('Test on mobile devices', 3),
        ('Prepare launch announcement', 4)
) AS items(title, ord)
WHERE 
    p.status = 'prep_launch' AND
    NOT EXISTS (
        SELECT 1 FROM checklist_items ci WHERE ci.project_id = p.id
    ); 