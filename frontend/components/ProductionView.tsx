import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Modal,
    Alert,
    FlatList,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import {
    recipes as recipesApi,
    production as productionApi,
    products as productsApi,
    Recipe,
    RecipeCreate,
    ProductionOrder,
    ProductionDashboard,
    FeasibilityResult,
    Product,
} from '../services/api';

const { width } = Dimensions.get('window');

// â”€â”€â”€ Sub-tab type â”€â”€â”€
type SubTab = 'recipes' | 'orders' | 'shop' | 'materials';

// â”€â”€â”€ Dashboard KPIs â”€â”€â”€
function DashboardKPIs({ data, colors, t }: { data: ProductionDashboard | null; colors: any; t: any }) {
    if (!data) return null;
    const kpis = [
        { label: t('production.today', "Aujourd'hui"), value: data.today_productions, icon: 'flame-outline', color: '#F59E0B' },
        { label: t('production.month', 'Ce mois'), value: data.month_productions, icon: 'calendar-outline', color: '#3B82F6' },
        { label: t('production.cost', 'Coût'), value: `${Math.round(data.month_cost).toLocaleString()}`, icon: 'cash-outline', color: '#10B981' },
        { label: t('production.waste', 'Pertes'), value: `${data.waste_percent}%`, icon: 'trash-outline', color: '#EF4444' },
    ];

    return (
        <View style={[s.kpiRow, { backgroundColor: colors.glass }]}>
            {kpis.map((kpi, i) => (
                <View key={i} style={s.kpiItem}>
                    <View style={[s.kpiIcon, { backgroundColor: kpi.color + '20' }]}>
                        <Ionicons name={kpi.icon as any} size={18} color={kpi.color} />
                    </View>
                    <Text style={[s.kpiValue, { color: colors.text }]}>{kpi.value}</Text>
                    <Text style={[s.kpiLabel, { color: colors.textMuted }]}>{kpi.label}</Text>
                </View>
            ))}
        </View>
    );
}

// â”€â”€â”€ Recipe Card â”€â”€â”€
function RecipeCard({
    recipe, colors, t, onProduce, onEdit, onDelete, currency,
}: {
    recipe: Recipe; colors: any; t: any; onProduce: () => void; onEdit: () => void; onDelete: () => void; currency: string;
}) {
    const marginColor = recipe.margin_percent > 50 ? '#10B981' : recipe.margin_percent > 20 ? '#F59E0B' : '#EF4444';

    return (
        <View style={[s.recipeCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
            <View style={s.recipeHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={[s.recipeName, { color: colors.text }]}>{recipe.name}</Text>
                    <Text style={[s.recipeIngredients, { color: colors.textMuted }]}>
                        {recipe.ingredients.map(ing => `${ing.name || ing.product_id} ${ing.quantity}${ing.unit}`).join(' · ')}
                    </Text>
                </View>
                {recipe.category && (
                    <View style={[s.badge, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[s.badgeText, { color: colors.primary }]}>{recipe.category}</Text>
                    </View>
                )}
            </View>

            <View style={s.recipeStats}>
                <View style={s.recipeStat}>
                    <Text style={[s.statLabel, { color: colors.textMuted }]}>{t('production.cost_label', 'Coût')}</Text>
                    <Text style={[s.statValue, { color: colors.text }]}>{Math.round(recipe.total_cost)} {currency}</Text>
                </View>
                <View style={s.recipeStat}>
                    <Text style={[s.statLabel, { color: colors.textMuted }]}>{t('production.output', 'Sortie')}</Text>
                    <Text style={[s.statValue, { color: colors.text }]}>{recipe.output_quantity} {recipe.output_unit}</Text>
                </View>
                <View style={s.recipeStat}>
                    <Text style={[s.statLabel, { color: colors.textMuted }]}>{t('production.margin', 'Marge')}</Text>
                    <Text style={[s.statValue, { color: marginColor }]}>{recipe.margin_percent}%</Text>
                </View>
                {recipe.prep_time_min > 0 && (
                    <View style={s.recipeStat}>
                        <Text style={[s.statLabel, { color: colors.textMuted }]}>â±</Text>
                        <Text style={[s.statValue, { color: colors.text }]}>{recipe.prep_time_min}min</Text>
                    </View>
                )}
            </View>

            <View style={s.recipeActions}>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#10B98120' }]} onPress={onProduce}>
                    <Ionicons name="play" size={16} color="#10B981" />
                    <Text style={[s.actionText, { color: '#10B981' }]}>{t('production.produce', 'Produire')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.primary + '20' }]} onPress={onEdit}>
                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#EF444420' }]} onPress={onDelete}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

// â”€â”€â”€ Order Card â”€â”€â”€
function OrderCard({
    order, colors, t, onStart, onComplete, onCancel, currency,
}: {
    order: ProductionOrder; colors: any; t: any;
    onStart: () => void; onComplete: () => void; onCancel: () => void; currency: string;
}) {
    const statusConfig: Record<string, { color: string; label: string; icon: string }> = {
        planned: { color: '#3B82F6', label: t('production.status_planned', 'Planifié'), icon: 'time-outline' },
        in_progress: { color: '#F59E0B', label: t('production.status_in_progress', 'En cours'), icon: 'hourglass-outline' },
        completed: { color: '#10B981', label: t('production.status_completed', 'Terminé'), icon: 'checkmark-circle-outline' },
        cancelled: { color: '#EF4444', label: t('production.status_cancelled', 'Annulé'), icon: 'close-circle-outline' },
    };
    const sc = statusConfig[order.status] || statusConfig.planned;

    return (
        <View style={[s.orderCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
            <View style={s.orderHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={[s.orderName, { color: colors.text }]}>{order.recipe_name}</Text>
                    <Text style={[s.orderMeta, { color: colors.textMuted }]}>
                        ×{order.batch_multiplier} → {order.planned_output} {order.output_unit}
                    </Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: sc.color + '20' }]}>
                    <Ionicons name={sc.icon as any} size={14} color={sc.color} />
                    <Text style={[s.statusText, { color: sc.color }]}>{sc.label}</Text>
                </View>
            </View>

            <Text style={[s.orderCost, { color: colors.textMuted }]}>
                {t('production.material_cost', 'Coût matières')}: {Math.round(order.total_material_cost)} {currency}
            </Text>

            {order.status === 'planned' && (
                <View style={s.orderActions}>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#10B98120', flex: 1 }]} onPress={onStart}>
                        <Ionicons name="play" size={16} color="#10B981" />
                        <Text style={[s.actionText, { color: '#10B981' }]}>{t('production.start', 'Démarrer')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#EF444420' }]} onPress={onCancel}>
                        <Ionicons name="close" size={16} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            )}
            {order.status === 'in_progress' && (
                <View style={s.orderActions}>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#10B98120', flex: 1 }]} onPress={onComplete}>
                        <Ionicons name="checkmark" size={16} color="#10B981" />
                        <Text style={[s.actionText, { color: '#10B981' }]}>{t('production.complete', 'Terminer')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#EF444420' }]} onPress={onCancel}>
                        <Ionicons name="close" size={16} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• Main Component â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export default function ProductionView({ currency = 'FCFA' }: { currency?: string }) {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const [activeTab, setActiveTab] = useState<SubTab>('recipes');
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Data
    const [recipesList, setRecipesList] = useState<Recipe[]>([]);
    const [ordersList, setOrdersList] = useState<ProductionOrder[]>([]);
    const [dashboard, setDashboard] = useState<ProductionDashboard | null>(null);
    const [rawMaterials, setRawMaterials] = useState<Product[]>([]);
    const [shopProducts, setShopProducts] = useState<Product[]>([]);

    // Modal states
    const [showRecipeModal, setShowRecipeModal] = useState(false);
    const [showProduceModal, setShowProduceModal] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);

    // Recipe form
    const [recipeName, setRecipeName] = useState('');
    const [recipeCategory, setRecipeCategory] = useState('');
    const [outputQty, setOutputQty] = useState('1');
    const [outputUnit, setOutputUnit] = useState('pièce');
    const [prepTime, setPrepTime] = useState('0');
    const [instructions, setInstructions] = useState('');

    // Produce form
    const [batchMultiplier, setBatchMultiplier] = useState('1');
    const [produceNotes, setProduceNotes] = useState('');

    // Complete form
    const [actualOutput, setActualOutput] = useState('');
    const [wasteQty, setWasteQty] = useState('0');

    const loadData = useCallback(async () => {
        try {
            const [r, o, d] = await Promise.all([
                recipesApi.list(),
                productionApi.listOrders(),
                productionApi.dashboard(),
            ]);
            setRecipesList(r);
            setOrdersList(o);
            setDashboard(d);

            // Load products for materials/shop tabs
            const response = await productsApi.list();
            const allProducts = response.items || [];
            setRawMaterials(allProducts.filter((p: any) => p.product_type === 'raw_material'));
            setShopProducts(allProducts.filter((p: any) => !p.product_type || p.product_type === 'standard'));
        } catch (e) {
            console.error('Production load error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const onRefresh = () => { setRefreshing(true); loadData(); };

    // â”€â”€â”€ Recipe Actions â”€â”€â”€
    const handleCreateRecipe = async () => {
        if (!recipeName.trim()) return;
        try {
            const data: RecipeCreate = {
                name: recipeName.trim(),
                category: recipeCategory || undefined,
                output_quantity: parseFloat(outputQty) || 1,
                output_unit: outputUnit,
                prep_time_min: parseInt(prepTime) || 0,
                instructions: instructions || undefined,
                ingredients: [],
            };
            await recipesApi.create(data);
            setShowRecipeModal(false);
            resetRecipeForm();
            loadData();
        } catch (e: any) {
            Alert.alert(t('common.error'), e?.message || 'Error');
        }
    };

    const handleDeleteRecipe = (recipe: Recipe) => {
        Alert.alert(
            t('production.delete_recipe', 'Supprimer la recette'),
            `${recipe.name} ?`,
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'), style: 'destructive',
                    onPress: async () => {
                        try {
                            await recipesApi.delete(recipe.recipe_id);
                            loadData();
                        } catch (e: any) {
                            Alert.alert(t('common.error'), e?.message || 'Error');
                        }
                    }
                }
            ]
        );
    };

    // â”€â”€â”€ Production Actions â”€â”€â”€
    const handleProduce = async () => {
        if (!selectedRecipe) return;
        try {
            const mult = parseFloat(batchMultiplier) || 1;
            await productionApi.createOrder(selectedRecipe.recipe_id, mult, produceNotes);
            setShowProduceModal(false);
            setBatchMultiplier('1');
            setProduceNotes('');
            setSelectedRecipe(null);
            loadData();
        } catch (e: any) {
            Alert.alert(t('common.error'), e?.message || 'Error');
        }
    };

    const handleStartOrder = async (order: ProductionOrder) => {
        try {
            await productionApi.startOrder(order.order_id);
            loadData();
        } catch (e: any) {
            Alert.alert(t('common.error'), e?.message || 'Error');
        }
    };

    const handleCompleteOrder = async () => {
        if (!selectedOrder) return;
        try {
            const output = parseFloat(actualOutput) || selectedOrder.planned_output;
            const waste = parseFloat(wasteQty) || 0;
            await productionApi.completeOrder(selectedOrder.order_id, output, waste);
            setShowCompleteModal(false);
            setSelectedOrder(null);
            setActualOutput('');
            setWasteQty('0');
            loadData();
        } catch (e: any) {
            Alert.alert(t('common.error'), e?.message || 'Error');
        }
    };

    const handleCancelOrder = async (order: ProductionOrder) => {
        Alert.alert(
            t('production.cancel_order', 'Annuler l\'ordre'),
            t('production.cancel_confirm', 'Les matières premières seront remises en stock.'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.confirm'), style: 'destructive',
                    onPress: async () => {
                        try {
                            await productionApi.cancelOrder(order.order_id);
                            loadData();
                        } catch (e: any) {
                            Alert.alert(t('common.error'), e?.message || 'Error');
                        }
                    }
                }
            ]
        );
    };

    const resetRecipeForm = () => {
        setRecipeName('');
        setRecipeCategory('');
        setOutputQty('1');
        setOutputUnit('pièce');
        setPrepTime('0');
        setInstructions('');
    };

    // â”€â”€â”€ Sub-tabs â”€â”€â”€
    const tabs: { key: SubTab; label: string; icon: string }[] = [
        { key: 'recipes', label: t('production.tab_recipes', 'Recettes'), icon: 'flask-outline' },
        { key: 'orders', label: t('production.tab_orders', 'Ordres'), icon: 'clipboard-outline' },
        { key: 'shop', label: t('production.tab_shop', 'Boutique'), icon: 'bag-outline' },
        { key: 'materials', label: t('production.tab_materials', 'Matières'), icon: 'leaf-outline' },
    ];

    if (loading) {
        return (
            <View style={[s.center, { backgroundColor: colors.bgDark }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[s.container, { backgroundColor: colors.bgDark }]}>
            {/* Dashboard KPIs */}
            <DashboardKPIs data={dashboard} colors={colors} t={t} />

            {/* Sub-tab bar */}
            <View style={[s.tabBar, { borderBottomColor: colors.glassBorder }]}>
                {tabs.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[s.tab, activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Ionicons name={tab.icon as any} size={18} color={activeTab === tab.key ? colors.primary : colors.textMuted} />
                        <Text style={[s.tabLabel, { color: activeTab === tab.key ? colors.primary : colors.textMuted }]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                contentContainerStyle={s.content}
            >
                {/* â”€â”€â”€ Recipes Tab â”€â”€â”€ */}
                {activeTab === 'recipes' && (
                    <>
                        <TouchableOpacity
                            style={[s.addButton, { backgroundColor: colors.primary }]}
                            onPress={() => setShowRecipeModal(true)}
                        >
                            <Ionicons name="add" size={20} color="#fff" />
                            <Text style={s.addButtonText}>{t('production.new_recipe', 'Nouvelle recette')}</Text>
                        </TouchableOpacity>

                        {recipesList.length === 0 ? (
                            <View style={s.emptyState}>
                                <Ionicons name="flask-outline" size={64} color={colors.textMuted} />
                                <Text style={[s.emptyTitle, { color: colors.text }]}>
                                    {t('production.no_recipes', 'Aucune recette')}
                                </Text>
                                <Text style={[s.emptyDesc, { color: colors.textMuted }]}>
                                    {t('production.no_recipes_desc', 'Créez votre première recette pour commencer à produire.')}
                                </Text>
                            </View>
                        ) : (
                            recipesList.map(recipe => (
                                <RecipeCard
                                    key={recipe.recipe_id}
                                    recipe={recipe}
                                    colors={colors}
                                    t={t}
                                    currency={currency}
                                    onProduce={() => { setSelectedRecipe(recipe); setShowProduceModal(true); }}
                                    onEdit={() => {}}
                                    onDelete={() => handleDeleteRecipe(recipe)}
                                />
                            ))
                        )}
                    </>
                )}

                {/* â”€â”€â”€ Orders Tab â”€â”€â”€ */}
                {activeTab === 'orders' && (
                    <>
                        {ordersList.length === 0 ? (
                            <View style={s.emptyState}>
                                <Ionicons name="clipboard-outline" size={64} color={colors.textMuted} />
                                <Text style={[s.emptyTitle, { color: colors.text }]}>
                                    {t('production.no_orders', 'Aucun ordre de production')}
                                </Text>
                                <Text style={[s.emptyDesc, { color: colors.textMuted }]}>
                                    {t('production.no_orders_desc', 'Lancez une production depuis l\'onglet Recettes.')}
                                </Text>
                            </View>
                        ) : (
                            ordersList.map(order => (
                                <OrderCard
                                    key={order.order_id}
                                    order={order}
                                    colors={colors}
                                    t={t}
                                    currency={currency}
                                    onStart={() => handleStartOrder(order)}
                                    onComplete={() => {
                                        setSelectedOrder(order);
                                        setActualOutput(String(order.planned_output));
                                        setShowCompleteModal(true);
                                    }}
                                    onCancel={() => handleCancelOrder(order)}
                                />
                            ))
                        )}
                    </>
                )}

                {/* â”€â”€â”€ Shop Tab (standard products) â”€â”€â”€ */}
                {activeTab === 'shop' && (
                    <>
                        <Text style={[s.sectionTitle, { color: colors.text }]}>
                            {t('production.shop_desc', 'Produits revendus (non produits)')}
                        </Text>
                        {shopProducts.length === 0 ? (
                            <View style={s.emptyState}>
                                <Ionicons name="bag-outline" size={64} color={colors.textMuted} />
                                <Text style={[s.emptyTitle, { color: colors.text }]}>
                                    {t('production.no_shop', 'Aucun produit boutique')}
                                </Text>
                            </View>
                        ) : (
                            shopProducts.slice(0, 50).map(p => (
                                <View key={p.product_id} style={[s.productRow, { borderBottomColor: colors.glassBorder }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[s.productName, { color: colors.text }]}>{p.name}</Text>
                                        <Text style={[s.productMeta, { color: colors.textMuted }]}>
                                            {p.selling_price} {currency} · Stock: {p.quantity} {p.unit || ''}
                                        </Text>
                                    </View>
                                    <View style={[s.stockBadge, {
                                        backgroundColor: p.quantity <= 0 ? '#EF444420' : p.quantity <= (p.min_stock || 5) ? '#F59E0B20' : '#10B98120'
                                    }]}>
                                        <Text style={{
                                            color: p.quantity <= 0 ? '#EF4444' : p.quantity <= (p.min_stock || 5) ? '#F59E0B' : '#10B981',
                                            fontWeight: '700', fontSize: 13,
                                        }}>{p.quantity}</Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </>
                )}

                {/* â”€â”€â”€ Materials Tab (raw materials) â”€â”€â”€ */}
                {activeTab === 'materials' && (
                    <>
                        <Text style={[s.sectionTitle, { color: colors.text }]}>
                            {t('production.materials_desc', 'Matières premières pour la production')}
                        </Text>
                        {rawMaterials.length === 0 ? (
                            <View style={s.emptyState}>
                                <Ionicons name="leaf-outline" size={64} color={colors.textMuted} />
                                <Text style={[s.emptyTitle, { color: colors.text }]}>
                                    {t('production.no_materials', 'Aucune matière première')}
                                </Text>
                                <Text style={[s.emptyDesc, { color: colors.textMuted }]}>
                                    {t('production.no_materials_desc', 'Ajoutez des produits avec le type "Matière première" pour les voir ici.')}
                                </Text>
                            </View>
                        ) : (
                            rawMaterials.map(p => (
                                <View key={p.product_id} style={[s.productRow, { borderBottomColor: colors.glassBorder }]}>
                                    <View style={[s.materialIcon, { backgroundColor: '#10B98120' }]}>
                                        <Ionicons name="leaf" size={16} color="#10B981" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[s.productName, { color: colors.text }]}>{p.name}</Text>
                                        <Text style={[s.productMeta, { color: colors.textMuted }]}>
                                            {p.purchase_price} {currency}/{p.unit || 'unité'} · Stock: {p.quantity}
                                        </Text>
                                    </View>
                                    <View style={[s.stockBadge, {
                                        backgroundColor: p.quantity <= 0 ? '#EF444420' : p.quantity <= (p.min_stock || 5) ? '#F59E0B20' : '#10B98120'
                                    }]}>
                                        <Text style={{
                                            color: p.quantity <= 0 ? '#EF4444' : p.quantity <= (p.min_stock || 5) ? '#F59E0B' : '#10B981',
                                            fontWeight: '700', fontSize: 13,
                                        }}>{p.quantity}</Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </>
                )}
            </ScrollView>

            {/* â•â•â• Create Recipe Modal â•â•â• */}
            {showRecipeModal && <Modal visible={showRecipeModal} animationType="slide" transparent onRequestClose={() => setShowRecipeModal(false)}>
                <View style={s.modalOverlay}>
                    <View style={[s.modalContent, { backgroundColor: colors.bgDark }]}>
                        <View style={s.modalHeader}>
                            <Text style={[s.modalTitle, { color: colors.text }]}>{t('production.new_recipe', 'Nouvelle recette')}</Text>
                            <TouchableOpacity onPress={() => setShowRecipeModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ flex: 1 }}>
                            <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{t('production.recipe_name', 'Nom de la recette')}</Text>
                            <TextInput
                                style={[s.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.glassBorder }]}
                                value={recipeName}
                                onChangeText={setRecipeName}
                                placeholder={t('production.recipe_name_hint', 'Ex: Baguette tradition')}
                                placeholderTextColor={colors.textMuted}
                            />

                            <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{t('production.category', 'Catégorie')}</Text>
                            <TextInput
                                style={[s.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.glassBorder }]}
                                value={recipeCategory}
                                onChangeText={setRecipeCategory}
                                placeholder={t('production.category_hint', 'Ex: Pains, Viennoiseries')}
                                placeholderTextColor={colors.textMuted}
                            />

                            <View style={s.rowFields}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{t('production.output_qty', 'Qté produite')}</Text>
                                    <TextInput
                                        style={[s.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.glassBorder }]}
                                        value={outputQty}
                                        onChangeText={setOutputQty}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{t('production.output_unit', 'Unité')}</Text>
                                    <TextInput
                                        style={[s.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.glassBorder }]}
                                        value={outputUnit}
                                        onChangeText={setOutputUnit}
                                        placeholder="pièce"
                                        placeholderTextColor={colors.textMuted}
                                    />
                                </View>
                            </View>

                            <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{t('production.prep_time', 'Temps préparation (min)')}</Text>
                            <TextInput
                                style={[s.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.glassBorder }]}
                                value={prepTime}
                                onChangeText={setPrepTime}
                                keyboardType="numeric"
                            />

                            <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{t('production.instructions', 'Instructions (optionnel)')}</Text>
                            <TextInput
                                style={[s.input, s.textArea, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.glassBorder }]}
                                value={instructions}
                                onChangeText={setInstructions}
                                multiline
                                numberOfLines={3}
                                placeholder={t('production.instructions_hint', 'Étapes de préparation...')}
                                placeholderTextColor={colors.textMuted}
                            />

                            <Text style={[s.helpText, { color: colors.textMuted }]}>
                                {t('production.ingredients_later', '💡 Vous pourrez ajouter les ingrédients après la création de la recette.')}
                            </Text>
                        </ScrollView>

                        <TouchableOpacity style={[s.submitBtn, { backgroundColor: colors.primary }]} onPress={handleCreateRecipe}>
                            <Text style={s.submitBtnText}>{t('production.create_recipe', 'Créer la recette')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>}

            {/* â•â•â• Produce Modal â•â•â• */}
            {showProduceModal && <Modal visible={showProduceModal} animationType="slide" transparent onRequestClose={() => setShowProduceModal(false)}>
                <View style={s.modalOverlay}>
                    <View style={[s.modalContent, { backgroundColor: colors.bgDark, maxHeight: '50%' }]}>
                        <View style={s.modalHeader}>
                            <Text style={[s.modalTitle, { color: colors.text }]}>
                                {t('production.produce', 'Produire')}: {selectedRecipe?.name}
                            </Text>
                            <TouchableOpacity onPress={() => setShowProduceModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{t('production.multiplier', 'Multiplicateur')}</Text>
                        <TextInput
                            style={[s.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.glassBorder }]}
                            value={batchMultiplier}
                            onChangeText={setBatchMultiplier}
                            keyboardType="numeric"
                            placeholder="1"
                            placeholderTextColor={colors.textMuted}
                        />
                        {selectedRecipe && (
                            <Text style={[s.helpText, { color: colors.textMuted }]}>
                                → {(selectedRecipe.output_quantity * (parseFloat(batchMultiplier) || 1)).toFixed(0)} {selectedRecipe.output_unit}
                            </Text>
                        )}

                        <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{t('production.notes', 'Notes')}</Text>
                        <TextInput
                            style={[s.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.glassBorder }]}
                            value={produceNotes}
                            onChangeText={setProduceNotes}
                            placeholder={t('production.notes_hint', 'Notes optionnelles...')}
                            placeholderTextColor={colors.textMuted}
                        />

                        <TouchableOpacity style={[s.submitBtn, { backgroundColor: '#10B981' }]} onPress={handleProduce}>
                            <Ionicons name="play" size={18} color="#fff" />
                            <Text style={s.submitBtnText}>{t('production.create_order', 'Lancer la production')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>}

            {/* â•â•â• Complete Modal â•â•â• */}
            {showCompleteModal && <Modal visible={showCompleteModal} animationType="slide" transparent onRequestClose={() => setShowCompleteModal(false)}>
                <View style={s.modalOverlay}>
                    <View style={[s.modalContent, { backgroundColor: colors.bgDark, maxHeight: '50%' }]}>
                        <View style={s.modalHeader}>
                            <Text style={[s.modalTitle, { color: colors.text }]}>
                                {t('production.complete', 'Terminer')}: {selectedOrder?.recipe_name}
                            </Text>
                            <TouchableOpacity onPress={() => setShowCompleteModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{t('production.actual_output', 'Quantité réelle produite')}</Text>
                        <TextInput
                            style={[s.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.glassBorder }]}
                            value={actualOutput}
                            onChangeText={setActualOutput}
                            keyboardType="numeric"
                        />

                        <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{t('production.waste', 'Pertes')}</Text>
                        <TextInput
                            style={[s.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.glassBorder }]}
                            value={wasteQty}
                            onChangeText={setWasteQty}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={colors.textMuted}
                        />

                        <TouchableOpacity style={[s.submitBtn, { backgroundColor: '#10B981' }]} onPress={handleCompleteOrder}>
                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                            <Text style={s.submitBtnText}>{t('production.mark_complete', 'Marquer comme terminé')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>}
        </View>
    );
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• Styles â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const s = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 16, paddingBottom: 100 },

    // KPIs
    kpiRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, marginHorizontal: 12, marginTop: 8, borderRadius: 12 },
    kpiItem: { flex: 1, alignItems: 'center' },
    kpiIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    kpiValue: { fontSize: 16, fontWeight: '800' },
    kpiLabel: { fontSize: 10, fontWeight: '500', marginTop: 2 },

    // Tabs
    tabBar: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 8 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10 },
    tabLabel: { fontSize: 11, fontWeight: '600' },

    // Recipe Card
    recipeCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
    recipeHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    recipeName: { fontSize: 16, fontWeight: '700' },
    recipeIngredients: { fontSize: 12, marginTop: 2 },
    recipeStats: { flexDirection: 'row', gap: 12, marginBottom: 10 },
    recipeStat: { alignItems: 'center' },
    statLabel: { fontSize: 10, fontWeight: '500' },
    statValue: { fontSize: 14, fontWeight: '700' },
    recipeActions: { flexDirection: 'row', gap: 8 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
    actionText: { fontSize: 13, fontWeight: '600' },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    badgeText: { fontSize: 11, fontWeight: '600' },

    // Order Card
    orderCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
    orderHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    orderName: { fontSize: 15, fontWeight: '700' },
    orderMeta: { fontSize: 12, marginTop: 2 },
    orderCost: { fontSize: 12, marginBottom: 8 },
    orderActions: { flexDirection: 'row', gap: 8 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 11, fontWeight: '600' },

    // Product rows
    productRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
    productName: { fontSize: 14, fontWeight: '600' },
    productMeta: { fontSize: 12, marginTop: 2 },
    stockBadge: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    materialIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

    // Empty state
    emptyState: { alignItems: 'center', paddingVertical: 48 },
    emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
    emptyDesc: { fontSize: 13, textAlign: 'center', marginTop: 8, paddingHorizontal: 32 },

    // Add button
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, marginBottom: 16 },
    addButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },

    sectionTitle: { fontSize: 13, fontWeight: '600', marginBottom: 12 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '700' },

    // Form
    fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
    input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    rowFields: { flexDirection: 'row', gap: 12 },
    helpText: { fontSize: 12, marginTop: 8, fontStyle: 'italic' },
    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 10, marginTop: 16 },
    submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
