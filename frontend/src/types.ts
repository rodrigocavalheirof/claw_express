export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  image_url?: string;
  category?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderStatusData {
  status: 'PENDING_PAYMENT' | 'PAID' | 'PAYMENT_FAILED';
  message?: string;
  updatedAt?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  status: 'PENDING_PAYMENT' | 'PAID' | 'PAYMENT_FAILED';
  total_amount: number;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}
