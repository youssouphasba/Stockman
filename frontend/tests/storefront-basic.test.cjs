const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const { test } = require('node:test');
const root = path.resolve(__dirname, '../..');

const STOREFRONT = 'web-app/src/app/shop/[slug]/StorefrontClient.tsx';
const HISTORICAL_BASIC_FINGERPRINT = '133ea4af04f4e8878e08a2d202436517f9bbb794641297f56f0eb211c02f3a41';
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

function basicBody() {
  const source = ts.createSourceFile(STOREFRONT, fs.readFileSync(path.join(root, STOREFRONT), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const component = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'StockmanBasicStorefront');
  assert.ok(component);
  return { source, component, text: component.body.getText(source) };
}

test('Stockman Basic keeps its exact render; the private preview only adds isolated branches', () => {
  const { text } = basicBody();
  assert.equal(sha256(text), '9a89f6e7a94eff1fbc0a0a81edcb6e482d68bbb8f472f04f09094c562a25be7e');
  // En retirant les seules branches de l'aperçu privé, on retrouve octet pour octet le rendu public historique.
  // Le paiement (Wave, Orange Money, à la livraison) n'ajoute que des branches isolées : sans elles, le rendu qui suit est celui d'avant.
  const paymentBranches = [
    ["  // Paiement : choix du client avant la commande, puis page de paiement de la commande passée.\n  const paymentOptions = paymentOptionsFor(payload?.site.payment, denkma.available);\n  const [chosenPayment, setChosenPayment] = useState<string | null>(null);\n  const paymentMethod = offeredPaymentMethod(paymentOptions, chosenPayment);\n  const placedOrder = usePlacedOrder(slug, !isPreview);\n  const placed = placedOrder.placed;\n  const paymentExpected = Boolean(placed && placed.status !== 'paid' && !['on_delivery', 'other'].includes(placed.method));\n  useEffect(() => {\n    // Le client revient de l'application de son opérateur : la page de paiement se rouvre.\n    if (paymentExpected) setCartOpen(true);\n  }, [paymentExpected]);\n", ""],
    ["          ...(paymentMethod ? { payment_method: paymentMethod } : {}),\n", ""],
    ["      if (paymentOptions && data.payment_token) {\n        placedOrder.place({\n          orderId: data.order_id,\n          orderNumber: data.order_number,\n          token: data.payment_token,\n          amountDue: typeof data.amount_due === 'number' ? data.amount_due : data.total_amount,\n          currency: payload?.site.currency || 'XOF',\n          method: data.payment?.method || 'other',\n          status: 'awaiting',\n          orderStatus: data.status || 'pending',\n        });\n      } else {\n        setOrderNumber(data.order_number);\n      }\n", "      setOrderNumber(data.order_number);\n"],
    ["      {placed && (\n        <div className=\"mb-4\"><OrderPaymentPanel state={placedOrder} options={paymentOptions} variant=\"basic\" format={formatAmount} /></div>\n      )}\n", ""],
    ["      {paymentOptions && cartLines.length > 0 && (\n        <div className=\"mt-4\"><PaymentChoice options={paymentOptions} value={paymentMethod} onChange={setChosenPayment} variant=\"basic\" /></div>\n      )}\n\n", ""],
    ["          <p className=\"font-black\">{paymentOptions ? 'À savoir sur le paiement' : 'Paiement'}</p>\n", "          <p className=\"font-black\">Paiement</p>\n"],
    [" : submitting ? 'Envoi...' : paymentMethod && paymentMethod !== 'on_delivery' ? 'Commander et payer' : 'Envoyer la commande'}", " : submitting ? 'Envoi...' : 'Envoyer la commande'}"],
  ];
  let withoutPayment = text;
  for (const [branch, original] of paymentBranches) {
    assert.equal(withoutPayment.split(branch).length - 1, 1, branch.slice(0, 60));
    withoutPayment = withoutPayment.replace(branch, original);
  }
  for (const name of ['paymentOptions', 'paymentMethod', 'placedOrder']) assert.equal(withoutPayment.includes(name), false, name);
  assert.equal(sha256(withoutPayment), 'bc747b18d85e8307616a30d0b1f02a54c616eb4ff72af299a0a31e6fb9017d23');
  const removals = [
    [`    // L'aperçu privé lit une révision grâce au jeton transmis dans le corps ; le site public garde sa lecture par adresse.
    const request = previewToken
      ? fetch('/api/public/ecommerce/preview', { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: previewToken }) })
      : fetch(\`/api/public/ecommerce/\${slug}\`, { cache: 'no-store' });
    request
`, "    fetch(`/api/public/ecommerce/${slug}`, { cache: 'no-store' })\n"],
    ["throw new Error(previewToken ? PREVIEW_UNAVAILABLE : 'Boutique en ligne introuvable.');", "throw new Error('Boutique en ligne introuvable.');"],
    ['  }, [slug, previewToken]);', '  }, [slug]);'],
    ["  const privatePreview = Boolean(previewToken);\n  const isPreview = privatePreview || searchParams.get('preview') === '1';\n  const previewExpiry = formatPreviewExpiry(payload?.preview?.expires_at);\n", "  const isPreview = searchParams.get('preview') === '1';\n"],
    ['    if (privatePreview) {\n      setError(PREVIEW_ORDER_DISABLED);\n      return;\n    }\n', ''],
    ['    if (privatePreview) {\n      setContactError(PREVIEW_CONTACT_DISABLED);\n      return;\n    }\n', ''],
    [`{privatePreview ? "Commandes désactivées dans l'aperçu" : submitting ? 'Envoi...' : 'Envoyer la commande'}`, "{submitting ? 'Envoi...' : 'Envoyer la commande'}"],
    [`{privatePreview ? "Messages désactivés dans l'aperçu" : contactSubmitting ? 'Envoi...' : 'Envoyer le message'}`, "{contactSubmitting ? 'Envoi...' : 'Envoyer le message'}"],
  ];
  let historical = withoutPayment;
  for (const [preview, original] of removals) {
    assert.equal(historical.split(preview).length - 1, 1, preview.slice(0, 60));
    historical = historical.replace(preview, original);
  }
  const banner = historical.indexOf('      {privatePreview && (');
  assert.ok(banner > 0);
  historical = historical.slice(0, banner) + historical.slice(historical.indexOf('      )}\n', banner) + '      )}\n'.length);
  historical = historical.split('privatePreview || ').join('');
  assert.equal(historical.includes('privatePreview'), false);
  // La livraison Denkma n'ajoute, elle aussi, que des branches isolées : sans elles, le rendu public historique reste identique.
  const denkmaBranches = [
    ["  const denkma = useDenkmaDelivery(slug, Boolean(payload?.site.denkma_delivery), isPreview);\n", ""],
    ["    if (denkma.available && (!denkma.choice || !customerPhone.trim())) {\n      setError(denkma.choice ? 'Indiquez votre téléphone : le livreur Denkma en a besoin.' : 'Choisissez votre position ou votre point relais Denkma.');\n      return;\n    }\n", ""],
    ["          ...(denkma.choice ? { delivery: { provider: 'denkma', destination_session_id: denkma.choice.sessionId } } : {}),\n", ""],
    ["      denkma.reset();\n", ""],
    ["      {denkma.choice && <p className=\"mt-5 flex items-center justify-between text-sm font-semibold text-slate-600\"><span>Livraison Denkma</span><span>{formatAmount(denkma.fee, currency)}</span></p>}\n", ""],
    ["        <span className=\"text-2xl font-black\">{formatAmount(cartTotal + denkma.fee, currency)}</span>\n", "        <span className=\"text-2xl font-black\">{formatAmount(cartTotal, currency)}</span>\n"],
    ["        <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder={denkma.available ? 'Téléphone (obligatoire pour le livreur)' : 'Téléphone'} type=\"tel\" className=\"w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-emerald-500\" />\n", "        <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder=\"Téléphone\" type=\"tel\" className=\"w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-emerald-500\" />\n"],
    ["        {denkma.available || denkma.loading ? <DenkmaDeliveryPicker delivery={denkma} variant=\"basic\" format={(amount) => formatAmount(amount, currency)} /> : <textarea value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} placeholder=\"Adresse de livraison\" rows={3} className=\"w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-emerald-500\" />}\n", "        <textarea value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} placeholder=\"Adresse de livraison\" rows={3} className=\"w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-emerald-500\" />\n"],
  ];
  for (const [branch, original] of denkmaBranches) {
    assert.equal(historical.split(branch).length - 1, 1, branch.slice(0, 60));
    historical = historical.replace(branch, original);
  }
  assert.equal(historical.includes('denkma'), false);
  assert.equal(sha256(historical), HISTORICAL_BASIC_FINGERPRINT);
});

test('The private preview disables commercial actions and never puts the token in a URL', () => {
  const { source, component, text } = basicBody();
  const firstStatement = (name) => {
    let found = null;
    const visit = (node) => {
      if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) found = node.initializer.body.statements[0].getText(source);
      ts.forEachChild(node, visit);
    };
    visit(component);
    return found;
  };
  assert.match(firstStatement('submitOrder'), /^if \(privatePreview\)/);
  assert.match(firstStatement('submitContactRequest'), /^if \(privatePreview\)/);
  assert.match(text, /const isPreview = privatePreview \|\| searchParams\.get\('preview'\) === '1';/);
  assert.match(text, /disabled=\{privatePreview \|\| submitting/);
  assert.match(text, /disabled=\{privatePreview \|\| contactSubmitting/);
  const full = fs.readFileSync(path.join(root, STOREFRONT), 'utf8');
  assert.doesNotMatch(full, /preview\/\$\{previewToken\}|[?&]token=/);
  assert.match(full, /return <Renderer slug=\{slug\} previewToken=\{previewToken\} \/>;/);
  const page = fs.readFileSync(path.join(root, 'web-app/src/app/preview/page.tsx'), 'utf8');
  assert.match(page, /robots: \{ index: false, follow: false, nocache: true/);
  assert.match(page, /referrer: 'no-referrer'/);
  const client = fs.readFileSync(path.join(root, 'web-app/src/app/preview/PreviewClient.tsx'), 'utf8');
  assert.match(client, /window\.location\.hash/);
  assert.match(client, /<StorefrontClient key=\{token\} slug="" previewToken=\{token\} \/>/);
});

test('Missing and unsupported model identifiers fall back to Basic', () => {
  const source = fs.readFileSync(path.join(root, 'web-app/src/lib/ecommerceThemes.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const exports = {};
  const requireContract = (request) => {
    assert.equal(request, './ecommerceThemeContract.json');
    return JSON.parse(fs.readFileSync(path.join(root, 'web-app/src/lib/ecommerceThemeContract.json'), 'utf8'));
  };
  vm.runInNewContext(compiled, { exports, Object, require: requireContract });
  for (const id of [undefined, null, '', 'legacy-v1', 'unsupported', 'toString', '__proto__']) {
    assert.equal(exports.resolveEcommerceModel(id).id, 'legacy-v1');
    assert.equal(exports.resolveEcommerceModel(id).name, 'Stockman Basic');
  }
});

test('Unknown renderers fall back to Basic instead of a blank page', () => {
  const source = fs.readFileSync(path.join(root, 'web-app/src/app/shop/[slug]/StorefrontClient.tsx'), 'utf8');
  assert.match(source, /STOREFRONT_RENDERERS\[model\.id as keyof typeof STOREFRONT_RENDERERS\] \|\| StockmanBasicStorefront/);
});

test('The shared theme contract is identical on the server and the web', () => {
  assert.equal(
    fs.readFileSync(path.join(root, 'web-app/src/lib/ecommerceThemeContract.json'), 'utf8'),
    fs.readFileSync(path.join(root, 'backend/ecommerce_theme_contract.json'), 'utf8'),
  );
});
