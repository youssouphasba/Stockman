'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Building2, Grid2X2, Heart, Mail, MapPin, Menu, MessageSquare, Minus, Phone, Plus, Search, Send, ShoppingBag, SlidersHorizontal, Trash2, X } from 'lucide-react';

type PublicProduct = {
  product_id: string;
  name: string;
  description?: string | null;
  selling_price: number;
  quantity: number;
  unit?: string | null;
  image?: string | null;
  category?: string | null;
  available: boolean;
};

type PublicSite = {
  slug: string;
  store_id: string;
  name: string;
  logo_url?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  currency: string;
  hero_title?: string | null;
  welcome_message?: string | null;
  brand_color?: string | null;
  delivery_info?: string | null;
  whatsapp_phone?: string | null;
  payment_instructions?: string | null;
  show_out_of_stock_products?: boolean;
};

type SitePayload = {
  site: PublicSite;
  products: PublicProduct[];
};

type CartLine = {
  product: PublicProduct;
  quantity: number;
};

const PRODUCTS_PER_PAGE = 50;

function formatAmount(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency || 'XOF',
      maximumFractionDigits: currency === 'XOF' ? 0 : 2,
    }).format(value || 0);
  } catch {
    return `${new Intl.NumberFormat('fr-FR').format(value || 0)} ${currency || ''}`.trim();
  }
}

function withAlpha(hex: string, alpha: number) {
  const normalized = (hex || '').replace('#', '').trim();
  const expanded = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    return `rgba(4, 120, 87, ${alpha})`;
  }
  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export default function StorefrontClient({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const [payload, setPayload] = useState<SitePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<PublicProduct | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewTracked, setViewTracked] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactCompany, setContactCompany] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/public/ecommerce/${slug}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Boutique en ligne introuvable.');
        }
        return response.json();
      })
      .then((data: SitePayload) => {
        if (cancelled) return;
        setPayload(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Impossible de charger cette boutique.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`stockman-shop-favorites-${slug}`);
      if (stored) setFavorites(JSON.parse(stored));
    } catch {
      setFavorites([]);
    }
  }, [slug]);

  useEffect(() => {
    setCurrentPage(1);
  }, [category, query]);

  const categories = useMemo(() => {
    const values = new Set<string>();
    for (const product of payload?.products || []) {
      if (product.category) values.add(product.category);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [payload?.products]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (payload?.products || []).filter((product) => {
      const matchesCategory = category === 'all' || product.category === category;
      const matchesQuery = !normalizedQuery || [product.name, product.description, product.category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      return matchesCategory && matchesQuery;
    });
  }, [category, payload?.products, query]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const visibleProducts = filteredProducts.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE);
  const cartLines = Object.values(cart);
  const cartTotal = cartLines.reduce((sum, line) => sum + line.product.selling_price * line.quantity, 0);
  const cartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const currency = payload?.site.currency || 'XOF';
  const brandColor = payload?.site.brand_color || '#047857';
  const brandSoft = withAlpha(brandColor, 0.10);
  const brandSurface = withAlpha(brandColor, 0.14);
  const brandBorder = withAlpha(brandColor, 0.24);
  const isPreview = searchParams.get('preview') === '1';
  const siteMark = (payload?.site.name || 'SM')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk.charAt(0).toUpperCase())
    .join('');
  const whatsappLink = payload?.site.whatsapp_phone
    ? `https://wa.me/${payload.site.whatsapp_phone.replace(/[^\d]/g, '')}`
    : null;

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!payload || isPreview || viewTracked) return;
    setViewTracked(true);
    fetch(`/api/public/ecommerce/${slug}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'site_view' }),
    }).catch(() => null);
  }, [isPreview, payload, slug, viewTracked]);

  const persistFavorites = (next: string[]) => {
    setFavorites(next);
    try {
      window.localStorage.setItem(`stockman-shop-favorites-${slug}`, JSON.stringify(next));
    } catch {
      return;
    }
  };

  const toggleFavorite = (productId: string) => {
    persistFavorites(favorites.includes(productId)
      ? favorites.filter((id) => id !== productId)
      : [...favorites, productId]);
  };

  const addToCart = (product: PublicProduct) => {
    if (!product.available || product.quantity <= 0) return;
    setCart((current) => {
      const previous = current[product.product_id]?.quantity || 0;
      const nextQuantity = Math.min(previous + 1, Math.max(0, product.quantity));
      return {
        ...current,
        [product.product_id]: { product, quantity: nextQuantity },
      };
    });
    if (!isPreview) {
      fetch(`/api/public/ecommerce/${slug}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: 'add_to_cart', product_id: product.product_id, quantity: 1 }),
      }).catch(() => null);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCart((current) => {
      const line = current[productId];
      if (!line) return current;
      if (quantity <= 0) {
        const next = { ...current };
        delete next[productId];
        return next;
      }
      return {
        ...current,
        [productId]: { ...line, quantity: Math.min(quantity, Math.max(0, line.product.quantity)) },
      };
    });
  };

  const submitOrder = async () => {
    if (!customerName.trim() || cartLines.length === 0) return;
    setSubmitting(true);
    setOrderNumber(null);
    try {
      const response = await fetch(`/api/public/ecommerce/${slug}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || null,
          customer_email: customerEmail.trim() || null,
          customer_address: customerAddress.trim() || null,
          notes: notes.trim() || null,
          items: cartLines.map((line) => ({ product_id: line.product.product_id, quantity: line.quantity })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || "Impossible d'envoyer la commande.");
      }
      setOrderNumber(data.order_number);
      setCart({});
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerAddress('');
      setNotes('');
    } catch (err: any) {
      setError(err?.message || "Impossible d'envoyer la commande.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitContactRequest = async () => {
    if (!contactName.trim() || !contactEmail.trim() || !contactSubject.trim() || !contactMessage.trim()) return;
    setContactSubmitting(true);
    setContactSuccess(null);
    setContactError(null);
    try {
      const response = await fetch(`/api/public/ecommerce/${slug}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: contactName.trim(),
          customer_phone: contactPhone.trim() || null,
          customer_email: contactEmail.trim() || null,
          company_name: contactCompany.trim() || null,
          subject: contactSubject.trim(),
          message: contactMessage.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || "Impossible d'envoyer votre demande.");
      }
      setContactSuccess('Votre message a bien été envoyé. La boutique vous répondra rapidement.');
      setContactName('');
      setContactPhone('');
      setContactEmail('');
      setContactCompany('');
      setContactSubject('');
      setContactMessage('');
    } catch (err: any) {
      setContactError(err?.message || "Impossible d'envoyer votre demande.");
    } finally {
      setContactSubmitting(false);
    }
  };

  const cartPanel = (
    <aside className={`${cartOpen ? 'fixed inset-y-0 right-0 z-50 block w-full max-w-md overflow-y-auto' : 'hidden'} border-l border-slate-200 bg-white p-5 shadow-2xl lg:sticky lg:top-24 lg:z-auto lg:block lg:h-fit lg:w-auto lg:max-w-none lg:overflow-visible lg:rounded-2xl lg:border lg:shadow-sm`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Panier</p>
          <h2 className="text-xl font-black">Votre commande</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{cartCount} article{cartCount > 1 ? 's' : ''}</span>
          <button type="button" onClick={() => setCartOpen(false)} className="rounded-full border border-slate-200 p-2 text-slate-500 lg:hidden" aria-label="Fermer le panier">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {cartLines.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Ajoutez des produits pour préparer votre commande.</p>
        ) : (
          cartLines.map((line) => (
            <div key={line.product.product_id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black">{line.product.name}</p>
                  <p className="text-sm text-slate-600">{formatAmount(line.product.selling_price, currency)}</p>
                </div>
                <button type="button" onClick={() => updateQuantity(line.product.product_id, 0)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Retirer du panier">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="inline-flex items-center rounded-xl border border-slate-200">
                  <button type="button" onClick={() => updateQuantity(line.product.product_id, line.quantity - 1)} className="p-2" aria-label="Diminuer la quantité">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-10 px-2 text-center text-sm font-black">{line.quantity}</span>
                  <button type="button" onClick={() => updateQuantity(line.product.product_id, line.quantity + 1)} className="p-2" aria-label="Augmenter la quantité">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <p className="font-black">{formatAmount(line.product.selling_price * line.quantity, currency)}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="my-5 flex items-center justify-between border-t border-slate-200 pt-4">
        <span className="text-sm font-bold text-slate-600">Total</span>
        <span className="text-2xl font-black">{formatAmount(cartTotal, currency)}</span>
      </div>

      {orderNumber && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          Commande envoyée : {orderNumber}. La boutique vous recontactera pour confirmer.
        </div>
      )}
      {error && payload && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Nom complet" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-emerald-500" />
        <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Téléphone" type="tel" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-emerald-500" />
        <input value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="Email" type="email" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-emerald-500" />
        <textarea value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} placeholder="Adresse de livraison" rows={3} className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-emerald-500" />
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Note pour la boutique" rows={3} className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-emerald-500" />
      </div>

      {payload?.site.payment_instructions && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <p className="font-black">Paiement</p>
          <p className="mt-1 whitespace-pre-line">{payload.site.payment_instructions}</p>
        </div>
      )}

      {payload?.site.delivery_info && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          <p className="font-black text-slate-950">Livraison</p>
          <p className="mt-1 whitespace-pre-line">{payload.site.delivery_info}</p>
        </div>
      )}

      <button
        type="button"
        onClick={submitOrder}
        disabled={submitting || !customerName.trim() || cartLines.length === 0}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-4 text-sm font-black text-white transition disabled:bg-slate-300"
        style={{ backgroundColor: submitting || !customerName.trim() || cartLines.length === 0 ? undefined : brandColor }}
      >
        <Send className="h-4 w-4" />
        {submitting ? 'Envoi...' : 'Envoyer la commande'}
      </button>
    </aside>
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f8f4] text-slate-950">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm font-semibold text-slate-600 shadow-sm">
            Chargement de la boutique...
          </div>
        </div>
      </main>
    );
  }

  if (error && !payload) {
    return (
      <main className="min-h-screen bg-[#f7f8f4] text-slate-950">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
          <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
            <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-rose-500" />
            <h1 className="text-xl font-black">Boutique indisponible</h1>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f8f5] text-slate-950">
      <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur" style={{ borderColor: brandBorder }}>
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => setMenuOpen(true)} className="rounded-full border border-slate-200 p-3 text-slate-950 lg:hidden" aria-label="Ouvrir le menu">
            <Menu className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex flex-1 items-center gap-3 px-4 lg:px-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-sm font-black text-white shadow-sm" style={{ backgroundColor: brandColor }}>
              {payload?.site.logo_url ? (
                <img src={payload.site.logo_url} alt={payload.site.name} className="h-full w-full object-cover" />
              ) : (
                siteMark || 'SM'
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xl font-black tracking-tight text-slate-950">{payload?.site.name}</p>
              <div className="mt-1 hidden items-center gap-3 text-xs font-medium text-slate-500 lg:flex">
                <a href="#contact" className="transition hover:text-slate-950">Contactez-nous</a>
                {whatsappLink ? <a href={whatsappLink} target="_blank" rel="noreferrer" style={{ color: brandColor }}>WhatsApp</a> : null}
              </div>
            </div>
            {whatsappLink && (
              <div className="mt-1 flex items-center gap-3 text-xs font-medium text-slate-500 lg:hidden">
                <a href={whatsappLink} target="_blank" rel="noreferrer" style={{ color: brandColor }}>WhatsApp</a>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setCartOpen(true)} className="relative rounded-full border border-slate-200 p-3 text-slate-950" aria-label="Ouvrir le panier">
              <ShoppingBag className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-black text-white" style={{ backgroundColor: brandColor }}>
                  {cartCount}
                </span>
              )}
            </button>
            <button type="button" onClick={() => setMenuOpen(true)} className="hidden rounded-full border border-slate-200 p-3 text-slate-950 lg:inline-flex" aria-label="Ouvrir le menu">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em]" style={{ color: brandColor }}>Boutique officielle</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
              {payload?.site.hero_title || payload?.site.name}
            </h1>
            {payload?.site.welcome_message && <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">{payload.site.welcome_message}</p>}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a href="#contact" className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-black text-white shadow-sm" style={{ backgroundColor: brandColor, boxShadow: `0 10px 24px ${withAlpha(brandColor, 0.22)}` }}>
                Contactez-nous
              </a>
              {whatsappLink ? (
                <a href={whatsappLink} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-xl border bg-white px-5 py-3 text-sm font-black text-slate-900 shadow-sm" style={{ borderColor: brandBorder }}>
                  WhatsApp
                </a>
              ) : null}
            </div>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: brandBorder, boxShadow: `0 18px 40px ${withAlpha(brandColor, 0.08)}` }}>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs font-bold uppercase text-slate-400">Catalogue</p>
                <p className="mt-1 text-xl font-black">{payload?.products.length || 0} produit{(payload?.products.length || 0) > 1 ? 's' : ''}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-400">Panier</p>
                <p className="mt-1 text-xl font-black">{cartCount} article{cartCount > 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <label className="flex h-14 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un produit"
              className="min-w-0 flex-1 bg-transparent text-base font-medium outline-none placeholder:text-slate-400"
            />
          </label>
          <button type="button" className="hidden h-14 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm lg:flex">
            <Grid2X2 className="h-5 w-5" />
            Grille
          </button>
          {categories.length > 0 ? (
            <label className="flex h-14 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm">
              <SlidersHorizontal className="h-5 w-5" />
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                aria-label="Filtrer par catégorie"
                className="bg-transparent font-black outline-none"
              >
                <option value="all">Toutes les catégories</option>
                {categories.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
          ) : (
            <button type="button" className="flex h-14 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm">
              <SlidersHorizontal className="h-5 w-5" />
              Filtres
            </button>
          )}
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-12 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold text-slate-500">
              {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} affiché{filteredProducts.length > 1 ? 's' : ''}
              {category !== 'all' ? ` dans ${category}` : ''}
            </p>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">50 produits par page</p>
          </div>
          {filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
              Aucun produit disponible pour cette recherche.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-3 xl:grid-cols-4">
                {visibleProducts.map((product) => {
                  const isFavorite = favorites.includes(product.product_id);
                  return (
                    <article
                      key={product.product_id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedProduct(product)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') setSelectedProduct(product);
                      }}
                      className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-400">
                            <ShoppingBag className="h-9 w-9" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleFavorite(product.product_id);
                          }}
                          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-sm"
                          style={isFavorite ? { backgroundColor: brandSoft, border: `1px solid ${brandBorder}` } : undefined}
                          aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        >
                          <Heart className={`h-5 w-5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                        </button>
                      </div>
                      <div className="space-y-3 px-1 pb-2 pt-3">
                        <div>
                          <h2 className="line-clamp-2 min-h-11 text-sm font-black tracking-tight text-slate-950 sm:text-base">{product.name}</h2>
                          {product.category && <p className="mt-1 text-xs font-bold uppercase text-slate-400">{product.category}</p>}
                        </div>
                        <div>
                          <div className="text-base font-black text-slate-950 sm:text-lg">{formatAmount(product.selling_price, currency)}</div>
                          <div className={`mt-1 text-xs font-semibold ${product.available ? 'text-slate-500' : 'text-rose-600'}`}>
                            {product.quantity > 0 ? `${product.quantity} ${product.unit || ''} disponible(s)` : 'Rupture'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            addToCart(product);
                            setCartOpen(true);
                          }}
                          disabled={!product.available}
                          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-black text-white transition disabled:bg-slate-200 disabled:text-slate-400"
                          style={product.available ? { backgroundColor: brandColor, borderColor: brandColor, boxShadow: `0 10px 24px ${withAlpha(brandColor, 0.22)}` } : undefined}
                          aria-label={`Ajouter ${product.name}`}
                        >
                          <ShoppingBag className="h-4 w-4" />
                          Ajouter
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="rounded-xl border bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm disabled:opacity-40"
                    style={currentPage > 1 ? { borderColor: brandBorder } : undefined}
                  >
                    Précédent
                  </button>
                  <span className="rounded-xl border bg-white px-4 py-3 text-sm font-black text-slate-500 shadow-sm" style={{ borderColor: brandBorder }}>
                    Page {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-xl border bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm disabled:opacity-40"
                    style={currentPage < totalPages ? { borderColor: brandBorder } : undefined}
                  >
                    Suivant
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {cartOpen && <button type="button" className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setCartOpen(false)} aria-label="Fermer le panier" />}
        {cartPanel}
      </div>

      <section id="contact" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border bg-white p-6 shadow-sm sm:p-8" style={{ borderColor: brandBorder, boxShadow: `0 18px 40px ${withAlpha(brandColor, 0.08)}` }}>
          <div className="mb-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em]" style={{ color: brandColor }}>Contact</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Contactez-nous</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Une question sur un produit, une disponibilité, une livraison ou une commande en préparation ? Envoyez votre message et la boutique vous répondra dans les meilleurs délais.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {payload?.site.address ? (
                <div className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: brandBorder }}>
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0" style={{ color: brandColor }} />
                    <div>
                      <p className="text-sm font-black text-slate-950">Adresse</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{payload.site.address}</p>
                    </div>
                  </div>
                </div>
              ) : null}
              {payload?.site.email ? (
                <div className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: brandBorder }}>
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-5 w-5 shrink-0" style={{ color: brandColor }} />
                    <div>
                      <p className="text-sm font-black text-slate-950">E-mail</p>
                      <a href={`mailto:${payload.site.email}`} className="mt-1 block text-sm leading-6 text-slate-600 hover:text-slate-950">{payload.site.email}</a>
                    </div>
                  </div>
                </div>
              ) : null}
              {payload?.site.phone ? (
                <div className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: brandBorder }}>
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-5 w-5 shrink-0" style={{ color: brandColor }} />
                    <div>
                      <p className="text-sm font-black text-slate-950">Téléphone</p>
                      <a href={`tel:${payload.site.phone}`} className="mt-1 block text-sm leading-6 text-slate-600 hover:text-slate-950">{payload.site.phone}</a>
                    </div>
                  </div>
                </div>
              ) : null}
              {whatsappLink ? (
                <div className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: brandBorder }}>
                  <div className="flex items-start gap-3">
                    <MessageSquare className="mt-0.5 h-5 w-5 shrink-0" style={{ color: brandColor }} />
                    <div>
                      <p className="text-sm font-black text-slate-950">WhatsApp</p>
                      <a href={whatsappLink} target="_blank" rel="noreferrer" className="mt-1 inline-flex text-sm leading-6 hover:text-slate-950" style={{ color: brandColor }}>Discuter avec la boutique</a>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <input value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="Nom complet *" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none transition focus:border-slate-900" />
                <input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} placeholder="Téléphone" type="tel" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none transition focus:border-slate-900" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="E-mail *" type="email" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none transition focus:border-slate-900" />
                <input value={contactCompany} onChange={(event) => setContactCompany(event.target.value)} placeholder="Société" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none transition focus:border-slate-900" />
              </div>
              <input value={contactSubject} onChange={(event) => setContactSubject(event.target.value)} placeholder="Sujet *" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none transition focus:border-slate-900" />
              <textarea value={contactMessage} onChange={(event) => setContactMessage(event.target.value)} placeholder="Votre message *" rows={6} className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none transition focus:border-slate-900" />

              {contactSuccess ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                  {contactSuccess}
                </div>
              ) : null}
              {contactError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {contactError}
                </div>
              ) : null}

              <button
                type="button"
                onClick={submitContactRequest}
                disabled={contactSubmitting || !contactName.trim() || !contactEmail.trim() || !contactSubject.trim() || !contactMessage.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black text-white transition disabled:bg-slate-300"
                style={{ backgroundColor: contactSubmitting || !contactName.trim() || !contactEmail.trim() || !contactSubject.trim() || !contactMessage.trim() ? undefined : brandColor }}
              >
                <Send className="h-4 w-4" />
                {contactSubmitting ? 'Envoi...' : 'Envoyer le message'}
              </button>
            </div>

            <div className="rounded-3xl border bg-slate-50 p-5 sm:p-6" style={{ borderColor: brandBorder }}>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-lg font-black text-white shadow-sm" style={{ backgroundColor: brandColor }}>
                  {payload?.site.logo_url ? (
                    <img src={payload.site.logo_url} alt={payload.site.name} className="h-full w-full object-cover" />
                  ) : (
                    siteMark || 'SM'
                  )}
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Boutique</p>
                  <h3 className="mt-1 text-2xl font-black text-slate-950">{payload?.site.name}</h3>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-white p-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: brandColor }} />
                    <div>
                      <p className="text-sm font-black text-slate-950">Service client</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">Nous répondons aux questions sur les produits, la disponibilité, la livraison et les commandes envoyées via le site.</p>
                    </div>
                  </div>
                </div>
                {payload?.site.delivery_info ? (
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-sm font-black text-slate-950">Livraison</p>
                    <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{payload.site.delivery_info}</p>
                  </div>
                ) : null}
                {payload?.site.payment_instructions ? (
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-sm font-black text-slate-950">Paiement</p>
                    <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{payload.site.payment_instructions}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40" onClick={() => setMenuOpen(false)}>
          <aside className="ml-auto flex h-full w-full max-w-sm flex-col overflow-y-auto bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Menu</p>
                <h2 className="text-xl font-black">{payload?.site.name}</h2>
              </div>
              <button type="button" onClick={() => setMenuOpen(false)} className="rounded-full border border-slate-200 p-2 text-slate-600" aria-label="Fermer le menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              <a
                href="#contact"
                onClick={() => setMenuOpen(false)}
                className="block w-full rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-black text-slate-700"
              >
                Contactez-nous
              </a>
              <button
                type="button"
                onClick={() => {
                  setCategory('all');
                  setMenuOpen(false);
                }}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-black ${category === 'all' ? 'text-white' : 'border-slate-200 text-slate-700'}`}
                style={category === 'all' ? { borderColor: brandColor, backgroundColor: brandColor } : undefined}
              >
                Tous les produits
              </button>
              {categories.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setCategory(value);
                    setMenuOpen(false);
                  }}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-black ${category === value ? 'text-white' : 'border-slate-200 text-slate-700'}`}
                  style={category === value ? { borderColor: brandColor, backgroundColor: brandColor } : undefined}
                >
                  {value}
                </button>
              ))}
            </div>
            <div className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              {payload?.site.phone && <p><span className="font-black text-slate-950">Téléphone : </span>{payload.site.phone}</p>}
              {payload?.site.email && <p><span className="font-black text-slate-950">Email : </span>{payload.site.email}</p>}
              {payload?.site.address && <p><span className="font-black text-slate-950">Adresse : </span>{payload.site.address}</p>}
              {whatsappLink && <a href={whatsappLink} target="_blank" rel="noreferrer" className="inline-flex rounded-xl px-4 py-3 text-sm font-black text-white" style={{ backgroundColor: brandColor }}>Contacter sur WhatsApp</a>}
            </div>
          </aside>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 px-4 py-6" onClick={() => setSelectedProduct(null)}>
          <div className="mx-auto grid max-w-4xl gap-6 rounded-3xl bg-white p-4 shadow-2xl md:grid-cols-[1fr_1fr] md:p-6" onClick={(event) => event.stopPropagation()}>
            <div className="aspect-square overflow-hidden rounded-2xl bg-slate-100">
              {selectedProduct.image ? (
                <img src={selectedProduct.image} alt={selectedProduct.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">
                  <ShoppingBag className="h-14 w-14" />
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-start justify-between gap-4">
                <div>
                  {selectedProduct.category && <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{selectedProduct.category}</p>}
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{selectedProduct.name}</h2>
                </div>
                <button type="button" onClick={() => setSelectedProduct(null)} className="rounded-full border border-slate-200 p-2 text-slate-600" aria-label="Fermer la fiche produit">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-5 text-3xl font-black">{formatAmount(selectedProduct.selling_price, currency)}</div>
              <p className={`mt-2 text-sm font-bold ${selectedProduct.available ? 'text-emerald-700' : 'text-rose-600'}`}>
                {selectedProduct.quantity > 0 ? `${selectedProduct.quantity} ${selectedProduct.unit || ''} disponible(s)` : 'Rupture'}
              </p>
              {selectedProduct.description ? (
                <p className="mt-6 whitespace-pre-line text-sm leading-7 text-slate-600">{selectedProduct.description}</p>
              ) : (
                <p className="mt-6 text-sm leading-7 text-slate-500">Aucune description détaillée n'a été renseignée pour ce produit.</p>
              )}
              <div className="mt-auto flex gap-3 pt-8">
                <button
                  type="button"
                  onClick={() => toggleFavorite(selectedProduct.product_id)}
                  className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 text-slate-950"
                  style={favorites.includes(selectedProduct.product_id) ? { backgroundColor: brandSurface, borderColor: brandBorder } : undefined}
                  aria-label={favorites.includes(selectedProduct.product_id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                >
                  <Heart className={`h-5 w-5 ${favorites.includes(selectedProduct.product_id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    addToCart(selectedProduct);
                    setCartOpen(true);
                    setSelectedProduct(null);
                  }}
                  disabled={!selectedProduct.available}
                  className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black text-white transition disabled:bg-slate-300"
                  style={{ backgroundColor: selectedProduct.available ? brandColor : undefined }}
                >
                  <ShoppingBag className="h-4 w-4" />
                  Ajouter au panier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
