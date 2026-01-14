import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export const formatPlate = (value: string) => {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
};

export const formatPhone = (value: string) => {
    if (!value) return "";
    const phone = value.replace(/\D/g, "");
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
};

// Lógica de Alerta: 6 meses ou 10.000km
export function getServiceStatus(lastDate: string, lastKm: number) {
    const sixMonthsInMs = 180 * 24 * 60 * 60 * 1000;
    const timeDiff = Date.now() - new Date(lastDate).getTime();

    // Se passou de 6 meses, alerta crítico
    if (timeDiff > sixMonthsInMs) return 'danger';

    // Se passou de 5 meses (aviso prévio)
    if (timeDiff > (sixMonthsInMs * 0.85)) return 'warning';

    return 'ok';
}

export const statusStyles = {
    danger: "bg-red-100 text-red-700 border-red-200",
    warning: "bg-yellow-100 text-yellow-700 border-yellow-200",
    ok: "bg-green-100 text-green-700 border-green-200"
};
