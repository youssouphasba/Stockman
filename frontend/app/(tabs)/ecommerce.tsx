import React from 'react';
import { Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { isStarterShopkeeper } from '../../utils/accountRouting';
import OrdersScreen from './orders';

export default function EcommerceScreen() {
  const { user } = useAuth();
  if (Platform.OS === 'web' || !isStarterShopkeeper(user)) {
    return <Redirect href={{ pathname: '/(tabs)/orders', params: { tab: 'web', source: 'ecommerce' } }} />;
  }
  return <OrdersScreen key={`${user?.user_id}:${user?.active_store_id || ''}`} ecommerceWorkspace />;
}
