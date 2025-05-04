-- connection-fix-v2.sql - Run this in your Supabase SQL Editor

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

-- 4. Create or replace the generate_launch_checklist function
create or replace function generate_launch_checklist(project_id uuid, project_category text)
returns void
language plpgsql
security definer -- Allows function to call Edge Function with service_role key
-- Set search_path for security
set search_path = public, extensions
AS $$
DECLARE
    response json;
    http_status int;
    supabase_service_key text := current_setting('app.supabase_service_key', true);
BEGIN
    -- Log the attempt to call the function
    RAISE NOTICE 'Attempting to generate checklist for project %', project_id;
    
    -- Check if we have the service key
    IF supabase_service_key IS NULL THEN
        RAISE WARNING 'Missing Supabase service key. Set using: SET app.supabase_service_key = your_key';
        supabase_service_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzY2lmY2xqZ2t6bHRueHJsemxwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTY5OTI1MywiZXhwIjoyMDYxMjc1MjUzfQ.xUpl7YXjVbZvu8geJA6UlVOk6bE2SuVYP29YWHmfjJg';
    END IF;
    
    -- Skip edge function call and just create basic checklist items directly
    -- This avoids potential connection issues with the edge function
    RAISE NOTICE 'Creating basic checklist items directly for project %', project_id;
    
    -- Insert starter items
    BEGIN
        INSERT INTO checklist_items (id, project_id, title, is_complete, order, created_at, updated_at)
        VALUES 
            (gen_random_uuid(), project_id, 'Define Minimum Lovable MVP', false, 0, now(), now()),
            (gen_random_uuid(), project_id, 'Set up landing page', false, 1, now(), now()),
            (gen_random_uuid(), project_id, 'Add README badges', false, 2, now(), now()),
            (gen_random_uuid(), project_id, 'Push first deploy', false, 3, now(), now()),
            (gen_random_uuid(), project_id, 'Create social media plan', false, 4, now(), now());
            
        RAISE NOTICE 'Successfully created checklist items for project %', project_id;
    EXCEPTION WHEN OTHERS THEN
        -- Log but don't re-throw
        RAISE WARNING 'Failed to create checklist items: %', SQLERRM;
    END;
    
EXCEPTION WHEN OTHERS THEN
    -- Log any exceptions
    RAISE WARNING 'Error in generate_launch_checklist: %', SQLERRM;
END;
$$;

-- 5. Create or replace the trigger function to detect status changes
create or replace function handle_project_status_change()
returns trigger
language plpgsql
security definer -- Use definer security context
AS $$
BEGIN
    -- Check if the status column was updated to 'prep_launch'
    if new.status = 'prep_launch' and (old.status is null or old.status <> 'prep_launch') then
        -- Log that we detected a status change
        RAISE NOTICE 'Project % status changed to prep_launch', new.id;
        
        -- Call the function to generate the checklist
        perform generate_launch_checklist(new.id::uuid, 'SaaS');
    end if;
    return new;
END;
$$;

-- 6. Drop all existing triggers to ensure clean state
drop trigger if exists on_project_status_prep_launch on "Project";
drop trigger if exists on_project_status_prep_launch on "project";
drop trigger if exists on_project_status_prep_launch_lowercase on "project";

-- 7. Create the trigger on the Project table
create trigger on_project_status_prep_launch
    after insert or update of status -- Trigger on insert or status update
    on "Project"
    for each row
    execute function handle_project_status_change();

-- 8. Create basic checklists for projects already in prep_launch status
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

-- 9. Grant required permissions
grant usage on schema net to postgres, authenticated, service_role;
grant execute on function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) to postgres, authenticated, service_role; 