import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { label: "Upload", path: "/" },
  { label: "Calibrate", path: "/calibrate" },
  { label: "Edit", path: "/edit" },
  { label: "Export", path: "/export" },
];

export function NavBar() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  return (
    <header className="sticky top-0 z-50 border-b border-white/40 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <img src="/favicon.svg" alt="CurveExtract" className="h-7 w-7" />
          <span className="font-bold text-gray-900">CurveExtract</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 sm:flex">
          {steps.map((step, i) => (
            <div key={step.path} className="flex items-center">
              {i > 0 && <span className="mx-1 text-gray-300">›</span>}
              <Link
                to={step.path}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive(step.path)
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:text-gray-900",
                )}
              >
                {step.label}
              </Link>
            </div>
          ))}
        </nav>

        {/* Mobile hamburger button */}
        <button
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 sm:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {open && (
        <nav className="border-t border-white/40 bg-white/90 px-6 py-3 sm:hidden">
          <ol className="flex flex-col gap-1">
            {steps.map((step, i) => (
              <li key={step.path}>
                <Link
                  to={step.path}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive(step.path)
                      ? "bg-gray-900 text-white"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
                  )}
                >
                  <span className="text-xs text-gray-400">{i + 1}.</span>
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
