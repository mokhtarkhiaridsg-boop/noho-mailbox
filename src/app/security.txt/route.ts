// Fallback security.txt at root. The preferred location is
// /.well-known/security.txt per RFC 9116.

export const dynamic = "force-static";

const SECURITY_TXT = `Contact: mailto:security@nohomailbox.org
Contact: https://nohomailbox.org/contact
Expires: 2027-01-01T00:00:00.000Z
Preferred-Languages: en
Canonical: https://nohomailbox.org/.well-known/security.txt
Policy: https://nohomailbox.org/security
`;

export async function GET() {
  return new Response(SECURITY_TXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
