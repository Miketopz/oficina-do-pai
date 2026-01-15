'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Wrench } from 'lucide-react';

export function Header() {
    const router = useRouter();
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh();
        router.push('/login');
    };

    return (
        <header className="border-b bg-card border-border">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary-700">
                    <Wrench className="h-6 w-6" />
                    <span>OFICINA</span>
                </Link>
                <div className="flex items-center gap-4">
                    <Button size="sm" variant="ghost" onClick={handleLogout}>
                        Sair
                    </Button>
                </div>
            </div>
        </header>
    );
}
