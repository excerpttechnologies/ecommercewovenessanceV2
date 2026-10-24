import { encodeCode128B } from "@/lib/barcode/code128";
import { cn } from "@/lib/utils";

const QUIET_ZONE = 10; // modules each side, per the Code 128 spec

/** Code 128 barcode drawn as SVG. Values that cannot be encoded fall back to plain text. */
export function Barcode({ value, height = 32, moduleWidth = 1, showText = true, className }: { value: string; height?: number; moduleWidth?: number; showText?: boolean; className?: string }) {
  const symbol = encodeCode128B(value);
  if (!symbol) return <span className={cn("font-mono text-xs", className)}>{value}</span>;

  const total = symbol.modules + QUIET_ZONE * 2;
  let x = QUIET_ZONE;
  const bars: React.ReactNode[] = [];
  symbol.widths.forEach((w, i) => {
    if (i % 2 === 0) bars.push(<rect key={i} x={x} y={0} width={w} height={height} />);
    x += w;
  });

  return (
    <span className={cn("inline-flex flex-col items-start", className)}>
      <svg
        role="img"
        aria-label={`Barcode ${value}`}
        width={total * moduleWidth}
        height={height}
        viewBox={`0 0 ${total} ${height}`}
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
        className="bg-white"
      >
        <g fill="currentColor">{bars}</g>
      </svg>
      {showText && <span className="mt-0.5 font-mono text-[11px] tracking-wider">{value}</span>}
    </span>
  );
}
