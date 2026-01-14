-- Função para buscar registros por placa ou nome do cliente
-- Includes client_id to maintain profile links in the UI

create or replace function search_maintenance(search_query text)
returns table (
  id uuid,
  date timestamp with time zone,
  km integer,
  vehicle_id uuid,
  plate text,
  model text,
  client_id uuid,
  client_name text
) as $$
begin
  return query
  select 
    mr.id,
    mr.date,
    mr.km,
    v.id as vehicle_id,
    v.plate,
    v.model,
    c.id as client_id,
    c.name as client_name
  from maintenance_records mr
  join vehicles v on mr.vehicle_id = v.id
  join clients c on v.client_id = c.id
  where v.plate ilike '%' || search_query || '%'
     or c.name ilike '%' || search_query || '%'
  order by mr.date desc;
end;
$$ language plpgsql;
