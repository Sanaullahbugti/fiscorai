import { useLayoutEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export const HEADER_SLOT_ID = "shell-header-slot";

/**
 * Renders page-level controls into the shell header instead of a second toolbar
 * row. Resolved in a layout effect so the portal lands before paint — a passive
 * effect would let the header render one frame short and flicker.
 */
export function HeaderSlot({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [resolved, setResolved] = useState(false);

  useLayoutEffect(() => {
    setHost(document.getElementById(HEADER_SLOT_ID));
    setResolved(true);
  }, []);

  // Nothing until we know whether a host exists, so the controls don't flash
  // in place and then jump into the header.
  if (!resolved) return null;
  // Rendered outside the shell (tests, or any future standalone use): fall back
  // to rendering in place rather than silently dropping the toolbar.
  if (!host) return <div className="header-slot-fallback">{children}</div>;
  return createPortal(children, host);
}
