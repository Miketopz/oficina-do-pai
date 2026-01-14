
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { User, Car } from 'lucide-react';

interface ClientCardProps {
    id: string;
    name: string;
    phone?: string;
    vehicleCount: number;
}

export function ClientCard({ id, name, phone, vehicleCount }: ClientCardProps) {
    return (
        <Card className="group relative overflow-hidden bg-card border border-border shadow-md hover:border-primary transition-all duration-300 cursor-pointer">
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

                <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                        Veículos
                    </span>
                    <div className="flex items-center gap-1 bg-secondary px-2 py-1 rounded text-xs font-bold">
                        <Car size={14} />
                        {vehicleCount}
                    </div>
                </div>
            </div>

            <Link href={`/client/${id}`} className="absolute inset-0" />
        </Card>
    );
}
