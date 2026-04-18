"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TransitionStartFunction } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { BRAND, type DashboardUser, type KeyReq } from "./types";
import {
  IconSettings,
  IconKey,
  IconLock,
  IconLogout,
} from "@/components/MemberIcons";
import { updateProfile } from "@/app/actions/user";
import { requestNewKey } from "@/app/actions/keys";
import { enable2FA, confirm2FA, disable2FA } from "@/app/actions/security";
import { logout } from "@/app/actions/auth";
import { getOrCreateMyReferralCode } from "@/app/actions/referral";
import { requestCancellation } from "@/app/actions/cancellation";

type Props = {
  user: DashboardUser;
  isPending: boolean;
  startTransition: TransitionStartFunction;
  setToast: (s: string) => void;
  router: AppRouterInstance;
  editingField: string | null;
  setEditingField: (v: string | null) => void;
  editValue: string;
  setEditValue: (v: string) => void;
  planLabel: string;
  planStatus: string;
  isBlocked: boolean;
  keyRequests: KeyReq[];
  runAction: (label: string, fn: () => Promise<unknown>) => void;
};

function TwoFactorPanel({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(enabled);
  const router = useRouter();

  const startSetup = () =>
    startTransition(async () => {
      setMessage(null);
      const res = await enable2FA();
      if (res.success) setSetup({ secret: res.secret, uri: res.uri });
      else setMessage("Failed to start setup");
    });

  const confirmSetup = () =>
    startTransition(async () => {
      const res = await confirm2FA(token);
      if (res.success) {
        setIsEnabled(true);
        setSetup(null);
        setToken("");
        setMessage("2FA enabled ✓");
        router.refresh();
      } else {
        setMessage(res.error ?? "Invalid code");
      }
    });

  const turnOff = () =>
    startTransition(async () => {
      const res = await disable2FA(token);
      if (res.success) {
        setIsEnabled(false);
        setToken("");
        setMessage("2FA disabled");
        router.refresh();
      } else {
        setMessage(res.error ?? "Invalid code");
      }
    });

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}` }}
    >
      <div className="flex items-center justify-between gap-2.5 mb-2">
        <div className="flex items-center gap-2.5">
          <IconLock className="w-4 h-4" style={{ color: BRAND.blueDeep }} />
          <p
            className="text-[10px] font-black uppercase tracking-[0.16em]"
            style={{ color: BRAND.blueDeep }}
          >
            Two-Factor Authentication
          </p>
        </div>
        <span
          className="text-[10px] font-black px-2 py-0.5 rounded-full"
          style={{
            background: isEnabled ? "#dcfce7" : "rgba(14,34,64,0.08)",
            color: isEnabled ? "#166534" : BRAND.inkSoft,
          }}
        >
          {isEnabled ? "Enabled" : "Off"}
        </span>
      </div>

      {!isEnabled && !setup && (
        <>
          <p className="text-xs mb-3" style={{ color: BRAND.inkSoft }}>
            Add a 6-digit code from an authenticator app on every sign-in.
          </p>
          <button
            disabled={pending}
            onClick={startSetup}
            className="text-xs font-black px-4 py-2 rounded-xl text-white disabled:opacity-50"
            style={{
              background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
              boxShadow: "0 4px 14px rgba(51,116,181,0.32)",
            }}
          >
            Enable 2FA
          </button>
        </>
      )}

      {setup && (
        <div className="space-y-3">
          <p className="text-[11px]" style={{ color: BRAND.inkSoft }}>
            Scan this URI with Google Authenticator, 1Password, Authy, etc., then enter the code.
          </p>
          <code
            className="block text-[10px] break-all rounded-lg p-2"
            style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.inkSoft }}
          >
            {setup.uri}
          </code>
          <p className="text-[10px]" style={{ color: BRAND.inkSoft }}>
            Manual key: <strong>{setup.secret}</strong>
          </p>
          <div className="flex gap-2">
            <input
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="000000"
              className="flex-1 rounded-xl px-3 py-2 text-sm tracking-[0.4em] text-center"
              style={{ background: "white", border: `1px solid ${BRAND.border}` }}
            />
            <button
              disabled={pending || token.length !== 6}
              onClick={confirmSetup}
              className="text-xs font-black px-4 py-2 rounded-xl text-white disabled:opacity-50"
              style={{ background: BRAND.blue }}
            >
              Verify
            </button>
          </div>
        </div>
      )}

      {isEnabled && (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: BRAND.inkSoft }}>
            Enter a current code to disable 2FA.
          </p>
          <div className="flex gap-2">
            <input
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="000000"
              className="flex-1 rounded-xl px-3 py-2 text-sm tracking-[0.4em] text-center"
              style={{ background: "white", border: `1px solid ${BRAND.border}` }}
            />
            <button
              disabled={pending || token.length !== 6}
              onClick={turnOff}
              className="text-xs font-black px-4 py-2 rounded-xl text-red-600 disabled:opacity-50"
              style={{ background: "white", border: "1px solid rgba(220,38,38,0.3)" }}
            >
              Disable
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className="mt-2 text-[11px] font-bold" style={{ color: BRAND.inkSoft }}>
          {message}
        </p>
      )}
    </div>
  );
}

export default function SettingsPanel({
  user,
  isPending,
  startTransition,
  setToast,
  router,
  editingField,
  setEditingField,
  editValue,
  setEditValue,
  planLabel,
  planStatus,
  isBlocked,
  keyRequests,
  runAction,
}: Props) {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGetCode() {
    setLoadingCode(true);
    const { code } = await getOrCreateMyReferralCode();
    setReferralCode(code);
    setLoadingCode(false);
  }

  function copyCode() {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="rounded-3xl p-6"
      style={{
        background: "white",
        border: `1px solid ${BRAND.border}`,
        boxShadow: "0 1px 0 rgba(51,116,181,0.04), 0 12px 32px rgba(14,34,64,0.06)",
      }}
    >
      <div className="flex items-center gap-2.5 mb-5">
        <IconSettings className="w-4 h-4" style={{ color: BRAND.blue }} />
        <h3 className="font-black text-xs uppercase tracking-[0.16em]" style={{ color: BRAND.ink }}>
          Account Settings
        </h3>
      </div>
      <div className="space-y-3">
        {[
          { label: "Name", key: "name", value: user.name, editable: true },
          { label: "Email", key: "email", value: user.email, editable: true },
          { label: "Phone", key: "phone", value: user.phone || "Not set", editable: true },
          { label: "Plan", key: "plan", value: planLabel, editable: false },
          {
            label: "Renewal Date",
            key: "renewalDate",
            value: user.planDueDate
              ? `${user.planDueDate}${planStatus !== "active" ? (isBlocked ? " — SUSPENDED" : " — renew now") : ""}`
              : "Not set",
            editable: false,
          },
        ].map((field) => (
          <div
            key={field.label}
            className="flex items-center justify-between p-4 rounded-2xl transition-all hover:-translate-y-0.5"
            style={{
              background: BRAND.blueSoft,
              border: `1px solid ${BRAND.border}`,
            }}
          >
            <div className="flex-1 min-w-0">
              <p
                className="text-[10px] font-black uppercase tracking-[0.16em]"
                style={{ color: BRAND.inkFaint }}
              >
                {field.label}
              </p>
              {editingField === field.key ? (
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="rounded-xl px-3 py-1.5 text-sm flex-1"
                    style={{
                      background: "white",
                      border: `1px solid ${BRAND.border}`,
                      color: BRAND.ink,
                    }}
                    autoFocus
                  />
                  <button
                    disabled={isPending}
                    onClick={() => {
                      const form = new FormData();
                      form.set("name", field.key === "name" ? editValue : user.name);
                      form.set("email", field.key === "email" ? editValue : user.email);
                      form.set("phone", field.key === "phone" ? editValue : user.phone || "");
                      startTransition(async () => {
                        await updateProfile({}, form);
                        setEditingField(null);
                        setToast("Profile updated");
                        router.refresh();
                      });
                    }}
                    className="text-xs font-black text-white px-3 py-1.5 rounded-lg disabled:opacity-40"
                    style={{ background: BRAND.blue }}
                  >
                    {isPending ? "..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditingField(null)}
                    className="text-xs font-bold"
                    style={{ color: BRAND.inkFaint }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <p
                  className="text-sm font-bold mt-0.5 truncate"
                  style={{ color: BRAND.ink }}
                >
                  {field.value}
                </p>
              )}
            </div>
            {field.editable && editingField !== field.key && (
              <button
                onClick={() => {
                  setEditingField(field.key);
                  setEditValue(field.key === "phone" ? user.phone || "" : field.value);
                }}
                className="text-xs font-black ml-3 px-3 py-1.5 rounded-lg transition-colors hover:bg-white"
                style={{ color: BRAND.blueDeep }}
              >
                Edit
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="mt-6 pt-5 space-y-4" style={{ borderTop: `1px solid ${BRAND.border}` }}>
        <div
          className="rounded-2xl p-4"
          style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}` }}
        >
          <div className="flex items-center gap-2.5 mb-2">
            <IconKey className="w-4 h-4" style={{ color: BRAND.blueDeep }} />
            <p
              className="text-[10px] font-black uppercase tracking-[0.16em]"
              style={{ color: BRAND.blueDeep }}
            >
              Mailbox Key
            </p>
          </div>
          <p className="text-xs mb-3" style={{ color: BRAND.inkSoft }}>
            Lost or damaged your key? Request a replacement. A $25 fee will be
            deducted from your security deposit upon issuance.
          </p>
          {keyRequests.length > 0 && (
            <p className="text-[11px] mb-3" style={{ color: BRAND.inkFaint }}>
              Latest request: <strong>{keyRequests[0].status}</strong>
            </p>
          )}
          <button
            disabled={isPending}
            onClick={() => {
              const reason = window.prompt(
                "Briefly describe why you need a new key:",
                "Lost key"
              );
              if (!reason) return;
              runAction("Key request submitted", () => requestNewKey(reason));
            }}
            className="text-xs font-black px-4 py-2 rounded-xl text-white disabled:opacity-50"
            style={{
              background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
              boxShadow: "0 4px 14px rgba(51,116,181,0.32)",
            }}
          >
            Request New Key
          </button>
        </div>

        <TwoFactorPanel enabled={user.totpEnabled} />

        {/* Referral Program */}
        <div className="rounded-2xl p-5 space-y-3" style={{ background: BRAND.bgDeep, border: `1px solid ${BRAND.border}` }}>
          <div className="flex items-center gap-2">
            <span className="text-lg">🎁</span>
            <div>
              <p className="font-black text-sm" style={{ color: BRAND.ink }}>Refer a Friend — Get $10</p>
              <p className="text-[11px]" style={{ color: BRAND.inkFaint }}>You both get $10 in wallet credit when they sign up with your code</p>
            </div>
          </div>
          {referralCode ? (
            <div className="flex items-center gap-2">
              <code
                className="flex-1 font-mono font-black text-sm px-4 py-2.5 rounded-xl text-center tracking-widest"
                style={{ background: "white", border: `2px solid ${BRAND.blue}`, color: BRAND.blue }}
              >{referralCode}</code>
              <button
                onClick={copyCode}
                className="px-4 py-2.5 rounded-xl text-sm font-black text-white transition-colors"
                style={{ background: copied ? "#16A34A" : BRAND.blue }}
              >{copied ? "✓ Copied!" : "Copy"}</button>
            </div>
          ) : (
            <button
              onClick={handleGetCode}
              disabled={loadingCode}
              className="w-full py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})` }}
            >{loadingCode ? "Generating…" : "Get My Referral Code"}</button>
          )}
        </div>

        {/* Cancel Membership */}
        <div
          className="rounded-2xl p-4 space-y-2"
          style={{ background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.15)" }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-700">Close Account</p>
          <p className="text-xs text-gray-500">
            Request to close your mailbox. After approval you&apos;ll have 30 days to collect remaining mail.
          </p>
          <button
            disabled={isPending}
            onClick={() => {
              const reason = window.prompt("Please tell us why you want to cancel:");
              if (!reason) return;
              startTransition(async () => {
                const res = await requestCancellation(reason);
                if ("error" in res && res.error) setToast(res.error);
                else setToast("Cancellation request submitted. We'll review it shortly.");
              });
            }}
            className="text-xs font-black px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
          >
            Request Cancellation
          </button>
        </div>

        <button
          onClick={() => logout()}
          className="flex items-center gap-2 text-xs font-black text-red-600 hover:underline"
        >
          <IconLogout className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
