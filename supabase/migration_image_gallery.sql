alter table public.works
  add column if not exists image_gallery text[] not null default '{}';
