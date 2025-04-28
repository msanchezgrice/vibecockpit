-- supabase/migrations/YYYYMMDDHHMMSS_launch_trigger.sql

-- Function to call the Edge Function
create or replace function generate_launch_checklist(project_id uuid, project_category text)
returns void
language plpgsql
security definer -- Allows function to call Edge Function with service_role key
-- Set configuration parameters if needed, e.g., for secrets
-- set search_path = public, extensions
AS $$
BEGIN
    -- Make a POST request to the Edge Function URL
    -- The Edge Function name must match exactly
    perform net.http_post(
        url:='{SUPABASE_URL}/functions/v1/launch-checklist', -- Replace {SUPABASE_URL} with your actual URL or use env var in config
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer {SUPABASE_SERVICE_ROLE_KEY}"}', -- Pass service key for auth
        body:=json_build_object(
            'project_id', project_id,
            'category', project_category -- Pass category for prompt context
        )::text
    );
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
        -- Call the function to generate the checklist
        -- Assuming project has a 'category' field or similar for context
        -- If not, pass a default category or modify the prompt
        perform generate_launch_checklist(new.id::uuid, 'SaaS'); -- Pass project ID and category
    end if;
    return new;
END;
$$;

-- Create the trigger on the Project table
drop trigger if exists on_project_status_prep_launch on "Project"; -- Drop existing first
create trigger on_project_status_prep_launch
    after insert or update of status -- Trigger on insert or status update
    on "Project"
    for each row
    execute function handle_project_status_change();

-- Grant execute permission on the net schema if needed (often needed for triggers)
-- grant usage on schema net to postgres, authenticated, service_role;
-- grant execute on function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) to postgres, authenticated, service_role; 