-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Clients Table
create table clients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text, -- stored as string, e.g. "(11) 99999-9999"
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Vehicles Table
create table vehicles (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete cascade not null,
  plate text not null unique, -- Mercosul pattern will be validated in UI
  model text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Maintenance Records Table
create table maintenance_records (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid references vehicles(id) on delete cascade not null,
  date timestamp with time zone default now(),
  km integer not null,
  
  -- Filter information (Text to allow Brand/Code, nullable if not changed)
  filter_oil text,
  filter_air text,
  filter_fuel text,
  filter_cabin text,
  
  notes text,
  created_by uuid references auth.users(id), -- Audit who created the record
  created_at timestamp with time zone default now()
);

-- RLS Policies
alter table clients enable row level security;
alter table vehicles enable row level security;
alter table maintenance_records enable row level security;

-- Policy: Allow authenticated users to view/insert/update all data
-- Since it's a small shop, any worker can see all data
create policy "Enable all access for authenticated users" on clients
  for all using (auth.role() = 'authenticated');

create policy "Enable all access for authenticated users" on vehicles
  for all using (auth.role() = 'authenticated');

create policy "Enable all access for authenticated users" on maintenance_records
  for all using (auth.role() = 'authenticated');
