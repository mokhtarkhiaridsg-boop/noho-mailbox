#!/usr/bin/env node
import { createClient } from "@libsql/client";
import { config } from "dotenv";
config({ path: ".env.production.local" });
config({ path: ".env" });
const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const tables = [
  "User","CatalogItem","ContactSubmission","DeliveryOrder","ForwardingAddress",
  "KeyRequest","MailItem","MailRequest","MessageThread","NotaryBooking",
  "Payment","ShippoLabel","ShopOrder","SiteConfig","SquareSyncLog",
  "Partner","Tenant","CreditRequest","LabelOrder","MailboxRenewal",
  "CustomerNote","MailboxKey","MailerThread","SuiteTransferRequest",
  "AgentConversation","StorageFeeDispute","WebhookEndpoint","JunkSender",
  "PickupAppointment","IdExpiryAlert","WalletTransaction","Card","Invoice",
  "BusinessClient","CancellationRequest","RecurringDelivery","ScheduledForwarding",
  "PasswordResetToken","TrackingEvent","DocumentVaultItem","Notification",
  "Referral","SmsLog","EmailLog","NewsletterSubscriber","SharedMailboxAccess",
  "ExternalDropoff","GuestPickupAuth","LabelUpload","MailItemTrackingState",
  "PartnerCommission","PickupSurvey","POSLineItem","POSSale",
  "QuarterlyStatement","TenantBillingEvent","TenantSubscription",
  "VacationHold","WebhookDelivery","Organization","OrganizationMember",
  "Message","MessageAttachment","AuditLog","AgentMemory","AgentMessage","MailerMessage",
];
for (const t of tables) {
  try {
    await c.execute(`SELECT * FROM ${t} LIMIT 1`);
    // OK silently
  } catch (e) {
    console.error("MISSING:", t, "→", e.message);
  }
}
console.log("done");
