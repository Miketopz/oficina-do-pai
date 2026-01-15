-- Enable the pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create indices for faster searching
CREATE INDEX IF NOT EXISTS vehicles_plate_trgm_idx ON vehicles USING gin (plate gin_trgm_ops);
CREATE INDEX IF NOT EXISTS clients_name_trgm_idx ON clients USING gin (name gin_trgm_ops);

-- Redefine the search function to be robust
DROP FUNCTION IF EXISTS search_maintenance(text);
CREATE OR REPLACE FUNCTION search_maintenance(search_query text)
RETURNS TABLE (
  id uuid,
  date timestamp with time zone,
  km integer,
  vehicle_id uuid,
  plate text,
  model text,
  client_id uuid,
  client_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mr.id,
    mr.date,
    mr.km,
    v.id as vehicle_id,
    v.plate,
    v.model,
    c.id as client_id,
    c.name as client_name
  FROM maintenance_records mr
  JOIN vehicles v ON mr.vehicle_id = v.id
  JOIN clients c ON v.client_id = c.id
  WHERE 
    -- Case insensitive search (and fuzzy if using trgm operators like %)
    v.plate ILIKE '%' || search_query || '%'
    OR c.name ILIKE '%' || search_query || '%'
  ORDER BY mr.date DESC;
END;
$$ LANGUAGE plpgsql;
