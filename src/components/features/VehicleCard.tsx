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
        <Card className={`group relative overflow-hidden bg-card border border-border shadow-md hover:border-primary transition-all duration-300 cursor-pointer ${borderClass}`}>
            {/* 'Metal Plate' Effect Header */}
            <div className="bg-secondary p-3 flex justify-between items-center border-b border-border">
                <div className="bg-white text-black font-black font-mono text-lg px-2 py-1 rounded border-2 border-black tracking-widest uppercase flex items-center shadow-inner">
                    <div className="w-4 h-2 bg-blue-700 mr-2"></div>
                    {plate}
                </div>
                <div className="flex flex-col items-end">
                    {detail && <span className="text-xs font-bold text-muted-foreground uppercase">{detail}</span>}
                    {status && (
                        <Badge status={status}>
                            {statusLabel}
                        </Badge>
                    )}
                </div>
            </div>

            <CardContent className="p-4 relative z-10">
                {/* Title (Main Highlight) */}
                <h3 className="text-xl font-bold text-foreground truncate">{title}</h3>

                {subtitle}

                {/* Actions Layer */}
                <div className="absolute bottom-2 right-2 flex gap-2 z-20">
                    {onAction && (
                        <Button
                            size="icon"
                            variant="destructive"
                            className="h-10 w-10 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onAction();
                            }}
                        >
                            {actionIcon}
                        </Button>
                    )}
                </div>
            </CardContent>

            {/* Click Area Overlay - Lower Z-Index so Buttons work */}
            <Link href={link} className="absolute inset-0 z-0" />
        </Card>
    );
}
