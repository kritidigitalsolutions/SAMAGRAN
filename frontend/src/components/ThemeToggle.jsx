import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { dark, setDark } = useContext(ThemeContext);

  return (
    <button
      onClick={() => setDark(!dark)}
      aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
      className="group inline-flex items-center gap-3 rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-3 py-2 text-sm font-medium text-[var(--admin-primary)] shadow-sm transition duration-300 hover:shadow"
    >
      <span className="relative flex h-7 w-12 items-center rounded-full bg-[var(--admin-bg)] p-1 transition">
        <span
          className={`absolute h-5 w-5 rounded-full bg-gradient-to-br shadow-md transition-all duration-300 ${
            dark
              ? "translate-x-5 from-[#6f7383] to-[#3c4155]"
              : "translate-x-0 from-[var(--admin-primary)] to-[var(--admin-primary-strong)]"
          }`}
        />
        <span className="flex w-full items-center justify-between px-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--admin-muted)]">
          <span>L</span>
          <span>D</span>
        </span>
      </span>
      <span>{dark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
