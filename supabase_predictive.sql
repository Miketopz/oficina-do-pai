-- Função de Inteligência Preditiva
-- Calcula a média de uso diário (QMD) e prevê a próxima troca
CREATE OR REPLACE FUNCTION get_predicted_maintenance()
RETURNS TABLE (
    vehicle_id UUID,
    plate VARCHAR,
    model VARCHAR,
    client_name VARCHAR,
    last_service_date DATE,
    last_km NUMERIC,
    avg_km_per_day NUMERIC,
    predicted_next_service DATE,
    confibility_score TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH LastTwoServices AS (
        -- Pega os 2 últimos serviços de cada carro
        SELECT 
            m.vehicle_id,
            m.date,
            m.km,
            LEAD(m.date) OVER (PARTITION BY m.vehicle_id ORDER BY m.date DESC) as prev_date,
            LEAD(m.km) OVER (PARTITION BY m.vehicle_id ORDER BY m.date DESC) as prev_km
        FROM maintenance_records m
    ),
    UsageStats AS (
        -- Calcula QMD apenas se tivermos 2 registros
        SELECT 
            lts.vehicle_id,
            lts.date as last_date,
            lts.km as last_km,
            (lts.date - lts.prev_date) as days_diff,
            (lts.km - lts.prev_km) as km_diff
        FROM LastTwoServices lts
        WHERE lts.prev_date IS NOT NULL 
          AND (lts.date - lts.prev_date) > 0 -- Evita divisão por zero
    )
    SELECT 
        v.id as vehicle_id,
        v.plate,
        v.model,
        c.name as client_name,
        us.last_date,
        us.last_km,
        ROUND((us.km_diff / us.days_diff)::numeric, 2) as avg_km_per_day,
        -- Previsão: Data da Última + ( (10000km Restantes) / QMD )
        (us.last_date + ((10000 / (us.km_diff / us.days_diff))::int || ' days')::interval)::date as predicted_next_service,
        CASE 
            WHEN (us.km_diff / us.days_diff) > 0 THEN 'HIGH'
            ELSE 'LOW' 
        END as confibility_score
    FROM UsageStats us
    JOIN vehicles v ON us.vehicle_id = v.id
    JOIN clients c ON v.client_id = c.id
    WHERE 
        -- Retorna apenas se a previsão for para os próximos 45 dias
        (us.last_date + ((10000 / (us.km_diff / us.days_diff))::int || ' days')::interval)::date <= (CURRENT_DATE + INTERVAL '45 days')
    ORDER BY predicted_next_service ASC;
END;
$$ LANGUAGE plpgsql;
