import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { PLANS } from "@/constants";
import {
  COUNTRIES,
  ERROR_RATE_PCT,
  MONTHS,
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

export function useLandingDemo() {
  const { t, i18n } = useTranslation("landing");
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
      const name = t(`countries.${c.code}`, { defaultValue: c.name });
      return { ...c, name, netRaw: net, refundRaw: refunds, vatRaw: vat, gapRaw: gap };
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
      { color: "#2E5D3B", vals: sales as number[], label: t("charts.netSales") },
      { color: "#C8862B", vals: vatMonthly, label: t("charts.vatDue") },
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

    const maxCountry = Math.max(...rows.map((r) => r.vatRaw), 1);
    const countryBars = rows.map((r) => ({
      code: r.code,
      name: r.name,
      color: r.color,
      value: eur(r.vatRaw),
      heightPct: (r.vatRaw / maxCountry) * 100,
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
        level: t("risk.levelCritical"),
        title: t("risk.flagPlTitle"),
        amount: eur(pl.gapRaw),
        body: t("risk.flagPlBody", { range }),
        bg: "var(--surface-critical-tint)",
        border: "#F0C9C0",
        fg: "#8E2F1F",
      },
      {
        level: t("risk.levelCritical"),
        title: t("risk.flagItTitle"),
        amount: eur(it.gapRaw),
        body: t("risk.flagItBody"),
        bg: "var(--surface-critical-tint)",
        border: "#F0C9C0",
        fg: "#8E2F1F",
      },
      {
        level: t("risk.levelWarning"),
        title: t("risk.flagNlTitle"),
        amount: eur(netTotal * 0.1),
        body: t("risk.flagNlBody"),
        bg: "var(--surface-warning-tint)",
        border: "#EBD9BC",
        fg: "#8A5B15",
      },
      {
        level: t("risk.levelWarning"),
        title: t("risk.flagRefundTitle"),
        amount: "4.3%",
        body: t("risk.flagRefundBody"),
        bg: "var(--surface-warning-tint)",
        border: "#EBD9BC",
        fg: "#8A5B15",
      },
      {
        level: t("risk.levelInfo"),
        title: t("risk.flagUnclassTitle"),
        amount: eur(netTotal * 0.021),
        body: t("risk.flagUnclassBody"),
        bg: "var(--surface-info-tint)",
        border: "#CBDBE5",
        fg: "#2C566E",
      },
    ];

    const proPrice = PLANS.find((p) => p.code === "Pro")?.price ?? 0;
    const annual = calc * 12;
    const exposure = annual * (ERROR_RATE_PCT / 100);
    const calcOut = [
      { label: t("risk.calcWrong"), value: eur(exposure) },
      { label: t("risk.calcPenalties"), value: eur(exposure * 0.2) },
      { label: t("risk.calcPro"), value: eur(proPrice * 12) },
    ];

    const heroDonut = donut([
      { n: vatTotal * 0.62, label: "OSS (6 countries)", color: "#2E5D3B" },
      { n: vatTotal * 0.27, label: "Local returns", color: "#C8862B" },
      { n: vatTotal * 0.11, label: "Domestic", color: "#8AB894" },
    ]);

    const planFeatures: Record<string, string[]> = {
      Free: [
        t("pricing.featFree1"),
        t("pricing.featFree2"),
        t("pricing.featFree3"),
        t("pricing.featFree4"),
        t("pricing.featFree5"),
      ],
      Basic: [t("pricing.featBasic1"), t("pricing.featBasic2"), t("pricing.featBasic3")],
      Standard: [t("pricing.featStandard1"), t("pricing.featStandard2")],
      Pro: [t("pricing.featPro1"), t("pricing.featPro2")],
    };

    const plans = PLANS.map((p) => {
      const isFeatured = p.code === "Standard";
      return {
        name: p.code,
        tag: p.code === "Standard" ? t("pricing.tagStandard") : "",
        price: p.price === 0 ? "€0" : "€" + p.price.toFixed(2),
        per: p.price === 0 ? t("pricing.forever") : t("pricing.perMonth"),
        surface: isFeatured ? "var(--surface-brand)" : "var(--surface-card)",
        ink: isFeatured ? "var(--text-on-brand)" : "var(--text-primary)",
        border: isFeatured ? "var(--surface-brand)" : "var(--border-default)",
        check: isFeatured ? "#C8862B" : "var(--brand-primary)",
        features: planFeatures[p.code] || [],
        cta: p.price === 0 ? t("cta.startFree") : t("cta.upgradeTo", { plan: p.code }),
        ctaBg: isFeatured ? "var(--brand-accent)" : "var(--surface-card)",
        ctaFg: isFeatured ? "#FFFFFF" : "var(--text-primary)",
        ctaBorder: isFeatured ? "var(--brand-accent)" : "var(--border-strong)",
      };
    });

    const faqs = [
      { q: t("faq.q1"), a: t("faq.a1") },
      { q: t("faq.q2"), a: t("faq.a2") },
      { q: t("faq.q3"), a: t("faq.a3") },
      { q: t("faq.q4"), a: t("faq.a4") },
    ];

    const today = new Date();
    const filingDefs = [
      { key: "oss" as const, date: new Date(2026, 9, 31), amount: 0.34 },
      { key: "de" as const, date: new Date(2026, 7, 10), amount: 0.28 },
      { key: "fr" as const, date: new Date(2026, 7, 19), amount: 0.17 },
      { key: "it" as const, date: new Date(2026, 10, 16), amount: 0.13 },
      { key: "es" as const, date: new Date(2026, 9, 20), amount: 0.12 },
    ];
    const filings = filingDefs
      .map((d) => {
        const days = Math.max(0, Math.ceil((d.date.getTime() - today.getTime()) / 86400000));
        const urgent = days <= 21;
        return {
          title: t(`filings.${d.key}`),
          due: t("filings.due", {
            date: d.date.toLocaleDateString(i18n.language, {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          }),
          amount: eur(vatTotal * d.amount),
          countdown: t("filings.days", { count: days }),
          days,
          bg: urgent ? "var(--surface-critical-tint)" : "var(--surface-brand-tint)",
          fg: urgent ? "#8E2F1F" : "#2E5D3B",
        };
      })
      .sort((a, b) => a.days - b.days)
      .slice(0, 5);

    return {
      heroPeriod: "Aug 2025 – Jul 2026 · sample seller file",
      flagCount: flags.length,
      heroDonut,
      totalVatLabel: eur(vatTotal),
      totalNetLabel: eur(netTotal),
      totalRefundLabel: "−" + eur(refundTotal),
      totalGapLabel: "+" + eur(gapTotal),
      heroKpis: [
        { label: t("charts.netSales"), value: compact(netTotal), color: "var(--text-primary)" },
        { label: "Underpaid VAT", value: compact(gapTotal), color: "#8E2F1F" },
        { label: "Countries", value: String(COUNTRIES.length), color: "var(--text-primary)" },
      ],
      stats: [
        {
          value: eur(gapTotal),
          label: t("stats.s1"),
          color: "#8E2F1F",
        },
        {
          value: "7",
          label: t("stats.s2"),
          color: "var(--text-primary)",
        },
        {
          value: t("stats.s3Value"),
          label: t("stats.s3"),
          color: "var(--brand-primary)",
        },
        {
          value: "412",
          label: t("stats.s4"),
          color: "var(--brand-accent)",
        },
      ],
      ranges: [12, 6, 3] as const,
      rangeLabel: t("charts.rangeLabel", { n: range }),
      lineLegend: series.map((s) => ({ label: s.label, color: s.color })),
      lineSeries,
      lineDots,
      grid,
      axisLabels,
      monthLabels,
      countryBars,
      reportRows,
      flags,
      filings,
      showCalculator: SHOW_CALCULATOR,
      calcRevenue: calc,
      calcRevenueLabel: eur(calc),
      calcOut,
      plans,
      faqs,
    };
  }, [range, calc, t, i18n.language]);

  return {
    ...demo,
    range,
    setRange,
    setCalc,
  };
}
