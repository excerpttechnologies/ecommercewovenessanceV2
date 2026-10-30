/** Shared Shiprocket types. Server-only: never import credentials into a client component. */

export type ShippingProvider = "shiprocket" | "flat";
export type ShippingStatus =
  | "not_created"
  | "creating"
  | "created"
  | "awb_assigned"
  | "pickup_scheduled"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "undelivered"
  | "rto_initiated"
  | "rto_in_transit"
  | "rto_out_for_delivery"
  | "rto_delivered"
  | "return_created"
  | "return_in_transit"
  | "returned"
  | "failed"
  | "not_configured";

export interface ShiprocketConfig {
  baseUrl: string;
  email: string;
  password: string;
  pickupLocation: string;
  pickupPincode: string;
  channelId?: string;
  timeoutMs: number;
  maxRetries: number;
  defaultWeightKg: number;
  defaultLengthCm: number;
  defaultBreadthCm: number;
  defaultHeightCm: number;
  rateMarkupPercent: number;
  codExtraCharge: number;
  pickup: {
    name: string;
    phone: string;
    email: string;
    address: string;
    address2: string;
    city: string;
    state: string;
    pincode: string;
  };
  returnAddress: {
    name: string;
    phone: string;
    email: string;
    address: string;
    address2: string;
    city: string;
    state: string;
    pincode: string;
  };
}

export interface PackageDimensions {
  weight: number;
  length: number;
  breadth: number;
  height: number;
}

export interface PackageItem {
  sku: string;
  qty: number;
  weightKg?: number;
  lengthCm?: number;
  breadthCm?: number;
  heightCm?: number;
}

export interface CourierOption {
  id: number | string;
  name: string;
  rate: number;
  cod: boolean;
  etaDays?: number;
  estimatedDelivery?: string;
  rating?: number;
  chargeWeight?: number;
  minWeight?: number;
  maxWeight?: number;
}

export interface ShippingQuote {
  serviceable: boolean;
  provider: ShippingProvider;
  fallback: boolean;
  reason?: string;
  pickupPincode?: string;
  deliveryPincode: string;
  codAvailable: boolean;
  shippingCharge: number;
  baseShippingCharge: number;
  currency: "INR";
  etaDays?: number;
  estimatedDelivery?: string;
  couriers: CourierOption[];
  selectedCourier?: CourierOption;
  package: PackageDimensions;
  quotedAt: string;
}

export interface TrackingEvent {
  status: string;
  statusCode?: string;
  activity?: string;
  location?: string;
  date?: string;
  awb?: string;
}

export interface TrackingResult {
  awb: string;
  courierName?: string;
  status: string;
  statusCode?: string;
  estimatedDelivery?: string;
  trackingUrl?: string;
  events: TrackingEvent[];
  updatedAt: string;
}

export interface ShipmentResult {
  alreadyExisted: boolean;
  skipped?: boolean;
  reason?: string;
  shiprocketOrderId?: number;
  shipmentId?: number;
  awbNo?: string;
  courierName?: string;
  pickupRequested: boolean;
  warnings: string[];
}

export interface ReturnResult {
  returnOrderId: number;
  returnShipmentId?: number;
  returnAwb?: string;
  status: string;
}

export interface ShipmentAddress {
  name?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  email?: string;
}

export interface ShipmentLine {
  name?: string;
  sku: string;
  qty: number;
  rate: number;
  discount?: number;
  tax?: number;
  hsn?: string;
}

export interface ShipmentRequest {
  orderNo: string;
  createdAt?: Date | string;
  paymentMode: string;
  netAmount: number;
  subTotal: number;
  shippingCharge?: number;
  items: ShipmentLine[];
  address: ShipmentAddress;
  package: PackageDimensions;
  email?: string;
  courierId?: number | string;
}

/** Quote returned to checkout/the delivery checker (includes free-shipping handling). */
export interface CheckoutShippingQuote {
  serviceable: boolean;
  provider: ShippingProvider;
  fallback: boolean;
  reason?: string;
  deliveryPincode: string;
  codAvailable: boolean;
  /** Amount actually charged after the free-shipping threshold is applied. */
  shippingCharge: number;
  /** Raw courier (or flat) amount before free shipping. */
  baseShippingCharge: number;
  freeShippingApplied: boolean;
  freeShippingThreshold: number;
  etaDays?: number;
  estimatedDelivery?: string;
  couriers: CourierOption[];
  selectedCourier?: CourierOption;
  package: PackageDimensions;
  quotedAt: string;
}

export interface ReturnRequest {
  orderNo: string;
  createdAt?: Date | string;
  paymentMode: string;
  netAmount: number;
  subTotal: number;
  items: ShipmentLine[];
  /** Where the parcel is picked up from — the customer's delivery address. */
  address: ShipmentAddress;
  package: PackageDimensions;
}
