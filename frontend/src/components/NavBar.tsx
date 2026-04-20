import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sun, Moon, Bell, Search, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

const steps = [
  { label: "Upload", path: "/" },
  { label: "Calibrate", path: "/calibrate" },
  { label: "Edit", path: "/edit" },
  { label: "Export", path: "/export" },
  { label: "History", path: "/history" },
];

export function NavBar() {
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white dark:border-[#1f1f1f] dark:bg-[#111111]">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-orange">
            <img src="/favicon.svg" alt="" className="h-5 w-5 brightness-0 invert" />
          </div>
          <span className="text-sm font-bold tracking-wide text-gray-900 dark:text-white">
            CURVEEXTRACT
          </span>
        </Link>

        {/* Desktop step navigation — center */}
        <nav className="hidden flex-1 items-center justify-center gap-1 sm:flex">
          {steps.map((step, i) => (
            <div key={step.path} className="flex items-center">
              {i > 0 && (
                <span aria-hidden="true" className="mx-1 text-xs text-gray-300 dark:text-gray-600">›</span>
              )}
              <Link
                to={step.path}
                className={cn(
                  "rounded-md px-3.5 py-1.5 text-sm font-medium transition-all duration-150",
                  isActive(step.path)
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
                )}
              >
                {step.label}
              </Link>
            </div>
          ))}
        </nav>

        {/* Right controls */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Search pill */}
          <div className="hidden items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-sm text-gray-400 dark:border-[#2a2a2a] dark:bg-[#1c1c1c] dark:text-gray-500 sm:flex">
            <Search className="h-3.5 w-3.5" />
            <span>Search…</span>
          </div>

          {/* Bell */}
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-[#1c1c1c] dark:hover:text-gray-300"
          >
            <Bell className="h-4 w-4" />
          </button>

          {/* Theme toggle */}
          <button
            type="button"
            aria-label="Toggle theme"
            onClick={toggle}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-[#1c1c1c] dark:hover:text-gray-300"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Avatar */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-purple to-brand-blue text-xs font-semibold text-white">
            CE
          </div>

          {/* Mobile hamburger button */}
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-[#1c1c1c] dark:hover:text-gray-300 sm:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {open && (
        <nav className="border-t border-gray-200 bg-white px-6 py-3 dark:border-[#1f1f1f] dark:bg-[#111111] sm:hidden">
          <ol className="flex flex-col gap-1">
            {steps.map((step, i) => (
              <li key={step.path}>
                <Link
                  to={step.path}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive(step.path)
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#1c1c1c] dark:hover:text-white",
                  )}
                >
                  <span aria-hidden="true" className="text-xs text-gray-400">{i + 1}.</span>
                  {step.label}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      )}
    </header>
  );
}
