const fs = require('fs');

const path = 'frontend/app/(tabs)/products.tsx';
let content = fs.readFileSync(path, 'utf8');

// Rename openBulkPriceModal to openBulkEditModal
content = content.replace(/function openBulkPriceModal\(\) \{[\s\S]*?showBulkPriceModal\(true\);\s*\}/, 
`function openBulkEditModal() {
    if (selectedProducts.length === 0) return;
    const initialPrice: Record<string, string> = {};
    const initialPurchase: Record<string, string> = {};
    const initialStock: Record<string, string> = {};
    selectedProducts.forEach((product) => {
      initialPrice[product.product_id] = String(product.selling_price ?? '');
      initialPurchase[product.product_id] = String(product.purchase_price ?? '');
      initialStock[product.product_id] = String(product.quantity ?? 0);
    });
    setBulkPriceValues(initialPrice);
    setBulkPurchaseValues(initialPurchase);
    setBulkStockValues(initialStock);
    setShowBulkEditModal(true);
  }`);

// Rename closeBulkPriceModal to closeBulkEditModal
content = content.replace(/function closeBulkPriceModal\(\) \{[\s\S]*?setBulkPriceSaving\(false\);\s*\}/, 
`function closeBulkEditModal() {
    setShowBulkEditModal(false);
    setBulkPriceValues({});
    setBulkPurchaseValues({});
    setBulkStockValues({});
    setBulkPriceSaving(false);
  }`);

// Remove bulk stock modal functions
content = content.replace(/function openBulkStockModal\(\) \{[\s\S]*?setShowBulkStockModal\(true\);\s*\}/, '');
content = content.replace(/function closeBulkStockModal\(\) \{[\s\S]*?setBulkStockSaving\(false\);\s*\}/, '');

// Rename handleBulkSellingPriceUpdate
content = content.replace(/async function handleBulkSellingPriceUpdate\(\) \{[\s\S]*?(?=async function handleBulkStockUpdate)/, 
`async function handleBulkEditUpdate() {
    if (selectedProducts.length === 0) return;

    const priceUpdates: Array<{ product_id: string; selling_price?: number; purchase_price?: number }> = [];
    const stockMovements: Array<{ product_id: string; name: string; type: 'in' | 'out'; quantity: number }> = [];
    const targetQuantities: Array<{ product_id: string; quantity: number }> = [];

    for (const product of selectedProducts) {
      let hasPriceUpdate = false;
      const updatePayload: { product_id: string; selling_price?: number; purchase_price?: number } = { product_id: product.product_id };

      // Selling price
      const rawSelling = bulkPriceValues[product.product_id];
      if (rawSelling != null) {
        const normSelling = rawSelling.replace(',', '.').trim();
        if (normSelling) {
          const parsedSelling = Number(normSelling);
          if (!Number.isFinite(parsedSelling) || parsedSelling < 0) {
            Alert.alert(t('common.error'), t('products.bulk_price_invalid_value', { name: product.name }));
            return;
          }
          if (parsedSelling !== Number(product.selling_price ?? 0)) {
            updatePayload.selling_price = parsedSelling;
            hasPriceUpdate = true;
          }
        }
      }

      // Purchase price
      const rawPurchase = bulkPurchaseValues[product.product_id];
      if (rawPurchase != null) {
        const normPurchase = rawPurchase.replace(',', '.').trim();
        if (normPurchase) {
          const parsedPurchase = Number(normPurchase);
          if (!Number.isFinite(parsedPurchase) || parsedPurchase < 0) {
            Alert.alert(t('common.error'), t('products.bulk_price_invalid_value', { name: product.name }));
            return;
          }
          if (parsedPurchase !== Number(product.purchase_price ?? 0)) {
            updatePayload.purchase_price = parsedPurchase;
            hasPriceUpdate = true;
          }
        }
      }

      if (hasPriceUpdate) {
        priceUpdates.push(updatePayload);
      }

      // Stock
      const rawStock = bulkStockValues[product.product_id];
      if (rawStock != null) {
        const normStock = rawStock.replace(',', '.').trim();
        if (normStock) {
          const targetQuantity = Number(normStock);
          if (!Number.isFinite(targetQuantity) || targetQuantity < 0) {
            Alert.alert(t('common.error'), t('products.bulk_stock_invalid_value', { name: product.name }));
            return;
          }
          const currentQuantity = Number(product.quantity ?? 0);
          const delta = targetQuantity - currentQuantity;
          if (Math.abs(delta) > 0.000001) {
            stockMovements.push({
              product_id: product.product_id,
              name: product.name,
              type: delta > 0 ? 'in' : 'out',
              quantity: Math.abs(delta),
            });
            targetQuantities.push({ product_id: product.product_id, quantity: targetQuantity });
          }
        }
      }
    }

    if (priceUpdates.length === 0 && stockMovements.length === 0) {
      Alert.alert(t('common.info'), t('products.bulk_no_changes', "Aucune modification détectée."));
      return;
    }

    setBulkPriceSaving(true);
    try {
      if (priceUpdates.length > 0) {
        if (isConnected) {
          await productsApi.bulkUpdatePrices(priceUpdates as any);
        } else {
          await syncService.addToQueue({
            entity: 'product',
            type: 'update',
            endpoint: '/products/bulk-update-prices',
            method: 'POST',
            payload: { updates: priceUpdates },
          });
        }
        
        // Update local price values
        setProductList((prev) => prev.map(p => {
          const update = priceUpdates.find(u => u.product_id === p.product_id);
          if (update) {
            return {
              ...p,
              ...(update.selling_price !== undefined && { selling_price: update.selling_price }),
              ...(update.purchase_price !== undefined && { purchase_price: update.purchase_price })
            };
          }
          return p;
        }));
      }

      if (stockMovements.length > 0) {
        const successfulTargetQuantities: Array<{ product_id: string; quantity: number }> = [];
        for (const movement of stockMovements) {
          try {
            await stockApi.createMovement({
              product_id: movement.product_id,
              type: movement.type,
              quantity: movement.quantity,
              reason: t('products.bulk_stock_reason'),
            });
            const target = targetQuantities.find((item) => item.product_id === movement.product_id);
            if (target) successfulTargetQuantities.push(target);
          } catch (error) {
            console.error("Stock update error:", error);
          }
        }
        updateLocalProductQuantities(successfulTargetQuantities);
      }

      closeBulkEditModal();
      setSelectedProductIds(new Set());
      setIsSelectionMode(false);
      await loadData();
      Alert.alert(t('common.success'), t('products.bulk_success', "Mise à jour réussie"));
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('products.bulk_error', "Erreur lors de la mise à jour"));
    } finally {
      setBulkPriceSaving(false);
    }
  }

  `);

// Remove handleBulkStockUpdate
content = content.replace(/async function handleBulkStockUpdate\(\) \{[\s\S]*?(?=function renderBulkImport)/, '');

fs.writeFileSync(path, content, 'utf8');
console.log('Done replacement part 1');
