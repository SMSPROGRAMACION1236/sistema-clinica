import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "var(--page)",
        surface: "var(--surface)",
        ink: {
          primary: "var(--ink-primary)",
          secondary: "var(--ink-secondary)",
          muted: "var(--ink-muted)",
        },
        border: "var(--border)",
        gridline: "var(--gridline)",
        accent: {
          DEFAULT: "var(--accent)",
          wash: "var(--accent-wash)",
        },
        status: {
          good: "var(--status-good)",
          "good-wash": "var(--status-good-wash)",
          warning: "var(--status-warning)",
          "warning-wash": "var(--status-warning-wash)",
          serious: "var(--status-serious)",
          "serious-wash": "var(--status-serious-wash)",
          critical: "var(--status-critical)",
          "critical-wash": "var(--status-critical-wash)",
          neutral: "var(--status-neutral)",
          "neutral-wash": "var(--status-neutral-wash)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
