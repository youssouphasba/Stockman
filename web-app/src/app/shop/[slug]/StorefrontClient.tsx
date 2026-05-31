'use client';

import { useEffect, useMemo, useState } from 'react';
import { Grid2X2, Heart, Menu, Minus, Plus, Search, Send, ShoppingBag, SlidersHorizontal, Trash2 } from 'lucide-react';

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
};

type SitePayload = {
  site: PublicSite;
  products: PublicProduct[];
};

type CartLine = {
  product: PublicProduct;
  quantity: number;
};

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

export default function StorefrontClient({ slug }: { slug: string }) {
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

  const cartLines = Object.values(cart);
  const cartTotal = cartLines.reduce((sum, line) => sum + line.product.selling_price * line.quantity, 0);
  const cartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const currency = payload?.site.currency || 'XOF';
  const brandColor = payload?.site.brand_color || '#047857';
  const whatsappLink = payload?.site.whatsapp_phone
    ? `https://wa.me/${payload.site.whatsapp_phone.replace(/[^\d]/g, '')}`
    : null;

  const addToCart = (product: PublicProduct) => {
    if (!product.available) return;
    setCart((current) => {
      const previous = current[product.product_id]?.quantity || 0;
      const nextQuantity = Math.min(previous + 1, Math.max(0, product.quantity));
      return {
        ...current,
        [product.product_id]: { product, quantity: nextQuantity },
      };
    });
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
    <main className="min-h-screen bg-white text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="truncate text-xl font-black tracking-tight text-slate-950">{payload?.site.name}</p>
            {(payload?.site.phone || whatsappLink) && (
              <div className="mt-1 flex items-center gap-3 text-xs font-medium text-slate-500">
                {payload?.site.phone && <span>{payload.site.phone}</span>}
                {whatsappLink && <a href={whatsappLink} target="_blank" rel="noreferrer" style={{ color: brandColor }}>WhatsApp</a>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="relative rounded-full p-3 text-slate-950">
              <ShoppingBag className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute right-0 top-0 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-black text-white" style={{ backgroundColor: brandColor }}>
                  {cartCount}
                </span>
              )}
            </button>
            <button type="button" className="rounded-full p-3 text-slate-950">
              <Menu className="h-7 w-7" />
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {(payload?.site.hero_title || payload?.site.welcome_message) && (
          <div className="mb-6">
            {payload?.site.hero_title && <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">{payload.site.hero_title}</h1>}
            {payload?.site.welcome_message && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{payload.site.welcome_message}</p>}
          </div>
        )}
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
          <label className="flex h-14 items-center gap-3 rounded-md bg-slate-100 px-4">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Recherche..."
              className="min-w-0 flex-1 bg-transparent text-base font-medium outline-none placeholder:text-slate-400"
            />
            <Search className="h-6 w-6 text-slate-950" />
          </label>
          <button type="button" className="hidden h-14 w-14 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-slate-950 sm:flex">
            <Grid2X2 className="h-6 w-6" />
          </button>
          {categories.length > 0 ? (
            <label className="flex h-14 w-14 items-center justify-center rounded-md bg-slate-100 text-slate-950">
              <SlidersHorizontal className="h-5 w-5" />
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                aria-label="Filtrer par catÃ©gorie"
                className="absolute h-14 w-14 cursor-pointer opacity-0"
              >
                <option value="all">Toutes les catÃ©gories</option>
                {categories.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
          ) : (
            <button type="button" className="flex h-14 w-14 items-center justify-center rounded-md bg-slate-100 text-slate-950">
              <SlidersHorizontal className="h-5 w-5" />
            </button>
          )}
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-8 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
        <section>
          {filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
              Aucun produit disponible pour cette recherche.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <article key={product.product_id} className="group bg-white">
                  <div className="aspect-square overflow-hidden bg-slate-100">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-400">
                        <ShoppingBag className="h-9 w-9" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 pt-3">
                    <div>
                      <h2 className="line-clamp-2 min-h-11 text-sm font-semibold uppercase tracking-wide text-slate-700 sm:text-base">{product.name}</h2>
                      {product.category && <p className="mt-1 text-xs font-medium uppercase text-slate-400">{product.category}</p>}
                    </div>
                    <div>
                      <div className="text-base font-medium text-slate-950 sm:text-lg">{formatAmount(product.selling_price, currency)}</div>
                      <div className={`mt-1 text-xs font-semibold ${product.available ? 'text-slate-500' : 'text-rose-600'}`}>
                        {product.quantity > 0 ? `${product.quantity} ${product.unit || ''} disponible(s)` : 'Rupture'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => addToCart(product)}
                        disabled={!product.available}
                        className="flex h-11 w-11 items-center justify-center border border-slate-300 bg-slate-100 text-slate-950 transition hover:bg-slate-200 disabled:text-slate-300"
                        aria-label={`Ajouter ${product.name}`}
                      >
                        <ShoppingBag className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        disabled
                        className="flex h-11 w-11 items-center justify-center border border-slate-300 bg-slate-100 text-slate-950 disabled:opacity-60"
                        aria-label="Favori"
                      >
                        <Heart className="h-5 w-5 fill-slate-950" />
                      </button>
                    </div>
                    {product.description && (
                      <p className="line-clamp-2 text-xs leading-5 text-slate-500 sm:text-sm">{product.description}</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black">Commande</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{cartCount} article{cartCount > 1 ? 's' : ''}</span>
          </div>

          <div className="space-y-3">
            {cartLines.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Ajoutez des produits pour prÃ©parer votre commande.</p>
            ) : (
              cartLines.map((line) => (
                <div key={line.product.product_id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{line.product.name}</p>
                      <p className="text-sm text-slate-600">{formatAmount(line.product.selling_price, currency)}</p>
                    </div>
                    <button type="button" onClick={() => updateQuantity(line.product.product_id, 0)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="inline-flex items-center rounded-xl border border-slate-200">
                      <button type="button" onClick={() => updateQuantity(line.product.product_id, line.quantity - 1)} className="p-2">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-10 px-2 text-center text-sm font-black">{line.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(line.product.product_id, line.quantity + 1)} className="p-2">
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
              Commande envoyÃ©e : {orderNumber}. La boutique vous recontactera pour confirmer.
            </div>
          )}
          {error && payload && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Nom complet" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-emerald-500" />
            <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="TÃ©lÃ©phone" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-emerald-500" />
            <input value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="Email" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-emerald-500" />
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
      </div>
    </main>
  );
}
