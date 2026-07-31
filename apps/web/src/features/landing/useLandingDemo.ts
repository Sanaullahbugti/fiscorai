import { useMemo, useState } from "react";
import {
  COUNTRIES,
  ERROR_RATE_PCT,
  MONTHS,
  PRO_PRICE,
  SALES,
  SHOW_CALCULATOR,
} from "./landingDemoData";

function eur(n: number, dp?: number) {
  const digits = dp || 0;
  const v = Math.round(n * (digits ? 100 : 1)) / (digits ? 100 : 1);
  return (
    "€" +
    v.toLocaleString("en-GB", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
  );
}

function compact(n: number) {
  if (Math.abs(n) >= 1000000) return "€" + (n / 1000000).toFixed(2) + "M";
  if (Math.abs(n) >= 1000) return "€" + Math.round(n / 1000) + "k";
  return eur(n);
}

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const big = a1 - a0 > Math.PI ? 1 : 0;
  return (
    "M" +
    cx +
    " " +
    cy +
    " L" +
    x0.toFixed(2) +
    " " +
    y0.toFixed(2) +
    " A" +
    r +
    " " +
    r +
    " 0 " +
    big +
    " 1 " +
    x1.toFixed(2) +
    " " +
    y1.toFixed(2) +
    " Z"
  );
}

function donut(items: { n: number; label: string; color: string }[]) {
  const total = items.reduce((s, i) => s + i.n, 0) || 1;
  let a = -Math.PI / 2;
  return items.map((i) => {
    const a1 = a + (i.n / total) * Math.PI * 2;
    const d = arc(100, 100, 92, a, a1 - 0.012);
    a = a1;
    return { d, fill: i.color, label: i.label, value: compact(i.n) };
  });
}

function filings(vat: number) {
  const today = new Date();
  const defs = [
    { title: "OSS return — Q3 2026", date: new Date(2026, 9, 31), amount: 0.34 },
    { title: "Germany — monthly VAT (Jul)", date: new Date(2026, 7, 10), amount: 0.28 },
    { title: "France — monthly VAT (Jul)", date: new Date(2026, 7, 19), amount: 0.17 },
    { title: "Italy — LIPE Q3 2026", date: new Date(2026, 10, 16), amount: 0.13 },
    { title: "Spain — Modelo 303 Q3", date: new Date(2026, 9, 20), amount: 0.12 },
  ];
  return defs
    .map((d) => {
      const days = Math.max(0, Math.ceil((d.date.getTime() - today.getTime()) / 86400000));
      const urgent = days <= 21;
      return {
        title: d.title,
        due:
          "Due " +
          d.date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        amount: eur(vat * d.amount),
        countdown: days + (days === 1 ? " day" : " days"),
        days,
        bg: urgent ? "var(--surface-critical-tint)" : "var(--surface-brand-tint)",
        fg: urgent ? "#8E2F1F" : "#2E5D3B",
      };
    })
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);
}

export function useLandingDemo() {
  const [range, setRange] = useState(12);
  const [calc, setCalc] = useState(60000);

  const demo = useMemo(() => {
    const months = MONTHS.slice(-range);
    const sales = SALES.slice(-range);
    const netTotal = sales.reduce((a, b) => a + b, 0);
    const refundTotal = netTotal * 0.043;
    const rows = COUNTRIES.map((c) => {
      const net = netTotal * c.share;
      const refunds = net * 0.043;
      const base = net - refunds;
      const vat = base * (c.correct / 100);
      const gap = base * ((c.correct - c.applied) / 100);
      return { ...c, netRaw: net, refundRaw: refunds, vatRaw: vat, gapRaw: gap };
    });
    const vatTotal = rows.reduce((s, r) => s + r.vatRaw, 0);
    const gapTotal = rows.reduce((s, r) => s + r.gapRaw, 0);

    const x0 = 6;
    const x1 = 554;
    const y0 = 8;
    const y1 = 256;
    const maxV = Math.max(...sales) * 1.08;
    const px = (i: number) => (sales.length === 1 ? x0 : x0 + (i * (x1 - x0)) / (sales.length - 1));
    const py = (v: number) => y1 - (v / maxV) * (y1 - y0);
    const vatMonthly = sales.map((s) => s * (vatTotal / netTotal));
    const series = [
      { color: "#2E5D3B", vals: sales as number[], label: "Net sales" },
      { color: "#C8862B", vals: vatMonthly, label: "VAT due" },
    ];
    const lineSeries = series.map((s) => ({
      color: s.color,
      points: s.vals.map((v, i) => px(i).toFixed(1) + "," + py(v).toFixed(1)).join(" "),
    }));
    const lineDots: { x: string; y: string; color: string }[] = [];
    series.forEach((s) =>
      s.vals.forEach((v, i) => lineDots.push({ x: px(i).toFixed(1), y: py(v).toFixed(1), color: s.color })),
    );
    const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => {
      const y = y1 - f * (y1 - y0);
      return { y: y.toFixed(1), label: compact(maxV * f) };
    });
    const axisLabels = grid.map((g) => g.label).reverse();
    const monthLabels = months.map((m, i) =>
      months.length > 8 ? (i % 2 === 0 ? m.split(" ")[0] : "") : m,
    );

    const maxCountry = Math.max(...rows.map((r) => r.vatRaw));
    const countryBars = rows.map((r) => ({
      name: r.name,
      color: r.color,
      value: eur(r.vatRaw),
      pct: ((r.vatRaw / maxCountry) * 100).toFixed(1) + "%",
    }));

    const reportRows = rows.map((r) => ({
      name: r.name + " (" + r.code + ")",
      net: eur(r.netRaw),
      refunds: "−" + eur(r.refundRaw),
      applied: r.applied + "%",
      correct: r.correct + "%",
      vat: eur(r.vatRaw),
      gap: r.gapRaw > 1 ? "+" + eur(r.gapRaw) : "—",
      gapColor: r.gapRaw > 1 ? "#8E2F1F" : "var(--text-secondary)",
    }));

    const it = rows.find((r) => r.code === "IT")!;
    const pl = rows.find((r) => r.code === "PL")!;
    const flags = [
      {
        level: "Critical",
        title: "Poland taxed at 8%, should be 23%",
        amount: eur(pl.gapRaw),
        body:
          "Reduced-rate mapping applied to standard-rate goods across " +
          range +
          " months of Polish sales. This is the single largest exposure in the file.",
        bg: "var(--surface-critical-tint)",
        border: "#F0C9C0",
        fg: "#8E2F1F",
      },
      {
        level: "Critical",
        title: "Italy taxed at 19%, should be 22%",
        amount: eur(it.gapRaw),
        body: "German rate carried over to Italian destination orders — a classic OSS mapping error after a marketplace settings change.",
        bg: "var(--surface-critical-tint)",
        border: "#F0C9C0",
        fg: "#8E2F1F",
      },
      {
        level: "Warning",
        title: "Local registration likely required in NL",
        amount: eur(netTotal * 0.1),
        body: "Dutch fulfilment movements suggest stock held locally, which puts these sales outside OSS and into a Dutch VAT registration.",
        bg: "var(--surface-warning-tint)",
        border: "#EBD9BC",
        fg: "#8A5B15",
      },
      {
        level: "Warning",
        title: "Refund rate above your 12-month norm",
        amount: "4.3%",
        body: "Refunds are outpacing sales growth in two countries, so VAT already remitted on those orders is recoverable but unclaimed.",
        bg: "var(--surface-warning-tint)",
        border: "#EBD9BC",
        fg: "#8A5B15",
      },
      {
        level: "Info",
        title: "412 rows with no tax classification",
        amount: eur(netTotal * 0.021),
        body: "Rows missing a jurisdiction or rate code are excluded from every total until you classify them. Nothing else flags this.",
        bg: "var(--surface-info-tint)",
        border: "#CBDBE5",
        fg: "#2C566E",
      },
    ];

    const annual = calc * 12;
    const exposure = annual * (ERROR_RATE_PCT / 100);
    const calcOut = [
      { label: "VAT stated wrong / year", value: eur(exposure) },
      { label: "Penalties + interest at 20%", value: eur(exposure * 0.2) },
      { label: "FiscorAI Pro / year", value: eur(PRO_PRICE * 12) },
    ];

    const heroDonut = donut([
      { n: vatTotal * 0.62, label: "OSS (6 countries)", color: "#2E5D3B" },
      { n: vatTotal * 0.27, label: "Local returns", color: "#C8862B" },
      { n: vatTotal * 0.11, label: "Domestic", color: "#8AB894" },
    ]);

    const plans = [
      {
        name: "Free",
        tag: "",
        price: "€0",
        per: "forever",
        surface: "var(--surface-card)",
        ink: "var(--text-primary)",
        border: "var(--border-default)",
        check: "var(--brand-primary)",
        features: [
          "Country VAT summary + charts",
          "VAT detailed report",
          "PDF and Excel export",
          "All deterministic checks",
          "3 analyst questions / month",
        ],
        cta: "Start free",
        ctaBg: "var(--surface-card)",
        ctaFg: "var(--text-primary)",
        ctaBorder: "var(--border-strong)",
      },
      {
        name: "Pro",
        tag: "Most sellers",
        price: "€" + PRO_PRICE,
        per: "/ month",
        surface: "var(--surface-brand)",
        ink: "var(--text-on-brand)",
        border: "var(--surface-brand)",
        check: "#C8862B",
        features: [
          "Everything in Free",
          "Transaction-level detail",
          "Unlimited analyst questions",
          "Filing calendar with deadlines",
          "Real volumes, no sampling",
        ],
        cta: "Upgrade to Pro",
        ctaBg: "var(--brand-accent)",
        ctaFg: "#FFFFFF",
        ctaBorder: "var(--brand-accent)",
      },
      {
        name: "Business",
        tag: "",
        price: "€" + PRO_PRICE * 4,
        per: "/ month",
        surface: "var(--surface-card)",
        ink: "var(--text-primary)",
        border: "var(--border-default)",
        check: "var(--brand-primary)",
        features: [
          "Everything in Pro",
          "Multiple seller accounts",
          "Accountant seats",
          "Historical re-analysis",
          "Priority support",
        ],
        cta: "Talk to us",
        ctaBg: "var(--surface-card)",
        ctaFg: "var(--text-primary)",
        ctaBorder: "var(--border-strong)",
      },
    ];

    const faqs = [
      {
        q: "What file do I upload?",
        a: "Your Amazon VAT transactions report, or the standard transaction report. CSV or TXT, any date range.",
      },
      {
        q: "Does it file for me?",
        a: "No. FiscorAI does the arithmetic and tells you what is due where and when. Filing stays with you or your accountant.",
      },
      {
        q: "Where does the AI come in?",
        a: "The analyst reads only your aggregates and flags — never your raw rows — and explains them in plain language. Every number on screen is computed, not generated.",
      },
      {
        q: "Is my data safe?",
        a: "Your file is processed for your report and deleted on request. It is never shared with other sellers or used to train anything.",
      },
    ];

    return {
      heroPeriod: "Aug 2025 – Jul 2026 · sample seller file",
      flagCount: flags.length,
      heroDonut,
      totalVatLabel: eur(vatTotal),
      totalNetLabel: eur(netTotal),
      totalRefundLabel: "−" + eur(refundTotal),
      totalGapLabel: "+" + eur(gapTotal),
      heroKpis: [
        { label: "Net sales", value: compact(netTotal), color: "var(--text-primary)" },
        { label: "Underpaid VAT", value: compact(gapTotal), color: "#8E2F1F" },
        { label: "Countries", value: String(COUNTRIES.length), color: "var(--text-primary)" },
      ],
      stats: [
        {
          value: eur(gapTotal),
          label: "Underpaid VAT found in this one seller file — before penalties.",
          color: "#8E2F1F",
        },
        {
          value: "7",
          label: "EU jurisdictions reconciled from a single Amazon transaction report.",
          color: "var(--text-primary)",
        },
        {
          value: "90 sec",
          label: "From upload to a filing-ready country report with flagged rows.",
          color: "var(--brand-primary)",
        },
        {
          value: "412",
          label: "Unclassified rows silently excluded from your totals elsewhere.",
          color: "var(--brand-accent)",
        },
      ],
      ranges: [12, 6, 3] as const,
      rangeLabel: "Last " + range + " months",
      lineLegend: series.map((s) => ({ label: s.label, color: s.color })),
      lineSeries,
      lineDots,
      grid,
      axisLabels,
      monthLabels,
      countryBars,
      reportRows,
      flags,
      filings: filings(vatTotal),
      showCalculator: SHOW_CALCULATOR,
      calcRevenue: calc,
      calcRevenueLabel: eur(calc),
      calcOut,
      plans,
      faqs,
    };
  }, [range, calc]);

  return {
    ...demo,
    range,
    setRange,
    setCalc,
  };
}
