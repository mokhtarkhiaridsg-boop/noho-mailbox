import Image from "next/image";

/**
 * NOHO Mailbox primary logo. Brand-book locked — uses the actual asset.
 * Aspect ratio: 596 × 343 (≈ 1.74:1).
 *
 * Sizing: pass a Tailwind height class (e.g. `h-7`, `h-9`, `h-14`) — the
 * width auto-scales because we set `width="auto"` and rely on the height
 * class. We deliberately do NOT set inline height styles, otherwise the
 * className would be overridden.
 */
export default function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/logo-trans.png"
      alt="NOHO Mailbox"
      width={596}
      height={343}
      priority
      className={className}
    />
  );
}
