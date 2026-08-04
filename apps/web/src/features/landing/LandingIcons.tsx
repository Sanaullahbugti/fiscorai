/**
 * Custom "claymorphic" 3D icon badges for the landing page — hand-built
 * SVGs, not rendered assets (no image-gen access, no third-party art to
 * borrow). Each icon is a soft rounded-square badge with a layered
 * gradient, a blurred glossy highlight, and a drop shadow — the same
 * construction real soft-3D icon sets (Duolingo, Wise, modern fintech
 * app icons) use to read as dimensional without a 3D renderer — with a
 * crisp linework symbol on top. Every id is namespaced with useId() so
 * two instances of the same icon on one page never collide (SVG ids are
 * global to the document, and this icon set is reused many times across
 * the page).
 * Themed to what an Amazon EU VAT seller's software actually does — a
 * shipment, a euro payout, a VAT rate, an automated processing gear, a
 * filed report, a compliance check — so it reads as this product, not
 * generic clip art.
 */

import { useId, type CSSProperties, type ReactNode } from "react";

type IconProps = { className?: string; style?: CSSProperties };

type Theme = { from: string; mid: string; to: string; ring: string };

const GOLD: Theme = { from: "#fdf1d4", mid: "#e0b45a", to: "#a9791f", ring: "rgba(255,255,255,0.4)" };
const GREEN: Theme = { from: "#eef6f0", mid: "#3a7050", to: "#123a26", ring: "rgba(255,255,255,0.35)" };
const INK: Theme = { from: "#dfe8e2", mid: "#1e3a2f", to: "#050f0a", ring: "rgba(255,255,255,0.22)" };
const CREAM: Theme = { from: "#fffef9", mid: "#f6f2e9", to: "#d9d2c3", ring: "rgba(255,255,255,0.6)" };

/** Shared soft-3D badge base — gradient fill, glossy highlight, drop shadow. */
function ClayBadge({ uid, theme, children }: { uid: string; theme: Theme; children: ReactNode }) {
  const base = `${uid}-base`;
  const blur = `${uid}-blur`;
  const shadow = `${uid}-shadow`;
  return (
    <>
      <defs>
        <linearGradient id={base} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor={theme.from} />
          <stop offset="0.55" stopColor={theme.mid} />
          <stop offset="1" stopColor={theme.to} />
        </linearGradient>
        <filter id={blur} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id={shadow} x="-40%" y="-30%" width="180%" height="180%">
          <feDropShadow dx="0" dy="9" stdDeviation="9" floodColor="#000" floodOpacity="0.38" />
        </filter>
      </defs>
      <g filter={`url(#${shadow})`}>
        <rect x="8" y="8" width="144" height="144" rx="44" fill={`url(#${base})`} />
        <ellipse cx="50" cy="40" rx="50" ry="28" fill="#fff" opacity="0.3" filter={`url(#${blur})`} />
        <rect
          x="9.5"
          y="9.5"
          width="141"
          height="141"
          rx="42.5"
          fill="none"
          stroke={theme.ring}
          strokeWidth="1.5"
        />
        {children}
      </g>
    </>
  );
}

/** Amazon shipment box — the "you sold something" beat. */
export const BoxIcon3D = ({ className, style }: IconProps) => {
  const uid = useId();
  return (
    <svg viewBox="0 0 160 160" className={className} style={style} aria-hidden>
      <ClayBadge uid={uid} theme={GOLD}>
        <path d="M80 44 L114 61 L114 100 L80 117 L46 100 L46 61 Z" fill="#7a5620" opacity="0.25" />
        <path d="M80 44 L114 61 L80 78 L46 61 Z" fill="#fff7e6" />
        <path d="M46 61 L80 78 L80 117 L46 100 Z" fill="#dba53f" />
        <path d="M114 61 L80 78 L80 117 L114 100 Z" fill="#a9791f" />
        <path
          d="M80 78 L80 44 M46 61 L80 78 L114 61"
          stroke="#5c3f11"
          strokeWidth="2"
          fill="none"
          opacity="0.55"
        />
        <path d="M63 89 L63 108 M97 89 L97 108" stroke="#5c3f11" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
      </ClayBadge>
    </svg>
  );
};

/** Stacked euro coins — the "here's what you owe" beat. */
export const CoinIcon3D = ({ className, style }: IconProps) => {
  const uid = useId();
  return (
    <svg viewBox="0 0 160 160" className={className} style={style} aria-hidden>
      <ClayBadge uid={uid} theme={GOLD}>
        <ellipse cx="80" cy="104" rx="30" ry="12" fill="#8a651f" />
        <ellipse cx="80" cy="96" rx="30" ry="12" fill="#c99a3f" />
        <ellipse cx="80" cy="88" rx="30" ry="12" fill="#e0b45a" />
        <ellipse cx="80" cy="80" rx="30" ry="12" fill="#f6d999" stroke="#8a651f" strokeWidth="1.4" />
        <text
          x="80"
          y="87"
          textAnchor="middle"
          fontFamily="DM Sans, sans-serif"
          fontWeight="700"
          fontSize="19"
          fill="#5c3f11"
        >
          €
        </text>
      </ClayBadge>
    </svg>
  );
};

/** VAT-rate badge — the country-by-country rate beat. */
export const PercentIcon3D = ({ className, style }: IconProps) => {
  const uid = useId();
  return (
    <svg viewBox="0 0 160 160" className={className} style={style} aria-hidden>
      <ClayBadge uid={uid} theme={GREEN}>
        <circle cx="62" cy="66" r="11" fill="#eef6f0" stroke="#123a26" strokeWidth="3" />
        <circle cx="98" cy="102" r="11" fill="#eef6f0" stroke="#123a26" strokeWidth="3" />
        <line x1="58" y1="106" x2="102" y2="62" stroke="#eef6f0" strokeWidth="5" strokeLinecap="round" />
      </ClayBadge>
    </svg>
  );
};

/** Automated processing gear — the "FiscorAI runs this" beat. */
export const GearIcon3D = ({ className, style }: IconProps) => {
  const uid = useId();
  const teeth = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const x1 = 80 + Math.cos(a) * 27;
    const y1 = 80 + Math.sin(a) * 27;
    const x2 = 80 + Math.cos(a) * 38;
    const y2 = 80 + Math.sin(a) * 38;
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#eef6f0" strokeWidth="8" strokeLinecap="round" />;
  });
  return (
    <svg viewBox="0 0 160 160" className={className} style={style} aria-hidden>
      <ClayBadge uid={uid} theme={INK}>
        {teeth}
        <circle cx="80" cy="80" r="25" fill="#123a26" stroke="#eef6f0" strokeWidth="2.5" />
        <circle cx="80" cy="80" r="9" fill="#eef6f0" />
      </ClayBadge>
    </svg>
  );
};

/** Filed report with a checkmark — the "here's your PDF" beat. */
export const DocumentIcon3D = ({ className, style }: IconProps) => {
  const uid = useId();
  return (
    <svg viewBox="0 0 160 160" className={className} style={style} aria-hidden>
      <ClayBadge uid={uid} theme={CREAM}>
        <rect x="52" y="38" width="56" height="72" rx="6" fill="#fffefb" stroke="#d9d2c3" strokeWidth="1.5" />
        <rect x="52" y="38" width="56" height="16" rx="6" fill="#e4dcc9" />
        <rect x="61" y="66" width="38" height="4.5" rx="2.25" fill="#b9ad91" />
        <rect x="61" y="77" width="38" height="4.5" rx="2.25" fill="#b9ad91" />
        <rect x="61" y="88" width="24" height="4.5" rx="2.25" fill="#b9ad91" />
        <circle cx="99" cy="103" r="16" fill="#2f5d3d" stroke="#fffefb" strokeWidth="3" />
        <path
          d="M91 103l5.5 5.5L108 96"
          stroke="#fffefb"
          strokeWidth="3.4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </ClayBadge>
    </svg>
  );
};

/** Shield with a check — the deterministic compliance-check beat. */
export const ShieldIcon3D = ({ className, style }: IconProps) => {
  const uid = useId();
  return (
    <svg viewBox="0 0 160 160" className={className} style={style} aria-hidden>
      <ClayBadge uid={uid} theme={INK}>
        <path
          d="M80 38 L112 51 V80 C112 102 98 117 80 125 C62 117 48 102 48 80 V51 Z"
          fill="#eef6f0"
          opacity="0.95"
        />
        <path d="M65 82 L76 93 L97 64" stroke="#123a26" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </ClayBadge>
    </svg>
  );
};

/** Chat bubble with a spark — the "ask FiscorAI" beat. */
export const ChatIcon3D = ({ className, style }: IconProps) => {
  const uid = useId();
  return (
    <svg viewBox="0 0 160 160" className={className} style={style} aria-hidden>
      <ClayBadge uid={uid} theme={GOLD}>
        <path
          d="M46 50 h68 a10 10 0 0 1 10 10 v34 a10 10 0 0 1 -10 10 H74 l-20 17 v-17 H46 a10 10 0 0 1 -10 -10 V60 a10 10 0 0 1 10 -10 z"
          fill="#fff7e6"
        />
        <path d="M46 50 h68 a10 10 0 0 1 10 10 v5 H36 v-5 a10 10 0 0 1 10 -10 z" fill="#eecf99" />
        <path
          d="M118 24 l3.6 9.4 9.4 3.6 -9.4 3.6 -3.6 9.4 -3.6-9.4 -9.4-3.6 9.4-3.6 z"
          fill="#a9791f"
        />
        <circle cx="60" cy="78" r="5" fill="#8a651f" />
        <circle cx="80" cy="78" r="5" fill="#8a651f" />
        <circle cx="100" cy="78" r="5" fill="#8a651f" />
      </ClayBadge>
    </svg>
  );
};

/** Globe with country markers — the "every EU country" beat. */
export const GlobeIcon3D = ({ className, style }: IconProps) => {
  const uid = useId();
  return (
    <svg viewBox="0 0 160 160" className={className} style={style} aria-hidden>
      <ClayBadge uid={uid} theme={GREEN}>
        <circle cx="80" cy="80" r="38" fill="#eef6f0" />
        <ellipse cx="80" cy="80" rx="38" ry="15" fill="none" stroke="#123a26" strokeWidth="2" opacity="0.55" />
        <ellipse cx="80" cy="80" rx="15" ry="38" fill="none" stroke="#123a26" strokeWidth="2" opacity="0.55" />
        <circle cx="80" cy="80" r="38" fill="none" stroke="#123a26" strokeWidth="2.5" />
        <circle cx="64" cy="62" r="6" fill="#e0b45a" />
        <circle cx="98" cy="70" r="4.5" fill="#e0b45a" />
        <circle cx="76" cy="98" r="5.5" fill="#e0b45a" />
      </ClayBadge>
    </svg>
  );
};
