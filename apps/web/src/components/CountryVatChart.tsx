import styles from "./CountryVatChart.module.css";

export type CountryVatItem = {
  /** Short label under the column — ISO code preferred. */
  code: string;
  name: string;
  valueLabel: string;
  /** 0–100 column height relative to the largest country. */
  heightPct: number;
  color: string;
};

type Props = {
  items: CountryVatItem[];
  /** Plot area height in px (columns grow upward inside it). */
  height?: number;
  emptyLabel?: string;
};

/**
 * Vertical VAT-by-country columns — deliberately not the horizontal progress
 * bars common on Auralid-style dashboards. Each country is a stem from the
 * baseline with the amount above and the ISO code below.
 */
export function CountryVatChart({ items, height = 220, emptyLabel = "No country data" }: Props) {
  if (!items.length) {
    return <p className={styles.empty}>{emptyLabel}</p>;
  }

  return (
    <div className={styles.wrap} style={{ ["--plot-h" as string]: `${height}px` }}>
      <div className={styles.plot} role="img" aria-label="VAT due by country">
        {items.map((c) => (
          <div key={c.code} className={styles.col} title={`${c.name || c.code}: ${c.valueLabel}`}>
            <div className={styles.tower}>
              <span className={styles.value}>{c.valueLabel}</span>
              <span className={styles.stem}>
                <span
                  className={styles.fill}
                  style={{
                    height: `${Math.max(10, Math.min(100, c.heightPct))}%`,
                    background: c.color,
                  }}
                />
              </span>
            </div>
            <span className={styles.code}>{c.code}</span>
            {c.name ? <span className={styles.name}>{c.name}</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
