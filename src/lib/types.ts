export type UserRole = "USER" | "ADMIN";
export type UserPlan = "Basic" | "Business" | "Premium";
export type PlanTerm = "3" | "6" | "14";
export type UserStatus = "Active" | "Expired";

export type MailType = "Letter" | "Package";
export type MailStatus =
  | "Received"
  | "Scanned"
  | "Awaiting Pickup"
  | "Forwarded"
  | "Picked Up"
  | "Held";

export type NotaryType = "Real Estate" | "Business Agreement" | "Legal Document";
export type NotaryStatus = "Pending" | "Confirmed" | "Completed" | "Cancelled";

export type DeliveryZone = "NoHo" | "Extended";
export type DeliveryItemType = "Letter" | "Package" | "Documents" | "Other";
export type DeliveryCourier = string;
export type DeliveryStatus = "Pending" | "In Transit" | "Delivered";

export type ShopOrderStatus = "Pending" | "Ready" | "Completed";
