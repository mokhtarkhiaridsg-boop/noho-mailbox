import type { ComponentType, ReactNode, SVGProps } from "react";
import { BRAND } from "../types";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

type Props = {
  Icon?: IconType;
  title: string;
  caption?: string;
  action?: ReactNode;
  className?: string;
};

export default function SectionHeader({ Icon, title, caption, action, className = "" }: Props) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 ${className}`.trim()}
      style={{ borderBottom: `1px solid ${BRAND.border}` }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <Icon
            aria-hidden
            className="w-4 h-4 shrink-0"
            style={{ color: BRAND.blue }}
            strokeWidth={1.8}
          />
        )}
        <div className="min-w-0">
          <p
            className="text-[11px] font-black uppercase tracking-[0.18em] truncate"
            style={{ color: BRAND.ink }}
          >
            {title}
          </p>
          {caption && (
            <p className="text-[11px] mt-0.5 truncate" style={{ color: BRAND.inkSoft }}>
              {caption}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
