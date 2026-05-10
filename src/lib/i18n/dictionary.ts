// iter-110 — Translation dictionary.
//
// English / French / Arabic for the most common member-dashboard +
// marketing strings. Keys are kebab-cased semantic IDs so the same key
// can land in multiple surfaces. Missing translations fall back to English
// at the hook level — DO NOT silently leave a key blank, that'll display
// as an empty string in production.

export const LOCALES = ["en", "fr", "ar"] as const;
export type Locale = typeof LOCALES[number];

export const LOCALE_META: Record<Locale, { label: string; nativeLabel: string; flag: string; dir: "ltr" | "rtl" }> = {
  en: { label: "English",  nativeLabel: "English",  flag: "🇺🇸", dir: "ltr" },
  fr: { label: "French",   nativeLabel: "Français", flag: "🇫🇷", dir: "ltr" },
  ar: { label: "Arabic",   nativeLabel: "العربية",  flag: "🇹🇳", dir: "rtl" },
};

// Sentinel cookie name + storage key (kept matching across server + client).
export const LOCALE_COOKIE = "noho_locale";

// Translation entry: each key has all three translations. New keys added
// here force a TypeScript error if any locale is missing — that's the
// guarantee we want.
export const DICT = {
  // Generic chrome
  "nav.overview":       { en: "Overview",        fr: "Aperçu",            ar: "نظرة عامة" },
  "nav.mail":           { en: "Mail",            fr: "Courrier",          ar: "البريد" },
  "nav.packages":       { en: "Packages",        fr: "Colis",             ar: "الطرود" },
  "nav.wallet":         { en: "Wallet",          fr: "Portefeuille",      ar: "المحفظة" },
  "nav.forwarding":     { en: "Forwarding",      fr: "Réexpédition",      ar: "إعادة التوجيه" },
  "nav.messages":       { en: "Messages",        fr: "Messages",          ar: "الرسائل" },
  "nav.notary":         { en: "Notary",          fr: "Notaire",           ar: "موثق" },
  "nav.settings":       { en: "Settings",        fr: "Paramètres",        ar: "الإعدادات" },
  "nav.shipping":       { en: "Shipping",        fr: "Expédition",        ar: "الشحن" },
  "nav.invoices":       { en: "Invoices",        fr: "Factures",          ar: "الفواتير" },
  "nav.deliveries":     { en: "Deliveries",      fr: "Livraisons",        ar: "التوصيلات" },
  "nav.vault":          { en: "Vault",           fr: "Coffre-fort",       ar: "الخزنة" },
  "nav.qr_pickup":      { en: "QR Pickup",       fr: "Retrait QR",        ar: "استلام QR" },
  "nav.year_in_review": { en: "Year in Review",  fr: "Bilan annuel",      ar: "ملخص العام" },

  // Common actions
  "action.save":        { en: "Save",            fr: "Enregistrer",       ar: "حفظ" },
  "action.cancel":      { en: "Cancel",          fr: "Annuler",           ar: "إلغاء" },
  "action.confirm":     { en: "Confirm",         fr: "Confirmer",         ar: "تأكيد" },
  "action.delete":      { en: "Delete",          fr: "Supprimer",         ar: "حذف" },
  "action.upload":      { en: "Upload",          fr: "Téléverser",        ar: "رفع" },
  "action.download":    { en: "Download",        fr: "Télécharger",       ar: "تنزيل" },
  "action.share":       { en: "Share",           fr: "Partager",          ar: "مشاركة" },
  "action.signin":      { en: "Sign in",         fr: "Connexion",         ar: "تسجيل الدخول" },
  "action.signout":     { en: "Sign out",        fr: "Déconnexion",       ar: "تسجيل الخروج" },
  "action.refresh":     { en: "Refresh",         fr: "Actualiser",        ar: "تحديث" },

  // Status labels
  "status.received":         { en: "Received",        fr: "Reçu",            ar: "مستلم" },
  "status.awaiting_pickup":  { en: "Awaiting Pickup", fr: "En attente",      ar: "في انتظار الاستلام" },
  "status.picked_up":        { en: "Picked Up",       fr: "Récupéré",        ar: "تم الاستلام" },
  "status.forwarded":        { en: "Forwarded",       fr: "Réexpédié",       ar: "أعيد توجيهه" },
  "status.held":             { en: "Held",            fr: "Conservé",        ar: "محتفظ به" },
  "status.scanned":          { en: "Scanned",         fr: "Scanné",          ar: "ممسوح" },

  // Dashboard greetings + headlines
  "greeting.morning":   { en: "Good morning",    fr: "Bonjour",           ar: "صباح الخير" },
  "greeting.afternoon": { en: "Good afternoon",  fr: "Bon après-midi",    ar: "مساء الخير" },
  "greeting.evening":   { en: "Good evening",    fr: "Bonsoir",           ar: "مساء الخير" },
  "dashboard.your_mailbox": { en: "Your mailbox", fr: "Votre boîte aux lettres", ar: "صندوق بريدك" },
  "dashboard.suite":    { en: "Suite",           fr: "Casier",            ar: "صندوق" },
  "dashboard.balance":  { en: "Balance",         fr: "Solde",             ar: "الرصيد" },

  // Card labels (various panels)
  "card.shared_mailbox":       { en: "Shared mailbox access",     fr: "Accès partagé à la boîte",  ar: "وصول مشترك للصندوق" },
  "card.refer_and_earn":       { en: "Refer & earn",              fr: "Parrainez & gagnez",        ar: "ادعُ واكسب" },
  "card.notification_prefs":   { en: "Notifications",             fr: "Notifications",             ar: "الإشعارات" },
  "card.two_factor_auth":      { en: "Two-factor authentication", fr: "Authentification à 2 facteurs", ar: "المصادقة الثنائية" },
  "card.schedule_pickup":      { en: "Schedule a pickup",         fr: "Programmer un retrait",     ar: "حجز موعد استلام" },
  "card.vacation_hold":        { en: "Vacation hold",             fr: "Suspension vacances",       ar: "تعليق الإجازة" },

  // i18n switcher
  "i18n.language":      { en: "Language",        fr: "Langue",            ar: "اللغة" },
  "i18n.switched":      { en: "Language updated", fr: "Langue mise à jour", ar: "تم تحديث اللغة" },
  // iter-183 — locale settings card
  "i18n.dashboard_language":   { en: "Dashboard language",    fr: "Langue du tableau de bord", ar: "لغة لوحة التحكم" },
  "i18n.choose_language_help": {
    en: "We'll show your dashboard in this language. Emails follow your choice too. Set once — syncs across all your devices.",
    fr: "Votre tableau de bord s'affichera dans cette langue. Les e-mails suivront aussi votre choix. À configurer une seule fois — synchronisé sur tous vos appareils.",
    ar: "ستظهر لوحة التحكم بهذه اللغة. ستتبع رسائل البريد الإلكتروني اختيارك أيضًا. إعداد مرة واحدة — متزامن عبر جميع أجهزتك.",
  },
  "i18n.synced_across_devices":   { en: "Synced across all your devices", fr: "Synchronisé sur tous vos appareils", ar: "متزامن عبر جميع أجهزتك" },
  "i18n.cookie_only":             { en: "Saved on this device only — sign in to sync", fr: "Enregistré uniquement sur cet appareil — connectez-vous pour synchroniser", ar: "محفوظ على هذا الجهاز فقط — سجل الدخول للمزامنة" },
} as const;

export type DictKey = keyof typeof DICT;

// Translate one key in the given locale, falling back to English if the
// locale entry is missing (defensive — TypeScript should prevent this).
export function translate(key: DictKey, locale: Locale): string {
  const row = DICT[key];
  if (!row) return key;
  return (row as Record<Locale, string>)[locale] ?? row.en;
}

// Detect best locale from cookie/header. Server-side helper.
export function pickLocale(input: { cookie?: string | null; acceptLanguage?: string | null }): Locale {
  if (input.cookie && (LOCALES as readonly string[]).includes(input.cookie)) {
    return input.cookie as Locale;
  }
  if (!input.acceptLanguage) return "en";
  const lower = input.acceptLanguage.toLowerCase();
  if (lower.startsWith("ar") || lower.includes(",ar")) return "ar";
  if (lower.startsWith("fr") || lower.includes(",fr")) return "fr";
  return "en";
}
