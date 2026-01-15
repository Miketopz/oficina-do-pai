
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
            client_id: v.client?.id, // Added client_id
            client: {
                id: v.client?.id,
                name: v.client?.name
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
    },

    /**
     * Creates a new maintenance record, handling all dependencies:
     * 1. Resolves Client (Find by Phone -> Find by Name -> Create New)
     * 2. Resolves Vehicle (Find by Plate -> Check Ownership -> Create New)
     * 3. Inserts Maintenance Record
     * 
     * @param data DTO containing service, vehicle, and client information
     * @returns The created record ID
     */
    async createMaintenanceRecord(data: import('@/types').CreateServiceDTO): Promise<void> {
        const supabase = createClient();

        // 1. Resolve Vehicle FIRST (Check ownership)
        let vehicleId: string;
        let existingOwnerId: string | null = null;

        const { data: existingVehicle } = await supabase
            .from('vehicles')
            .select('id, client_id, clients(name)')
            .eq('plate', data.vehiclePlate)
            .maybeSingle();

        if (existingVehicle) {
            vehicleId = existingVehicle.id;
            existingOwnerId = existingVehicle.client_id;
        }

        // 2. Resolve Client
        let clientId = data.preFilledClientId || existingOwnerId;

        if (!clientId) {
            const finalPhone = data.clientPhone ? data.clientPhone.trim() : null;
            const finalName = data.clientName.trim();

            // 2.1 Try by PHONE (Unique ID)
            if (finalPhone) {
                const { data: phoneMatch } = await supabase
                    .from('clients')
                    .select('id')
                    .eq('phone', finalPhone)
                    .maybeSingle();

                if (phoneMatch) clientId = phoneMatch.id;
            }

            // 2.2 Try by NAME (if no phone provided)
            if (!clientId && !finalPhone) {
                const { data: nameMatch } = await supabase
                    .from('clients')
                    .select('id')
                    .ilike('name', finalName)
                    .maybeSingle();

                if (nameMatch) clientId = nameMatch.id;
            }

            // 2.3 Create NEW CLIENT
            if (!clientId) {
                const { data: newClient, error } = await supabase
                    .from('clients')
                    .insert({ name: finalName, phone: finalPhone })
                    .select()
                    .single();

                if (error) throw error;
                clientId = newClient.id;
            }
        }

        // 3. Final Safety Check & Vehicle Creation
        if (existingVehicle) {
            // Safety Block: If we resolved a clientId different from vehicle owner
            if (existingOwnerId && clientId !== existingOwnerId) {
                // @ts-ignore
                const ownerName = existingVehicle.clients?.name || 'Outro Cliente';
                throw new Error(`Esta placa já pertence a ${ownerName}. Impossível registrar para outra pessoa.`);
            }
            vehicleId = existingVehicle.id; // Assign here
        } else {
            // Create New Vehicle
            const { data: newVehicle, error } = await supabase
                .from('vehicles')
                .insert({ client_id: clientId, plate: data.vehiclePlate, model: data.vehicleModel })
                .select()
                .single();

            if (error) throw error;
            vehicleId = newVehicle.id;
        }

        // 4. Create Record
        const { error: recordError } = await supabase.from('maintenance_records').insert({
            vehicle_id: vehicleId,
            date: data.date,
            km: data.km,
            oil: data.oil,
            filter_oil: data.filterOil,
            filter_air: data.filterAir,
            filter_fuel: data.filterFuel,
            filter_cabin: data.filterCabin,
            notes: data.notes
        });

        if (recordError) throw recordError;
    }
};
