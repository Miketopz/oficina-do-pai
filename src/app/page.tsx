'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Calendar, User, Car } from 'lucide-react';

// Mock types for now
type RecentService = {
    id: string;
    vehicle: { plate: string; model: string };
    client: { name: string };
    date: string;
    km: number;
};

export default function Dashboard() {
    const [query, setQuery] = useState('');
    const [recentServices, setRecentServices] = useState<RecentService[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        fetchRecentServices();
    }, []);

    const fetchRecentServices = async () => {
        try {
            const { data, error } = await supabase
                .from('maintenance_records')
                .select(`
          id,
          date,
          km,
          vehicle:vehicles (
            plate,
            model,
            client:clients (name)
          )
        `)
                .order('date', { ascending: false })
                .limit(5);

            if (data) {
                // Transformations to flatten structure if needed, depends on actual return
                // For now trusting the relationship query structure
                const formatted = data.map((item: any) => ({
                    id: item.id,
                    date: item.date,
                    km: item.km,
                    vehicle: {
                        plate: item.vehicle?.plate || '---',
                        model: item.vehicle?.model || 'Desconhecido'
                    },
                    client: {
                        name: item.vehicle?.client?.name || 'Cliente N/A'
                    },
                }));
                setRecentServices(formatted);
            }
        } catch (error) {
            console.error('Error fetching services', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, this would route to a search results page or filter a list
        console.log('Searching for:', query);
        // For now, simpler implementation: just log
        alert(`Busca por "${query}" ainda não implementada neste demo. Mas o layout está pronto!`);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <main className="container mx-auto px-4 py-8">
                {/* Search Section */}
                <section className="mb-8">
                    <div className="max-w-2xl mx-auto text-center space-y-4">
                        <h1 className="text-3xl font-bold text-gray-900">Buscar Veículo</h1>
                        <Card>
                            <CardContent className="p-4">
                                <form onSubmit={handleSearch} className="flex gap-2">
                                    <Input
                                        placeholder="Digite a PLACA ou NOME do cliente..."
                                        className="text-lg"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                    />
                                    <Button type="submit" size="lg">
                                        <Search className="h-5 w-5" />
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* Action Buttons (Mobile Friendly) */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-w-2xl mx-auto">
                    <Link href="/new">
                        <Button className="w-full h-16 text-lg" variant="default">
                            <Plus className="mr-2 h-6 w-6" /> Nova Troca
                        </Button>
                    </Link>
                    {/* Add more shortcuts if needed */}
                </section>

                {/* Recent Activity */}
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Últimas Trocas Realizadas</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {loading ? (
                            <p className="text-gray-500">Carregando...</p>
                        ) : recentServices.length === 0 ? (
                            <p className="text-gray-500 col-span-full text-center py-8">Nenhum registro encontrado.</p>
                        ) : (
                            recentServices.map((service) => (
                                <Card key={service.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-5">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="bg-primary-50 text-primary-700 px-2 py-1 rounded font-mono font-bold">
                                                {service.vehicle.plate}
                                            </div>
                                            <span className="text-sm text-gray-500 flex items-center">
                                                <Calendar className="h-3 w-3 mr-1" />
                                                {new Date(service.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-medium text-gray-900 flex items-center">
                                                <Car className="h-4 w-4 mr-2 text-gray-400" />
                                                {service.vehicle.model}
                                            </p>
                                            <p className="text-gray-600 flex items-center">
                                                <User className="h-4 w-4 mr-2 text-gray-400" />
                                                {service.client.name}
                                            </p>
                                            <p className="text-sm text-gray-500 mt-2">
                                                KM: {service.km.toLocaleString()}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
