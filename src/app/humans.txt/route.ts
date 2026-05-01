// humans.txt — credit + thanks file. Small but appreciated.
// Spec: humanstxt.org

export const dynamic = "force-static";

const HUMANS_TXT = `/* TEAM */

Founder + Operator: NOHO Mailbox team
Location: 5062 Lankershim Blvd, North Hollywood CA 91601
Contact: real@nohomailbox.org
Phone: (818) 506-7744


/* THANKS */

Anthropic Claude — for the autonomous build assistance
USPS — for being a reliable mail-handling partner
Stripe — for processing payments
Mercury — for business banking
Resend — for transactional + marketing email
Turso — for libSQL database
Vercel — for hosting + deployment
Next.js — for the framework
Tailwind CSS — for the styling
TypeScript — for type safety
React — for the UI library
LA County small businesses — for trusting us with their mail


/* SITE */

Last update: 2026 Q2
Standards: HTML5, CSS3, ES2024
Components: Server + Client Components, Schema.org, RFC 9116, RFC 5023, llmstxt.org
Software: Next.js 16, React 19, Prisma 7, Tailwind 4
`;

export async function GET() {
  return new Response(HUMANS_TXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
