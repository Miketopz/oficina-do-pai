import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Oficina do Pai",
    description: "Histórico de manutenção para loja de filtros automotivos",
    manifest: "/manifest.json",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-BR">
            <body className={inter.className}>
                <div className="min-h-screen flex flex-col">
                    {children}
                    <Toaster
                        position="bottom-right"
                        toastOptions={{
                            className: 'border border-border bg-background text-foreground shadow-lg',
                            duration: 4000,
                        }}
                        closeButton
                    />
                    <footer className="text-center text-xs text-gray-500 py-4 opacity-50">
                        {/* Version info removed */}
                    </footer>
                </div>
            </body>
        </html>
    );
}
