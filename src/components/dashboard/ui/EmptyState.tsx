import type { ComponentType, ReactNode, SVGProps } from "react";
import { BRAND } from "../types";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

type Props = {
  Icon?: IconType;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
};

export default function EmptyState({ Icon, title, body, action, className = "" }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 py-10 ${className}`.trim()}>
      {Icon && (
        <span
          className="ai-icon mb-4 inline-flex items-center justify-center w-14 h-14 rounded-2xl"
          style={{ background: BRAND.bgDeep, color: BRAND.blue }}
        >
          <Icon className="w-7 h-7" />
        </span>
      )}
      <p
        className="text-sm font-black uppercase tracking-[0.10em]"
        style={{ color: BRAND.ink }}
      >
        {title}
      </p>
      {body && (
        <p
          className="mt-1.5 text-[12px] leading-relaxed max-w-xs"
          style={{ color: BRAND.inkSoft }}
        >
          {body}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
