'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CheckCircle2, User, Car, Wrench, ArrowRight } from 'lucide-react';
import { cn, formatPhone, formatPlate } from '@/lib/utils';
import { toast } from 'sonner';

// Validation Schema
const formSchema = z.object({
    clientName: z.string().min(3, "Nome deve ter pelo menos 3 letras"),
    clientPhone: z.string().optional(),
    vehiclePlate: z.string().min(5, "Placa deve ter pelo menos 5 caracteres").regex(/^[A-Za-z0-9]+$/, "Apenas letras e números"),
    vehicleModel: z.string().min(2, "Modelo do veículo é obrigatório"),
    date: z.string(), // YYYY-MM-DD
    km: z.union([z.string(), z.number()]).transform((val) => Number(val)).pipe(z.number().positive("KM deve ser positivo")),
    oil: z.string().optional(),
    filterOil: z.string().optional(),
    filterAir: z.string().optional(),
    filterFuel: z.string().optional(),
    filterCabin: z.string().optional(),
    notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

function NewServiceForm() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const searchParams = useSearchParams();
    const [currentStep, setCurrentStep] = useState(1);
    const preFilledClientId = searchParams.get('clientId');

    const { register, handleSubmit, trigger, setValue, formState: { errors }, watch } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            date: new Date().toISOString().split('T')[0]
        }
    });

    useEffect(() => {
        if (preFilledClientId) {
            console.log('Pre-filling client:', preFilledClientId);
            supabase.from('clients').select('*').eq('id', preFilledClientId).single().then(({ data }) => {
                if (data) {
                    setValue('clientName', data.name);
                    if (data.phone) setValue('clientPhone', data.phone);
                }
            });
        }
    }, [preFilledClientId, setValue, supabase]);

    // --- MASK HANDLERS ---
    const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPlate(e.target.value);
        setValue('vehiclePlate', formatted);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhone(e.target.value);
        setValue('clientPhone', formatted);
    };

    const handlePlateBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const plate = e.target.value.toUpperCase();
        if (plate.length < 5) return;

        console.log('Checking plate:', plate);
        const { data: vehicleData } = await supabase
            .from('vehicles')
            .select(`
                model,
                client:clients (name, phone)
            `)
            .eq('plate', plate)
            .maybeSingle();

        if (vehicleData) {
            toast.info("Veículo encontrado! Dados carregados.");
            setValue('vehicleModel', vehicleData.model);
            if (vehicleData.client) {
                // @ts-ignore
                setValue('clientName', vehicleData.client.name);
                // @ts-ignore
                setValue('clientPhone', vehicleData.client.phone || '');
            }
        }
    };

    const watchedData = watch();

    const nextStep = async () => {
        let isValid = false;
        if (currentStep === 1) {
            isValid = await trigger(['clientName', 'vehiclePlate', 'vehicleModel']);
        } else if (currentStep === 2) {
            isValid = await trigger(['km']);
        }

        if (isValid) {
            setCurrentStep(prev => prev + 1);
            window.scrollTo(0, 0);
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => prev - 1);
        window.scrollTo(0, 0);
    };

    const onSubmit = async (data: FormData) => {
        setLoading(true);

        try {
            // 1. Resolve Client (Robust Deduplication)
            let clientId;
            const finalPhone = data.clientPhone ? data.clientPhone.trim() : null;
            const finalName = data.clientName.trim();

            // A. Search by PHONE
            if (finalPhone) {
                const { data: phoneMatch } = await supabase.from('clients').select('id').eq('phone', finalPhone).maybeSingle();
                if (phoneMatch) {
                    console.log('Cliente encontrado por telefone');
                    clientId = phoneMatch.id;
                }
            }

            // B. Search by NAME (if no phone match)
            if (!clientId) {
                const { data: nameMatch } = await supabase.from('clients').select('id').ilike('name', finalName).maybeSingle();
                if (nameMatch) {
                    console.log('Cliente encontrado por nome');
                    clientId = nameMatch.id;
                }
            }

            // C. Create NEW
            if (!clientId) {
                console.log('Criando novo cliente');
                const { data: newClient, error } = await supabase.from('clients').insert({ name: finalName, phone: finalPhone }).select().single();
                if (error) throw error;
                clientId = newClient.id;
            }

            // 2. Resolve Vehicle
            let vehicleId;
            const { data: existingVehicle } = await supabase.from('vehicles').select('id').eq('plate', data.vehiclePlate).maybeSingle();

            if (existingVehicle) {
                // BUSCA SE O CLIENTE DIGITADO JÁ EXISTE (pelo telefone ou nome)
                // (Already resolved above as clientId)

                // TRAVA DE SEGURANÇA:
                // Check if we have a clientId (resolved from form) and if it matches the vehicle's owner
                if (clientId) {
                    // We need to fetch the existing vehicle's owner to compare
                    const { data: currentOwnerCheck } = await supabase
                        .from('vehicles')
                        .select('client_id, clients(name)')
                        .eq('id', existingVehicle.id)
                        .single();

                    if (currentOwnerCheck && currentOwnerCheck.client_id !== clientId) {
                        // @ts-ignore
                        const ownerName = currentOwnerCheck.clients?.name || 'Outro Cliente';
                        toast.error(`Esta placa já pertence ao cliente ${ownerName}. Não é possível registrar para outra pessoa.`);
                        setLoading(false);
                        return; // ABORT
                    }
                }

                vehicleId = existingVehicle.id;
                // REMOVED: await supabase.from('vehicles').update({ client_id: clientId }).eq('id', vehicleId);
            } else {
                const { data: newVehicle, error } = await supabase.from('vehicles').insert({ client_id: clientId, plate: data.vehiclePlate, model: data.vehicleModel }).select().single();
                if (error) throw error;
                vehicleId = newVehicle.id;
            }

            // 3. Create Record
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

            // Success Feedback
            toast.success("Serviço registrado com sucesso! 🚀");
            router.push('/');
            router.refresh();

        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Erro ao salvar.');
        } finally {
            setLoading(false);
        }
    };

    // UI Rendering
    const StepIndicator = ({ step, title }: { step: number, title: string }) => (
        <div className={`flex items-center gap-2 p-3 rounded-lg border-2 ${currentStep === step ? 'border-primary-600 bg-primary-50 text-primary-800' : 'border-gray-200 text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${currentStep === step ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step}
            </div>
            <span className="font-bold uppercase tracking-wide hidden md:inline">{title}</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-12">

            <main className="container mx-auto px-4 py-8 max-w-2xl">
                {/* Progress Bar */}
                <div className="flex justify-between items-center mb-8 gap-2">
                    <StepIndicator step={1} title="Identif." />
                    <div className="h-1 flex-1 bg-gray-200 mx-2" />
                    <StepIndicator step={2} title="Serviço" />
                    <div className="h-1 flex-1 bg-gray-200 mx-2" />
                    <StepIndicator step={3} title="Resumo" />
                </div>

                <form className="space-y-6">

                    {currentStep === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right fade-in duration-300">
                            <Card className="border-2 border-blue-100 shadow-md">
                                <CardHeader className="bg-blue-50/50 pb-2">
                                    <CardTitle className="text-xl flex items-center gap-2 text-blue-800">
                                        <Car className="h-6 w-6" /> Veículo
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4">
                                    <div>
                                        <label className="text-lg font-bold text-gray-700 mb-2 block uppercase">Placa do Carro</label>
                                        <Input
                                            {...register('vehiclePlate')}
                                            onChange={(e) => {
                                                handlePlateChange(e);
                                                register('vehiclePlate').onChange(e);
                                            }}
                                            onBlur={(e) => {
                                                handlePlateBlur(e);
                                                register('vehiclePlate').onBlur(e);
                                            }}
                                            placeholder="ABC1234"
                                            maxLength={7}
                                            className="h-16 text-3xl font-mono uppercase tracking-widest border-2 border-gray-300 focus:border-blue-500"
                                        />
                                        {errors.vehiclePlate && <p className="text-red-600 font-bold mt-1 text-lg">{errors.vehiclePlate.message}</p>}
                                    </div>
                                    <div>
                                        <Input {...register('vehicleModel')} placeholder="Modelo (Ex: Gol)" className="h-14 text-xl border-2 border-gray-300" />
                                        {errors.vehicleModel && <p className="text-red-600">{errors.vehicleModel.message}</p>}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-2 border-gray-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xl flex items-center gap-2 text-gray-700"><User /> Dono</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Input {...register('clientName')} className="h-14 text-xl" placeholder="Nome Completo" />
                                    {errors.clientName && <p className="text-red-600">{errors.clientName.message}</p>}
                                    <Input
                                        {...register('clientPhone')}
                                        onChange={(e) => {
                                            handlePhoneChange(e);
                                            register('clientPhone').onChange(e);
                                        }}
                                        className="h-14 text-xl"
                                        maxLength={15}
                                        placeholder="Telefone (11) 99999-9999"
                                    />
                                </CardContent>
                            </Card>

                            <Button onClick={nextStep} type="button" className="w-full h-20 text-2xl font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-700">
                                Próximo <ArrowRight className="ml-2" />
                            </Button>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right fade-in duration-300">
                            <Card className="border-2 border-yellow-100 shadow-md">
                                <CardHeader className="bg-yellow-50/50 pb-2"><CardTitle className="text-yellow-800"><Wrench /> Troca de Óleo</CardTitle></CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <Input type="number" {...register('km')} className="h-16 text-3xl" placeholder="KM Atual" />
                                    {errors.km && <p className="text-red-600">{errors.km.message}</p>}

                                    <label className="font-bold">🛢️ Óleo Utilizado</label>
                                    <Input {...register('oil')} className="h-14 text-xl bg-yellow-50" placeholder="Ex: 5W30 Shell" />
                                    <Input type="date" {...register('date')} className="h-12" />
                                </CardContent>
                            </Card>

                            {/* Filter Inputs (Simplified) */}
                            <div className="grid grid-cols-1 gap-2">
                                <Input {...register('filterOil')} placeholder="Filtro de Óleo" className="h-12" />
                                <Input {...register('filterAir')} placeholder="Filtro de Ar" className="h-12" />
                                <Input {...register('filterFuel')} placeholder="Filtro de Combustível" className="h-12" />
                                <Input {...register('filterCabin')} placeholder="Filtro de Cabine" className="h-12" />
                                <Input {...register('notes')} placeholder="Observações" className="h-12" />
                            </div>

                            <div className="flex gap-4">
                                <Button onClick={prevStep} variant="outline" className="flex-1 h-16">Voltar</Button>
                                <Button onClick={nextStep} className="flex-[2] h-16 bg-blue-600 text-xl font-bold">Revisar</Button>
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <Card className="border-2 border-green-500 bg-green-50">
                                <CardContent className="p-6 text-center space-y-4">
                                    <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
                                    <h2 className="text-3xl font-bold">Confirmar?</h2>
                                    <div className="bg-white p-4 rounded text-left shadow">
                                        <p><strong>Veículo:</strong> {watchedData.vehiclePlate} - {watchedData.vehicleModel}</p>
                                        <p><strong>Cliente:</strong> {watchedData.clientName}</p>
                                        <p><strong>Óleo:</strong> {watchedData.oil}</p>
                                    </div>

                                </CardContent>
                            </Card>
                            <div className="flex gap-4">
                                <Button onClick={prevStep} variant="outline" className="flex-1 h-20">Voltar</Button>
                                <Button onClick={handleSubmit(onSubmit)} disabled={loading} className="flex-[2] h-20 bg-green-600 text-2xl font-black hover:bg-green-700">
                                    {loading ? 'SALVANDO...' : 'CONFIRMAR'}
                                </Button>
                            </div>
                        </div>
                    )}

                </form>
            </main>
        </div>
    );
}

export default function NewServicePage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen font-bold text-xl text-gray-500">Carregando formulário...</div>}>
            <NewServiceForm />
        </Suspense>
    );
}
