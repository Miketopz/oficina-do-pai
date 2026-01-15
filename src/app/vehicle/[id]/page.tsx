'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Header } from '@/components/features/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle, Trash2, AlertTriangle, Check, Plus, Info, X } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { cn, getServiceStatus, statusStyles } from '@/lib/utils';

const FilterRow = ({ label, value }: { label: string, value?: string | null }) => {
    const cleanValue = value ? value.replace('(MANTIDO) ', '').replace('(MANTIDO)', '').trim() : '';
    const hasValue = cleanValue.length > 0;
    // It is effectively "Changed" if it has value AND does NOT contain (MANTIDO)
    const isChanged = hasValue && !value?.includes('(MANTIDO)');
    const isKept = value?.includes('(MANTIDO)');

    return (
        <div className="flex justify-between border-b border-dashed border-gray-100 pb-2 items-center last:border-0 hover:bg-gray-50 px-1 rounded transition-colors">
            <span className={cn("flex items-center gap-2 font-medium text-sm text-gray-700")}>
                {isChanged ? (
                    <div className="bg-green-100 p-1 rounded-full">
                        <Check className="w-3 h-3 text-green-600 font-bold" />
                    </div>
                ) : (
                    <div className="bg-red-100 p-1 rounded-full">
                        <X className="w-3 h-3 text-red-500 font-bold" />
                    </div>
                )}
                {label}
            </span>
            <span className={cn("font-bold text-right text-sm uppercase", isChanged ? "text-slate-800" : "text-gray-400 italic")}>
                {isChanged ? cleanValue : (
                    isKept && hasValue ? cleanValue : "Não trocado"
                )}
            </span>
        </div>
    );
};

import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ... FilterRow code ...

export default function VehiclePage({ params }: { params: { id: string } }) {
    const [vehicle, setVehicle] = useState<any>(null);
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const [prediction, setPrediction] = useState<string | null>(null);
    const [recordToDelete, setRecordToDelete] = useState<string | null>(null); // State for delete dialog

    const handleDeleteRecord = async (id: string) => {
        try {
            await supabase.from('maintenance_records').delete().eq('id', id);
            toast.success("Registro apagado.");
            setRecordToDelete(null);
            // manually refresh records or reload
            window.location.reload();
        } catch (error) {
            toast.error("Erro ao apagar registro.");
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            // 1. Fetch Vehicle Info
            const { data: vehicleData } = await supabase
                .from('vehicles')
                .select('*, client:clients(*)')
                .eq('id', params.id)
                .single();

            setVehicle(vehicleData);

            // 2. Fetch History
            if (vehicleData) {
                const { data: historyData } = await supabase
                    .from('maintenance_records')
                    .select('*')
                    .eq('vehicle_id', params.id)
                    .order('date', { ascending: false })
                    .order('created_at', { ascending: false });

                const recs = historyData || [];
                setRecords(recs);

                // 3. Calculate Prediction (Intelligence)
                if (recs.length >= 2) {
                    // We have history! Let's calculate avg usage.
                    const latest = recs[0];
                    const previous = recs[1]; // Compare with the one before

                    const date1 = new Date(latest.date);
                    const date2 = new Date(previous.date);
                    const diffTime = Math.abs(date1.getTime() - date2.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    const kmDiff = latest.km - previous.km;

                    if (diffDays > 0 && kmDiff > 0) {
                        const kmPerDay = kmDiff / diffDays;
                        const nextServiceKm = 10000; // Standard interval
                        const daysToNext = Math.round(nextServiceKm / kmPerDay);

                        const nextDate = new Date(date1);
                        nextDate.setDate(nextDate.getDate() + daysToNext);

                        setPrediction(`Baseado no uso (${Math.round(kmPerDay)} km/dia), previsão da próxima troca: ${nextDate.toLocaleDateString()}`);
                    } else {
                        setPrediction("Uso irregular, previsão para daqui 6 meses.");
                    }
                } else if (recs.length === 1) {
                    // Only one record, use Standard 6 months
                    const latest = recs[0];
                    const nextDate = new Date(latest.date);
                    nextDate.setMonth(nextDate.getMonth() + 6);
                    setPrediction(`Previsão estimada (Padrão 6 meses): ${nextDate.toLocaleDateString()}`);
                }
            }
            setLoading(false);
        };

        fetchData();
    }, [params.id]);

    const handleShare = () => {
        // Simple WhatsApp content generator
        if (!vehicle || records.length === 0) return;
        const lastRecord = records[0];
        const text = `Olá ${vehicle.client.name}, aqui é da Oficina! \nRealizamos a troca de filtros do seu ${vehicle.model} (${vehicle.plate}) no dia ${new Date(lastRecord.date).toLocaleDateString()}. \nKM: ${lastRecord.km}. \nQualquer dúvida estamos à disposição!`;

        const url = `https://wa.me/55${vehicle.client.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    if (loading) return <div className="p-8 text-center">Carregando histórico...</div>;
    if (!vehicle) return <div className="p-8 text-center text-red-500">Veículo não encontrado.</div>;

    const lastRecord = records[0];
    const status = lastRecord ? getServiceStatus(lastRecord.date, lastRecord.km) : 'ok';

    return (
        <div className="min-h-screen bg-gray-50 pb-8">
            <Header />

            <main className="container mx-auto px-4 py-8 max-w-3xl">
                <Link href="/">
                    <Button variant="ghost" className="mb-4 pl-0 hover:pl-2 transition-all">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                    </Button>
                </Link>

                {/* Vehicle Header with Share Button */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 uppercase">{vehicle.model}</h1>
                        <p className="text-xl text-gray-500 font-mono">{vehicle.plate}</p>
                        <div className="mt-2 text-lg">
                            <span className="text-gray-600">Dono(a): </span>
                            <Link href={`/client/${vehicle.client.id}`} className="font-bold text-blue-600 hover:text-blue-800 hover:underline">
                                {vehicle.client.name}
                            </Link>
                        </div>
                    </div>
                    <Link href={`/new?plate=${vehicle.plate}&clientId=${vehicle.client.id}&model=${encodeURIComponent(vehicle.model)}`}>
                        <Button className="h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-lg">
                            <Plus className="mr-2 h-5 w-5" /> Nova Troca
                        </Button>
                    </Link>
                </div>

                {/* STATUS BANNER */}
                {status !== 'ok' && (
                    <div className={cn("mb-6 p-4 rounded-lg border flex items-center gap-3", statusStyles[status])}>
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-medium">
                            {status === 'danger'
                                ? "Atenção: Este veículo já ultrapassou o prazo de 6 meses desde a última troca."
                                : "Aviso: A próxima revisão deste veículo deve ser agendada em breve."}
                        </span>
                    </div>
                )}

                {/* Prediction Card - The Intelligence Layer */}
                {prediction && (
                    <Card className="mb-8 border-l-4 border-l-blue-500 bg-blue-50">
                        <CardContent className="pt-6 flex items-center gap-4">
                            <div className="bg-blue-100 p-3 rounded-full">
                                <MessageCircle className="h-6 w-6 text-blue-700" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Inteligência da Oficina</h3>
                                <p className="text-gray-700">{prediction}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Timeline */}
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold border-b pb-2">Histórico de Manutenção</h2>

                    {records.map((record, index) => {
                        const exchangeNumber = records.length - index;
                        return (
                            <div key={record.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                        onClick={() => setRecordToDelete(record.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="flex justify-between items-start mb-6 pr-10">
                                    <div>
                                        <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs font-black rounded uppercase tracking-wider mb-2">
                                            {exchangeNumber}ª Troca
                                        </span>
                                        <div className="text-2xl font-black text-slate-900">
                                            {format(new Date(record.date || new Date()), "dd/MM/yyyy")}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Quilometragem</div>
                                        <div className="text-xl font-mono font-bold text-slate-700">
                                            {record.km ? Number(record.km).toLocaleString('pt-BR') : '---'} KM
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                                    <FilterRow label="Óleo do Motor" value={record.oil} />
                                    <FilterRow label="Filtro de Óleo" value={record.filter_oil} />
                                    <FilterRow label="Filtro de Ar" value={record.filter_air} />
                                    <FilterRow label="Filtro de Combustível" value={record.filter_fuel} />
                                    <FilterRow label="Filtro de Cabine" value={record.filter_cabin} />
                                    {record.notes && (
                                        <div className="col-span-full mt-2 bg-yellow-50 p-3 rounded text-sm text-yellow-800">
                                            <strong>Obs:</strong> {record.notes}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}


                    {records.length === 0 && (
                        <div className="text-center py-16 px-4 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                            <div className="bg-gray-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="h-10 w-10 text-gray-300" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Histórico Vazio</h3>
                            <p className="text-gray-500 max-w-sm mx-auto mb-8">
                                Este veículo ainda não possui registros de manutenção cadastrados nesta frota.
                            </p>
                            <Link href={`/new?plate=${vehicle.plate}&clientId=${vehicle.client.id}&model=${encodeURIComponent(vehicle.model)}`}>
                                <Button variant="outline" className="h-12 border-blue-200 hover:bg-blue-50 text-blue-700 font-bold">
                                    <Plus className="mr-2 h-4 w-4" /> Adicionar Primeira Troca
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>

                <AlertDialog open={!!recordToDelete} onOpenChange={() => setRecordToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Registro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta ação apagará permanentemente o registro de manutenção.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => recordToDelete && handleDeleteRecord(recordToDelete)} className="bg-red-600 hover:bg-red-700">
                                Sim, Excluir
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

            </main >
        </div >
    );
}
