/** Full-viewport gradient background matching the pastel blob aesthetic from the screenshot. */
export function GradientBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-white">
      {/* Pink blob */}
      <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-brand-pink/30 blur-3xl" />
      {/* Blue blob */}
      <div className="absolute top-1/2 -right-40 h-[600px] w-[600px] rounded-full bg-brand-blue/25 blur-3xl" />
      {/* Purple blob */}
      <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-brand-purple/20 blur-3xl" />
    </div>
  );
}
