create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "Users see own roles" on public.user_roles for select to authenticated
using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- First user to sign up becomes admin
create or replace function public.handle_new_user_role()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end; $$;
create trigger on_auth_user_created_role after insert on auth.users
for each row execute function public.handle_new_user_role();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "Anyone reads categories" on public.categories for select to anon, authenticated using (true);
create policy "Admins manage categories" on public.categories for all to authenticated
using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null default '',
  price_cents integer not null check (price_cents >= 0),
  stock integer not null default 0 check (stock >= 0),
  image_url text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "Anyone reads active products" on public.products for select to anon, authenticated
using (active or public.has_role(auth.uid(), 'admin'));
create policy "Admins manage products" on public.products for all to authenticated
using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  status text not null default 'pending',
  total_cents integer not null,
  shipping_name text not null,
  shipping_address text not null,
  shipping_city text not null,
  shipping_postal text not null,
  created_at timestamptz not null default now()
);
grant select, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "Users read own orders" on public.orders for select to authenticated
using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Admins update orders" on public.orders for update to authenticated
using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price_cents integer not null,
  quantity integer not null check (quantity > 0)
);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "Read items of visible orders" on public.order_items for select to authenticated
using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))));

-- Atomic order placement: prices and stock are checked on the server
create or replace function public.place_order(_items jsonb, _name text, _address text, _city text, _postal text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _order_id uuid;
  _total integer := 0;
  _it jsonb;
  _p public.products%rowtype;
  _qty integer;
begin
  if _uid is null then raise exception 'Not signed in'; end if;
  if jsonb_array_length(_items) = 0 then raise exception 'Cart is empty'; end if;
  if coalesce(trim(_name),'') = '' or coalesce(trim(_address),'') = '' or coalesce(trim(_city),'') = '' or coalesce(trim(_postal),'') = '' then
    raise exception 'Shipping details are required';
  end if;

  insert into public.orders (user_id, total_cents, shipping_name, shipping_address, shipping_city, shipping_postal, status)
  values (_uid, 0, left(_name,200), left(_address,300), left(_city,100), left(_postal,20), 'paid')
  returning id into _order_id;

  for _it in select * from jsonb_array_elements(_items) loop
    _qty := (_it->>'quantity')::int;
    if _qty is null or _qty < 1 or _qty > 99 then raise exception 'Invalid quantity'; end if;
    select * into _p from public.products where id = (_it->>'product_id')::uuid and active for update;
    if not found then raise exception 'Product not available'; end if;
    if _p.stock < _qty then raise exception 'Not enough stock for %', _p.name; end if;
    update public.products set stock = stock - _qty where id = _p.id;
    insert into public.order_items (order_id, product_id, product_name, unit_price_cents, quantity)
    values (_order_id, _p.id, _p.name, _p.price_cents, _qty);
    _total := _total + _p.price_cents * _qty;
  end loop;

  update public.orders set total_cents = _total where id = _order_id;
  return _order_id;
end; $$;
revoke execute on function public.place_order(jsonb, text, text, text, text) from public, anon;
grant execute on function public.place_order(jsonb, text, text, text, text) to authenticated;

insert into public.categories (slug, name) values
  ('electronics','Electronics'), ('food','Food'), ('clothing','Clothing');

insert into public.products (slug, name, description, price_cents, stock, image_url, category_id) values
  ('wireless-headphones','Wireless Headphones','Over-ear, noise cancelling, 30-hour battery.',12900,25,'/products/headphones.jpg',(select id from categories where slug='electronics')),
  ('smart-watch','Smart Watch','Heart rate, GPS and a week of battery life.',19900,15,'/products/watch.jpg',(select id from categories where slug='electronics')),
  ('bluetooth-speaker','Bluetooth Speaker','Pocket-sized, waterproof, big sound.',5900,40,'/products/speaker.jpg',(select id from categories where slug='electronics')),
  ('artisan-coffee','Artisan Coffee Beans','Single-origin, medium roast, 500g.',1800,60,'/products/coffee.jpg',(select id from categories where slug='food')),
  ('dark-chocolate','Dark Chocolate Box','Twelve hand-made 70% cacao pieces.',2400,50,'/products/chocolate.jpg',(select id from categories where slug='food')),
  ('olive-oil','Extra Virgin Olive Oil','Cold-pressed, 750ml bottle.',2200,35,'/products/olive-oil.jpg',(select id from categories where slug='food')),
  ('denim-jacket','Denim Jacket','Classic fit, washed indigo.',8900,20,'/products/jacket.jpg',(select id from categories where slug='clothing')),
  ('cotton-tee','Organic Cotton Tee','Soft, heavyweight everyday t-shirt.',2900,80,'/products/tee.jpg',(select id from categories where slug='clothing')),
  ('wool-beanie','Wool Beanie','Ribbed merino knit, one size.',3400,45,'/products/beanie.jpg',(select id from categories where slug='clothing'));