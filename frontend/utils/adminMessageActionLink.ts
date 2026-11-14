export const ADMIN_MESSAGE_ACTION_LABEL_LIMIT = 80;
export const ADMIN_MESSAGE_ACTION_URL_LIMIT = 2083;

export function isAdminMessageActionUrl(url: string): boolean {
  return /^https:\/\/[^\s\\/@?#]+(?:[/?#][^\s\\]*)?$/i.test(url)
    && url.length <= ADMIN_MESSAGE_ACTION_URL_LIMIT;
}
