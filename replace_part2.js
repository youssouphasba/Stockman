const fs = require('fs');

const path = 'frontend/app/(tabs)/products.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace selection action buttons
const selectionActionsRegex = /<View style=\{styles\.selectionActions\}>[\s\S]*?(?=<\/View>\s*<\/View>\s*\)\})/m;
const selectionActionsReplacement = `<View style={styles.selectionActions}>
              {canWrite && (
                <TouchableOpacity
                  style={[
                    styles.selectionActionBtn,
                    styles.selectionActionBtnPrimary,
                    (selectedProductIds.size === 0 || bulkDeleteSaving) && styles.selectionActionBtnDisabled,
                  ]}
                  onPress={openBulkEditModal}
                  disabled={selectedProductIds.size === 0 || bulkDeleteSaving}
                >
                  <Ionicons name="create-outline" size={20} color={colors.primaryLight} />
                  <Text style={styles.selectionActionText}>{t('products.bulk_edit_cta', 'Prix et stock')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.selectionActionBtn,
                  styles.selectionActionBtnPrimary,
                  bulkDeleteSaving && styles.selectionActionBtnDisabled,
                ]}
                onPress={exportCatalog}
                disabled={bulkDeleteSaving}
              >
                <Ionicons name="share-social-outline" size={20} color={colors.primaryLight} />
                <Text style={styles.selectionActionText}>{t('products.bulk_share_catalog')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.selectionActionBtn,
                  styles.selectionActionBtnDanger,
                  (selectedProductIds.size === 0 || bulkDeleteSaving) && styles.selectionActionBtnDisabled,
                ]}
                onPress={handleBulkDelete}
                disabled={selectedProductIds.size === 0 || bulkDeleteSaving}
              >
                {bulkDeleteSaving ? (
                  <ActivityIndicator color={colors.danger} />
                ) : (
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                )}
                <Text style={[styles.selectionActionText, { color: colors.danger }]}>
                  {bulkDeleteSaving
                    ? \`\${t('products.delete')} (\${bulkDeleteProcessedCount}/\${bulkDeleteTotalCount})\`
                    : t('products.delete')}
                </Text>
              </TouchableOpacity>
            </View>`;

content = content.replace(selectionActionsRegex, selectionActionsReplacement);

// Replace showBulkPriceModal UI
const bulkModalRegex = /<Modal visible=\{showBulkPriceModal\}[\s\S]*?(?=<\/Modal>\s*<Modal visible=\{showBulkStockModal\})/m;
const bulkModalReplacement = `<Modal visible={showBulkEditModal} animationType="slide" transparent onRequestClose={closeBulkEditModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: Spacing.md }}>
                <Text style={styles.modalTitle}>{t('products.bulk_edit_modal_title', 'Édition en masse')}</Text>
                <Text style={styles.modalSubtitle}>
                  {t('products.bulk_edit_modal_subtitle', { count: selectedProducts.length })}
                </Text>
              </View>
              <TouchableOpacity onPress={closeBulkEditModal} disabled={bulkPriceSaving}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
              <FlatList
                data={selectedProducts}
                keyExtractor={(item) => item.product_id}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: Spacing.lg }}
                renderItem={({ item }) => (
                  <View style={[styles.bulkPriceRow, { flexDirection: 'column', alignItems: 'stretch' }]}>
                    <Text style={styles.bulkPriceName}>{item.name}</Text>
                    
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>Vente ({formatUserCurrency(item.selling_price, user)})</Text>
                        <TextInput
                          style={styles.bulkPriceInput}
                          value={bulkPriceValues[item.product_id] ?? ''}
                          onChangeText={(value) => setBulkPriceValues((prev) => ({ ...prev, [item.product_id]: value }))}
                          keyboardType="decimal-pad"
                          placeholder={String(item.selling_price ?? 0)}
                          placeholderTextColor={colors.textMuted}
                        />
                      </View>
                      
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>Achat ({formatUserCurrency(item.purchase_price, user)})</Text>
                        <TextInput
                          style={styles.bulkPriceInput}
                          value={bulkPurchaseValues[item.product_id] ?? ''}
                          onChangeText={(value) => setBulkPurchaseValues((prev) => ({ ...prev, [item.product_id]: value }))}
                          keyboardType="decimal-pad"
                          placeholder={String(item.purchase_price ?? 0)}
                          placeholderTextColor={colors.textMuted}
                        />
                      </View>

                      {!isRestaurant && (
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>Stock ({formatMeasurementQuantity(item.quantity, item.display_unit || item.unit)})</Text>
                        <TextInput
                          style={styles.bulkPriceInput}
                          value={bulkStockValues[item.product_id] ?? ''}
                          onChangeText={(value) => setBulkStockValues((prev) => ({ ...prev, [item.product_id]: value }))}
                          keyboardType="decimal-pad"
                          placeholder={String(item.quantity ?? 0)}
                          placeholderTextColor={colors.textMuted}
                        />
                      </View>
                      )}
                    </View>
                  </View>
                )}
                ListFooterComponent={
                  <TouchableOpacity
                    style={[styles.submitBtn, bulkPriceSaving && styles.submitBtnDisabled]}
                    onPress={handleBulkEditUpdate}
                    disabled={bulkPriceSaving}
                  >
                    {bulkPriceSaving ? (
                      <ActivityIndicator color={colors.text} />
                    ) : (
                      <Text style={styles.submitBtnText}>{t('products.bulk_price_save')}</Text>
                    )}
                  </TouchableOpacity>
                }
              />
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

`;

content = content.replace(bulkModalRegex, bulkModalReplacement);

// Remove the old showBulkStockModal UI
const stockModalRegex = /<Modal visible=\{showBulkStockModal\}[\s\S]*?(?=<\/Modal>\s*\{\/\* Add Product Modal \*\/)/m;
content = content.replace(stockModalRegex, "");

// Add bulkPurchaseValues state
content = content.replace(/const \[bulkStockValues, setBulkStockValues\] = useState<Record<string, string>>\(\{\}\);/, 
`const [bulkStockValues, setBulkStockValues] = useState<Record<string, string>>({});
  const [bulkPurchaseValues, setBulkPurchaseValues] = useState<Record<string, string>>({});
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);`);

fs.writeFileSync(path, content, 'utf8');
console.log('Done replacement part 2');
