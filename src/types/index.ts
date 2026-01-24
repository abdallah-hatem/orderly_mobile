export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  members: GroupMember[];
  orders: Order[];
}

export interface GroupMember {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  user: User;
  userId: string;
  createdAt: string;
}

export interface Restaurant {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  categories: MenuCategory[];
}

export interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  imageUrl?: string;
  variants: MenuItemVariant[];
  addons: MenuItemAddon[];
}

export interface MenuItemVariant {
  id: string;
  name: string;
  priceDiff: number;
}

export interface MenuItemAddon {
  id: string;
  name: string;
  price: number;
}

export interface Order {
  id: string;
  status: 'OPEN' | 'CLOSED' | 'PAID' | 'CANCELLED';
  initiatorId: string;
  restaurantId?: string;
  customRestaurantName?: string;
  restaurant?: Restaurant;
  items: OrderItem[];
  createdAt: string;
  receipt?: Receipt;
  group?: { id: string; name: string };
  payments?: any[]; // For completeness if needed
}

export interface OrderItem {
  id: string;
  userId: string;
  user: { name: string };
  menuItemId?: string;
  customItemName?: string;
  menuItem?: MenuItem;
  variant?: MenuItemVariant;
  addons: { addon: MenuItemAddon }[];
  priceAtOrder: number;
  quantity: number;
}

export interface Receipt {
    id: string;
    orderId: string;
    imageUrl: string;
    subtotal: number;
    tax: number;
    serviceFee: number;
    deliveryFee: number;
    totalAmount: number;
    rawParsedData?: any;
}

export interface ItemSplit {
    id: string;
    name: string;
    quantity: number;
    originalPrice: number;
    currentPrice: number;
}

export interface SplitResult {
    userId: string;
    userName: string;
    itemsTotal: number;
    sharedCostPortion: number;
    total: number;
    items?: ItemSplit[];
}
