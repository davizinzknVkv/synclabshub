
DROP POLICY IF EXISTS "Allow public inserts on task_status_logs" ON public.task_status_logs;
DROP POLICY IF EXISTS "Allow public reads on task_status_logs" ON public.task_status_logs;

DROP POLICY IF EXISTS "Admins can update settings" ON public.site_settings;
