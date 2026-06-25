export default function Footer() {
  return (
    <footer className="w-full border-t border-[rgba(255,255,255,0.06)] bg-[#05162D]">
      <div className="max-w-[var(--content-width,1200px)] mx-auto px-6 sm:px-12 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white tracking-tight">
            WTO
          </span>
          <span className="text-xs text-[#7D8DA0]">
            World Trade Organization
          </span>
        </div>
        <div className="flex items-center gap-6 text-xs text-[#7D8DA0]">
          <a href="#" className="hover:text-[#B6C3D1] transition-colors duration-200">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-[#B6C3D1] transition-colors duration-200">
            Terms of Service
          </a>
          <span>&copy; {new Date().getFullYear()} WTO</span>
        </div>
      </div>
    </footer>
  );
}
