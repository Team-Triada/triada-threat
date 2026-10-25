// `short` is used below the xl breakpoint where the pill has to fit a phone.
const ITEMS = [
  { color: "#ff3c3c", label: "Heavy ransomware activity", short: "Heavy" },
  { color: "#c8742f", label: "Some ransomware activity", short: "Some" },
  { color: "#3c8dff", label: "Mentioned in the news", short: "In the news" },
];

// Explains the country colours. Bottom of the globe on small screens, top-left on desktop
// (hidden while the detail panel is wide).
export default function MapLegend({ hideOnDesktop = false }: { hideOnDesktop?: boolean }) {
  return (
    <ul
      aria-label="Map legend: country shading"
      className={`dash-legend pointer-events-none absolute z-[9] left-1/2 -translate-x-1/2 flex items-center gap-2.5 rounded-full border border-[var(--border)] bg-[rgba(10,11,14,0.78)] px-3 py-1 text-[11px] text-[#aab2bf] whitespace-nowrap bottom-[calc(var(--sheet-g)+10px)] max-[359px]:hidden max-xl:landscape:left-[27%] max-xl:landscape:bottom-3 xl:left-[392px] xl:translate-x-0 xl:bottom-auto xl:top-[calc(var(--hdr)+12px)] xl:flex-col xl:items-start xl:gap-1.5 xl:rounded-xl xl:px-3 xl:py-2 ${hideOnDesktop ? "xl:hidden" : ""}`}
    >
      <li className="xl:hidden text-[var(--muted-foreground)]">Ransomware</li>
      {ITEMS.map((i, n) => (
        <li key={i.label} className={`flex items-center gap-1.5 ${n === 2 ? "max-xl:ml-1 max-xl:border-l max-xl:border-[var(--border-strong)] max-xl:pl-3" : ""}`}>
          <span className="h-2 w-2 rounded-sm" style={{ background: i.color }} />
          <span className="xl:hidden">{i.short}</span>
          <span className="hidden xl:inline">{i.label}</span>
        </li>
      ))}
    </ul>
  );
}
