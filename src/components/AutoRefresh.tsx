"use client";

/**
 * Silent server-component refresh on a fixed interval.
 *
 * Used by /r/[id] (the public tracking receipt) to keep the live carrier
 * status fresh while the customer leaves the tab open. Fires
 * `router.refresh()` which re-runs server data fetches and patches the
 * rendered tree — no flicker, no scroll loss, no full page reload.
 *
 * Disables itself automatically when the page is hidden (Page Visibility API)
 * so background tabs don't burn rate-limit on Shippo's tracking endpoint, and
 * resumes when the tab becomes visible again.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
  /** ms between refreshes. Default 60_000 (60s). */
  intervalMs?: number;
  /** When true, mount no timer — useful for "delivered" or "refunded" states. */
  disabled?: boolean;
};

export default function AutoRefresh({ intervalMs = 60_000, disabled = false }: Props) {
  const router = useRouter();
  useEffect(() => {
    if (disabled) return;
    let id: number | null = null;
    function start() {
      stop();
      id = window.setInterval(() => {
        // router.refresh() re-runs the route's server data fetch and patches
        // the rendered tree — silent, no flicker, no scroll-jump.
        router.refresh();
      }, intervalMs);
    }
    function stop() {
      if (id != null) {
        window.clearInterval(id);
        id = null;
      }
    }
    function onVisibility() {
      if (document.hidden) stop();
      else start();
    }
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, intervalMs, disabled]);
  return null;
}
