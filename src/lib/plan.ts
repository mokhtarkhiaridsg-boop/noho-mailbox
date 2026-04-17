/**
 * Plan expiration utilities shared between server actions and UI.
 */

export type PlanStatus = "active" | "warning" | "grace" | "expired";

/**
 * Compute the current plan status from the admin-set due date string.
 *
 * - active:  no due date OR due date is more than 14 days away
 * - warning: due date is within the next 14 days (still valid)
 * - grace:   due date has passed, but within the 10-day grace window
 * - expired: due date has passed by more than 10 days — block actions
 */
export function getPlanStatus(planDueDate: string | null | undefined): PlanStatus {
  if (!planDueDate) return "active";

  // Parse as UTC midnight so comparisons are timezone-independent
  const due = new Date(planDueDate + "T00:00:00Z");
  if (isNaN(due.getTime())) return "active";

  // Compare against UTC midnight today so the diff is whole days
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);
  const diffDays = (due.getTime() - todayUTC.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays > 14) return "active";
  if (diffDays > 0) return "warning";
  if (diffDays > -10) return "grace";
  return "expired";
}

/** Human-readable label for the banner */
export function planStatusMessage(planDueDate: string, status: PlanStatus): string {
  const due = new Date(planDueDate + "T00:00:00Z");
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);
  const daysUntil = Math.ceil((due.getTime() - todayUTC.getTime()) / (1000 * 60 * 60 * 24));
  const daysOver = Math.floor((todayUTC.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  const graceLeft = 10 - daysOver;

  switch (status) {
    case "warning":
      return `Your plan renews on ${planDueDate}. ${daysUntil} day${daysUntil === 1 ? "" : "s"} remaining.`;
    case "grace":
      return `Your plan expired on ${planDueDate}. You have ${graceLeft} day${graceLeft === 1 ? "" : "s"} left in the grace period — renew now to avoid service interruption.`;
    case "expired":
      return `Your plan expired on ${planDueDate}. Service is suspended. Please renew or contact us to restore access.`;
    default:
      return "";
  }
}
