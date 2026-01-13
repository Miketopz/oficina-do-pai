'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, User, Car, Wrench } from 'lucide-react';

// Validation Schema
const formSchema = z.object({
    // Client
    clientName: z.string().min(3, "Nome do cliente é obrigatório"),
    clientPhone: z.string().optional(),

    // Vehicle
    vehiclePlate: z.string().min(5, "Placa deve ter pelo menos 5 caracteres").regex(/^[A-Za-z0-9]+$/, "Apenas letras e números"),
    vehicleModel: z.string().min(2, "Modelo do veículo é obrigatório"),

    // Service
    date: z.string(), // YYYY-MM-DD
    km: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().positive("KM deve ser positivo")),
    filterOil: z.string().optional(),
    filterAir: z.string().optional(),
    filterFuel: z.string().optional(),
    filterCabin: z.string().optional(),
    notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function NewServicePage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [generalError, setGeneralError] = useState<string | null>(null);

    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(formSchema),
    });

    const onSubmit = async (data: FormData) => {
        setLoading(true);
        setGeneralError(null);

        try {
            // 1. Create or Get Client
            // Ideally we check if client exists, but for now we just create a new one for this transaction
            // In a real app, we'd search first. Here we assume we might create duplicates for simplicity of the prompt "Cadastro"
            const { data: clientData, error: clientError } = await supabase
                .from('clients')
                .insert({ name: data.clientName, phone: data.clientPhone })
                .select()
                .single();

            if (clientError) throw new Error(`Erro ao salvar cliente: ${clientError.message}`);

            // 2. Create or Get Vehicle
            // We explicitly check for existing plate to avoid duplicates
            let vehicleId;
            const { data: existingVehicle } = await supabase
                .from('vehicles')
                .select('id')
                .eq('plate', data.vehiclePlate.toUpperCase())
                .single();

            if (existingVehicle) {
                vehicleId = existingVehicle.id;
            } else {
                const { data: newVehicle, error: vehicleError } = await supabase
                    .from('vehicles')
                    .insert({
                        client_id: clientData.id,
                        plate: data.vehiclePlate.toUpperCase(),
                        model: data.vehicleModel
                    })
                    .select()
                    .single();

                if (vehicleError) throw new Error(`Erro ao salvar veículo: ${vehicleError.message}`);
                vehicleId = newVehicle.id;
            }

            // 3. Create Maintenance Record
            const { error: recordError } = await supabase
                .from('maintenance_records')
                .insert({
                    vehicle_id: vehicleId,
                    date: data.date, // Add date here
                    km: data.km,
                    filter_oil: data.filterOil,
                    filter_air: data.filterAir,
                    filter_fuel: data.filterFuel,
                    filter_cabin: data.filterCabin,
                    notes: data.notes
                });

            if (recordError) throw new Error(`Erro ao salvar serviço: ${recordError.message}`);

            // Success!
            alert('Serviço registrado com sucesso!');
            router.push('/');
            router.refresh();

        } catch (err: any) {
            console.error(err);
            setGeneralError(err.message || 'Ocorreu um erro ao salvar.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <Header />

            <main className="container mx-auto px-4 py-8 max-w-2xl">
                <h1 className="text-2xl font-bold mb-6 text-gray-800">Nova Ordem de Serviço</h1>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                    {/* Cliente */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <User className="h-5 w-5 text-primary-600" />
                                Dados do Cliente
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Nome do Cliente</label>
                                <Input {...register('clientName')} placeholder="Ex: João da Silva" />
                                {errors.clientName && <p className="text-sm text-red-500">{errors.clientName.message}</p>}
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Telefone / WhatsApp</label>
                                <Input {...register('clientPhone')} placeholder="(XX) 9XXXX-XXXX" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Veículo */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Car className="h-5 w-5 text-primary-600" />
                                Dados do Veículo
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Placa</label>
                                    <Input {...register('vehiclePlate')} placeholder="ABC1234" className="uppercase" />
                                    {errors.vehiclePlate && <p className="text-sm text-red-500">{errors.vehiclePlate.message}</p>}
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Modelo</label>
                                    <Input {...register('vehicleModel')} placeholder="Ex: Fiat Uno" />
                                    {errors.vehicleModel && <p className="text-sm text-red-500">{errors.vehicleModel.message}</p>}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Filters & Service */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Wrench className="h-5 w-5 text-primary-600" />
                                Troca e Filtros
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Data do Serviço</label>
                                    <Input type="date" {...register('date')} defaultValue={new Date().toISOString().split('T')[0]} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Quilometragem Atual (KM)</label>
                                    <Input type="number" {...register('km')} placeholder="Ex: 50000" />
                                    {errors.km && <p className="text-sm text-red-500">{errors.km.message}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="text-sm font-medium mb-1 block text-gray-600">Filtro de Óleo (Cód/Marca)</label>
                                    <Input {...register('filterOil')} placeholder="Opcional" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block text-gray-600">Filtro de Ar (Cód/Marca)</label>
                                    <Input {...register('filterAir')} placeholder="Opcional" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block text-gray-600">Filtro de Combustível</label>
                                    <Input {...register('filterFuel')} placeholder="Opcional" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block text-gray-600">Filtro de Cabine (Ar Cond.)</label>
                                    <Input {...register('filterCabin')} placeholder="Opcional" />
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="text-sm font-medium mb-1 block text-gray-600">Observações Extras</label>
                                <Input {...register('notes')} placeholder="Ex: Trocado também o óleo 5w30..." />
                            </div>
                        </CardContent>
                    </Card>

                    {generalError && (
                        <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
                            {generalError}
                        </div>
                    )}

                    <Button type="submit" size="lg" className="w-full text-lg h-14" disabled={loading}>
                        <Save className="mr-2 h-5 w-5" />
                        {loading ? 'Salvando...' : 'Salvar Registro'}
                    </Button>

                </form>
            </main>
        </div>
    );
}
