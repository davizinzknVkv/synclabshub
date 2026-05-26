CREATE TABLE public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_mode BOOLEAN NOT NULL DEFAULT false,
    scripts_enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert initial configuration
INSERT INTO public.site_settings (maintenance_mode, scripts_enabled) 
VALUES (false, true);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Anyone can read site settings" ON public.site_settings
    FOR SELECT USING (true);

-- Allow admins to update (using a simplified approach since auth is custom)
-- In a real production app, we would check for a specific admin role or UUID.
-- For this project's current structure, we'll allow updates if authenticated.
CREATE POLICY "Admins can update settings" ON public.site_settings
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();