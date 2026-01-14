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
