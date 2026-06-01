import { Timestamp } from "firebase/firestore";

export type OrderStatus =
  | "Pending"
  | "Packing"
  | "Ready to Dispatch"
  | "Assigned"
  | "Accepted"
  | "Out for Delivery"
  | "Awaiting Verification"
  | "Delivered"
  | "Cancelled";

export interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  mrp: number;
  weight: number;
  unit: string;
  imageUrl: string;
  categoryId: string;
  stock: number;
  lowStockThreshold: number;
  active: boolean;
  rating?: number;
  createdAt?: Timestamp | any;
}

export interface Category {
  id?: string;
  name: string;
  imageUrl: string;
  active: boolean;
}

export interface Banner {
  id?: string;
  imageUrl: string;
  link: string;
  active: boolean;
}

export interface ContactInfo {
  phone: string;
  email: string;
  address: string;
  deliveryRadiusKm: number;
  logoUrl: string;
  warehouseLat: number;
  warehouseLng: number;
  storeName: string;
  socialLinks?: Record<string, string>;
  taxPercentage?: number;
  deliveryFeePerKm?: number;
  freeDeliveryAbove?: number;
  privacyPolicy?: string;
  refundPolicy?: string;
  shippingPolicy?: string;
  termsAndConditions?: string;
  tagline?: string;
  copyrightText?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  aboutText?: string;
}

export interface ContactReply {
  message: string;
  createdAt: Timestamp | any;
  by: "owner" | "customer";
}

export interface Contact {
  id?: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  createdAt?: Timestamp | any;
  read?: boolean;
  userId?: string;
  orderId?: string;
  status?: "open" | "in-progress" | "resolved";
  replies?: ContactReply[];
  replacementOrderId?: string;
}

export interface TicketReply {
  message: string;
  createdAt: Timestamp | any;
  by: "owner" | "worker";
}

export interface Ticket {
  id?: string;
  type: string;
  orderId: string;
  productId: string;
  workerId: string;
  message: string;
  createdAt?: Timestamp | any;
  resolved: boolean;
  status?: "open" | "in-progress" | "resolved";
  replies?: TicketReply[];
}

export interface BonusEntry {
  type: "diwali" | "performance" | "overtime" | "other";
  amount: number;
  reason: string;
  date: Timestamp | any;
  month: string;
}

export interface Worker {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  fcmToken?: string;
  active: boolean;
  salary: number;
  joiningDate: Timestamp | any;
  incrementHistory: { date: Timestamp | any; amount: number }[];
  holidays: { date: Timestamp | any; reason: string }[];
  totalEarnings: number;
  currentPackingOrderId?: string;
  bonuses?: BonusEntry[];
  overtimeHours?: number;
}

export interface SalaryPayment {
  id?: string;
  amount: number;
  monthYear: string;
  paidAt: Timestamp | any;
  mode: string;
}

export interface DeliveryBoy {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  vehicleNumber: string;
  fcmToken?: string;
  active: boolean;
  salary: number;
  joiningDate: Timestamp | any;
  incrementHistory: { date: Timestamp | any; amount: number }[];
  holidays: { date: Timestamp | any; reason: string }[];
  totalEarnings: number;
  breakLogs: { start: Timestamp | any; end?: Timestamp | any }[];
  currentBreakStart?: Timestamp | any;
  basket?: BasketItem[];
  bonuses?: BonusEntry[];
  overtimeHours?: number;
}

export interface BasketItem {
  id?: string;
  areaCode: string;
  orders: { userId: string; orderId: string; address: any }[];
  totalWeight: number;
  status: "Assigned" | "Accepted" | "Rejected" | "Out for Delivery" | "Completed";
  assignedAt: Timestamp | any;
  acceptedAt?: Timestamp | any;
  completedAt?: Timestamp | any;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  weight: number;
}

export interface OrderAddress {
  name: string;
  phone: string;
  addressLine: string;
  pincode: string;
  city: string;
  lat?: number;
  lng?: number;
}

export interface OrderPayment {
  method: "razorpay" | "cod";
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  status: "paid" | "pending" | "refunded";
}

export interface Order {
  id?: string;
  userId: string;
  items: OrderItem[];
  address: OrderAddress;
  status: OrderStatus;
  totalAmount: number;
  totalWeight: number;
  payment: OrderPayment;
  areaCode: string;
  assignedWorkerId?: string;
  assignedDeliveryBoyId?: string;
  assignedBasketId?: string;
  outOfCity: boolean;
  estimatedDeliveryDate?: Timestamp | any;
  packedAt?: Timestamp | any;
  outForDeliveryAt?: Timestamp | any;
  deliveredAt?: Timestamp | any;
  cancelledAt?: Timestamp | any;
  cancelReason?: string;
  createdAt?: Timestamp | any;
  rejectionHistory: { rejectedBy: string; reason: string; at: Timestamp | any }[];
  ticketContactId?: string;
}

export interface Refund {
  id?: string;
  orderId: string;
  razorpayRefundId: string;
  amount: number;
  reason: string;
  createdAt: Timestamp | any;
}

export interface Payment {
  id?: string;
  orderId: string;
  type: string;
  amount: number;
  razorpayId: string;
  createdAt: Timestamp | any;
}

export interface DeliveryPartnerLog {
  id?: string;
  orderId: string;
  partner: string;
  trackingId: string;
  status: string;
  createdAt: Timestamp | any;
}

export interface Coupon {
  id?: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  expiryDate: Timestamp | any;
  usageLimit: number;
  usedCount: number;
  active: boolean;
  createdAt?: Timestamp | any;
}
