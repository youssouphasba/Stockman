import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, BorderRadius, FontSize } from '../constants/theme';
import { useTranslation } from 'react-i18next';
import { HELP_MODULES, FAQ, HelpModule, HelpFeature, FAQItem } from '../constants/helpContent';

type Props = {
  visible: boolean;
  onClose: () => void;
  onLaunchGuide: (guideKey: string) => void;
  userRole?: 'shopkeeper' | 'supplier' | 'all';
};

export default function HelpCenter({ visible, onClose, onLaunchGuide, userRole = 'shopkeeper' }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const filteredModules = useMemo(() => {
    return HELP_MODULES.filter(
      (m) => m.role === 'all' || m.role === userRole
    );
  }, [userRole]);

  const query = searchQuery.toLowerCase().trim();

  const searchResults = useMemo(() => {
    if (!query) return null;

    const moduleResults: { module: HelpModule; features: HelpFeature[] }[] = [];
    for (const m of filteredModules) {
      const matched = m.features.filter(
        (f) =>
          t(f.title).toLowerCase().includes(query) ||
          t(f.description).toLowerCase().includes(query)
      );
      if (matched.length > 0 || t(m.title).toLowerCase().includes(query)) {
        moduleResults.push({ module: m, features: matched.length > 0 ? matched : m.features.slice(0, 2) });
      }
    }

    const faqResults: FAQItem[] = FAQ.filter(
      (f) =>
        t(f.question).toLowerCase().includes(query) ||
        t(f.answer).toLowerCase().includes(query)
    );

    return { modules: moduleResults, faq: faqResults };
  }, [query, filteredModules]);

  function toggleModule(key: string) {
    setExpandedModule(expandedModule === key ? null : key);
  }

  function toggleFaq(index: number) {
    setExpandedFaq(expandedFaq === index ? null : index);
  }

  function handleLaunchGuide(guideKey: string) {
    onClose();
    setTimeout(() => onLaunchGuide(guideKey), 300);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: colors.bgDark }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerIconWrap, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="book-outline" size={22} color={colors.primary} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('help.title')}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchRow, { backgroundColor: colors.inputBg || colors.glass, borderColor: colors.divider }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('help.search_placeholder')}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
          {searchResults ? (
            /* ─── Search Results ─── */
            <>
              {searchResults.modules.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                    {t('help.results', { count: searchResults.modules.reduce((sum, r) => sum + r.features.length, 0) })}
                  </Text>
                  {searchResults.modules.map((result) => (
                    <View key={result.module.key} style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
                      <View style={styles.moduleHeader}>
                        <View style={[styles.moduleIcon, { backgroundColor: result.module.color + '20' }]}>
                          <Ionicons name={result.module.icon} size={18} color={result.module.color} />
                        </View>
                        <Text style={[styles.moduleName, { color: colors.text }]}>{t(result.module.title)}</Text>
                      </View>
                      {result.features.map((f, i) => (
                        <View key={i} style={[styles.featureRow, { borderTopColor: colors.divider }]}>
                          <Ionicons name={f.icon} size={16} color={colors.primary} style={{ marginTop: 2 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.featureTitle, { color: colors.text }]}>{t(f.title)}</Text>
                            <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{t(f.description)}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ))}
                </>
              )}

              {searchResults.faq.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: Spacing.md }]}>
                    {t('help.faq_title')}
                  </Text>
                  {searchResults.faq.map((faq, i) => (
                    <View key={i} style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
                      <Text style={[styles.faqQuestion, { color: colors.text }]}>{t(faq.question)}</Text>
                      <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>{t(faq.answer)}</Text>
                    </View>
                  ))}
                </>
              )}

              {searchResults.modules.length === 0 && searchResults.faq.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={48} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    {t('help.no_results', { query: searchQuery })}
                  </Text>
                </View>
              )}
            </>
          ) : (
            /* ─── Browse Mode ─── */
            <>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                {t('help.modules_title')}
              </Text>

              {filteredModules.map((m) => {
                const isExpanded = expandedModule === m.key;
                return (
                  <View key={m.key} style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
                    <TouchableOpacity style={styles.moduleHeader} onPress={() => toggleModule(m.key)} activeOpacity={0.7}>
                      <View style={[styles.moduleIcon, { backgroundColor: m.color + '20' }]}>
                        <Ionicons name={m.icon} size={18} color={m.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.moduleName, { color: colors.text }]}>{t(m.title)}</Text>
                        <Text style={[styles.moduleCount, { color: colors.textMuted }]}>
                          {t('help.features_count', { count: m.features.length })}
                        </Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>

                    {isExpanded && (
                      <>
                        {m.features.map((f, i) => (
                          <View key={i} style={[styles.featureRow, { borderTopColor: colors.divider }]}>
                            <Ionicons name={f.icon} size={16} color={m.color} style={{ marginTop: 2 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.featureTitle, { color: colors.text }]}>{t(f.title)}</Text>
                              <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{t(f.description)}</Text>
                            </View>
                          </View>
                        ))}
                        <TouchableOpacity
                          style={[styles.launchBtn, { borderColor: m.color }]}
                          onPress={() => handleLaunchGuide(m.guideKey)}
                        >
                          <Ionicons name="play-circle-outline" size={16} color={m.color} />
                          <Text style={[styles.launchText, { color: m.color }]}>
                            {t('help.launch_guide')}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                );
              })}

              {/* FAQ */}
              <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: Spacing.lg }]}>
                {t('help.faq_title')}
              </Text>

              {FAQ.map((faq, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
                  onPress={() => toggleFaq(i)}
                  activeOpacity={0.7}
                >
                  <View style={styles.faqHeader}>
                    <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
                    <Text style={[styles.faqQuestion, { color: colors.text, flex: 1 }]}>{t(faq.question)}</Text>
                    <Ionicons
                      name={expandedFaq === i ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.textMuted}
                    />
                  </View>
                  {expandedFaq === i && (
                    <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>{t(faq.answer)}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    height: 44,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  moduleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  moduleCount: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  featureRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
  },
  featureTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  launchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  launchText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  faqQuestion: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  faqAnswer: {
    fontSize: FontSize.xs,
    lineHeight: 18,
    marginTop: Spacing.sm,
    paddingLeft: 26,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
