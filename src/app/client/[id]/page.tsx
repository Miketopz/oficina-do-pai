'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Car, Plus, Trash2, User } from 'lucide-react';
import Link from 'next/link';

interface Client {
    id: string;
    name: string;
    phone: string | null;
}

interface Vehicle {
    id: string;
    plate: string;
    model: string;
}

export default function ClientProfilePage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const supabase = createClient();

    const [client, setClient] = useState<Client | null>(null);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setLoading(true);
        // Fetch Client
        const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .single();

        if (clientError) {
            console.error(clientError);
            alert('Erro ao carregar cliente.');
            router.push('/');
            return;
        }

        setClient(clientData);

        // Fetch Vehicles
        const { data: vehicleData } = await supabase
            .from('vehicles')
            .select('*')
            .eq('client_id', id)
            .order('model');

        if (vehicleData) {
            setVehicles(vehicleData);
        }

        setLoading(false);
    };

    const handleDeleteVehicle = async (vehicleId: string) => {
        if (!confirm('Tem certeza que deseja excluir este veículo? Todo o histórico de manutenção dele será apagado permanentemente.')) return;

        const { error } = await supabase
            .from('vehicles')
            .delete()
            .eq('id', vehicleId);

        if (error) {
            alert('Erro ao excluir veículo.');
            console.error(error);
        } else {
            loadData(); // Reload list
        }
    };

    const handleDeleteClient = async () => {
        if (!confirm('ATENÇÃO: Tem certeza que deseja excluir ESTE CLIENTE? \n\nIsso apagará TODOS os veículos e TODAS as manutenções vinculadas a ele.\n\nEsta ação não pode ser desfeita.')) return;

        // Verify cascading delete in DB or do manual delete?
        // Schema says: vehicle references client on delete cascade. So deleting client should wipe vehicles. 
        // Vehicle references maintenance on delete cascade. So wiping vehicle wipes maintenace.
        // It should be safe to just delete client.

        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Erro ao excluir cliente.');
            console.error(error);
        } else {
            alert('Cliente excluído com sucesso.');
            router.push('/');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-xl font-bold text-gray-500 animate-pulse">Carregando Perfil...</div>
            </div>
        );
    }

    if (!client) return null;

    return (
        <div className="min-h-screen bg-gray-50 p-4 pb-20">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header / Nav */}
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-800">Perfil do Cliente</h1>
                </div>

                {/* Client Info Card */}
                <Card className="border-l-4 border-l-blue-600 shadow-sm">
                    <CardHeader className="flex flex-row justify-between items-center bg-white">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                <User size={32} />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-bold">{client.name}</CardTitle>
                                {client.phone && <p className="text-gray-500 text-lg mt-1">{client.phone}</p>}
                            </div>
                        </div>
                        <Button variant="destructive" size="sm" onClick={handleDeleteClient}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir Cliente
                        </Button>
                    </CardHeader>
                </Card>

                {/* Fleet / Vehicles Section */}
                <div className="flex justify-between items-center mt-8">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Car className="h-6 w-6" />
                        Frota ({vehicles.length})
                    </h2>
                    <Link href={`/new?clientId=${client.id}`}>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="mr-2 h-5 w-5" />
                            Adicionar Carro
                        </Button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehicles.map((v) => (
                        <Card key={v.id} className="cursor-pointer hover:shadow-md transition-shadow">
                            <CardContent className="p-6 flex justify-between items-center">
                                <Link href={`/vehicle/${v.id}`} className="flex-1">
                                    <h3 className="text-2xl font-bold text-gray-900">{v.plate}</h3>
                                    <p className="text-gray-500 font-medium">{v.model}</p>
                                </Link>
                                <Button
                                    variant="ghost"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent navigation
                                        handleDeleteVehicle(v.id);
                                    }}
                                >
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}

                    {vehicles.length === 0 && (
                        <div className="col-span-full text-center py-10 bg-white rounded-lg border border-dashed border-gray-300">
                            <Car className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500">Nenhum veículo cadastrado para este cliente.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
