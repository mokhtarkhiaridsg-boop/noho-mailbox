import { createClient } from "@libsql/client";
import { config } from "dotenv";
config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const stmts = [
  `ALTER TABLE User ADD COLUMN cardLast4 TEXT`,
  `ALTER TABLE User ADD COLUMN cardBrand TEXT`,
  `ALTER TABLE User ADD COLUMN cardExpiry TEXT`,
  `ALTER TABLE User ADD COLUMN cardholderName TEXT`,
  `ALTER TABLE User ADD COLUMN cardDiscountPct INTEGER NOT NULL DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS SiteConfig (key TEXT PRIMARY KEY, value TEXT NOT NULL, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
];

for (const sql of stmts) {
  try {
    await client.execute(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e) {
    if (e.message?.includes("duplicate column") || e.message?.includes("already exists")) {
      console.log("SKIP (already exists):", sql.slice(0, 60));
    } else {
      console.error("ERR:", e.message, "| SQL:", sql);
    }
  }
}
console.log("Done.");

// Phase 3 — Shippo Labels + Label Uploads
const phase3 = [
  `CREATE TABLE IF NOT EXISTS ShippoLabel (
    id TEXT PRIMARY KEY,
    userId TEXT,
    mailItemId TEXT,
    deliveryOrderId TEXT,
    transactionId TEXT UNIQUE NOT NULL,
    shipmentId TEXT NOT NULL,
    carrier TEXT NOT NULL,
    servicelevel TEXT NOT NULL,
    trackingNumber TEXT NOT NULL,
    trackingUrl TEXT NOT NULL,
    labelUrl TEXT NOT NULL,
    amountPaid REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    labelFormat TEXT NOT NULL DEFAULT 'PDF',
    status TEXT NOT NULL DEFAULT 'purchased',
    toName TEXT NOT NULL,
    toStreet TEXT NOT NULL,
    toCity TEXT NOT NULL,
    toState TEXT NOT NULL,
    toZip TEXT NOT NULL,
    lengthIn REAL,
    widthIn REAL,
    heightIn REAL,
    weightOz REAL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    refundedAt DATETIME,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS LabelUpload (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    filename TEXT NOT NULL,
    url TEXT NOT NULL,
    carrier TEXT,
    trackingNum TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'uploaded',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
  )`,
];

for (const sql of phase3) {
  try {
    await client.execute(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e) {
    if (e.message?.includes("already exists")) {
      console.log("SKIP:", sql.slice(0, 60));
    } else {
      console.error("ERR:", e.message);
    }
  }
}
console.log("Phase 3 migration done.");

// Phase 4 — Notifications
const phase4 = [
  `CREATE TABLE IF NOT EXISTS Notification (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0,
    link TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    readAt DATETIME,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
  )`,
];

for (const sql of phase4) {
  try {
    await client.execute(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e) {
    if (e.message?.includes("already exists")) {
      console.log("SKIP:", sql.slice(0, 60));
    } else {
      console.error("ERR:", e.message);
    }
  }
}
console.log("Phase 4 migration done.");

// Phase 4b — Referral program
const phase4b = [
  `CREATE TABLE IF NOT EXISTS Referral (
    id TEXT PRIMARY KEY,
    referrerId TEXT NOT NULL,
    refereeId TEXT,
    code TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    creditCents INTEGER NOT NULL DEFAULT 1000,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creditedAt DATETIME,
    FOREIGN KEY (referrerId) REFERENCES User(id) ON DELETE CASCADE
  )`,
];

for (const sql of phase4b) {
  try {
    await client.execute(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e) {
    if (e.message?.includes("already exists")) {
      console.log("SKIP:", sql.slice(0, 60));
    } else {
      console.error("ERR:", e.message);
    }
  }
}
console.log("Phase 4b migration done.");

// Phase 4c — Cancellation workflow
const phase4c = [
  `CREATE TABLE IF NOT EXISTS CancellationRequest (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    requestedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    gracePeriodEnd DATETIME,
    completedAt DATETIME,
    adminNotes TEXT,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
  )`,
];

for (const sql of phase4c) {
  try {
    await client.execute(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e) {
    if (e.message?.includes("already exists")) {
      console.log("SKIP:", sql.slice(0, 60));
    } else {
      console.error("ERR:", e.message);
    }
  }
}
console.log("Phase 4c migration done.");

// Phase 5 — QoL features (priority mail, junk senders, vacation hold)
const phase5 = [
  `ALTER TABLE MailItem ADD COLUMN priority INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE MailItem ADD COLUMN junkBlocked INTEGER NOT NULL DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS JunkSender (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    sender TEXT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS VacationHold (
    id TEXT PRIMARY KEY,
    userId TEXT UNIQUE NOT NULL,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    digest INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
  )`,
];

for (const sql of phase5) {
  try {
    await client.execute(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e) {
    if (e.message?.includes("already exists") || e.message?.includes("duplicate column")) {
      console.log("SKIP:", sql.slice(0, 60));
    } else {
      console.error("ERR:", e.message);
    }
  }
}
console.log("Phase 5 migration done.");

// Phase 5b — Guest pickup + scheduled forwarding
const phase5b = [
  `CREATE TABLE IF NOT EXISTS GuestPickupAuth (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    guestName TEXT NOT NULL,
    guestPhone TEXT,
    guestEmail TEXT,
    expiresAt DATETIME,
    usedAt DATETIME,
    active INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS ScheduledForwarding (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    addressId TEXT,
    frequency TEXT NOT NULL DEFAULT 'weekly',
    nextRunDate TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    lastRunDate TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
  )`,
];

for (const sql of phase5b) {
  try {
    await client.execute(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e) {
    if (e.message?.includes("already exists") || e.message?.includes("duplicate column")) {
      console.log("SKIP:", sql.slice(0, 60));
    } else {
      console.error("ERR:", e.message);
    }
  }
}
console.log("Phase 5b migration done.");

// Phase 5c — QR express pickup token
const phase5c = [
  `ALTER TABLE User ADD COLUMN pickupToken TEXT`,
];

for (const sql of phase5c) {
  try {
    await client.execute(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e) {
    if (e.message?.includes("already exists") || e.message?.includes("duplicate column")) {
      console.log("SKIP:", sql.slice(0, 60));
    } else {
      console.error("ERR:", e.message);
    }
  }
}
console.log("Phase 5c migration done.");

// Phase 5d — Package tracking fields on MailItem
const phase5d = [
  `ALTER TABLE MailItem ADD COLUMN trackingNumber TEXT`,
  `ALTER TABLE MailItem ADD COLUMN carrier TEXT`,
];

for (const sql of phase5d) {
  try {
    await client.execute(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e) {
    if (e.message?.includes("already exists") || e.message?.includes("duplicate column")) {
      console.log("SKIP:", sql.slice(0, 60));
    } else {
      console.error("ERR:", e.message);
    }
  }
}
console.log("Phase 5d migration done.");

// Phase 5e — Recurring delivery schedule
const phase5e = [
  `CREATE TABLE IF NOT EXISTS RecurringDelivery (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'weekly',
    destination TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT 'standard',
    notes TEXT,
    nextRunDate TEXT NOT NULL,
    lastRunDate TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
  )`,
];

for (const sql of phase5e) {
  try {
    await client.execute(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e) {
    if (e.message?.includes("already exists") || e.message?.includes("duplicate column")) {
      console.log("SKIP:", sql.slice(0, 60));
    } else {
      console.error("ERR:", e.message);
    }
  }
}
console.log("Phase 5e migration done.");

// Phase 5f — Shared mailbox access
const phase5f = [
  `CREATE TABLE IF NOT EXISTS SharedMailboxAccess (
    id TEXT PRIMARY KEY,
    primaryUserId TEXT NOT NULL,
    sharedUserId TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (primaryUserId) REFERENCES User(id) ON DELETE CASCADE,
    FOREIGN KEY (sharedUserId) REFERENCES User(id) ON DELETE CASCADE
  )`,
];

for (const sql of phase5f) {
  try {
    await client.execute(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e) {
    if (e.message?.includes("already exists") || e.message?.includes("duplicate column")) {
      console.log("SKIP:", sql.slice(0, 60));
    } else {
      console.error("ERR:", e.message);
    }
  }
}
console.log("Phase 5f migration done.");

// Phase 6 — iter-91 (insurance) + iter-94 (live tracking).
// MailItem.declaredValueCents + insuranceFeeCents back the declared-
// value insurance feature. The /dashboard Server Component SELECTs
// both fields, so they must exist before any dashboard load can
// succeed. MailItemTrackingState is the per-mail-item live tracking
// summary populated by the Shippo webhook.
const phase6 = [
  `ALTER TABLE MailItem ADD COLUMN declaredValueCents INTEGER`,
  `ALTER TABLE MailItem ADD COLUMN insuranceFeeCents INTEGER`,
  `CREATE TABLE IF NOT EXISTS MailItemTrackingState (
    mailItemId TEXT PRIMARY KEY,
    lastPolledAt DATETIME,
    lastStatusKey TEXT,
    lastStatusLabel TEXT,
    lastLocation TEXT,
    etaIso TEXT,
    pollErrorCount INTEGER NOT NULL DEFAULT 0,
    pollLastError TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mailItemId) REFERENCES MailItem(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS MailItemTrackingState_lastPolledAt_idx ON MailItemTrackingState(lastPolledAt)`,
];

for (const sql of phase6) {
  try {
    await client.execute(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e) {
    if (e.message?.includes("already exists") || e.message?.includes("duplicate column")) {
      console.log("SKIP:", sql.slice(0, 60));
    } else {
      console.error("ERR:", e.message);
    }
  }
}
console.log("Phase 6 migration done.");

// Phase 7 — iter-105 (storage-fee dispute). MailItem.feeChargedCents
// records the storage fee charged to a customer when their package
// crosses the free-storage tier. The Server Component dashboard query
// SELECTs this column, so the migration must run before any /dashboard
// load can succeed (mirrors Phase 6's failure mode).
const phase7 = [
  `ALTER TABLE MailItem ADD COLUMN feeChargedCents INTEGER`,
];

for (const sql of phase7) {
  try {
    await client.execute(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e) {
    if (e.message?.includes("already exists") || e.message?.includes("duplicate column")) {
      console.log("SKIP:", sql.slice(0, 60));
    } else {
      console.error("ERR:", e.message);
    }
  }
}
console.log("Phase 7 migration done.");

// Phase 8 — iter-96 (TOTP recovery codes). User.totpRecoveryCodes is a
// JSON-string column holding SHA-256-hashed one-time codes generated
// alongside enrollment. NextAuth's Prisma adapter SELECTs every column
// on the User model during the auth callback, so this column must
// exist in Turso before any sign-in attempt can succeed.
const phase8 = [
  `ALTER TABLE User ADD COLUMN totpRecoveryCodes TEXT`,
];

for (const sql of phase8) {
  try {
    await client.execute(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e) {
    if (e.message?.includes("already exists") || e.message?.includes("duplicate column")) {
      console.log("SKIP:", sql.slice(0, 60));
    } else {
      console.error("ERR:", e.message);
    }
  }
}
console.log("Phase 8 migration done.");

// Phase 9 — Password reset tokens (model PasswordResetToken in
// schema.prisma was added without a migration). Without this table the
// `/reset-password?token=…` flow throws "Cannot find table" which the
// Next.js error boundary surfaces to the user as "Something went wrong".
const phase9 = [
  `CREATE TABLE IF NOT EXISTS PasswordResetToken (
     id TEXT PRIMARY KEY,
     userId TEXT NOT NULL,
     token TEXT NOT NULL UNIQUE,
     expiresAt DATETIME NOT NULL,
     usedAt DATETIME,
     createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE INDEX IF NOT EXISTS PasswordResetToken_userId_idx ON PasswordResetToken(userId)`,
  `CREATE INDEX IF NOT EXISTS PasswordResetToken_token_idx ON PasswordResetToken(token)`,
];

for (const sql of phase9) {
  try {
    await client.execute(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e) {
    if (e.message?.includes("already exists") || e.message?.includes("duplicate column")) {
      console.log("SKIP:", sql.slice(0, 60));
    } else {
      console.error("ERR:", e.message);
    }
  }
}
console.log("Phase 9 migration done.");

// Phase 10 — MailerThread + MailerMessage + SuiteTransferRequest
// tables. These models were added to schema.prisma without a
// corresponding migration step, so production queries against them
// throw "no such table" and the /admin and /dashboard error boundaries
// surface "Something went wrong" with a long error ID.
const phase10 = [
  `CREATE TABLE IF NOT EXISTS MailerThread (
     id TEXT PRIMARY KEY,
     customerEmail TEXT NOT NULL,
     customerUserId TEXT,
     subject TEXT NOT NULL,
     lastMessageAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     unreadCount INTEGER NOT NULL DEFAULT 0,
     archived INTEGER NOT NULL DEFAULT 0,
     createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE INDEX IF NOT EXISTS MailerThread_customerEmail_idx ON MailerThread(customerEmail)`,
  `CREATE INDEX IF NOT EXISTS MailerThread_archived_lastMessageAt_idx ON MailerThread(archived, lastMessageAt)`,
  `CREATE INDEX IF NOT EXISTS MailerThread_customerUserId_idx ON MailerThread(customerUserId)`,

  `CREATE TABLE IF NOT EXISTS MailerMessage (
     id TEXT PRIMARY KEY,
     threadId TEXT NOT NULL,
     direction TEXT NOT NULL,
     fromEmail TEXT NOT NULL,
     toEmail TEXT NOT NULL,
     subject TEXT NOT NULL,
     bodyHtml TEXT NOT NULL,
     bodyText TEXT,
     providerId TEXT,
     unread INTEGER NOT NULL DEFAULT 1,
     templateId TEXT,
     bulkBatchId TEXT,
     sentAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE INDEX IF NOT EXISTS MailerMessage_threadId_sentAt_idx ON MailerMessage(threadId, sentAt)`,
  `CREATE INDEX IF NOT EXISTS MailerMessage_bulkBatchId_idx ON MailerMessage(bulkBatchId)`,

  `CREATE TABLE IF NOT EXISTS SuiteTransferRequest (
     id TEXT PRIMARY KEY,
     userId TEXT NOT NULL,
     fromSuite TEXT NOT NULL,
     toSuite TEXT NOT NULL,
     reason TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'Pending',
     decidedAt DATETIME,
     decidedById TEXT,
     decisionNote TEXT,
     createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE INDEX IF NOT EXISTS SuiteTransferRequest_userId_status_idx ON SuiteTransferRequest(userId, status)`,
  `CREATE INDEX IF NOT EXISTS SuiteTransferRequest_status_createdAt_idx ON SuiteTransferRequest(status, createdAt)`,
];

for (const sql of phase10) {
  try {
    await client.execute(sql);
    console.log("OK:", sql.slice(0, 60).replace(/\s+/g, " "));
  } catch (e) {
    if (e.message?.includes("already exists") || e.message?.includes("duplicate column")) {
      console.log("SKIP:", sql.slice(0, 60).replace(/\s+/g, " "));
    } else {
      console.error("ERR:", e.message);
    }
  }
}
console.log("Phase 10 migration done.");

// Phase 11 — all remaining tables that exist in schema.prisma but not
// in production. Discovered via prisma/probe-admin-queries.mjs after
// /admin and /dashboard were 500-ing on cold queries.
const phase11 = [
  // StorageFeeDispute
  `CREATE TABLE IF NOT EXISTS StorageFeeDispute (
     id TEXT PRIMARY KEY,
     mailItemId TEXT NOT NULL,
     filedById TEXT NOT NULL,
     feeCents INTEGER NOT NULL,
     reason TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'Open',
     resolution TEXT,
     resolvedAt DATETIME,
     resolvedById TEXT,
     refundCents INTEGER,
     createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE INDEX IF NOT EXISTS StorageFeeDispute_mailItemId_idx ON StorageFeeDispute(mailItemId)`,
  `CREATE INDEX IF NOT EXISTS StorageFeeDispute_status_createdAt_idx ON StorageFeeDispute(status, createdAt)`,
  `CREATE INDEX IF NOT EXISTS StorageFeeDispute_filedById_createdAt_idx ON StorageFeeDispute(filedById, createdAt)`,

  // WebhookEndpoint
  `CREATE TABLE IF NOT EXISTS WebhookEndpoint (
     id TEXT PRIMARY KEY,
     label TEXT NOT NULL,
     url TEXT NOT NULL,
     format TEXT NOT NULL DEFAULT 'slack',
     events TEXT NOT NULL,
     active INTEGER NOT NULL DEFAULT 1,
     secret TEXT,
     createdBy TEXT,
     createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     lastFiredAt DATETIME,
     lastStatus TEXT
   )`,
  `CREATE INDEX IF NOT EXISTS WebhookEndpoint_active_idx ON WebhookEndpoint(active)`,

  // WebhookDelivery
  `CREATE TABLE IF NOT EXISTS WebhookDelivery (
     id TEXT PRIMARY KEY,
     endpointId TEXT NOT NULL,
     event TEXT NOT NULL,
     payload TEXT NOT NULL,
     status TEXT NOT NULL,
     httpStatus INTEGER,
     error TEXT,
     durationMs INTEGER,
     sentAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE INDEX IF NOT EXISTS WebhookDelivery_endpointId_sentAt_idx ON WebhookDelivery(endpointId, sentAt)`,

  // PickupAppointment
  `CREATE TABLE IF NOT EXISTS PickupAppointment (
     id TEXT PRIMARY KEY,
     userId TEXT NOT NULL,
     scheduledAt DATETIME NOT NULL,
     durationMin INTEGER NOT NULL DEFAULT 15,
     status TEXT NOT NULL DEFAULT 'Scheduled',
     packageCount INTEGER,
     guestName TEXT,
     notes TEXT,
     checkedInAt DATETIME,
     completedAt DATETIME,
     cancelledAt DATETIME,
     cancelledBy TEXT,
     createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE INDEX IF NOT EXISTS PickupAppointment_scheduledAt_status_idx ON PickupAppointment(scheduledAt, status)`,
  `CREATE INDEX IF NOT EXISTS PickupAppointment_userId_scheduledAt_idx ON PickupAppointment(userId, scheduledAt)`,

  // IdExpiryAlert
  `CREATE TABLE IF NOT EXISTS IdExpiryAlert (
     id TEXT PRIMARY KEY,
     userId TEXT NOT NULL,
     document TEXT NOT NULL,
     threshold TEXT NOT NULL,
     expDate TEXT NOT NULL,
     sentAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     UNIQUE(userId, document, threshold, expDate)
   )`,
  `CREATE INDEX IF NOT EXISTS IdExpiryAlert_userId_idx ON IdExpiryAlert(userId)`,
  `CREATE INDEX IF NOT EXISTS IdExpiryAlert_sentAt_idx ON IdExpiryAlert(sentAt)`,

  // TrackingEvent
  `CREATE TABLE IF NOT EXISTS TrackingEvent (
     id TEXT PRIMARY KEY,
     mailItemId TEXT NOT NULL,
     eventTimeIso TEXT NOT NULL,
     statusKey TEXT NOT NULL,
     statusDetails TEXT NOT NULL,
     location TEXT,
     source TEXT NOT NULL,
     createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     UNIQUE(mailItemId, eventTimeIso, statusKey)
   )`,
  `CREATE INDEX IF NOT EXISTS TrackingEvent_mailItemId_createdAt_idx ON TrackingEvent(mailItemId, createdAt)`,

  // SmsLog
  `CREATE TABLE IF NOT EXISTS SmsLog (
     id TEXT PRIMARY KEY,
     userId TEXT,
     toPhone TEXT NOT NULL,
     fromPhone TEXT,
     body TEXT NOT NULL,
     kind TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'queued',
     provider TEXT,
     providerId TEXT,
     error TEXT,
     segments INTEGER,
     createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     sentAt DATETIME
   )`,
  `CREATE INDEX IF NOT EXISTS SmsLog_userId_createdAt_idx ON SmsLog(userId, createdAt)`,
  `CREATE INDEX IF NOT EXISTS SmsLog_status_createdAt_idx ON SmsLog(status, createdAt)`,

  // ExternalDropoff
  `CREATE TABLE IF NOT EXISTS ExternalDropoff (
     id TEXT PRIMARY KEY,
     trackingNumber TEXT NOT NULL,
     carrier TEXT NOT NULL,
     senderName TEXT,
     senderPhone TEXT,
     receiverName TEXT,
     destination TEXT,
     exteriorImageUrl TEXT,
     notes TEXT,
     status TEXT NOT NULL DEFAULT 'Awaiting Carrier',
     loggedById TEXT NOT NULL,
     carrierPickedUpAt DATETIME,
     createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE INDEX IF NOT EXISTS ExternalDropoff_status_createdAt_idx ON ExternalDropoff(status, createdAt)`,
  `CREATE INDEX IF NOT EXISTS ExternalDropoff_trackingNumber_idx ON ExternalDropoff(trackingNumber)`,
  `CREATE INDEX IF NOT EXISTS ExternalDropoff_createdAt_idx ON ExternalDropoff(createdAt)`,

  // PickupSurvey
  `CREATE TABLE IF NOT EXISTS PickupSurvey (
     id TEXT PRIMARY KEY,
     mailItemId TEXT NOT NULL UNIQUE,
     userId TEXT NOT NULL,
     token TEXT NOT NULL UNIQUE,
     rating INTEGER,
     comment TEXT,
     submittedAt DATETIME,
     createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE INDEX IF NOT EXISTS PickupSurvey_userId_createdAt_idx ON PickupSurvey(userId, createdAt)`,
  `CREATE INDEX IF NOT EXISTS PickupSurvey_submittedAt_idx ON PickupSurvey(submittedAt)`,
];

for (const sql of phase11) {
  try {
    await client.execute(sql);
    console.log("OK:", sql.slice(0, 60).replace(/\s+/g, " "));
  } catch (e) {
    if (e.message?.includes("already exists") || e.message?.includes("duplicate column")) {
      console.log("SKIP:", sql.slice(0, 60).replace(/\s+/g, " "));
    } else {
      console.error("ERR:", e.message);
    }
  }
}
console.log("Phase 11 migration done.");

// Phase 12 — MailItem columns that schema.prisma added without
// matching ALTER TABLE rows. The /dashboard SELECT requests
// aiAnalysisJson; without the column, Prisma 500s and the entire
// member dashboard hits the error boundary. publicShareToken is also
// in the schema for the (recent) public-mail-item share link feature.
const phase12 = [
  `ALTER TABLE MailItem ADD COLUMN aiAnalysisJson TEXT`,
  `ALTER TABLE MailItem ADD COLUMN publicShareToken TEXT`,
];
for (const sql of phase12) {
  try {
    await client.execute(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e) {
    if (e.message?.includes("already exists") || e.message?.includes("duplicate column")) {
      console.log("SKIP:", sql.slice(0, 60));
    } else {
      console.error("ERR:", e.message);
    }
  }
}
console.log("Phase 12 migration done.");

// Phase 13 — User.locale column + backfill stuck SquareSyncLog rows.
//
// Root cause discovered by sync-investigation agent: prisma/schema.prisma
// added User.locale at iter-183 but no ALTER ran on Turso. Every Prisma
// SELECT on User now fails with "no such column: main.User.locale", which
// is why Square payment sync sat at status='running' indefinitely (the
// payment-sync flow does prisma.user.findMany to resolve the userId
// link, hits the SQL error, jumps to catch — but the catch's
// completeSyncLog() also touches User columns through the connection
// recovery path and silently never resolves). 36 sync-log rows are
// stuck in "running"; this phase backfills them to "failed" so the
// admin UI shows truth.
const phase13 = [
  `ALTER TABLE User ADD COLUMN locale TEXT`,
  `UPDATE SquareSyncLog SET status = 'failed', errors = 'Stale row — locked while User.locale column was missing in prod (migration 13)', completedAt = CURRENT_TIMESTAMP WHERE status = 'running' AND completedAt IS NULL`,
];
for (const sql of phase13) {
  try {
    await client.execute(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e) {
    if (e.message?.includes("already exists") || e.message?.includes("duplicate column")) {
      console.log("SKIP:", sql.slice(0, 60));
    } else {
      console.error("ERR:", e.message);
    }
  }
}
console.log("Phase 13 migration done.");

// Phase 14 — 13 more missing User columns discovered after Phase 13
// fixed `locale`. All were added to schema.prisma at various iters
// without an ALTER landing on Turso. Until now every Prisma SELECT on
// User threw "no such column: User.kycTrustScore" (or similar) and
// dragged Square sync, /admin queries, and several panels down with it.
const phase14 = [
  `ALTER TABLE User ADD COLUMN kycTrustScore INTEGER`,
  `ALTER TABLE User ADD COLUMN kycTrustComputedAt DATETIME`,
  `ALTER TABLE User ADD COLUMN kycTrustFlagsJson TEXT`,
  `ALTER TABLE User ADD COLUMN shareJunkLearning INTEGER DEFAULT 1`,
  `ALTER TABLE User ADD COLUMN renewalCadenceJson TEXT`,
  `ALTER TABLE User ADD COLUMN leaderboardOptIn INTEGER DEFAULT 0`,
  `ALTER TABLE User ADD COLUMN preferredCarrier TEXT`,
  `ALTER TABLE User ADD COLUMN suitePinSlogan TEXT`,
  `ALTER TABLE User ADD COLUMN outboundDigestOptIn INTEGER DEFAULT 0`,
  `ALTER TABLE User ADD COLUMN outboundDigestLastSentAt DATETIME`,
  `ALTER TABLE User ADD COLUMN lockboxMonthPassUntil DATETIME`,
  `ALTER TABLE User ADD COLUMN loyaltyTier TEXT`,
  `ALTER TABLE User ADD COLUMN loyaltyTierAt DATETIME`,
  // Backfill the 8 rows that re-stuck in 'running' between Phase 13 and now.
  `UPDATE SquareSyncLog SET status='failed', errors='Pre-phase14 stale row', completedAt=CURRENT_TIMESTAMP WHERE status='running' AND completedAt IS NULL`,
];
for (const sql of phase14) {
  try {
    await client.execute(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e) {
    if (e.message?.includes("already exists") || e.message?.includes("duplicate column")) {
      console.log("SKIP:", sql.slice(0, 60));
    } else {
      console.error("ERR:", e.message);
    }
  }
}
console.log("Phase 14 migration done.");
