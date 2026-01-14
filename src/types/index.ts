
export type Client = {
    id: string;
    name: string;
    phone?: string;
};

export type ClientWithFleet = Client & {
    vehicleCount: number;
};

export type Vehicle = {
    id: string;
    plate: string;
    model: string;
    client: Client;
};

export type Service = {
    id: string;
    date: string;
    km: number;
    oil?: string;
    vehicle: {
        id: string;
        plate: string;
        model: string;
    };
    client: {
        id?: string;
        name: string;
    };
};
