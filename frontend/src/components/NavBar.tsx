import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const steps = [
  { label: "Upload", path: "/" },
  { label: "Calibrate", path: "/calibrate" },
  { label: "Edit", path: "/edit" },
  { label: "Export", path: "/export" },
];

export function NavBar() {
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-white/40 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center gap-2">
          <img src="/favicon.svg" alt="CurveExtract" className="h-7 w-7" />
          <span className="font-bold text-gray-900">CurveExtract</span>
        </Link>

        <nav className="flex items-center gap-1">
          {steps.map((step, i) => {
            const active = pathname === step.path || pathname.startsWith(step.path + "/");
            return (
              <div key={step.path} className="flex items-center">
                {i > 0 && <span className="mx-1 text-gray-300">›</span>}
                <Link
                  to={step.path}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-gray-900 text-white"
                      : "text-gray-500 hover:text-gray-900",
                  )}
                >
                  {step.label}
                </Link>
              </div>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
