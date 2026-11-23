import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Assemble des classes Tailwind ; en cas de conflit, la dernière gagne (ex. la taille passée par l'appelant).
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
