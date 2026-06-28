export enum RoleCode {
  SUPER_ADMIN = "SUPER_ADMIN",
  OWNER = "OWNER",
  MANAGER = "MANAGER",
  KITCHEN = "KITCHEN",
  WAITER = "WAITER",
  CASHIER = "CASHIER",
  CUSTOMER = "CUSTOMER"
}

export enum OrderStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  PREPARING = "PREPARING",
  READY = "READY",
  SERVED = "SERVED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED"
}

export enum TableStatus {
  AVAILABLE = "AVAILABLE",
  OCCUPIED = "OCCUPIED",
  RESERVED = "RESERVED",
  OUT_OF_SERVICE = "OUT_OF_SERVICE"
}

export enum PaymentStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  PAID = "PAID",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED"
}

export enum PaymentMethod {
  CASH = "CASH",
  UPI = "UPI",
  CARD = "CARD",
  ONLINE = "ONLINE"
}

export enum SubscriptionStatus {
  ACTIVE = "ACTIVE",
  TRIAL = "TRIAL",
  EXPIRED = "EXPIRED",
  SUSPENDED = "SUSPENDED",
  CANCELLED = "CANCELLED"
}

export enum BillingCycle {
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY"
}

export enum DiscountType {
  PERCENTAGE = "PERCENTAGE",
  FIXED = "FIXED"
}
