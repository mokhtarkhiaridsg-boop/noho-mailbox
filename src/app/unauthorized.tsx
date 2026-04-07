import Link from "next/link";

export default function Unauthorized() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          "linear-gradient(155deg, #1a1108 0%, #2D1D0F 50%, #0d1e35 100%)",
      }}
    >
      <div className="text-center">
        <h1 className="text-6xl font-black text-[#F7E6C2] mb-4">401</h1>
        <p className="text-lg text-[#F7E6C2]/60 mb-8">
          You need to sign in to access this page.
        </p>
        <Link
          href="/login"
          className="inline-block font-black px-8 py-3.5 rounded-2xl text-sm text-white"
          style={{
            background: "linear-gradient(135deg, #3374B5, #2055A0)",
            boxShadow: "0 4px 16px rgba(51,116,181,0.4)",
          }}
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
