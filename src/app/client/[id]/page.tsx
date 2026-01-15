'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Use navigation for App Router
import { createClient } from '@/lib/supabase';
import { Header } from '@/components/features/Header';
import { VehicleCard } from '@/components/features/VehicleCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, User, Phone, Car, ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatPlate } from '@/lib/utils';
import { maintenanceService } from '@/services/maintenanceService';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ClientProfilePage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const supabase = createClient();
    const [client, setClient] = useState<any>(null);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // New Vehicle Form State
    const [newPlate, setNewPlate] = useState('');
    const [newModel, setNewModel] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [addingVehicle, setAddingVehicle] = useState(false);

    useEffect(() => {
        fetchData();
    }, [params.id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Client
            const { data: clientData, error: clientError } = await supabase
                .from('clients')
                .select('*')
                .eq('id', params.id)
                .single();

            if (clientError) throw clientError;
            setClient(clientData);

            // Fetch Vehicles
            const { data: vehicleData, error: vehicleError } = await supabase
                .from('vehicles')
                .select('*')
                .eq('client_id', params.id)
                .order('model');

            if (vehicleError) throw vehicleError;
            setVehicles(vehicleData || []);

        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar dados do cliente.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddVehicle = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddingVehicle(true);
        try {
            // 1. Check if plate exists globally
            const { data: existing } = await supabase
                .from('vehicles')
                .select('id, client_id, clients(name)')
                .eq('plate', newPlate)
                .maybeSingle();

            if (existing) {
                if (existing.client_id !== params.id) {
                    // @ts-ignore
                    toast.error(`Placa já pertence a ${existing.clients?.name}.`);
                    return;
                } else {
                    toast.info("Veículo já está cadastrado para este cliente.");
                    setIsDialogOpen(false);
                    return;
                }
            }

            // 2. Insert new vehicle linked to THIS client
            const { error } = await supabase.from('vehicles').insert({
                client_id: params.id,
                plate: newPlate,
                model: newModel
            });

            if (error) throw error;

            toast.success("Veículo adicionado!", {
                description: `${newModel} (${newPlate}) agora faz parte da frota.`,
                icon: <CheckCircle2 className="h-5 w-5 text-green-500" />
            });
            setNewPlate('');
            setNewModel('');
            setIsDialogOpen(false);
            fetchData(); // Reload list

        } catch (error) {
            console.error(error);
            toast.error("Erro ao adicionar veículo.");
        } finally {
            setAddingVehicle(false);
        }
    };

    const handleDeleteVehicle = async (vehicleId: string, model: string) => {
        if (confirm(`Remover ${model} da frota do cliente?`)) {
            try {
                // Using service to handle constraints if any (though currently it's a simple delete)
                await maintenanceService.deleteVehicle(vehicleId);
                toast.success("Veículo removido.", {
                    description: `O ${model} foi retirado da lista.`,
                    icon: <Trash2 className="h-5 w-5 text-red-500" />
                });
                fetchData();
            } catch (error) {
                toast.error("Erro ao remover veículo.");
            }
        }
    };

    const handleDeleteClient = async () => {
        if (confirm(`ATENÇÃO: Deseja realmente excluir o cliente ${client.name}? Isso apagará todos os seus veículos e históricos permanentemente.`)) {
            try {
                const { error } = await supabase.from('clients').delete().eq('id', params.id);
                if (error) throw error;
                toast.success("Cliente removido com sucesso.");
                router.push('/');
                router.refresh();
            } catch (error) {
                console.error(error);
                toast.error("Erro ao excluir cliente.");
            }
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando perfil...</div>;
    if (!client) return <div className="min-h-screen flex items-center justify-center">Cliente não encontrado.</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Header />

            <main className="container mx-auto px-4 py-8">
                {/* Back Button */}
                <Button variant="ghost" className="mb-6 pl-0 hover:bg-transparent" onClick={() => router.push('/')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Dashboard
                </Button>

                {/* HEADER PROFILE */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <User size={40} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">{client.name}</h1>
                            <div className="flex items-center gap-2 text-lg text-gray-500 mt-1 font-medium">
                                <Phone size={18} />
                                {client.phone || 'Sem telefone'}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 w-full md:w-auto">
                        <Button variant="destructive" size="sm" onClick={handleDeleteClient} className="opacity-70 hover:opacity-100 w-full md:w-auto">
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir Perfil
                        </Button>

                        {/* ADD VEHICLE DIALOG */}
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="h-14 px-8 text-lg font-bold uppercase bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/20 rounded-xl">
                                    <Plus className="mr-2" /> Novo Carro
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Adicionar Veículo para {client.name.split(' ')[0]}</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleAddVehicle} className="space-y-4 pt-4">
                                    <div>
                                        <label className="text-sm font-bold uppercase text-gray-500">Placa</label>
                                        <Input
                                            value={newPlate}
                                            onChange={e => setNewPlate(formatPlate(e.target.value))}
                                            placeholder="ABC1234"
                                            maxLength={7}
                                            className="text-2xl font-mono uppercase text-slate-900 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold uppercase text-gray-500">Modelo</label>
                                        <Input
                                            value={newModel}
                                            onChange={e => setNewModel(e.target.value)}
                                            placeholder="Ex: Fiat Uno"
                                            className="text-lg text-slate-900 bg-white"
                                        />
                                    </div>
                                    <Button type="submit" disabled={addingVehicle} className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700">
                                        {addingVehicle ? 'Salvando...' : 'Adicionar Veículo'}
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* FLEET LIST */}
                <h2 className="text-xl font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Car className="text-gray-300" /> Frota do Cliente ({vehicles.length})
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {vehicles.map(vehicle => (
                        <div key={vehicle.id} className="relative group">
                            <VehicleCard
                                title={vehicle.model}
                                plate={vehicle.plate}
                                link={`/vehicle/${vehicle.id}`} // Takes to history page
                                detail="VER HISTÓRICO"
                                subtitle={
                                    <div className="mt-2 text-sm text-gray-400 font-mono">
                                        Cadastrado em {new Date().getFullYear()}
                                    </div>
                                }
                                status="ok"
                                actionIcon={<Trash2 size={18} />}
                                onAction={() => handleDeleteVehicle(vehicle.id, vehicle.model)}
                            />
                        </div>
                    ))}

                    {vehicles.length === 0 && (
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
                            <p className="text-gray-400 text-lg">Este cliente ainda não possui veículos cadastrados.</p>
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
}
