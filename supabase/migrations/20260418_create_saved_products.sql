-- saved_products: per-user shopping list entries
create table if not exists public.saved_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists saved_products_user_id_idx
  on public.saved_products(user_id);

-- RLS
alter table public.saved_products enable row level security;

create policy "Users can read their own saves"
  on public.saved_products for select
  using (auth.uid() = user_id);

create policy "Users can insert their own saves"
  on public.saved_products for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own saves"
  on public.saved_products for delete
  using (auth.uid() = user_id);
