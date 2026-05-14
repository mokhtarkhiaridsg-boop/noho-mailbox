"use client";

// Spanish-language contact form. Uses the same submitContact server action
// as the English /contact page — the form fields submit identical names
// (name/email/service/message) so admin sees both languages in one inbox.

import Link from "next/link";
import { useActionState } from "react";
import { submitContact, type ContactState } from "@/app/actions/contact";

type Props = {
  weekdayHours: string;
  saturdayHours: string;
  breakLabel: string | null;
};

export default function ContactoClient({
  weekdayHours,
  saturdayHours,
  breakLabel,
}: Props) {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(
    submitContact,
    {},
  );

  return (
    <div style={{ background: "#FFFDF8" }}>
      {/* Hero */}
      <section
        className="relative px-5 sm:px-6 pt-12 pb-10 sm:pt-20 sm:pb-14 overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at top, #F7E6C2 0%, #F0DBA9 45%, #E8DDD0 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(#2D100F 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
          aria-hidden="true"
        />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <nav aria-label="Migas de pan" className="text-[11px] mb-4">
            <Link
              href="/es"
              style={{ color: "#A89484" }}
              className="hover:underline"
            >
              Inicio
            </Link>
            <span style={{ color: "#A89484" }}> · </span>
            <span style={{ color: "#2D100F" }} className="font-semibold">
              Contacto
            </span>
          </nav>
          <h1
            className="font-extrabold tracking-tight"
            style={{
              fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
              color: "#2D100F",
              fontSize: "clamp(2rem, 6vw, 3.5rem)",
              lineHeight: 1.05,
            }}
          >
            Contáctanos{" "}
            <span
              style={{
                fontFamily: "var(--font-pacifico), 'Pacifico', cursive",
                color: "#337485",
                fontWeight: 400,
              }}
            >
              en español
            </span>
          </h1>
          <p
            className="mt-3 sm:mt-4 max-w-md mx-auto text-[14.5px] sm:text-base"
            style={{ color: "#5C4540" }}
          >
            ¿Quieres un apartado postal, un notario público o formar tu LLC?
            Mándanos un mensaje — respondemos en menos de 24 horas.
          </p>
        </div>
      </section>

      <div
        className="py-3 px-5 sm:px-6 text-center text-[12.5px] sm:text-sm font-semibold"
        style={{ background: "#2D100F", color: "#F7E6C2" }}
      >
        Respondemos en menos de 24 horas &mdash; o pásate a la tienda
        Lun&ndash;Sáb en 5062 Lankershim Blvd
      </div>

      {/* Content */}
      <section
        className="px-5 sm:px-6 py-12 sm:py-16 md:py-20"
        style={{ background: "#FFFDF8" }}
      >
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-10">
          {/* Form */}
          {state.success ? (
            <div
              className="rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E8DDD0",
                boxShadow:
                  "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(45,16,15,0.06)",
              }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: "rgba(34,197,94,0.10)" }}
              >
                <svg
                  className="w-8 h-8"
                  style={{ color: "#22C55E" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3
                className="text-xl font-extrabold tracking-tight mb-2"
                style={{
                  color: "#2D100F",
                  fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif",
                }}
              >
                ¡Mensaje enviado!
              </h3>
              <p
                className="text-[14px] sm:text-sm"
                style={{ color: "#5C4540" }}
              >
                Te contestamos en menos de 24 horas.
              </p>
            </div>
          ) : (
            <form
              action={formAction}
              className="space-y-4 sm:space-y-5 rounded-2xl p-5 sm:p-7"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E8DDD0",
                boxShadow:
                  "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(45,16,15,0.06)",
              }}
            >
              <h2
                className="font-extrabold tracking-tight text-lg sm:text-xl mb-2"
                style={{
                  color: "#2D100F",
                  fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif",
                }}
              >
                Mándanos un mensaje
              </h2>
              {state.error && (
                <p
                  className="text-[13px] p-3 rounded-xl"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    color: "#B91C1C",
                    border: "1px solid rgba(239,68,68,0.25)",
                  }}
                >
                  {state.error}
                </p>
              )}
              <div>
                <label
                  className="block text-[13px] font-bold mb-1.5"
                  style={{ color: "#2D100F" }}
                  htmlFor="name"
                >
                  Nombre
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Tu nombre completo"
                  className="w-full rounded-xl px-4 py-3 text-[15px] sm:text-sm focus:outline-none transition-colors"
                  style={{
                    border: "1px solid #E8DDD0",
                    background: "#FFF9F3",
                    color: "#2D100F",
                  }}
                />
              </div>
              <div>
                <label
                  className="block text-[13px] font-bold mb-1.5"
                  style={{ color: "#2D100F" }}
                  htmlFor="email"
                >
                  Correo electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="tu@ejemplo.com"
                  className="w-full rounded-xl px-4 py-3 text-[15px] sm:text-sm focus:outline-none transition-colors"
                  style={{
                    border: "1px solid #E8DDD0",
                    background: "#FFF9F3",
                    color: "#2D100F",
                  }}
                />
              </div>
              <div>
                <label
                  className="block text-[13px] font-bold mb-1.5"
                  style={{ color: "#2D100F" }}
                  htmlFor="service"
                >
                  ¿En qué te podemos ayudar?
                </label>
                <select
                  id="service"
                  name="service"
                  defaultValue=""
                  className="w-full rounded-xl px-4 py-3 text-[15px] sm:text-sm focus:outline-none transition-colors"
                  style={{
                    border: "1px solid #E8DDD0",
                    background: "#FFF9F3",
                    color: "#2D100F",
                  }}
                >
                  <option value="">Selecciona un servicio</option>
                  <option value="mailbox">Apartado postal</option>
                  <option value="notary">Notario público</option>
                  <option value="business">
                    Paquete de lanzamiento de negocio
                  </option>
                  <option value="formation">Formación de LLC</option>
                  <option value="branding">Marca y diseño</option>
                  <option value="website">Sitio web</option>
                  <option value="other">Otra cosa / pregunta general</option>
                </select>
              </div>
              <div>
                <label
                  className="block text-[13px] font-bold mb-1.5"
                  style={{ color: "#2D100F" }}
                  htmlFor="message"
                >
                  Mensaje
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  required
                  placeholder="Cuéntanos qué necesitas..."
                  className="w-full rounded-xl px-4 py-3 text-[15px] sm:text-sm focus:outline-none resize-none transition-colors"
                  style={{
                    border: "1px solid #E8DDD0",
                    background: "#FFF9F3",
                    color: "#2D100F",
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="w-full font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                style={{
                  background: "#2D100F",
                  color: "#F7E6C2",
                  minHeight: 48,
                }}
              >
                {pending ? "Enviando…" : "Enviar mensaje"}
                {!pending && (
                  <svg
                    viewBox="0 0 20 20"
                    className="w-4 h-4"
                    fill="none"
                  >
                    <path
                      d="M4 10 H16 M12 6 L16 10 L12 14"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </form>
          )}

          {/* Sidebar — location, hours, phone */}
          <div className="space-y-4 sm:space-y-5">
            <div
              className="rounded-2xl p-5 sm:p-6"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E8DDD0",
                boxShadow:
                  "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(45,16,15,0.06)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="inline-flex items-center justify-center rounded-xl shrink-0"
                  style={{ width: 40, height: 40, background: "#F7E6C2" }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                    fill="none"
                    stroke="#2D100F"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s-8-7.5-8-13a8 8 0 0 1 16 0c0 5.5-8 13-8 13Z" />
                    <circle cx="12" cy="9" r="3" />
                  </svg>
                </span>
                <h3
                  className="font-extrabold text-[15px]"
                  style={{
                    color: "#2D100F",
                    fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif",
                  }}
                >
                  Ubicación
                </h3>
              </div>
              <p className="text-[14px]" style={{ color: "#5C4540" }}>
                5062 Lankershim Blvd,
                <br />
                North Hollywood, CA 91601
              </p>
              <Link
                href="https://maps.apple.com/?address=5062+Lankershim+Blvd,+North+Hollywood,+CA+91601"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-3 text-[12.5px] font-bold"
                style={{ color: "#337485" }}
              >
                Cómo llegar
                <svg
                  viewBox="0 0 16 16"
                  className="w-3.5 h-3.5"
                  fill="none"
                >
                  <path
                    d="M3 8 H13 M10 5 L13 8 L10 11"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>

            <div
              className="rounded-2xl p-5 sm:p-6"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E8DDD0",
                boxShadow:
                  "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(45,16,15,0.06)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="inline-flex items-center justify-center rounded-xl shrink-0"
                  style={{ width: 40, height: 40, background: "#F7E6C2" }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                    fill="none"
                    stroke="#2D100F"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7 L12 12 L15.5 14" />
                  </svg>
                </span>
                <h3
                  className="font-extrabold text-[15px]"
                  style={{
                    color: "#2D100F",
                    fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif",
                  }}
                >
                  Horario
                </h3>
              </div>
              <p className="text-[14px]" style={{ color: "#5C4540" }}>
                <span className="font-semibold" style={{ color: "#2D100F" }}>
                  Lun – Vie:
                </span>{" "}
                {weekdayHours}
                <br />
                {breakLabel && (
                  <>
                    <span
                      className="text-[12px]"
                      style={{ color: "#7A6B57" }}
                    >
                      (Descanso {breakLabel})
                    </span>
                    <br />
                  </>
                )}
                <span className="font-semibold" style={{ color: "#2D100F" }}>
                  Sábado:
                </span>{" "}
                {saturdayHours}
                <br />
                <span className="font-semibold" style={{ color: "#2D100F" }}>
                  Domingo:
                </span>{" "}
                Cerrado
              </p>
            </div>

            <div
              className="rounded-2xl p-5 sm:p-6"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E8DDD0",
                boxShadow:
                  "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(45,16,15,0.06)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="inline-flex items-center justify-center rounded-xl shrink-0"
                  style={{ width: 40, height: 40, background: "#F7E6C2" }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                    fill="none"
                    stroke="#2D100F"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </span>
                <h3
                  className="font-extrabold text-[15px]"
                  style={{
                    color: "#2D100F",
                    fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif",
                  }}
                >
                  Llamar o escribir
                </h3>
              </div>
              <div className="space-y-2 text-[14px]">
                <a
                  href="tel:+18185067744"
                  className="flex items-center gap-2 font-bold"
                  style={{ color: "#337485" }}
                >
                  (818) 506-7744
                </a>
                <a
                  href="mailto:nohomailbox@gmail.com"
                  className="flex items-center gap-2"
                  style={{ color: "#5C4540" }}
                >
                  nohomailbox@gmail.com
                </a>
              </div>
            </div>

            <div
              className="rounded-2xl p-5 sm:p-6"
              style={{
                background: "linear-gradient(160deg, #2D100F 0%, #1F0807 100%)",
                color: "#F7E6C2",
              }}
            >
              <p
                className="text-[10.5px] font-bold uppercase tracking-[0.18em] mb-3"
                style={{ color: "#F0DBA9" }}
              >
                Enlaces rápidos
              </p>
              <ul className="space-y-2 text-[14px]">
                <li>
                  <Link
                    href="/es"
                    className="flex items-center justify-between gap-2 transition-opacity hover:opacity-80"
                    style={{ color: "#F7E6C2" }}
                  >
                    Apartado postal y planes
                    <span style={{ color: "#F0DBA9" }}>→</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/es/buzon-virtual"
                    className="flex items-center justify-between gap-2 transition-opacity hover:opacity-80"
                    style={{ color: "#F7E6C2" }}
                  >
                    Buzón virtual
                    <span style={{ color: "#F0DBA9" }}>→</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/es/negocios"
                    className="flex items-center justify-between gap-2 transition-opacity hover:opacity-80"
                    style={{ color: "#F7E6C2" }}
                  >
                    Forma tu LLC ($2,000)
                    <span style={{ color: "#F0DBA9" }}>→</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
