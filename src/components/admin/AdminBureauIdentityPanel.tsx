"use client";

/**
 * iter-215 — Bureau identity admin panel (Tier 15 #124).
 *
 * Edit the bureau's name + address + contact + brand color. Surfaces
 * the federated API URLs at the top so admin can hand them to a sister
 * bureau to wire into discovery.
 */

import { useEffect, useState, useTransition } from "react";
import { getBureauIdentity, updateBureauIdentity, resetBureauIdentity } from "@/app/actions/bureauIdentity";
import type { BureauIdentity } from "@/lib/bureau-identity";

const T = {
  surface: "#FFFFFF",
  surfaceAlt: "#F4F5F7",
  border: "#ECEEF1",
  ink: "#1A1D23",
  inkSoft: "#3B4252",
  inkFaint: "#7A8290",
  blue: "#1976FF",
  blueDeep: "#0F5BD9",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
};

export default function AdminBureauIdentityPanel() {
  const [identity, setIdentity] = useState<BureauIdentity | null>(null);
  const [busy, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string>("");

  useEffect(() => {
    void getBureauIdentity().then(setIdentity).catch(() => setIdentity(null));
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  function patch<K extends keyof BureauIdentity>(key: K, value: BureauIdentity[K]) {
    if (!identity) return;
    setIdentity({ ...identity, [key]: value });
  }

  function onSave() {
    if (!identity) return;
    setInfo(null); setError(null);
    startTransition(async () => {
      const res = await updateBureauIdentity(identity);
      if (res.error) setError(res.error);
      else { setInfo(`✓ Saved · bureauId = ${res.row?.bureauId}`); if (res.row) setIdentity(res.row); }
    });
  }
  function onReset() {
    if (!confirm("Reset bureau identity to defaults?")) return;
    setInfo(null); setError(null);
    startTransition(async () => {
      const res = await resetBureauIdentity();
      setIdentity(res.row);
      setInfo("Reset to defaults");
    });
  }

  if (!identity) return <p className="text-[12px] text-gray-500">Loading…</p>;

  const infoUrl = origin ? `${origin}/api/bureau/${identity.bureauId}/info` : `/api/bureau/${identity.bureauId}/info`;
  const hoursUrl = origin ? `${origin}/api/bureau/${identity.bureauId}/hours` : `/api/bureau/${identity.bureauId}/hours`;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          System · Bureau identity
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>Bureau identity & federation</h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          Per-install identity that powers the federated `/api/bureau/{`{`}id{`}`}/...` namespace. When NOHO franchises spin up sister bureaus, each install has its own bureauId and they discover each other via these public APIs.
        </p>
      </div>

      {info && <p className="text-[11.5px] font-semibold" style={{ color: T.success }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}

      <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.inkFaint }}>🌐 Federated API URLs (give these to a sister bureau)</p>
        <div className="space-y-1.5">
          <code className="block text-[10.5px] break-all rounded p-2 font-mono" style={{ background: T.surfaceAlt, color: T.ink, border: `1px solid ${T.border}` }}>
            GET {infoUrl}
          </code>
          <code className="block text-[10.5px] break-all rounded p-2 font-mono" style={{ background: T.surfaceAlt, color: T.ink, border: `1px solid ${T.border}` }}>
            GET {hoursUrl}
          </code>
        </div>
        <p className="text-[10px] mt-1.5" style={{ color: T.inkFaint }}>
          Both routes are public + cache-friendly (60s for hours, 5min for identity). 404 when bureauId in URL doesn&apos;t match this install — lets a caller fan out across a known franchise list.
        </p>
      </div>

      <div className="rounded-2xl p-4 space-y-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>⚙️ Identity fields</p>

        <Field label="Bureau ID (slug)" hint="lowercase letters/digits/dashes, 2-40 chars">
          <input value={identity.bureauId} onChange={(e) => patch("bureauId", e.target.value.toLowerCase())} maxLength={40}
            className="w-full px-3 py-2 rounded-lg text-[13px] font-mono" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field label="Name">
            <input value={identity.name} onChange={(e) => patch("name", e.target.value)} maxLength={80}
              className="w-full px-3 py-2 rounded-lg text-[13px]" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
          </Field>
          <Field label="Founded year">
            <input type="number" min={1900} max={2100} value={identity.founded} onChange={(e) => patch("founded", parseInt(e.target.value, 10) || 2024)}
              className="w-full px-3 py-2 rounded-lg text-[13px] font-mono" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
          </Field>
        </div>

        <Field label="Street address">
          <textarea value={identity.address} onChange={(e) => patch("address", e.target.value)} maxLength={300} rows={2}
            className="w-full px-3 py-2 rounded-lg text-[12.5px] resize-none" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
        </Field>

        <div className="grid grid-cols-3 gap-2">
          <Field label="City">
            <input value={identity.city} onChange={(e) => patch("city", e.target.value)} maxLength={80}
              className="w-full px-3 py-2 rounded-lg text-[13px]" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
          </Field>
          <Field label="State (2-letter)">
            <input value={identity.state} onChange={(e) => patch("state", e.target.value.toUpperCase().slice(0, 2))} maxLength={2}
              className="w-full px-3 py-2 rounded-lg text-[13px] font-mono uppercase" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
          </Field>
          <Field label="ZIP">
            <input value={identity.zip} onChange={(e) => patch("zip", e.target.value)} maxLength={12}
              className="w-full px-3 py-2 rounded-lg text-[13px] font-mono" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field label="Timezone (IANA)">
            <input value={identity.timezone} onChange={(e) => patch("timezone", e.target.value)} maxLength={60}
              className="w-full px-3 py-2 rounded-lg text-[13px] font-mono" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
          </Field>
          <Field label="Phone (E.164 preferred)">
            <input value={identity.phone} onChange={(e) => patch("phone", e.target.value)} maxLength={30}
              className="w-full px-3 py-2 rounded-lg text-[13px] font-mono" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field label="Contact email">
            <input value={identity.contactEmail} onChange={(e) => patch("contactEmail", e.target.value)} maxLength={80}
              className="w-full px-3 py-2 rounded-lg text-[13px]" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
          </Field>
          <Field label="Website URL">
            <input value={identity.websiteUrl} onChange={(e) => patch("websiteUrl", e.target.value)} maxLength={200}
              className="w-full px-3 py-2 rounded-lg text-[13px] font-mono" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field label="Brand primary color (hex)">
            <div className="flex items-center gap-2">
              <input value={identity.brandPrimaryHex} onChange={(e) => patch("brandPrimaryHex", e.target.value)} maxLength={7}
                className="flex-1 px-3 py-2 rounded-lg text-[13px] font-mono" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
              <span className="w-10 h-10 rounded-md shrink-0" style={{ background: identity.brandPrimaryHex, border: `1px solid ${T.border}` }} />
            </div>
          </Field>
          <Field label="CMRA license # (optional)">
            <input value={identity.cmraLicenseNumber ?? ""} onChange={(e) => patch("cmraLicenseNumber", e.target.value || null)} maxLength={60}
              placeholder="leave blank if not licensed yet"
              className="w-full px-3 py-2 rounded-lg text-[13px] font-mono" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onReset} disabled={busy}
            className="text-[11px] font-bold px-3 py-1.5 rounded-lg disabled:opacity-50" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
            Reset to defaults
          </button>
          <button type="button" onClick={onSave} disabled={busy}
            className="text-[11.5px] font-black px-4 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
            {busy ? "Saving…" : "Save identity"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] mb-1" style={{ color: T.inkFaint }}>
        {label}{hint && <span className="font-normal normal-case ml-1 tracking-normal" style={{ color: T.inkFaint }}>· {hint}</span>}
      </p>
      {children}
    </div>
  );
}
