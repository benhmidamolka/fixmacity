-- ============================================================
-- Enable Row Level Security on PostGIS system table
-- ============================================================
-- The spatial_ref_sys table is a PostGIS system table (read-only).
-- Adding an explicit read-only policy makes the RLS configuration explicit.

ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_spatial_ref_sys" ON public.spatial_ref_sys FOR SELECT USING (true);