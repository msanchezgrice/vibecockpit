-- supabase/migrations/YYYYMMDDHHMMSS_launch_trigger.sql

-- Function to call the Edge Function
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
BEGIN
    -- Log the attempt to call the function
    RAISE NOTICE 'Attempting to generate checklist for project %', project_id;
    
    -- Make a POST request to the Edge Function URL
    -- Using net.http_post from pg_net extension
    SELECT
        status, content::json
    INTO 
        http_status, response
    FROM net.http_post(
        url:= 'https://zscifcljgkzltnxrlzlp.supabase.co/functions/v1/launch-checklist',
        body:= json_build_object(
            'project_id', project_id,
            'category', project_category
        )::jsonb,
        headers:= '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzY2lmY2xqZ2t6bHRueHJsemxwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTY5OTI1MywiZXhwIjoyMDYxMjc1MjUzfQ.xUpl7YXjVbZvu8geJA6UlVOk6bE2SuVYP29YWHmfjJg"}'::jsonb
    );
    
    -- Log the response
    RAISE NOTICE 'Launch checklist function response: status=%, body=%', http_status, response;
    
    -- Check response for potential errors
    IF http_status < 200 OR http_status >= 300 THEN
        RAISE WARNING 'Launch checklist API call failed: HTTP Status %', http_status;
    END IF;

    -- Fallback: Create basic checklist items directly if edge function fails
    IF http_status < 200 OR http_status >= 300 THEN
        RAISE NOTICE 'Creating fallback checklist items directly';
        -- Insert starter items
        INSERT INTO checklist_items (id, project_id, title, is_complete, order, created_at, updated_at)
        VALUES 
            (gen_random_uuid(), project_id, 'Define Minimum Lovable MVP', false, 0, now(), now()),
            (gen_random_uuid(), project_id, 'Set up /landing page', false, 1, now(), now()),
            (gen_random_uuid(), project_id, 'Add README badges', false, 2, now(), now()),
            (gen_random_uuid(), project_id, 'Push first deploy', false, 3, now(), now()),
            (gen_random_uuid(), project_id, 'Create social media plan', false, 4, now(), now());
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Log any exceptions
    RAISE WARNING 'Error calling launch checklist: %', SQLERRM;
    
    -- Fallback: Create basic checklist items directly in case of any exception
    BEGIN
        RAISE NOTICE 'Creating emergency fallback checklist items after exception';
        -- Insert starter items
        INSERT INTO checklist_items (id, project_id, title, is_complete, order, created_at, updated_at)
        VALUES 
            (gen_random_uuid(), project_id, 'Define Minimum Lovable MVP', false, 0, now(), now()),
            (gen_random_uuid(), project_id, 'Set up /landing page', false, 1, now(), now()),
            (gen_random_uuid(), project_id, 'Add README badges', false, 2, now(), now()),
            (gen_random_uuid(), project_id, 'Push first deploy', false, 3, now(), now()),
            (gen_random_uuid(), project_id, 'Create social media plan', false, 4, now(), now());
    EXCEPTION WHEN OTHERS THEN
        -- Log but don't re-throw
        RAISE WARNING 'Emergency fallback checklist creation also failed: %', SQLERRM;
    END;
END;
$$;

-- Trigger to call the function when project status changes to 'prep_launch'
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

-- Drop all existing triggers to ensure clean state
drop trigger if exists on_project_status_prep_launch on "Project";
drop trigger if exists on_project_status_prep_launch on "project";
drop trigger if exists on_project_status_prep_launch on projects;
drop trigger if exists on_project_status_prep_launch on checklist_items;

-- Create the trigger on the Project table - try both cases to ensure it works
create trigger on_project_status_prep_launch
    after insert or update of status -- Trigger on insert or status update
    on "Project"
    for each row
    execute function handle_project_status_change();

-- Also create a trigger on the lowercase version as a fallback
create trigger on_project_status_prep_launch_lowercase
    after insert or update of status
    on "project" 
    for each row
    execute function handle_project_status_change();

-- Grant required permissions to make network calls
grant usage on schema net to postgres, authenticated, service_role;
grant execute on function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) to postgres, authenticated, service_role; 