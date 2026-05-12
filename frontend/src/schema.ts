export interface Product {
  id: number;
  name: string;
  wholesale_price: number;
  retail_price: number;
  is_active: number;
}

export interface OrderItem {
  id?: number;
  product_id: number;
  name: string;
  weight: number;
  price: number;
  rate: number;
  calculated_price?: number;
}

export interface OrderLog {
  id: number;
  status_reached: string;
  timestamp: string;
  description?: string;
}

export interface Order {
  id: number;
  customer_id: number;
  date: string;
  total_amount: number;
  summary_text: string;
  payment_status: 'Pending' | 'Cash' | 'UPI' | 'Debt';
  payment_date?: string;
  order_status: 'Received' | 'In Manufacturing' | 'Ready for Delivery' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  items: OrderItem[];
  logs: OrderLog[];
  is_payment_approved?: number;
  is_active?: number;
}

export interface Customer {
  id: number;
  name: string;
  category: 'Retail' | 'Wholesale';
  phone?: string;
  address?: string;
  notes?: string;
}

export type Tab = 'dashboard' | 'history' | 'manage' | 'products' | 'analytics' | 'export' | 'money' | 'customers' | 'product_analysis' | 'manufacturing' | 'delivery' | 'recent_log' | 'exp_1' | 'ai_settings';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
