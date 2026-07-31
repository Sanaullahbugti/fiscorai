export function TabIcon({ name }: { name: "dash" | "vat" | "review" | "analyst" | "more" }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true as const };
  switch (name) {
    case "dash":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.75" />
          <rect x="13" y="3" width="8" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
          <rect x="13" y="10" width="8" height="11" rx="2" stroke="currentColor" strokeWidth="1.75" />
          <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.75" />
        </svg>
      );
    case "vat":
      return (
        <svg {...common}>
          <path
            d="M7 3.5h7.5L19 8v12.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 20.5v-15A1.5 1.5 0 0 1 7.5 4"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M14 3.5V8h4.5" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
          <path d="M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );
    case "review":
      return (
        <svg {...common}>
          <path
            d="M8.5 4.5h9A1.5 1.5 0 0 1 19 6v13.5a1 1 0 0 1-1.5.85L13 18.2l-4.5 2.15A1 1 0 0 1 7 19.5V6a1.5 1.5 0 0 1 1.5-1.5Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M10 10.5l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "analyst":
      return (
        <svg {...common}>
          <path
            d="M12 3.5l1.2 3.6H17l-3 2.3 1.1 3.6L12 10.8 8.9 13l1.1-3.6-3-2.3h3.8L12 3.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M5 19h14M7.5 19v-3.5M12 19v-5M16.5 19v-2.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );
    case "more":
      return (
        <svg {...common}>
          <circle cx="6" cy="12" r="1.75" fill="currentColor" />
          <circle cx="12" cy="12" r="1.75" fill="currentColor" />
          <circle cx="18" cy="12" r="1.75" fill="currentColor" />
        </svg>
      );
  }
}
