CREATE TABLE public.task_status_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ra TEXT NOT NULL,
  task_count INTEGER NOT NULL DEFAULT 0,
  task_type TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.task_status_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public inserts on task_status_logs"
  ON public.task_status_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public reads on task_status_logs"
  ON public.task_status_logs
  FOR SELECT
  TO anon, authenticated
  USING (true);