export const ADMIN_MESSAGE_ACTION_LABEL_LIMIT = 80;
export const ADMIN_MESSAGE_ACTION_URL_LIMIT = 2083;

export function isAdminMessageActionUrl(value: string): boolean {
    if (!/^https:\/\/[^\s\\/@?#]+(?:[/?#][^\s\\]*)?$/i.test(value) || value.length > ADMIN_MESSAGE_ACTION_URL_LIMIT) return false;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
    } catch {
        return false;
    }
}
