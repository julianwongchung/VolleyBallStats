alter table public.matches add column if not exists video_url text;
notify pgrst, 'reload schema';
