import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// Mask Utilities
export function formatPlate(value: string) {
    // Uppercase and remove non-alphanumeric
    let v = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Mercosul (AAA1A11) or Standard (AAA-1111)
    if (v.length > 7) v = v.slice(0, 7);
    return v;
}

export function formatPhone(value: string) {
    let v = value.replace(/\D/g, '');
    // (11) 99999-9999
    if (v.length > 11) v = v.slice(0, 11);

    if (v.length > 6) {
        return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
    } else if (v.length > 2) {
        return `(${v.slice(0, 2)}) ${v.slice(2)}`;
    } else if (v.length > 0) {
        return `(${v}`;
    }
    return v;
}

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
