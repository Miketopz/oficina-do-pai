
export type Client = {
    id: string;
    name: string;
    created_at?: string;
    phone?: string | null;
};

export type ClientWithFleet = Client & {
    vehicleCount: number;
    vehicles?: { count: number }[]; // For Supabase response mapping
};

export type Vehicle = {
    id: string;
    plate: string;
    model: string;
    client_id: string;
    client: Client;
    maintenance_records?: { count: number }[]; // For count queries
};

export type Service = {
    id: string;
    date: string;
    km: number;
    oil?: string | null;
    filter_oil?: string | null;
    filter_air?: string | null;
    filter_fuel?: string | null;
    filter_cabin?: string | null;
    notes?: string | null;
    vehicle: { id: string; plate: string; model: string };
    client: { id?: string; name: string };
    created_at?: string;
};

// DTO for Creating a new Service (Full Flow)
export type CreateServiceDTO = {
    clientName: string;
    clientPhone?: string;
    vehiclePlate: string;
    vehicleModel: string;
    date: string;
    km: number;
    oil?: string;
    filterOil?: string;
    filterAir?: string;
    filterFuel?: string;
    filterCabin?: string;
    notes?: string;
    preFilledClientId?: string | null;
};
