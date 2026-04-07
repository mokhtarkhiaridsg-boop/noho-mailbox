import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7E6C2] px-4">
      <div className="text-center max-w-md">
        <div className="text-7xl font-black text-[#2D1D0F]/10 mb-4">404</div>
        <h1 className="text-3xl font-black text-[#2D1D0F] mb-3">
          Page Not Found
        </h1>
        <p className="text-[#2D1D0F]/60 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/"
            className="px-6 py-3 rounded-xl font-black text-white text-sm"
            style={{
              background: "linear-gradient(135deg, #3374B5, #2055A0)",
              boxShadow: "0 2px 10px rgba(51,116,181,0.3)",
            }}
          >
            Go Home
          </Link>
          <Link
            href="/contact"
            className="px-6 py-3 rounded-xl font-black text-[#2D1D0F] text-sm"
            style={{ border: "2px solid rgba(45,29,15,0.15)" }}
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
