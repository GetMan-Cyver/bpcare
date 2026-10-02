export interface Product {
  id: string;
  name: string;
  category: 'propolis' | 'stevia' | 'specialty' | string;
  badge: string;
  price: number;
  volume: string;
  bpom: string;
  status: 'active' | 'archived';
  image: string;
  shortDesc: string;
  description: string;
  benefits: string[];
  usage: string;
}

export interface Package {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
  tag: string;
  desc: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  type: 'product' | 'package';
}

export interface SecurityState {
  failedAttempts: number;
  lockedUntil: number;
}

export interface AdminConfig {
  url: string;
  key: string;
  lastUpdated: string;
}
