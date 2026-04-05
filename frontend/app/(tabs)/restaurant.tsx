import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { BorderRadius, FontSize, Spacing } from '../../constants/theme';

type Shortcut = {
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: '/pos' | '/products' | '/tables' | '/reservations' | '/kitchen' | '/accounting';
};

export default function RestaurantHubScreen() {
  const { t } = useTranslation();
  const { colors, glassStyle } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const styles = getStyles(colors, glassStyle);

  const shortcuts: Shortcut[] = [
    {
      label: t('tabs.pos', 'Caisse'),
      description: t('restaurant.hub.pos_desc', 'Prendre une commande et envoyer en cuisine.'),
      icon: 'calculator-outline',
      route: '/pos',
    },
    {
      label: t('tabs.menu', 'Menu'),
      description: t('restaurant.hub.menu_desc', 'Gérer les articles, menus et prix du restaurant.'),
      icon: 'restaurant-outline',
      route: '/products',
    },
    {
      label: t('tabs.tables', 'Tables'),
      description: t('restaurant.hub.tables_desc', 'Voir les tables et mettre à jour leur statut.'),
      icon: 'grid-outline',
      route: '/tables',
    },
    {
      label: t('tabs.reservations', 'Réservations'),
      description: t('restaurant.hub.reservations_desc', 'Suivre les réservations du jour et confirmer les arrivées.'),
      icon: 'calendar-outline',
      route: '/reservations',
    },
    {
      label: t('tabs.kitchen', 'Cuisine'),
      description: t('restaurant.hub.kitchen_desc', 'Consulter les tickets en attente côté cuisine.'),
      icon: 'flame-outline',
      route: '/kitchen',
    },
    {
      label: t('tabs.accounting', 'Comptabilité'),
      description: t('restaurant.hub.accounting_desc', 'Suivre les ventes et la performance financière.'),
      icon: 'bar-chart-outline',
      route: '/accounting',
    },
  ];

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <View style={styles.hero}>
          <Text style={styles.title}>{t('restaurant.hub.title', 'Pilotage restaurant')}</Text>
          <Text style={styles.subtitle}>
            {t('restaurant.hub.subtitle', 'Retrouve ici les modules service, salle, carte et cuisine pour piloter ton restaurant sur mobile.')}
          </Text>
        </View>

        <View style={styles.grid}>
          {shortcuts.map((item) => (
            <TouchableOpacity key={item.route} style={styles.card} onPress={() => router.push(item.route as any)}>
              <View style={styles.iconWrap}>
                <Ionicons name={item.icon} size={22} color={colors.primary} />
              </View>
              <Text style={styles.cardTitle}>{item.label}</Text>
              <Text style={styles.cardText}>{item.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const getStyles = (colors: any, glassStyle: any) =>
  StyleSheet.create({
    gradient: { flex: 1 },
    content: { padding: Spacing.lg, gap: Spacing.lg },
    hero: {
      ...glassStyle,
      padding: Spacing.lg,
      borderRadius: BorderRadius.xl,
      gap: Spacing.sm,
    },
    title: {
      color: colors.text,
      fontSize: FontSize.xl,
      fontWeight: '800',
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: FontSize.sm,
      lineHeight: 20,
    },
    grid: {
      gap: Spacing.md,
    },
    card: {
      ...glassStyle,
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      gap: Spacing.sm,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary + '18',
    },
    cardTitle: {
      color: colors.text,
      fontSize: FontSize.md,
      fontWeight: '700',
    },
    cardText: {
      color: colors.textSecondary,
      fontSize: FontSize.sm,
      lineHeight: 20,
    },
  });
