import { API_URL } from '../config';

export type LegalContentResponse = {
    content: string;
    updated_at: string;
    lang: string;
};

export async function fetchLegalContent(type: 'cgu' | 'privacy', lang: string = 'fr'): Promise<LegalContentResponse> {
    if (!API_URL) {
        throw new Error('API_URL is not defined');
    }

    try {
        const response = await fetch(`${API_URL}/api/${type}?lang=${lang}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${type}:`, error);
        throw error;
    }
}
