import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { auth } from '../services/api';

export async function openStockmanWebLogin() {
  const webAppUrl = Constants.expoConfig?.extra?.webAppUrl || 'https://app.stockman.pro';
  const url = new URL('/', webAppUrl);
  if (url.protocol !== 'https:') throw new Error('HTTPS is required');
  const { code } = await auth.startWebLogin();
  return WebBrowser.openBrowserAsync(`${url.toString()}#web-login=${encodeURIComponent(code)}`);
}
