import type { ComponentType, CSSProperties, SVGProps } from "react";

type Props = {
  label: string;
  // Shorter label used when the tile is too narrow for the full one.
  short?: string;
  value: string | number | undefined;
  color: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  sub?: string;
  title?: string;
  // Long text values (a gang or sector name) use a smaller size and may wrap.
  text?: boolean;
  capitalize?: boolean;
};

// The one stat card used on the dashboard and the list pages (see .stat-card in
// globals.css): icon and label as a small heading, a large neutral value, a muted
// caption. The wrapper is a size container: a narrow tile reserves two lines for
// its label, so values in the same row stay level when one label wraps.
export default function StatTile({ label, short, value, color, Icon, sub, title, text = false, capitalize = false }: Props) {
  const shown = value === undefined ? "-" : typeof value === "number" ? value.toLocaleString() : value;
  return (
    <div title={title} className="@container min-w-0">
      <div className="stat-card flex h-full flex-col gap-2 px-3.5 py-3 xl:px-4 xl:py-3.5 @max-[150px]:gap-1.5 @max-[150px]:px-2.5 @max-[150px]:py-2.5" style={{ "--accent": color } as CSSProperties}>
        <div className="flex items-start gap-1.5">
          <Icon className="mt-px h-3.5 w-3.5 shrink-0 @max-[150px]:hidden" style={{ color }} aria-hidden />
          <div className="line-clamp-2 text-[11px] font-medium uppercase leading-snug tracking-[0.05em] text-[#9aa3b2] @max-[150px]:tracking-normal @max-[185px]:min-h-[2.75em]">
            <span className={short ? "@max-[180px]:hidden" : ""}>{label}</span>
            {short && <span className="hidden @max-[180px]:inline">{short}</span>}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span
            className={`font-semibold tabular-nums text-[#f4f6f9] ${text ? "text-[19px] leading-tight sm:text-[23px]" : "text-[26px] leading-none xl:text-[30px] @max-[150px]:text-[24px]"} ${capitalize ? "capitalize" : ""}`}
            style={{ fontFamily: "var(--font-telegraf), sans-serif", overflowWrap: "break-word" }}
          >
            {shown}
          </span>
          <Icon className="hidden h-4 w-4 shrink-0 @max-[150px]:block" style={{ color }} aria-hidden />
        </div>
        {sub && <div className="line-clamp-2 text-[12px] leading-snug text-[var(--muted-foreground)] @max-[150px]:hidden">{sub}</div>}
      </div>
    </div>
  );
}
