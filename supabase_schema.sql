-- ==============================================================================
-- Supabase Schema: Tracxn Disclaimer Cleaner
-- Run this in your Supabase Project -> SQL Editor
-- ==============================================================================

-- 1. Create table for tracking processed PDF records and QA certificates
CREATE TABLE IF NOT EXISTS public.tracxn_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    processed_filename TEXT,
    size BIGINT,
    formatted_size TEXT,
    page_count INT,
    raw_storage_path TEXT,
    cleaned_storage_path TEXT,
    status TEXT NOT NULL DEFAULT 'READY', -- READY, PROCESSING, SUCCESS, NO_MATCH, NEEDS_REVIEW, FAILED
    progress INT DEFAULT 0,
    pages_scanned INT DEFAULT 0,
    disclaimers_removed INT DEFAULT 0,
    disclaimers_found INT DEFAULT 0,
    needs_review_count INT DEFAULT 0,
    pages_with_disclaimer JSONB DEFAULT '[]'::jsonb,
    validation JSONB DEFAULT NULL,
    page_details JSONB DEFAULT '[]'::jsonb,
    error_message TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast status queries and ordered listing
CREATE INDEX IF NOT EXISTS idx_tracxn_files_created_at ON public.tracxn_files (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracxn_files_status ON public.tracxn_files (status);

-- 2. Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tracxn_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tracxn_files_updated_at ON public.tracxn_files;
CREATE TRIGGER trigger_tracxn_files_updated_at
    BEFORE UPDATE ON public.tracxn_files
    FOR EACH ROW
    EXECUTE FUNCTION update_tracxn_files_updated_at();

-- 3. Enable Row-Level Security (RLS)
ALTER TABLE public.tracxn_files ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access for session-based anonymous usage
-- (If using Supabase Auth later, you can restrict policies to auth.uid())
CREATE POLICY "Allow public read on tracxn_files"
    ON public.tracxn_files FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert on tracxn_files"
    ON public.tracxn_files FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public update on tracxn_files"
    ON public.tracxn_files FOR UPDATE
    USING (true);

CREATE POLICY "Allow public delete on tracxn_files"
    ON public.tracxn_files FOR DELETE
    USING (true);

-- 4. Enable Supabase Realtime for instant frontend updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.tracxn_files;

-- 5. Create Storage Buckets for raw and cleaned PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('raw-pdfs', 'raw-pdfs', true),
    ('cleaned-pdfs', 'cleaned-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: allow upload & read for raw-pdfs
CREATE POLICY "Public Access raw-pdfs" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'raw-pdfs');

CREATE POLICY "Public Upload raw-pdfs" 
    ON storage.objects FOR INSERT 
    WITH CHECK (bucket_id = 'raw-pdfs');

CREATE POLICY "Public Delete raw-pdfs" 
    ON storage.objects FOR DELETE 
    USING (bucket_id = 'raw-pdfs');

-- Storage policies: allow upload & read for cleaned-pdfs
CREATE POLICY "Public Access cleaned-pdfs" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'cleaned-pdfs');

CREATE POLICY "Public Upload cleaned-pdfs" 
    ON storage.objects FOR INSERT 
    WITH CHECK (bucket_id = 'cleaned-pdfs');

CREATE POLICY "Public Delete cleaned-pdfs" 
    ON storage.objects FOR DELETE 
    USING (bucket_id = 'cleaned-pdfs');
