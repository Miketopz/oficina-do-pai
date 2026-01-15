'use client';

import Link from 'next/link';
import { Header } from '@/components/features/Header';
import { VehicleCard } from '@/components/features/VehicleCard';
import { ClientCard } from '@/components/features/ClientCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { StatCard } from '@/components/ui/stat-card';
import { getServiceStatus } from '@/lib/utils';
import { Search, Plus, Car, Trash2, Activity, Droplet } from 'lucide-react';
import { useMaintenanceDashboard } from '@/hooks/useMaintenanceDashboard';
import { maintenanceService } from '@/services/maintenanceService';

export default function Dashboard() {
    const {
        recentServices,
        filteredClients,
        stats,
        searchTerm,
        setSearchTerm,
        handleSearch,
        notFoundPlate,
        setNotFoundPlate,
        reloadFleet
    } = useMaintenanceDashboard();

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            <Header />

            {/* Custom Alert Logic */}
            <Dialog open={!!notFoundPlate} onOpenChange={(open: boolean) => !open && setNotFoundPlate(null)}>
                <DialogContent>
                    <div className="flex flex-col items-center justify-center p-4 text-center space-y-4">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                            <Search className="w-8 h-8 text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-bold">Placa Não Encontrada</h2>
                        <p className="text-muted-foreground text-lg">
                            O veículo <span className="font-mono font-bold text-foreground bg-secondary px-2 py-1 rounded">{notFoundPlate}</span> ainda não tem cadastro.
                        </p>
                        <p className="text-muted-foreground">Deseja iniciar um novo serviço para ele agora?</p>

                        <div className="flex gap-4 w-full mt-4">
                            <Button variant="outline" className="flex-1 h-12 text-lg" onClick={() => setNotFoundPlate(null)}>
                                Cancelar
                            </Button>
                            <Link href={`/new?plate=${notFoundPlate}`} className="flex-1">
                                <Button className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700">
                                    Cadastrar
                                </Button>
                            </Link>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <main className="container mx-auto px-4 py-8">

                {/* Top Bar: Search & New Actions */}
                <div className="flex flex-col md:flex-row gap-4 mb-8 justify-center items-center">
                    <form onSubmit={handleSearch} className="relative w-full max-w-4xl">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-6 w-6" />
                        <Input
                            placeholder="DIGITE A PLACA (Ex: ABC1234) ou NOME..."
                            className="pl-12 h-16 text-2xl bg-card border-2 border-border focus:ring-4 focus:ring-primary/20 shadow-lg"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground hidden md:block border px-2 py-1 rounded bg-secondary">
                            ENTER
                        </div>
                    </form>
                </div>

                {/* ANALYTICS SECTION */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        title="Trocas (30 dias)"
                        value={stats.monthly}
                        icon={Activity}
                        description="Manutenções recentes"
                    />
                    <StatCard
                        title="Óleo + Usado"
                        value={stats.topOil}
                        icon={Droplet}
                        description="Preferência da oficina"
                    />
                </div>

                <Tabs defaultValue="activities" className="space-y-6">
                    <TabsList className="bg-card border border-border h-16 p-2 rounded-xl">
                        <TabsTrigger value="activities" className="flex-1 h-full text-lg font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white">
                            Atividades
                        </TabsTrigger>
                        <TabsTrigger value="fleet" className="flex-1 h-full text-lg font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white">
                            Clientes ({filteredClients.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* TAB 1: ACTIVITIES (RPC Search Results) */}
                    <TabsContent value="activities">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {recentServices.map(service => (
                                <VehicleCard
                                    key={service.id}
                                    title={service.client.name}
                                    plate={service.vehicle.plate}
                                    link={`/vehicle/${service.vehicle.id}`}
                                    detail={new Date(service.date).toLocaleDateString()}
                                    status={getServiceStatus(service.date, service.km)} // Pass status
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
                            {recentServices.length === 0 && <p className="text-center text-muted-foreground py-10 text-xl">Nenhuma atividade encontrada.</p>}
                        </div>
                    </TabsContent>

                    {/* TAB 2: CLIENTS/FLEET (Client-Side Filter) */}
                    <TabsContent value="fleet">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredClients.map(client => (
                                <ClientCard
                                    key={client.id}
                                    id={client.id}
                                    name={client.name}
                                    phone={client.phone}
                                    vehicleCount={client.vehicleCount}
                                />
                            ))}
                            {filteredClients.length === 0 && <p className="text-center text-muted-foreground py-10 text-xl">Nenhum cliente encontrado.</p>}
                        </div>
                    </TabsContent>
                </Tabs>

            </main>
        </div>
    );
}
