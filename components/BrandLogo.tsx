import { useId } from "react";

type BrandLogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  showSubtitle?: boolean;
};

const sizeMap = {
  sm: {
    icon: "h-8 w-8 rounded-xl",
    iconInner: 18,
    brand: "text-sm",
    subtitle: "text-[11px]",
  },
  md: {
    icon: "h-10 w-10 rounded-2xl",
    iconInner: 24,
    brand: "text-base",
    subtitle: "text-xs",
  },
  lg: {
    icon: "h-12 w-12 rounded-2xl",
    iconInner: 28,
    brand: "text-lg",
    subtitle: "text-sm",
  },
} as const;

export default function BrandLogo({
  className = "",
  size = "md",
  showText = true,
  showSubtitle = true,
}: BrandLogoProps) {
  const styles = sizeMap[size];
  const gradientId = useId();
  const pageId = useId();

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div
        className={`relative grid place-items-center overflow-hidden border border-white/10 bg-[linear-gradient(145deg,#10213f_0%,#0a1122_55%,#060b18_100%)] shadow-[0_12px_30px_rgba(8,15,30,0.45)] ${styles.icon}`}
      >
        <svg
          width={styles.iconInner}
          height={styles.iconInner}
          viewBox="0 0 28 28"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id={gradientId}
              x1="4"
              y1="3"
              x2="24"
              y2="26"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#67E8F9" />
              <stop offset="0.55" stopColor="#38BDF8" />
              <stop offset="1" stopColor="#818CF8" />
            </linearGradient>
            <linearGradient
              id={pageId}
              x1="8"
              y1="7"
              x2="22"
              y2="23"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="rgba(255,255,255,0.98)" />
              <stop offset="1" stopColor="rgba(255,255,255,0.75)" />
            </linearGradient>
          </defs>
          <rect
            x="2.25"
            y="2.25"
            width="23.5"
            height="23.5"
            rx="7.5"
            fill={`url(#${gradientId})`}
            opacity="0.18"
          />
          <path
            d="M8 6.5h7.9L20 10.6V21.2A2.3 2.3 0 0 1 17.7 23.5H8A2.3 2.3 0 0 1 5.7 21.2V8.8A2.3 2.3 0 0 1 8 6.5Z"
            fill={`url(#${pageId})`}
            stroke={`url(#${gradientId})`}
            strokeWidth="1.2"
          />
          <path
            d="M15.85 6.5v2.5A1.6 1.6 0 0 0 17.45 10.6H20"
            stroke={`url(#${gradientId})`}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.4 12.1h7.8"
            stroke="#0F172A"
            strokeOpacity="0.34"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M9.4 15h5.6"
            stroke="#0F172A"
            strokeOpacity="0.34"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M9.4 17.9h4.2"
            stroke="#0F172A"
            strokeOpacity="0.34"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M18.5 14.1h2.2"
            stroke={`url(#${gradientId})`}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M19.6 13v2.2"
            stroke={`url(#${gradientId})`}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <circle
            cx="19.6"
            cy="14.1"
            r="3.15"
            stroke={`url(#${gradientId})`}
            strokeOpacity="0.55"
            strokeWidth="0.9"
          />
          <path
            d="M21.9 9.1l.5 1.1 1.1.5-1.1.5-.5 1.1-.5-1.1-1.1-.5 1.1-.5.5-1.1Z"
            fill="#F8FAFC"
            opacity="0.95"
          />
        </svg>
      </div>

      {showText && (
        <div className="grid min-w-0 leading-tight">
          <span className={`truncate font-semibold tracking-tight text-white ${styles.brand}`}>
            DocuMind AI
          </span>
          {showSubtitle && (
            <span className={`truncate text-sky-300/80 ${styles.subtitle}`}>
              Smart Document Archiving
            </span>
          )}
        </div>
      )}
    </div>
  );
}