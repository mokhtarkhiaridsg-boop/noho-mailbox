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

  // Treat the due date as the end of that calendar day
  const due = new Date(planDueDate + "T23:59:59");
  if (isNaN(due.getTime())) return "active";

  const now = new Date();
  const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays > 14) return "active";
  if (diffDays > 0) return "warning";
  if (diffDays > -10) return "grace";
  return "expired";
}

/** Human-readable label for the banner */
export function planStatusMessage(planDueDate: string, status: PlanStatus): string {
  const due = new Date(planDueDate + "T23:59:59");
  const daysUntil = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const daysOver = Math.floor((Date.now() - due.getTime()) / (1000 * 60 * 60 * 24));
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
