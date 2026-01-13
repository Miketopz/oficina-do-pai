'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import Link from 'next/link';

export default function VehiclePage({ params }: { params: { id: string } }) {
    const [vehicle, setVehicle] = useState<any>(null);
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

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
                    .order('date', { ascending: false });

                setRecords(historyData || []);
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
                        <h1 className="text-3xl font-bold text-gray-900">{vehicle.model}</h1>
                        <p className="text-xl text-gray-500 font-mono">{vehicle.plate}</p>
                        <p className="text-gray-600 mt-1">Proprietário: <span className="font-semibold">{vehicle.client.name}</span></p>
                    </div>

                    {/* The "Share on WhatsApp" button requested by the "Owner" */}
                    <Button onClick={handleShare} className="bg-green-600 hover:bg-green-700 text-white">
                        <MessageCircle className="mr-2 h-5 w-5" />
                        Enviar Resumo
                    </Button>
                </div>

                {/* Timeline */}
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold border-b pb-2">Histórico de Manutenção</h2>

                    {records.map((record) => (
                        <Card key={record.id} className="border-l-4 border-l-primary-500">
                            <CardHeader className="pb-2 bg-gray-50/50">
                                <div className="flex justify-between items-baseline">
                                    <CardTitle className="text-lg">
                                        {new Date(record.date).toLocaleDateString()}
                                    </CardTitle>
                                    <span className="font-mono font-bold text-gray-600">{record.km.toLocaleString()} KM</span>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                {record.filter_oil && (
                                    <div className="flex justify-between border-b border-dashed pb-1">
                                        <span className="text-gray-500">Filtro de Óleo:</span>
                                        <span className="font-medium">{record.filter_oil}</span>
                                    </div>
                                )}
                                {record.filter_air && (
                                    <div className="flex justify-between border-b border-dashed pb-1">
                                        <span className="text-gray-500">Filtro de Ar:</span>
                                        <span className="font-medium">{record.filter_air}</span>
                                    </div>
                                )}
                                {record.filter_fuel && (
                                    <div className="flex justify-between border-b border-dashed pb-1">
                                        <span className="text-gray-500">Filtro de Combustível:</span>
                                        <span className="font-medium">{record.filter_fuel}</span>
                                    </div>
                                )}
                                {record.filter_cabin && (
                                    <div className="flex justify-between border-b border-dashed pb-1">
                                        <span className="text-gray-500">Filtro de Cabine:</span>
                                        <span className="font-medium">{record.filter_cabin}</span>
                                    </div>
                                )}
                                {record.notes && (
                                    <div className="col-span-full mt-2 bg-yellow-50 p-3 rounded text-sm text-yellow-800">
                                        <strong>Obs:</strong> {record.notes}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}

                    {records.length === 0 && (
                        <p className="text-gray-500 italic">Nenhum registro encontrado para este veículo.</p>
                    )}
                </div>

            </main>
        </div>
    );
}
