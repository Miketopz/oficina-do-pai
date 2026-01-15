'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';

interface VehicleCardProps {
    title: string;
    plate: string;
    subtitle: React.ReactNode;
    detail?: string;
    link: string;
    actionIcon?: React.ReactNode;
    onAction?: () => void;
    status?: 'danger' | 'warning' | 'ok'; // New prop
}

export function VehicleCard({ title, plate, subtitle, detail, link, actionIcon, onAction, status }: VehicleCardProps) {
    // Status Styles Mapping
    const borderClass = status === 'danger' ? 'border-l-4 border-l-red-500' :
        status === 'warning' ? 'border-l-4 border-l-yellow-500' :
            status === 'ok' ? 'border-l-4 border-l-green-500' : '';


    const statusLabel = status === 'danger' ? 'VENCIDO' : status === 'warning' ? 'PRÓXIMO' : 'EM DIA';

    return (
        <Card className={`group relative overflow-hidden bg-card border border-border shadow-sm hover:shadow-md hover:border-primary transition-all duration-300 ${borderClass}`}>
            {/* O Link agora envolve o conteúdo principal, mas não o botão de ação */}
            <Link href={link} className="block cursor-pointer">
                <div className="bg-secondary/50 p-4 flex justify-between items-center border-b border-border">
                    <div className="bg-background text-foreground font-black font-mono text-xl px-3 py-1.5 rounded-md border border-border tracking-widest uppercase flex items-center shadow-sm">
                        <div className="w-3 h-3 rounded-full bg-blue-600 mr-2.5 animate-pulse"></div>
                        {plate}
                    </div>
                    <div className="flex flex-col items-end">
                        {status && (
                            <Badge status={status} className="mb-1">
                                {statusLabel}
                            </Badge>
                        )}
                        {detail && <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{detail}</span>}
                    </div>
                </div>

                <CardContent className="p-4">
                    <h3 className="text-xl font-bold text-foreground truncate">{title}</h3>
                    {subtitle}
                </CardContent>
            </Link>

            {/* A lixeira fica fixa no canto inferior, fora do Link para não disparar a navegação */}
            {onAction && (
                <div className="absolute bottom-3 right-3 z-30">
                    <Button
                        size="icon"
                        variant="destructive"
                        className="h-10 w-10 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation(); // Impede que o clique no botão ative o Link do card
                            onAction();
                        }}
                    >
                        {actionIcon}
                    </Button>
                </div>
            )}
        </Card>
    );
}
