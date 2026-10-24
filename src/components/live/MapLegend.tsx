const ITEMS = [
  { color: "#ff3c3c", label: "Heavy ransomware activity" },
  { color: "#c8742f", label: "Some ransomware activity" },
  { color: "#3c8dff", label: "Mentioned in the news" },
];

// Explains the country shading. Bottom edge of the globe on small screens;
// on desktop it sits top-left of the globe, clear of the stats cards and
// hidden while the details panel is widened over that area.
export default function MapLegend({ hideOnDesktop = false }: { hideOnDesktop?: boolean }) {
  return (
    <ul
      aria-label="Map legend: country shading"
      className={`pointer-events-none absolute z-[9] left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full border border-[var(--border)] bg-[rgba(10,11,14,0.78)] px-3 py-1 text-[11px] text-[#aab2bf] whitespace-nowrap bottom-[calc(var(--sheet)+8px)] max-[359px]:hidden max-xl:landscape:left-[27%] max-xl:landscape:bottom-3 xl:left-[392px] xl:translate-x-0 xl:bottom-auto xl:top-[calc(var(--hdr)+12px)] xl:flex-col xl:items-start xl:gap-1.5 xl:rounded-xl xl:px-3 xl:py-2 ${hideOnDesktop ? "xl:hidden" : ""}`}
    >
      {ITEMS.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
