export const API_URL = import.meta.env.VITE_API_URL;
if (!API_URL) {
    console.warn('⚠️ VITE_API_URL is not defined in environment variables.');
}
