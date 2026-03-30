import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOST_SUFFIXES = ['stripe.com', 'flutterwave.com'];

function isAllowedTarget(url: URL) {
  if (url.protocol !== 'https:') return false;
  return ALLOWED_HOST_SUFFIXES.some((suffix) => url.hostname === suffix || url.hostname.endsWith(`.${suffix}`));
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const encoded = requestUrl.searchParams.get('url');
  if (!encoded) {
    return NextResponse.json({ error: 'Lien de paiement invalide.' }, { status: 400 });
  }

  let decoded = encoded;
  try {
    decoded = decodeURIComponent(encoded);
  } catch {
    // keep raw value
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(decoded);
  } catch {
    return NextResponse.json({ error: 'Lien de paiement invalide.' }, { status: 400 });
  }

  if (!isAllowedTarget(targetUrl)) {
    return NextResponse.json({ error: 'Lien de paiement non autorisé.' }, { status: 400 });
  }

  return NextResponse.redirect(targetUrl.toString(), 302);
}
