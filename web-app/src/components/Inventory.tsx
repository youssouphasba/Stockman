import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Search,
    Filter,
    Download,
    Plus,
    MoreVertical,
    Edit,
    Trash2,
    Eye,
    AlertCircle,
    Sparkles,
    Upload,
    Scan,
    History,
    ChevronDown,
    ChevronUp,
    DollarSign,
    Layers
} from 'lucide-react';
import { products as productsApi, categories as categoriesApi, ai as aiApi } from '../services/api';
import Modal from './Modal';
import BulkImportModal from './BulkImportModal';
import ProductHistoryModal from './ProductHistoryModal';
import BarcodeScanner from './BarcodeScanner';
import BatchScanModal from './BatchScanModal';

export default function Inventory() {
    const { t, i18n } = useTranslation();
    const [products, setProducts] = useState<any[]>([]);
    const [categoriesList, setCategoriesList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modal & Form State
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isBatchScanOpen, setIsBatchScanOpen] = useState(false);
    const [selectedProductForHistory, setSelectedProductForHistory] = useState<any>(null);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState({ category: false, description: false, price: false });

    const [form, setForm] = useState({
        name: '',
        sku: '',
        quantity: 0,
        unit: 'pièce',
        purchase_price: 0,
        selling_price: 0,
        min_stock: 0,
        max_stock: 100,
        category_id: '',
        description: '',
        image: '',
        has_variants: false,
        variants: [] as any[]
    });

    const [showVariantForm, setShowVariantForm] = useState(false);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const [prodsRes, catsRes] = await Promise.all([
                productsApi.list(undefined, 0, 500),
                categoriesApi.list()
            ]);
            setProducts(prodsRes.items || prodsRes);
            setCategoriesList(catsRes);
        } catch (err) {
            console.error('Error fetching inventory data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleOpenAddModal = () => {
        setEditingProduct(null);
        setForm({
            name: '',
            sku: '',
            quantity: 0,
            unit: 'pièce',
            purchase_price: 0,
            selling_price: 0,
            min_stock: 0,
            max_stock: 100,
            category_id: '',
            description: '',
            image: '',
            has_variants: false,
            variants: []
        });
        setIsProductModalOpen(true);
    };

    const handleOpenEditModal = (product: any) => {
        setEditingProduct(product);
        setForm({
            name: product.name,
            sku: product.sku || '',
            quantity: product.quantity,
            unit: product.unit || 'pièce',
            purchase_price: product.purchase_price,
            selling_price: product.selling_price,
            min_stock: product.min_stock || 0,
            max_stock: product.max_stock || 100,
            category_id: product.category_id || '',
            description: product.description || '',
            image: product.image || '',
            has_variants: product.has_variants || false,
            variants: product.variants || []
        });
        setIsProductModalOpen(true);
    };

    const handleOpenHistory = (product: any) => {
        setSelectedProductForHistory(product);
        setIsHistoryModalOpen(true);
    };

    const handleSubmitProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            if (editingProduct) {
                await productsApi.update(editingProduct.product_id, form);
            } else {
                await productsApi.create(form);
            }
            setIsProductModalOpen(false);
            fetchProducts();
        } catch (err) {
            console.error('Error saving product', err);
        } finally {
            setFormLoading(false);
        }
    };

    const handleAiSuggestCategory = async () => {
        if (!form.name || form.name.length < 3) return;
        setAiLoading(prev => ({ ...prev, category: true }));
        try {
            const res = await aiApi.suggestCategory(form.name, i18n.language);
            const matchedCat = categoriesList.find(c => c.name.toLowerCase() === res.category.toLowerCase());
            if (matchedCat) {
                setForm(prev => ({ ...prev, category_id: matchedCat.category_id }));
            }
        } catch (err) {
            console.error('AI Suggest category error', err);
        } finally {
            setAiLoading(prev => ({ ...prev, category: false }));
        }
    };

    const handleAiSuggestPrice = async () => {
        if (!editingProduct) return;
        setAiLoading(prev => ({ ...prev, price: true }));
        try {
            const res = await aiApi.suggestPrice(editingProduct.product_id, i18n.language);
            setForm(prev => ({ ...prev, selling_price: res.suggested_price }));
        } catch (err) {
            console.error('AI Suggest price error', err);
        } finally {
            setAiLoading(prev => ({ ...prev, price: false }));
        }
    };

    const handleAiGenerateDescription = async () => {
        if (!form.name) return;
        setAiLoading(prev => ({ ...prev, description: true }));
        try {
            const res = await aiApi.generateDescription(form.name, undefined, undefined, i18n.language);
            setForm(prev => ({ ...prev, description: res.description }));
        } catch (err) {
            console.error('AI Generate description error', err);
        } finally {
            setAiLoading(prev => ({ ...prev, description: false }));
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setForm(prev => ({ ...prev, image: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const addVariant = () => {
        setForm(prev => ({
            ...prev,
            has_variants: true,
            variants: [...prev.variants, { name: '', quantity: 0, selling_price: prev.selling_price }]
        }));
    };

    const updateVariant = (index: number, field: string, value: any) => {
        const newVariants = [...form.variants];
        newVariants[index] = { ...newVariants[index], [field]: value };
        setForm(prev => ({ ...prev, variants: newVariants }));
    };

    const removeVariant = (index: number) => {
        const newVariants = form.variants.filter((_, i) => i !== index);
        setForm(prev => ({
            ...prev,
            variants: newVariants,
            has_variants: newVariants.length > 0
        }));
    };

    const filteredProducts = (Array.isArray(products) ? products : []).filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading && products.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 overflow-y-auto">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{t('common.stock')}</h1>
                    <p className="text-slate-400">{t('catalog.product_count', { count: filteredProducts.length })}</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="glass-card px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                    >
                        <Upload size={16} />
                        Importer
                    </button>
                    <button
                        onClick={() => setIsBatchScanOpen(true)}
                        className="glass-card px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                    >
                        <Layers size={16} />
                        Scan par lot
                    </button>
                    <button
                        onClick={handleOpenAddModal}
                        className="btn-primary py-2 px-6 flex items-center gap-2"
                    >
                        <Plus size={20} />
                        {t('catalog.add_product')}
                    </button>
                </div>
            </header>

            {/* Filters & Search */}
            <div className="flex gap-4 mb-8">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder={t('catalog.search_placeholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                    />
                </div>
                <button className="glass-card px-6 py-3 text-white flex items-center gap-2 hover:bg-white/10 transition-colors">
                    <Filter size={20} />
                    {t('common.filter')}
                </button>
            </div>

            {/* Products Table */}
            <div className="glass-card overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10 text-slate-400 text-sm bg-white/5 uppercase tracking-wider">
                            <th className="py-4 px-6 font-semibold">Produit</th>
                            <th className="py-4 px-6 font-semibold">Catégorie</th>
                            <th className="py-4 px-6 font-semibold text-center">Stock</th>
                            <th className="py-4 px-6 font-semibold">Prix</th>
                            <th className="py-4 px-6 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-white">
                        {filteredProducts.map((p) => {
                            const matchesMin = p.quantity <= p.min_stock;
                            const isOut = p.quantity === 0;

                            return (
                                <tr key={p.product_id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-4">
                                            {p.image ? (
                                                <img src={p.image} className="w-10 h-10 rounded-lg object-cover" alt={p.name} />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-primary font-bold">
                                                    {p.name.charAt(0)}
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <span className="font-bold">{p.name}</span>
                                                <span className="text-xs text-slate-500 font-mono uppercase">{p.sku || 'SANS-REF'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
                                            {categoriesList.find(c => c.category_id === p.category_id)?.name || t('common.uncategorized')}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={`text-lg font-bold ${isOut ? 'text-red-400' : matchesMin ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                {p.quantity}
                                            </span>
                                            {matchesMin && (
                                                <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-red-400">
                                                    <AlertCircle size={10} />
                                                    Stock Bas
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white">{p.selling_price} F</span>
                                            <span className="text-xs text-slate-500">Achat: {p.purchase_price} F</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleOpenHistory(p)}
                                                className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-primary transition-colors"
                                                title="Historique"
                                            >
                                                <History size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleOpenEditModal(p)}
                                                className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Product Add/Edit Modal */}
            <Modal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                title={editingProduct ? t('catalog.edit_product') : t('catalog.add_product')}
                maxWidth="2xl"
            >
                <form onSubmit={handleSubmitProduct} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Image Section */}
                        <div className="md:col-span-1 space-y-4">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Image du produit</label>
                            <div className="aspect-square rounded-2xl bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center relative overflow-hidden group">
                                {form.image ? (
                                    <>
                                        <img src={form.image} className="w-full h-full object-cover" alt="Preview" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button type="button" onClick={() => setForm(prev => ({ ...prev, image: '' }))} className="p-2 bg-rose-500 rounded-lg text-white">
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <label className="cursor-pointer flex flex-col items-center gap-2">
                                        <Upload className="text-slate-600" size={32} />
                                        <span className="text-xs text-slate-500 font-bold">Ajouter</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Info Section */}
                        <div className="md:col-span-2 space-y-4">
                            <label className="block text-sm font-medium text-slate-300">{t('common.name')}</label>
                            <div className="flex gap-2">
                                <input
                                    required
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-primary/50"
                                />
                                <button
                                    type="button"
                                    onClick={handleAiSuggestCategory}
                                    disabled={aiLoading.category}
                                    className="p-2 glass-card text-primary hover:bg-white/10 disabled:opacity-50"
                                    title="IA Categorisation"
                                >
                                    <Sparkles size={20} className={aiLoading.category ? 'animate-pulse' : ''} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">{t('common.category')}</label>
                                    <select
                                        value={form.category_id}
                                        onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-primary/50 text-sm"
                                    >
                                        <option value="">Choisir...</option>
                                        {categoriesList.map(c => (
                                            <option key={c.category_id} value={c.category_id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">SKU / Code-barres</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={form.sku}
                                            onChange={(e) => setForm({ ...form, sku: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-4 pr-10 py-2 text-white outline-none focus:border-primary/50 font-mono"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setIsScannerOpen(true)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-primary"
                                        >
                                            <Scan size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">{t('common.purchase_price')}</label>
                                    <input
                                        type="number"
                                        value={form.purchase_price}
                                        onChange={(e) => setForm({ ...form, purchase_price: Number(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 flex justify-between">
                                        {t('common.selling_price')}
                                        <button type="button" onClick={handleAiSuggestPrice} disabled={aiLoading.price} className="text-primary hover:underline text-[10px] flex items-center gap-1 font-bold italic">
                                            <Sparkles size={10} className={aiLoading.price ? 'animate-pulse' : ''} /> Suggestion IA
                                        </button>
                                    </label>
                                    <input
                                        type="number"
                                        value={form.selling_price}
                                        onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-primary/50"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Variants Section */}
                    <div className="space-y-4 pt-4 border-t border-white/10">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Variantes de produit</h3>
                            <button type="button" onClick={addVariant} className="text-xs text-primary font-bold flex items-center gap-1 hover:bg-primary/10 px-2 py-1 rounded-lg">
                                <Plus size={14} /> Ajouter une variante
                            </button>
                        </div>
                        {form.variants.length > 0 && (
                            <div className="space-y-3">
                                {form.variants.map((v, i) => (
                                    <div key={i} className="flex gap-4 items-end bg-white/5 p-4 rounded-xl border border-white/10">
                                        <div className="flex-1">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nom (ex: XL, Rouge)</label>
                                            <input
                                                type="text"
                                                value={v.name}
                                                onChange={(e) => updateVariant(i, 'name', e.target.value)}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-primary"
                                                required
                                            />
                                        </div>
                                        <div className="w-24">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Stock</label>
                                            <input
                                                type="number"
                                                value={v.quantity}
                                                onChange={(e) => updateVariant(i, 'quantity', Number(e.target.value))}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-primary"
                                            />
                                        </div>
                                        <div className="w-32">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Prix (Optionnel)</label>
                                            <input
                                                type="number"
                                                value={v.selling_price}
                                                onChange={(e) => updateVariant(i, 'selling_price', Number(e.target.value))}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-primary"
                                            />
                                        </div>
                                        <button type="button" onClick={() => removeVariant(i)} className="p-2 text-slate-500 hover:text-rose-400">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="block text-sm font-medium text-slate-300">{t('common.description')}</label>
                            <button
                                type="button"
                                onClick={handleAiGenerateDescription}
                                disabled={aiLoading.description}
                                className="text-xs text-primary flex items-center gap-1 hover:underline disabled:opacity-50"
                            >
                                <Sparkles size={14} className={aiLoading.description ? 'animate-pulse' : ''} />
                                Générer par IA
                            </button>
                        </div>
                        <textarea
                            rows={3}
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-primary/50 resize-none"
                        />
                    </div>

                    <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
                        <button
                            type="button"
                            onClick={() => setIsProductModalOpen(false)}
                            className="px-6 py-2 rounded-lg text-slate-400 hover:text-white transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={formLoading}
                            className="btn-primary px-10 py-2 disabled:opacity-50 flex items-center gap-2"
                        >
                            {formLoading && <div className="w-4 h-4 border-2 border-white/20 border-b-white rounded-full animate-spin" />}
                            {t('common.save')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Sub-Modals */}
            <BulkImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={fetchProducts}
            />

            <ProductHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                product={selectedProductForHistory}
            />

            {isScannerOpen && (
                <BarcodeScanner
                    onScan={(sku) => setForm(prev => ({ ...prev, sku }))}
                    onClose={() => setIsScannerOpen(false)}
                />
            )}

            {isBatchScanOpen && (
                <BatchScanModal onClose={() => setIsBatchScanOpen(false)} />
            )}
        </div>
    );
}
