import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
    Modal, TextInput, FlatList, RefreshControl, ActivityIndicator,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import {
    projects as projectsApi,
    productsApi,
    Project, ProjectCreate, ProjectDashboard, ProjectMaterial,
} from '../services/api';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Types ───
type SubTab = 'projects' | 'materials' | 'situations';

const CORPS_OPTIONS = [
    { key: 'gros_oeuvre', label: 'Gros œuvre', icon: '🧱' },
    { key: 'plomberie', label: 'Plomberie', icon: '🚿' },
    { key: 'electricite', label: 'Électricité', icon: '⚡' },
    { key: 'peinture', label: 'Peinture', icon: '🎨' },
    { key: 'carrelage', label: 'Carrelage', icon: '🧱' },
    { key: 'menuiserie', label: 'Menuiserie', icon: '🪑' },
    { key: 'toiture', label: 'Toiture', icon: '🏠' },
    { key: 'ferronnerie', label: 'Ferronnerie', icon: '⚒️' },
    { key: 'etancheite', label: 'Étanchéité', icon: '💧' },
    { key: 'autre', label: 'Autre', icon: '📦' },
];

// ─── Main Component ───
export default function ProjectView({ currency }: { currency: string }) {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const [activeTab, setActiveTab] = useState<SubTab>('projects');
    const [projectList, setProjectList] = useState<Project[]>([]);
    const [dashboard, setDashboard] = useState<ProjectDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modals
    const [showNewProject, setShowNewProject] = useState(false);
    const [showAllocate, setShowAllocate] = useState(false);
    const [showLabor, setShowLabor] = useState(false);
    const [showSituation, setShowSituation] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [products, setProducts] = useState<any[]>([]);

    // Form states
    const [newName, setNewName] = useState('');
    const [newClient, setNewClient] = useState('');
    const [newAddress, setNewAddress] = useState('');
    const [newBudget, setNewBudget] = useState('');
    const [newDesc, setNewDesc] = useState('');

    // Allocate form
    const [allocProductId, setAllocProductId] = useState('');
    const [allocQty, setAllocQty] = useState('');
    const [allocCorps, setAllocCorps] = useState('autre');

    // Labor form
    const [laborName, setLaborName] = useState('');
    const [laborRole, setLaborRole] = useState('');
    const [laborDays, setLaborDays] = useState('');
    const [laborRate, setLaborRate] = useState('');
    const [laborCorps, setLaborCorps] = useState('autre');

    // Situation form
    const [sitLabel, setSitLabel] = useState('');
    const [sitPercent, setSitPercent] = useState('');
    const [sitAmount, setSitAmount] = useState('');
    const [sitNotes, setSitNotes] = useState('');

    const loadData = useCallback(async () => {
        try {
            const [p, d] = await Promise.all([
                projectsApi.list(),
                projectsApi.dashboard(),
            ]);
            setProjectList(p);
            setDashboard(d);

            // Load products for material allocation
            const resp = await productsApi.list();
            setProducts(resp.items || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const onRefresh = () => { setRefreshing(true); loadData(); };

    const fmt = (n: number) => {
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
        if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
        return n.toFixed(0);
    };

    // ─── Create project ───
    const handleCreateProject = async () => {
        if (!newName.trim()) return;
        try {
            await projectsApi.create({
                name: newName,
                client_name: newClient,
                address: newAddress,
                budget_estimate: parseFloat(newBudget) || 0,
                description: newDesc,
            });
            setShowNewProject(false);
            setNewName(''); setNewClient(''); setNewAddress(''); setNewBudget(''); setNewDesc('');
            loadData();
        } catch (e: any) {
            Alert.alert('Erreur', e.message);
        }
    };

    // ─── Start project ───
    const handleStartProject = async (p: Project) => {
        try {
            await projectsApi.update(p.project_id, { status: 'en_cours' });
            loadData();
        } catch (e: any) {
            Alert.alert('Erreur', e.message);
        }
    };

    // ─── Complete project ───
    const handleCompleteProject = async (p: Project) => {
        Alert.alert(
            t('projects.complete_confirm_title', 'Clôturer le chantier ?'),
            t('projects.complete_confirm_msg', 'Cette action est irréversible.'),
            [
                { text: t('common.cancel', 'Annuler'), style: 'cancel' },
                {
                    text: t('projects.complete', 'Clôturer'), onPress: async () => {
                        try {
                            await projectsApi.complete(p.project_id);
                            loadData();
                        } catch (e: any) { Alert.alert('Erreur', e.message); }
                    }
                },
            ]
        );
    };

    // ─── Allocate material ───
    const handleAllocate = async () => {
        if (!selectedProject || !allocProductId || !allocQty) return;
        try {
            await projectsApi.allocateMaterial(
                selectedProject.project_id, allocProductId,
                parseFloat(allocQty), allocCorps
            );
            setShowAllocate(false);
            setAllocProductId(''); setAllocQty(''); setAllocCorps('autre');
            loadData();
        } catch (e: any) {
            Alert.alert('Erreur', e.message);
        }
    };

    // ─── Add labor ───
    const handleAddLabor = async () => {
        if (!selectedProject || !laborName) return;
        try {
            await projectsApi.addLabor(
                selectedProject.project_id, laborName, laborRole,
                parseFloat(laborDays) || 1, parseFloat(laborRate) || 0, laborCorps
            );
            setShowLabor(false);
            setLaborName(''); setLaborRole(''); setLaborDays(''); setLaborRate(''); setLaborCorps('autre');
            loadData();
        } catch (e: any) {
            Alert.alert('Erreur', e.message);
        }
    };

    // ─── Add situation ───
    const handleAddSituation = async () => {
        if (!selectedProject || !sitLabel) return;
        try {
            await projectsApi.addSituation(
                selectedProject.project_id, sitLabel,
                parseFloat(sitPercent) || 0, parseFloat(sitAmount) || 0, sitNotes
            );
            setShowSituation(false);
            setSitLabel(''); setSitPercent(''); setSitAmount(''); setSitNotes('');
            loadData();
        } catch (e: any) {
            Alert.alert('Erreur', e.message);
        }
    };

    const statusColor = (s: string) => {
        switch (s) {
            case 'devis': return '#FF9800';
            case 'en_cours': return '#2196F3';
            case 'termine': return '#4CAF50';
            case 'facture': return '#9C27B0';
            default: return '#888';
        }
    };
    const statusLabel = (s: string) => {
        switch (s) {
            case 'devis': return t('projects.status_devis', 'Devis');
            case 'en_cours': return t('projects.status_en_cours', 'En cours');
            case 'termine': return t('projects.status_termine', 'Terminé');
            case 'facture': return t('projects.status_facture', 'Facturé');
            default: return s;
        }
    };

    // ─── Dashboard KPIs ───
    const renderDashboard = () => {
        if (!dashboard) return null;
        const kpis = [
            { label: t('projects.active', 'Actifs'), value: dashboard.active_projects.toString(), icon: '🏗️' },
            { label: t('projects.budget', 'Budget'), value: `${fmt(dashboard.total_budget)} ${currency}`, icon: '💰' },
            { label: t('projects.actual', 'Réel'), value: `${fmt(dashboard.total_actual)} ${currency}`, icon: '📊' },
            { label: t('projects.margin', 'Marge'), value: `${dashboard.margin_percent}%`, icon: '📈' },
        ];
        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {kpis.map((k, i) => (
                    <LinearGradient
                        key={i}
                        colors={[colors.card + 'CC', colors.card + '99']}
                        style={s.kpiCard}
                    >
                        <Text style={{ fontSize: 20 }}>{k.icon}</Text>
                        <Text style={[s.kpiValue, { color: colors.text }]}>{k.value}</Text>
                        <Text style={[s.kpiLabel, { color: colors.textSecondary }]}>{k.label}</Text>
                    </LinearGradient>
                ))}
            </ScrollView>
        );
    };

    // ─── Sub tabs ───
    const tabs: { key: SubTab; label: string; icon: string }[] = [
        { key: 'projects', label: t('projects.tab_projects', 'Chantiers'), icon: 'construct-outline' },
        { key: 'materials', label: t('projects.tab_materials', 'Matériaux'), icon: 'cube-outline' },
        { key: 'situations', label: t('projects.tab_situations', 'Factures'), icon: 'receipt-outline' },
    ];

    // ─── Project Card ───
    const renderProjectCard = (project: Project) => {
        const budgetUsed = project.budget_estimate > 0
            ? Math.round((project.actual_cost / project.budget_estimate) * 100)
            : 0;
        const totalInvoiced = project.situations.reduce((s, sit) => s + sit.amount, 0);

        return (
            <View key={project.project_id} style={[s.card, { backgroundColor: colors.card }]}>
                {/* Header */}
                <View style={s.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.cardTitle, { color: colors.text }]}>{project.name}</Text>
                        {project.client_name ? (
                            <Text style={[s.cardSub, { color: colors.textSecondary }]}>
                                👤 {project.client_name}
                            </Text>
                        ) : null}
                        {project.address ? (
                            <Text style={[s.cardSub, { color: colors.textSecondary }]}>
                                📍 {project.address}
                            </Text>
                        ) : null}
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: statusColor(project.status) + '22' }]}>
                        <Text style={[s.statusText, { color: statusColor(project.status) }]}>
                            {statusLabel(project.status)}
                        </Text>
                    </View>
                </View>

                {/* Budget progress */}
                <View style={s.progressRow}>
                    <Text style={[s.progressLabel, { color: colors.textSecondary }]}>
                        {t('projects.budget_progress', 'Budget')} : {fmt(project.actual_cost)} / {fmt(project.budget_estimate)} {currency}
                    </Text>
                    <Text style={[s.progressPercent, { color: budgetUsed > 100 ? '#F44336' : '#4CAF50' }]}>
                        {budgetUsed}%
                    </Text>
                </View>
                <View style={[s.progressBar, { backgroundColor: colors.border }]}>
                    <View style={[
                        s.progressFill,
                        {
                            width: `${Math.min(budgetUsed, 100)}%`,
                            backgroundColor: budgetUsed > 100 ? '#F44336' : budgetUsed > 80 ? '#FF9800' : '#4CAF50',
                        }
                    ]} />
                </View>

                {/* Stats row */}
                <View style={s.statsRow}>
                    <Text style={[s.statItem, { color: colors.textSecondary }]}>
                        📦 {project.materials_allocated.length} {t('projects.materials_count', 'matériaux')}
                    </Text>
                    <Text style={[s.statItem, { color: colors.textSecondary }]}>
                        👷 {project.labor_entries.length} {t('projects.labor_count', 'ouvriers')}
                    </Text>
                    <Text style={[s.statItem, { color: colors.textSecondary }]}>
                        💰 {fmt(totalInvoiced)} {currency} {t('projects.invoiced', 'facturé')}
                    </Text>
                </View>

                {/* Actions */}
                <View style={s.actionsRow}>
                    {project.status === 'devis' && (
                        <TouchableOpacity
                            style={[s.actionBtn, { backgroundColor: '#2196F3' }]}
                            onPress={() => handleStartProject(project)}
                        >
                            <Ionicons name="play" size={16} color="#fff" />
                            <Text style={s.actionText}>{t('projects.start', 'Démarrer')}</Text>
                        </TouchableOpacity>
                    )}
                    {project.status === 'en_cours' && (
                        <>
                            <TouchableOpacity
                                style={[s.actionBtn, { backgroundColor: '#FF9800' }]}
                                onPress={() => { setSelectedProject(project); setShowAllocate(true); }}
                            >
                                <Ionicons name="cube-outline" size={16} color="#fff" />
                                <Text style={s.actionText}>{t('projects.allocate', 'Matériau')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.actionBtn, { backgroundColor: '#9C27B0' }]}
                                onPress={() => { setSelectedProject(project); setShowLabor(true); }}
                            >
                                <Ionicons name="people-outline" size={16} color="#fff" />
                                <Text style={s.actionText}>{t('projects.labor', 'Ouvrier')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.actionBtn, { backgroundColor: '#607D8B' }]}
                                onPress={() => { setSelectedProject(project); setShowSituation(true); }}
                            >
                                <Ionicons name="receipt-outline" size={16} color="#fff" />
                                <Text style={s.actionText}>{t('projects.situation', 'Facture')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.actionBtn, { backgroundColor: '#4CAF50' }]}
                                onPress={() => handleCompleteProject(project)}
                            >
                                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                                <Text style={s.actionText}>{t('projects.complete', 'Clôturer')}</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        );
    };

    // ─── Materials Tab ───
    const renderMaterials = () => {
        const allMaterials: (ProjectMaterial & { projectName: string })[] = [];
        projectList.forEach(p => {
            p.materials_allocated.forEach(m => {
                allMaterials.push({ ...m, projectName: p.name });
            });
        });
        allMaterials.sort((a, b) => new Date(b.allocated_at).getTime() - new Date(a.allocated_at).getTime());

        if (allMaterials.length === 0) {
            return (
                <View style={s.emptyCenter}>
                    <Text style={{ fontSize: 48 }}>📦</Text>
                    <Text style={[s.emptyTitle, { color: colors.text }]}>
                        {t('projects.no_materials', 'Aucun matériau affecté')}
                    </Text>
                    <Text style={[s.emptySub, { color: colors.textSecondary }]}>
                        {t('projects.no_materials_desc', 'Affectez des matériaux depuis la fiche chantier.')}
                    </Text>
                </View>
            );
        }

        return (
            <FlatList
                data={allMaterials}
                keyExtractor={(item, i) => `${item.allocation_id ?? item.material_id}-${i}`}
                renderItem={({ item }) => (
                    <View style={[s.matRow, { backgroundColor: colors.card }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.matName, { color: colors.text }]}>{item.name}</Text>
                            <Text style={[s.matSub, { color: colors.textSecondary }]}>
                                {item.projectName} · {CORPS_OPTIONS.find(c => c.key === item.corps_metier)?.label || item.corps_metier}
                            </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[s.matQty, { color: colors.text }]}>{item.quantity} {item.unit}</Text>
                            <Text style={[s.matCost, { color: colors.textSecondary }]}>{fmt(item.total_cost)} {currency}</Text>
                        </View>
                    </View>
                )}
            />
        );
    };

    // ─── Situations Tab ───
    const renderSituations = () => {
        const allSituations: { sit: any; projectName: string }[] = [];
        projectList.forEach(p => {
            p.situations.forEach(sit => {
                allSituations.push({ sit, projectName: p.name });
            });
        });
        allSituations.sort((a, b) => new Date(b.sit.date).getTime() - new Date(a.sit.date).getTime());

        if (allSituations.length === 0) {
            return (
                <View style={s.emptyCenter}>
                    <Text style={{ fontSize: 48 }}>💰</Text>
                    <Text style={[s.emptyTitle, { color: colors.text }]}>
                        {t('projects.no_situations', 'Aucune situation de travaux')}
                    </Text>
                    <Text style={[s.emptySub, { color: colors.textSecondary }]}>
                        {t('projects.no_situations_desc', 'Ajoutez des factures progressives depuis la fiche chantier.')}
                    </Text>
                </View>
            );
        }

        return (
            <FlatList
                data={allSituations}
                keyExtractor={(item, i) => item.sit.situation_id + i}
                renderItem={({ item }) => (
                    <View style={[s.matRow, { backgroundColor: colors.card }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.matName, { color: colors.text }]}>{item.sit.label}</Text>
                            <Text style={[s.matSub, { color: colors.textSecondary }]}>
                                {item.projectName} · {item.sit.percent}%
                            </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[s.matQty, { color: colors.text }]}>{fmt(item.sit.amount)} {currency}</Text>
                            <View style={[s.statusBadge, { backgroundColor: item.sit.paid ? '#4CAF5022' : '#FF980022' }]}>
                                <Text style={{ color: item.sit.paid ? '#4CAF50' : '#FF9800', fontSize: 11 }}>
                                    {item.sit.paid ? t('projects.paid', 'Payé') : t('projects.pending', 'En attente')}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}
            />
        );
    };

    // ─── Modal: New Project ───
    const renderNewProjectModal = () => (
        {showNewProject && <Modal visible={showNewProject} transparent animationType="slide">
            <View style={s.modalOverlay}>
                <View style={[s.modalContent, { backgroundColor: colors.card }]}>
                    <Text style={[s.modalTitle, { color: colors.text }]}>
                        {t('projects.new_project', 'Nouveau chantier')}
                    </Text>
                    <TextInput style={[s.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        placeholder={t('projects.project_name', 'Nom du chantier')} placeholderTextColor={colors.textSecondary}
                        value={newName} onChangeText={setNewName} />
                    <TextInput style={[s.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        placeholder={t('projects.client_name', 'Nom du client')} placeholderTextColor={colors.textSecondary}
                        value={newClient} onChangeText={setNewClient} />
                    <TextInput style={[s.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        placeholder={t('projects.address', 'Adresse / Lieu')} placeholderTextColor={colors.textSecondary}
                        value={newAddress} onChangeText={setNewAddress} />
                    <TextInput style={[s.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        placeholder={t('projects.budget_estimate', 'Budget estimé')} placeholderTextColor={colors.textSecondary}
                        value={newBudget} onChangeText={setNewBudget} keyboardType="numeric" />
                    <TextInput style={[s.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, height: 80 }]}
                        placeholder={t('projects.description', 'Description / Notes')} placeholderTextColor={colors.textSecondary}
                        value={newDesc} onChangeText={setNewDesc} multiline />
                    <View style={s.modalActions}>
                        <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.border }]} onPress={() => setShowNewProject(false)}>
                            <Text style={{ color: colors.text }}>{t('common.cancel', 'Annuler')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.modalBtn, { backgroundColor: '#2196F3' }]} onPress={handleCreateProject}>
                            <Text style={{ color: '#fff', fontWeight: '700' }}>{t('projects.create', 'Créer')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>}
    );

    // ─── Modal: Allocate Material ───
    const renderAllocateModal = () => (
        {showAllocate && <Modal visible={showAllocate} transparent animationType="slide">
            <View style={s.modalOverlay}>
                <View style={[s.modalContent, { backgroundColor: colors.card }]}>
                    <Text style={[s.modalTitle, { color: colors.text }]}>
                        {t('projects.allocate_title', 'Affecter un matériau')}
                    </Text>
                    <Text style={[s.modalSub, { color: colors.textSecondary }]}>
                        {selectedProject?.name}
                    </Text>

                    {/* Product picker (simple list) */}
                    <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>{t('projects.select_product', 'Produit')} :</Text>
                    <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                        {products.map((p: any) => (
                            <TouchableOpacity
                                key={p.product_id}
                                style={[s.pickItem, allocProductId === p.product_id && { backgroundColor: '#2196F322' }]}
                                onPress={() => setAllocProductId(p.product_id)}
                            >
                                <Text style={[{ color: colors.text, flex: 1 }]}>{p.name}</Text>
                                <Text style={{ color: colors.textSecondary }}>Stock: {p.quantity} {p.unit}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <TextInput style={[s.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        placeholder={t('projects.quantity', 'Quantité')} placeholderTextColor={colors.textSecondary}
                        value={allocQty} onChangeText={setAllocQty} keyboardType="numeric" />

                    <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>{t('projects.corps_metier', 'Corps de métier')} :</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                        {CORPS_OPTIONS.map(c => (
                            <TouchableOpacity
                                key={c.key}
                                style={[s.corpsChip, allocCorps === c.key && { backgroundColor: '#2196F333', borderColor: '#2196F3' }]}
                                onPress={() => setAllocCorps(c.key)}
                            >
                                <Text>{c.icon} {c.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={s.modalActions}>
                        <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.border }]} onPress={() => setShowAllocate(false)}>
                            <Text style={{ color: colors.text }}>{t('common.cancel', 'Annuler')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.modalBtn, { backgroundColor: '#FF9800' }]} onPress={handleAllocate}>
                            <Text style={{ color: '#fff', fontWeight: '700' }}>{t('projects.allocate', 'Affecter')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>}
    );

    // ─── Modal: Labor ───
    const renderLaborModal = () => (
        {showLabor && <Modal visible={showLabor} transparent animationType="slide">
            <View style={s.modalOverlay}>
                <View style={[s.modalContent, { backgroundColor: colors.card }]}>
                    <Text style={[s.modalTitle, { color: colors.text }]}>
                        {t('projects.add_labor', 'Ajouter main d\'œuvre')}
                    </Text>
                    <TextInput style={[s.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        placeholder={t('projects.worker_name', 'Nom')} placeholderTextColor={colors.textSecondary}
                        value={laborName} onChangeText={setLaborName} />
                    <TextInput style={[s.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        placeholder={t('projects.worker_role', 'Rôle (ex: Maçon)')} placeholderTextColor={colors.textSecondary}
                        value={laborRole} onChangeText={setLaborRole} />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TextInput style={[s.input, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder={t('projects.days', 'Jours')} placeholderTextColor={colors.textSecondary}
                            value={laborDays} onChangeText={setLaborDays} keyboardType="numeric" />
                        <TextInput style={[s.input, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder={t('projects.daily_rate', 'Tarif / jour')} placeholderTextColor={colors.textSecondary}
                            value={laborRate} onChangeText={setLaborRate} keyboardType="numeric" />
                    </View>

                    <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>{t('projects.corps_metier', 'Corps de métier')} :</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                        {CORPS_OPTIONS.map(c => (
                            <TouchableOpacity
                                key={c.key}
                                style={[s.corpsChip, laborCorps === c.key && { backgroundColor: '#9C27B033', borderColor: '#9C27B0' }]}
                                onPress={() => setLaborCorps(c.key)}
                            >
                                <Text>{c.icon} {c.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={s.modalActions}>
                        <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.border }]} onPress={() => setShowLabor(false)}>
                            <Text style={{ color: colors.text }}>{t('common.cancel', 'Annuler')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.modalBtn, { backgroundColor: '#9C27B0' }]} onPress={handleAddLabor}>
                            <Text style={{ color: '#fff', fontWeight: '700' }}>{t('projects.add', 'Ajouter')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>}
    );

    // ─── Modal: Situation ───
    const renderSituationModal = () => (
        {showSituation && <Modal visible={showSituation} transparent animationType="slide">
            <View style={s.modalOverlay}>
                <View style={[s.modalContent, { backgroundColor: colors.card }]}>
                    <Text style={[s.modalTitle, { color: colors.text }]}>
                        {t('projects.add_situation', 'Nouvelle situation de travaux')}
                    </Text>
                    <TextInput style={[s.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        placeholder={t('projects.sit_label', 'Libellé (ex: Gros œuvre terminé)')} placeholderTextColor={colors.textSecondary}
                        value={sitLabel} onChangeText={setSitLabel} />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TextInput style={[s.input, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder={t('projects.sit_percent', '% avancement')} placeholderTextColor={colors.textSecondary}
                            value={sitPercent} onChangeText={setSitPercent} keyboardType="numeric" />
                        <TextInput style={[s.input, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder={t('projects.sit_amount', 'Montant')} placeholderTextColor={colors.textSecondary}
                            value={sitAmount} onChangeText={setSitAmount} keyboardType="numeric" />
                    </View>
                    <TextInput style={[s.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, height: 60 }]}
                        placeholder={t('projects.sit_notes', 'Notes')} placeholderTextColor={colors.textSecondary}
                        value={sitNotes} onChangeText={setSitNotes} multiline />
                    <View style={s.modalActions}>
                        <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.border }]} onPress={() => setShowSituation(false)}>
                            <Text style={{ color: colors.text }}>{t('common.cancel', 'Annuler')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.modalBtn, { backgroundColor: '#607D8B' }]} onPress={handleAddSituation}>
                            <Text style={{ color: '#fff', fontWeight: '700' }}>{t('projects.add', 'Ajouter')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>}
    );

    if (loading) {
        return (
            <View style={[s.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[s.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={s.header}>
                <Text style={[s.headerTitle, { color: colors.text }]}>
                    🏗️ {t('projects.title', 'Chantiers')}
                </Text>
                <TouchableOpacity style={s.addBtn} onPress={() => setShowNewProject(true)}>
                    <Ionicons name="add" size={22} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Dashboard */}
            {renderDashboard()}

            {/* Sub tabs */}
            <View style={s.tabRow}>
                {tabs.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[s.tab, activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Ionicons name={tab.icon as any} size={18} color={activeTab === tab.key ? colors.primary : colors.textSecondary} />
                        <Text style={[s.tabLabel, { color: activeTab === tab.key ? colors.primary : colors.textSecondary }]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content */}
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {activeTab === 'projects' && (
                    projectList.length === 0 ? (
                        <View style={s.emptyCenter}>
                            <Text style={{ fontSize: 48 }}>🏗️</Text>
                            <Text style={[s.emptyTitle, { color: colors.text }]}>
                                {t('projects.no_projects', 'Aucun chantier')}
                            </Text>
                            <Text style={[s.emptySub, { color: colors.textSecondary }]}>
                                {t('projects.no_projects_desc', 'Créez votre premier chantier pour commencer.')}
                            </Text>
                        </View>
                    ) : projectList.map(renderProjectCard)
                )}
                {activeTab === 'materials' && renderMaterials()}
                {activeTab === 'situations' && renderSituations()}
            </ScrollView>

            {/* Modals */}
            {renderNewProjectModal()}
            {renderAllocateModal()}
            {renderLaborModal()}
            {renderSituationModal()}
        </View>
    );
}

// ─── Styles ───
const s = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    headerTitle: { fontSize: 22, fontWeight: '800' },
    addBtn: { backgroundColor: '#2196F3', width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
    // KPIs
    kpiCard: { padding: 14, borderRadius: 14, marginRight: 10, minWidth: 100, alignItems: 'center' },
    kpiValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
    kpiLabel: { fontSize: 11, marginTop: 2 },
    // Tab row
    tabRow: { flexDirection: 'row', marginBottom: 12 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 4 },
    tabLabel: { fontSize: 13, fontWeight: '600' },
    // Card
    card: { borderRadius: 14, padding: 16, marginBottom: 12 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    cardTitle: { fontSize: 17, fontWeight: '700' },
    cardSub: { fontSize: 13, marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 12, fontWeight: '700' },
    // Progress bar
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    progressLabel: { fontSize: 12 },
    progressPercent: { fontSize: 13, fontWeight: '700' },
    progressBar: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
    progressFill: { height: '100%', borderRadius: 3 },
    // Stats
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    statItem: { fontSize: 12 },
    // Actions
    actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    actionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    // Material rows
    matRow: { flexDirection: 'row', padding: 12, borderRadius: 10, marginBottom: 8, alignItems: 'center' },
    matName: { fontSize: 15, fontWeight: '600' },
    matSub: { fontSize: 12, marginTop: 2 },
    matQty: { fontSize: 15, fontWeight: '700' },
    matCost: { fontSize: 12 },
    // Empty
    emptyCenter: { alignItems: 'center', paddingTop: 60 },
    emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 12 },
    emptySub: { fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
    modalTitle: { fontSize: 19, fontWeight: '800', marginBottom: 6 },
    modalSub: { fontSize: 13, marginBottom: 12 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
    modalBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
    input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 10 },
    fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
    pickItem: { flexDirection: 'row', padding: 10, borderRadius: 8, marginBottom: 4 },
    corpsChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#ddd', marginRight: 6 },
});
