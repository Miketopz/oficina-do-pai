
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { User, Car } from 'lucide-react';

interface ClientCardProps {
    id: string;
    name: string;
    phone?: string | null;
    vehicleCount: number;
}

export function ClientCard({ id, name, phone, vehicleCount }: ClientCardProps) {
    return (
        <Card className="group relative overflow-hidden bg-zinc-900/80 border border-zinc-800 shadow-sm hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-md transition-all duration-300 cursor-pointer">
            <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <User size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">{name}</h3>
                        <p className="text-sm text-muted-foreground">{phone || 'Sem telefone'}</p>
                    </div>
                </div>

                <div className="mt-2 pt-2 border-t border-zinc-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wide group-hover:text-zinc-300 transition-colors">
                        Veículos
                    </span>
                    <div className="flex items-center gap-1 bg-zinc-800 text-zinc-300 px-2 py-1 rounded text-xs font-bold border border-zinc-700 group-hover:bg-zinc-700 group-hover:text-white transition-colors">
                        <Car size={14} />
                        {vehicleCount}
                    </div>
                </div>
            </div>

            <Link href={`/client/${id}`} className="absolute inset-0" />
        </Card>
    );
}
