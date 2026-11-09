-- Mshasha Zwinepe initial schema.
-- RLS is enabled with no policies: only the backend (service role key) can access these tables.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table public.portfolio (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  category_name text not null,
  title text not null,
  description text not null,
  images jsonb not null default '[]'::jsonb,
  videos jsonb not null default '[]'::jsonb,
  youtube_urls jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index portfolio_category_id_idx on public.portfolio (category_id);

create table public.home_portfolio (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  description text not null,
  image text not null,
  gallery_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null default '',
  service text not null default '',
  message text not null,
  status text not null default 'unread' check (status in ('read', 'unread')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.categories enable row level security;
alter table public.portfolio enable row level security;
alter table public.home_portfolio enable row level security;
alter table public.contacts enable row level security;
alter table public.settings enable row level security;
