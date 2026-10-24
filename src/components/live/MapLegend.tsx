const ITEMS = [
  { color: "#ff3c3c", label: "Many ransomware victims" },
  { color: "#c8742f", label: "Some victims" },
  { color: "#3c8dff", label: "In the news" },
];

// Explains the country shading. Sits at the bottom edge of the globe area.
export default function MapLegend() {
  return (
    <ul
      aria-label="Map legend"
      className="pointer-events-none absolute z-[9] left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full border border-[var(--border)] bg-[rgba(10,11,14,0.78)] px-3 py-1 text-[11px] text-[#aab2bf] whitespace-nowrap bottom-[calc(var(--sheet)+8px)] xl:bottom-[calc(var(--stats)+8px)] max-[359px]:hidden max-xl:landscape:left-[27%] max-xl:landscape:bottom-3"
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
