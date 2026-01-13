import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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
                </div>
            </body>
        </html>
    );
}
