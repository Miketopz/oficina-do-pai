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

const FilterInput = ({ label, name, register }: any) => {
    return (
        <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">{label}</label>
            <Input
                {...register(name)}
                placeholder="Ex: W610/3 (ou deixe vazio)"
                className="h-12 text-lg text-slate-900 bg-white border-2 border-slate-200 focus:border-blue-500"
            />
        </div>
    );
};

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

        // Auto-fill Plate & Model from URL
        const preFilledPlate = searchParams.get('plate');
        const preFilledModel = searchParams.get('model');

        if (preFilledPlate) {
            setValue('vehiclePlate', formatPlate(preFilledPlate));
        }
        if (preFilledModel) {
            setValue('vehicleModel', preFilledModel);
        }

        // AUTO-SKIP: If we have Client + Plate, jump to Step 2
        if (preFilledClientId && preFilledPlate) {
            toast.info("Dados do veículo carregados!", { icon: '🚗' });
            setCurrentStep(2);
        }
    }, [preFilledClientId, searchParams, setValue, supabase]);

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

        const { data: vehicleData } = await supabase
            .from('vehicles')
            .select(`model, client_id, client:clients (name, phone)`)
            .eq('plate', plate)
            .maybeSingle();

        if (vehicleData) {
            // Se já temos um cliente pré-selecionado (vimos do perfil dele) e a placa é de OUTRO
            if (preFilledClientId && vehicleData.client_id !== preFilledClientId) {
                // @ts-ignore
                toast.error(`Atenção! Esta placa pertence ao cliente ${vehicleData.client?.name}.`);
                setValue('vehiclePlate', ''); // Limpa para evitar erro
                return;
            }

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
            // 1. Resolve Vehicle FIRST (Check ownership)
            let vehicleId;
            let existingOwnerId = null;

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
            // --- NOVA LÓGICA DE RESOLUÇÃO DE CLIENTE ---
            let clientId = preFilledClientId || existingOwnerId;

            if (!clientId) {
                const finalPhone = data.clientPhone ? data.clientPhone.trim() : null;
                const finalName = data.clientName.trim();

                // 1. Tentar primeiro pelo TELEFONE (Identificador Único)
                if (finalPhone) {
                    const { data: phoneMatch } = await supabase
                        .from('clients')
                        .select('id')
                        .eq('phone', finalPhone)
                        .maybeSingle();

                    if (phoneMatch) {
                        clientId = phoneMatch.id;
                    }
                    // Se forneceu telefone e não achou, NÃO vamos procurar por nome.
                    // Isso garante que "João Carlos" com telefone NOVO seja um NOVO cliente.
                }

                // 2. Se NÃO forneceu telefone, tentamos pelo NOME
                if (!clientId && !finalPhone) {
                    const { data: nameMatch } = await supabase
                        .from('clients')
                        .select('id')
                        .ilike('name', finalName)
                        .maybeSingle();

                    if (nameMatch) {
                        clientId = nameMatch.id;
                    }
                }

                // 3. Se ainda não temos ID, criamos um NOVO CLIENTE
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
                    toast.error(`Esta placa já pertence a ${ownerName}. Impossível registrar para outra pessoa.`);
                    setLoading(false);
                    return;
                }
            } else {
                // Create New Vehicle
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
                                            className="h-16 text-3xl font-mono uppercase tracking-widest border-2 border-gray-300 focus:border-blue-500 text-slate-900 bg-white"
                                        />
                                        {errors.vehiclePlate && <p className="text-red-600 font-bold mt-1 text-lg">{errors.vehiclePlate.message}</p>}
                                    </div>
                                    <div>
                                        <Input {...register('vehicleModel')} placeholder="Modelo (Ex: Gol)" className="h-14 text-xl border-2 border-gray-300 text-slate-900 bg-white" />
                                        {errors.vehicleModel && <p className="text-red-600">{errors.vehicleModel.message}</p>}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-2 border-gray-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xl flex items-center gap-2 text-gray-700"><User /> Dono</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Input {...register('clientName')} className="h-14 text-xl text-slate-900 bg-white" placeholder="Nome Completo" />
                                    {errors.clientName && <p className="text-red-600">{errors.clientName.message}</p>}
                                    <Input
                                        {...register('clientPhone')}
                                        onChange={(e) => {
                                            handlePhoneChange(e);
                                            register('clientPhone').onChange(e);
                                        }}
                                        className="h-14 text-xl text-slate-900 bg-white"
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
                                    <Input type="number" {...register('km')} className="h-16 text-3xl text-slate-900 bg-white" placeholder="KM Atual" />
                                    {errors.km && <p className="text-red-600">{errors.km.message}</p>}

                                    <label className="font-bold">🛢️ Óleo Utilizado</label>
                                    <Input {...register('oil')} className="h-14 text-xl bg-white text-slate-900" placeholder="Ex: 5W30 Shell" />
                                    <Input type="date" {...register('date')} className="h-12 text-slate-900 bg-white" />
                                </CardContent>
                            </Card>

                            {/* Filter Inputs (Enhanced with Keep Option) */}
                            <div className="grid grid-cols-1 gap-4">
                                <FilterInput
                                    label="Filtro de Óleo"
                                    name="filterOil"
                                    register={register}
                                />
                                <FilterInput
                                    label="Filtro de Ar"
                                    name="filterAir"
                                    register={register}
                                />
                                <FilterInput
                                    label="Filtro de Combustível"
                                    name="filterFuel"
                                    register={register}
                                />
                                <FilterInput
                                    label="Filtro de Cabine"
                                    name="filterCabin"
                                    register={register}
                                />
                                <Input {...register('notes')} placeholder="Observações Gerais" className="h-12 text-slate-900 bg-white" />
                            </div>

                            <div className="flex gap-4">
                                <Button onClick={prevStep} type="button" variant="outline" className="flex-1 h-16">Voltar</Button>
                                <Button onClick={nextStep} type="button" className="flex-[2] h-16 bg-blue-600 text-xl font-bold">Revisar</Button>
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
                                <Button onClick={prevStep} type="button" variant="outline" className="flex-1 h-20">Voltar</Button>
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
