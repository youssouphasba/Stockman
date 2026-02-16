import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { FontSize, Spacing, BorderRadius } from '../constants/theme';
import { SHARED_CATEGORIES } from '../constants/defaultCategories';

type Props = {
  selectedCategory: string;
  selectedSubcategory: string;
  onSelect: (category: string, subcategory: string) => void;
};

const categoryKeys = Object.keys(SHARED_CATEGORIES);

export default function CategorySubcategoryPicker({
  selectedCategory,
  selectedSubcategory,
  onSelect,
}: Props) {
  const { colors } = useTheme();

  const subcategories = selectedCategory
    ? SHARED_CATEGORIES[selectedCategory]?.subcategories ?? []
    : [];

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textMuted }]}>Catégorie</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        {categoryKeys.map((cat) => {
          const info = SHARED_CATEGORIES[cat];
          const active = cat === selectedCategory;
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? info.color : colors.glass,
                  borderColor: active ? info.color : colors.divider,
                },
              ]}
              onPress={() => {
                if (active) {
                  onSelect('', '');
                } else {
                  onSelect(cat, '');
                }
              }}
            >
              <Ionicons
                name={info.icon as any}
                size={14}
                color={active ? '#fff' : info.color}
              />
              <Text
                style={[
                  styles.chipText,
                  { color: active ? '#fff' : colors.text },
                ]}
                numberOfLines={1}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {subcategories.length > 0 && (
        <>
          <Text style={[styles.label, { color: colors.textMuted, marginTop: Spacing.sm }]}>
            Sous-catégorie
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
            {subcategories.map((sub) => {
              const active = sub === selectedSubcategory;
              const catColor = SHARED_CATEGORIES[selectedCategory]?.color ?? colors.primary;
              return (
                <TouchableOpacity
                  key={sub}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? catColor : colors.glass,
                      borderColor: active ? catColor : colors.divider,
                    },
                  ]}
                  onPress={() => {
                    onSelect(selectedCategory, active ? '' : sub);
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? '#fff' : colors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {sub}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: 6,
  },
  chipText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
});
