import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function getProxiedImageUrl(url: string | null | undefined): string {
    if (!url) return '';
    // Don't proxy if it's already a relative path or data URL
    if (url.startsWith('/') || url.startsWith('data:')) return url;

    // Proxy external URLs
    if (url.startsWith('http')) {
        return `/proxy/image?url=${encodeURIComponent(url)}`;
    }

    return url;
}
