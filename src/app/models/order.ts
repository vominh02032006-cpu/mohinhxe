export interface CustomerUser {
  id: string;
  name: string;
  email: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled';

export interface OrderItem {
  productSlug: string;
  name: string;
  image: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CustomerOrder {
  id: string;
  userId: string;
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  note: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderPayload {
  name: string;
  phone: string;
  address: string;
  note: string;
  items: { slug: string; quantity: number }[];
}
