import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CalendarClock, Droplets } from "lucide-react";
import Link from "next/link";

interface Prediction {
    vehicle_id: string;
    plate: string;
    model: string;
    client_name: string;
    predicted_next_service: string;
    avg_km_per_day: number;
    confibility_score: 'HIGH' | 'LOW';
}

interface PredictionCardProps {
    predictions: Prediction[];
}

export function PredictionCard({ predictions }: PredictionCardProps) {
    if (!predictions || predictions.length === 0) return null; // Logic is correct, but let's verify if data is reaching here.

    return (
        <Card className="border-l-4 border-l-yellow-500 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
            <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center gap-2 text-yellow-700">
                    <CalendarClock className="h-6 w-6" />
                    Próximas Revisões (Estimadas)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {predictions.map((pred) => (
                        <Link
                            href={`/new?plate=${pred.plate}`}
                            key={pred.vehicle_id}
                            className="block group bg-yellow-50/50 p-3 rounded-lg border border-yellow-100 hover:bg-yellow-100 transition-colors"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                        {pred.plate} - {pred.model}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {pred.client_name}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-yellow-800">
                                        {new Date(pred.predicted_next_service).toLocaleDateString()}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        ~{Math.round(pred.avg_km_per_day)}km/dia
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
