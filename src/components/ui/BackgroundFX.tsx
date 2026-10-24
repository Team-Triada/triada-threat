// Site-wide atmosphere: pure CSS (no canvas) so it costs nothing next to the
// WebGL globe. Layers, back to front: colour glows, perspective grid,
// scanlines + sweep, vignette.
export default function BackgroundFX() {
  return (
    <div aria-hidden className="fx-root">
      <div className="fx-glow" />
      <div className="fx-dots" />
      <svg className="fx-rings" viewBox="-500 -500 1000 1000" preserveAspectRatio="xMidYMid slice">
        <g fill="none" stroke="rgba(255,90,90,0.32)" strokeWidth="1">
          <circle r="330" />
          <circle r="400" strokeDasharray="2 8" stroke="rgba(255,90,90,0.4)" />
          <circle r="470" strokeDasharray="30 14" stroke="rgba(255,90,90,0.22)" />
          <path d="M-500 0H-300M300 0H500M0 -500V-300M0 300V500" stroke="rgba(255,90,90,0.32)" />
        </g>
        <g stroke="rgba(255,255,255,0.22)" strokeWidth="1.2">
          {Array.from({ length: 36 }, (_, i) => {
            const a = (i * 10 * Math.PI) / 180;
            const r1 = 400, r2 = i % 3 === 0 ? 416 : 408;
            return <line key={i} x1={Math.cos(a) * r1} y1={Math.sin(a) * r1} x2={Math.cos(a) * r2} y2={Math.sin(a) * r2} />;
          })}
        </g>
      </svg>
      <div className="fx-grid"><div className="fx-grid-i" /></div>
      <div className="fx-sweep" />
      <div className="fx-vignette" />
    </div>
  );
}
