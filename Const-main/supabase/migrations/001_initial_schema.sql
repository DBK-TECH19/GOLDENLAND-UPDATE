create extension if not exists pgcrypto;

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  icon text not null default 'fa-briefcase',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'commercial',
  title text not null,
  description text not null default '',
  location text not null default '',
  badge text not null default '',
  image_url text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  rating integer not null default 5 check (rating between 1 and 5),
  text text not null,
  author text not null,
  role text not null default '',
  avatar_text text not null default 'GL',
  avatar_color text not null default '#0b2b5c',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null check (kind in ('image', 'video', 'file')),
  file_path text not null unique,
  public_url text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  service text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'replied', 'resolved')),
  replied_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.submission_replies (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.contact_submissions(id) on delete cascade,
  admin_email text not null,
  subject text not null,
  message text not null,
  brevo_message_id text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.analytics_visits (
  id uuid primary key default gen_random_uuid(),
  visit_date date not null,
  ip_hash text not null,
  page_path text not null default '/',
  referrer text not null default 'direct',
  title text,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (visit_date, ip_hash)
);

create table if not exists public.analytics_clicks (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  page_path text not null default '/',
  event_type text not null default 'click',
  target text not null default 'unknown',
  created_at timestamptz not null default timezone('utc', now())
);

insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do nothing;

drop policy if exists "Public can view site media" on storage.objects;
create policy "Public can view site media"
on storage.objects
for select
to public
using (bucket_id = 'site-media');

drop policy if exists "Service role can manage site media" on storage.objects;
create policy "Service role can manage site media"
on storage.objects
for all
to service_role
using (bucket_id = 'site-media')
with check (bucket_id = 'site-media');
