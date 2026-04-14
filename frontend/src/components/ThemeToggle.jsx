import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { dark, setDark } = useContext(ThemeContext);

  return (
    <button
      onClick={() => setDark(!dark)}
      aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
      className="group inline-flex items-center gap-3 rounded-full border border-[#d8c4a0]/65 bg-[linear-gradient(135deg,rgba(255,250,241,0.92),rgba(246,232,206,0.86))] px-3 py-2 text-sm font-medium text-[#5a1a26] shadow-[0_14px_40px_rgba(90,26,38,0.12)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(90,26,38,0.18)] dark:border-[#ffffff1a] dark:bg-[linear-gradient(135deg,rgba(59,13,20,0.92),rgba(18,8,10,0.95))] dark:text-[#f7e7bf]"
    >
      <span className="relative flex h-7 w-12 items-center rounded-full bg-[#3B0D14]/15 p-1 transition dark:bg-white/10">
        <span
          className={`absolute h-5 w-5 rounded-full bg-gradient-to-br shadow-md transition-all duration-300 ${
            dark
              ? "translate-x-5 from-[#D4AF37] to-[#f6d77b]"
              : "translate-x-0 from-[#7c2232] to-[#3B0D14]"
          }`}
        />
        <span className="flex w-full items-center justify-between px-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[#7c2232]/70 dark:text-[#f7e7bf]/70">
          <span>S</span>
          <span>M</span>
        </span>
      </span>
      <span>{dark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
