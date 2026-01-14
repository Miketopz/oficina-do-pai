'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { VehicleCard } from '@/components/VehicleCard';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Calendar, User, Car, Wrench, Edit, Trash2, ArrowRight } from 'lucide-react';

// Types
type Service = {
    id: string;
    vehicle: { id: string; plate: string; model: string };
    client: { id?: string; name: string };
    date: string;
    km: number;
    oil?: string;
};

type Vehicle = {
    id: string;
    plate: string;
    model: string;
    client: { id: string; name: string };
};

export default function Dashboard() {
    const supabase = createClient();
    const router = useRouter();

    const [recentServices, setRecentServices] = useState<Service[]>([]);
    const [fleet, setFleet] = useState<Vehicle[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        // 1. Fetch Recent Services
        const { data: services } = await supabase
            .from('maintenance_records')
            .select(`
                id, date, km, oil,
                vehicle:vehicles (id, plate, model, client:clients(id, name))
            `)
            .order('date', { ascending: false })
            .limit(20);

        if (services) {
            // @ts-ignore
            const formatted = services.map((s: any) => ({
                id: s.id,
                date: s.date,
                km: s.km,
                oil: s.oil,
                vehicle: s.vehicle,
                client: s.vehicle.client
            }));

            // Deduplicate: Keep only the FIRST occurrence (Latest date) for each vehicle
            const uniqueServices: Service[] = [];
            const seenVehicles = new Set();
            for (const s of formatted) {
                if (!seenVehicles.has(s.vehicle.id)) {
                    seenVehicles.add(s.vehicle.id);
                    uniqueServices.push(s);
                }
            }
            setRecentServices(uniqueServices);
        }

        // 2. Fetch Fleet (All Vehicles)
        const { data: vehicles } = await supabase
            .from('vehicles')
            .select(`id, plate, model, client:clients(id, name)`)
            .order('model');

        if (vehicles) {
            // @ts-ignore
            setFleet(vehicles);
        }
        setLoading(false);
    };

    // Filter Logic
    const filteredServices = recentServices.filter(s =>
        s.vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.client.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredFleet = fleet.filter(v =>
        v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.client.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // -- Sub-Components --

    // Imported from @/components/VehicleCard

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            <Header />

            <main className="container mx-auto px-4 py-8">

                {/* Top Bar: Search & New Actions */}
                <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between items-center">
                    <div className="relative w-full md:w-1/2">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                        <Input
                            placeholder="Buscar PLACA ou CLIENTE..."
                            className="pl-10 h-14 text-lg bg-card border-border focus:ring-primary"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Link href="/new" className="w-full md:w-auto">
                        <Button className="w-full h-14 text-xl font-bold uppercase tracking-wider bg-primary hover:bg-blue-600 shadow-xl shadow-blue-900/20">
                            <Plus className="mr-2 h-6 w-6" /> Nova Troca
                        </Button>
                    </Link>
                </div>

                <Tabs defaultValue="activities" className="space-y-6">
                    <TabsList className="bg-card border border-border h-16 p-2 rounded-xl">
                        <TabsTrigger value="activities" className="flex-1 h-full text-lg font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white">
                            Atividades Recentes
                        </TabsTrigger>
                        <TabsTrigger value="fleet" className="flex-1 h-full text-lg font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white">
                            Clientes ({fleet.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* TAB 1: ACTIVITIES */}
                    <TabsContent value="activities">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredServices.map(service => (
                                <VehicleCard
                                    key={service.id}
                                    title={service.client.name} /* Now uses Client Name as Title (Big) */
                                    plate={service.vehicle.plate}
                                    link={`/vehicle/${service.vehicle.id}`}
                                    detail={new Date(service.date).toLocaleDateString()}
                                    subtitle={
                                        <div className="mt-2 text-muted-foreground">
                                            <p className="flex items-center gap-2 text-sm font-bold opacity-80 uppercase tracking-wide">
                                                <Car size={16} /> {service.vehicle.model}
                                            </p>
                                            <p className="text-sm font-mono text-orange-500 font-bold mt-1">
                                                KM: {service.km}
                                            </p>
                                        </div>
                                    }
                                />
                            ))}
                            {filteredServices.length === 0 && <p className="text-center text-muted-foreground py-10 text-xl">Nenhuma atividade encontrada.</p>}
                        </div>
                    </TabsContent>

                    {/* TAB 2: CLIENTS/FLEET */}
                    <TabsContent value="fleet">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredFleet.map(vehicle => (
                                <VehicleCard
                                    key={vehicle.id}
                                    title={vehicle.client.name} /* Client Name Big */
                                    plate={vehicle.plate}
                                    link={`/vehicle/${vehicle.id}`}
                                    detail="CLIENTE"
                                    subtitle={
                                        <div className="mt-2 text-muted-foreground">
                                            <p className="flex items-center gap-2 text-sm font-bold opacity-80 uppercase tracking-wide">
                                                <Car size={16} /> Veículo
                                            </p>
                                            <p className="text-xl font-bold text-gray-100">
                                                {vehicle.model}
                                            </p>
                                        </div>
                                    }
                                    actionIcon={<Trash2 size={20} />}
                                    onAction={async () => {
                                        if (confirm(`Excluir ${vehicle.model} (${vehicle.plate})?`)) {
                                            await supabase.from('vehicles').delete().eq('id', vehicle.id);
                                            fetchData(); // Reload
                                        }
                                    }}
                                />
                            ))}
                            {filteredFleet.length === 0 && <p className="text-center text-muted-foreground py-10 text-xl">Nenhum veículo encontrado.</p>}
                        </div>
                    </TabsContent>
                </Tabs>

            </main>
        </div>
    );
}
