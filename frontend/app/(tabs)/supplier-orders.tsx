import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import OrdersScreen from './orders';

// Commandes et retours fournisseurs, ouverts depuis l'écran Fournisseurs.
export default function SupplierOrdersScreen() {
  const { user } = useAuth();
  return <OrdersScreen key={`${user?.user_id}:${user?.active_store_id || ''}:supplier`} supplierOrders />;
}
