import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Filtros Carro",
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
                    <Toaster richColors position="top-center" />
                    <footer className="text-center text-xs text-gray-500 py-4 opacity-50">
                        V4.1 - SISTEMA ATUALIZADO (14/01)
                    </footer>
                </div>
            </body>
        </html>
    );
}
