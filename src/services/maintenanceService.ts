
import { createClient } from '@/lib/supabase';
import { Service, Vehicle, ClientWithFleet } from '@/types';

// Helper to deduplicate services (Business Logic)
const deduplicateServices = (services: Service[]) => {
    const uniqueServices: Service[] = [];
    const seenVehicles = new Set();
    for (const s of services) {
        if (!seenVehicles.has(s.vehicle.id)) {
            seenVehicles.add(s.vehicle.id);
            uniqueServices.push(s);
        }
    }
    return uniqueServices;
};

export const maintenanceService = {
    async getRecentServices(): Promise<Service[]> {
        const supabase = createClient();
        const { data: services, error } = await supabase
            .from('maintenance_records')
            .select(`
                id, date, km, oil,
                vehicle:vehicles!inner (id, plate, model, client:clients!inner(id, name))
            `)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error('Error fetching services:', error);
            throw error;
        }

        if (!services) return [];

        const formatted: Service[] = services.map((s: any) => ({
            id: s.id,
            date: s.date,
            km: s.km,
            oil: s.oil,
            vehicle: {
                id: s.vehicle.id,
                plate: s.vehicle.plate,
                model: s.vehicle.model
            },
            client: {
                id: s.vehicle.client.id,
                name: s.vehicle.client.name
            }
        }));

        return deduplicateServices(formatted);
    },

    async getClientsWithFleet(): Promise<ClientWithFleet[]> {
        const supabase = createClient();
        const { data: clients, error } = await supabase
            .from('clients')
            .select(`
                id, name, phone,
                vehicles (count)
            `)
            .order('name');

        if (error) {
            console.error('Error fetching clients:', error);
            throw error;
        }

        return clients.map((c: any) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            vehicleCount: c.vehicles ? c.vehicles[0].count : 0
        }));
    },

    async getFleet(): Promise<Vehicle[]> {
        const supabase = createClient();
        const { data: vehicles, error } = await supabase
            .from('vehicles')
            .select(`id, plate, model, client:clients!inner(id, name)`)
            .order('model');

        if (error) {
            console.error('Error fetching fleet:', error);
            throw error;
        }

        if (!vehicles) return [];

        return vehicles.map((v: any) => ({
            id: v.id,
            plate: v.plate,
            model: v.model,
            client: {
                id: v.client.id,
                name: v.client.name
            }
        }));
    },

    async getVehicleByPlate(plate: string): Promise<string | null> {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('vehicles')
            .select('id')
            .eq('plate', plate.toUpperCase())
            .maybeSingle();

        if (error) {
            console.error(error);
            return null;
        }
        return data ? data.id : null;
    },

    async search(query: string): Promise<Service[]> {
        const supabase = createClient();
        const { data, error } = await supabase
            .rpc('search_maintenance', { search_query: query });

        if (error) throw error;

        if (!data) return [];

        return data.map((item: any) => ({
            id: item.id,
            date: item.date,
            km: item.km,
            oil: null,
            vehicle: {
                id: item.vehicle_id,
                plate: item.plate,
                model: item.model
            },
            client: {
                id: item.client_id,
                name: item.client_name
            },
        }));
    },

    async deleteVehicle(id: string) {
        const supabase = createClient();
        const { error } = await supabase.from('vehicles').delete().eq('id', id);
        if (error) throw error;
    }
};
