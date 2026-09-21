import { formatEUR } from "@/lib/money";

/** Schlanke SVG-Charts ohne Bibliothek (Server-Komponenten). Farben: Rosé-Akzent auf dunklem Grund. */

export function AreaChart({ data, format = formatEUR, height = 190 }: { data: { label: string; value: number }[]; format?: (n: number) => string; height?: number }) {
  const W = 720, H = height, pad = { l: 8, r: 8, t: 14, b: 26 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const x = (i: number) => pad.l + (i / Math.max(1, data.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1)} ${H - pad.b} L${x(0)} ${H - pad.b} Z`;
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Verlauf, Summe ${format(total)}`}>
        <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#A95D7C" stopOpacity="0.5" /><stop offset="1" stopColor="#A95D7C" stopOpacity="0" /></linearGradient></defs>
        {[0, 0.5, 1].map((t) => <line key={t} x1={pad.l} x2={W - pad.r} y1={pad.t + t * (H - pad.t - pad.b)} y2={pad.t + t * (H - pad.t - pad.b)} stroke="#fff" strokeOpacity="0.07" />)}
        <path d={area} fill="url(#ag)" /><path d={line} fill="none" stroke="#DCAFC0" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => d.value > 0 && <circle key={i} cx={x(i)} cy={y(d.value)} r="3" fill="#DCAFC0"><title>{`${d.label}: ${format(d.value)}`}</title></circle>)}
        {data.map((d, i) => (i % Math.ceil(data.length / 6) === 0) && <text key={i} x={x(i)} y={H - 6} fontSize="11" fill="#F6EEF2" fillOpacity="0.4" textAnchor="middle">{d.label}</text>)}
      </svg>
      <figcaption className="mt-1 text-[12px] text-cream/40">Maximum {format(max)}</figcaption>
    </figure>
  );
}

export function BarChart({ data, height = 170 }: { data: { label: string; value: number }[]; height?: number }) {
  const W = 720, H = height, pad = { t: 10, b: 26 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const bw = (W / data.length) * 0.62;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Bestellungen pro Tag">
      {data.map((d, i) => {
        const h = (d.value / max) * (H - pad.t - pad.b);
        const cx = (i + 0.5) * (W / data.length);
        return <g key={i}><rect x={cx - bw / 2} y={H - pad.b - h} width={bw} height={Math.max(d.value ? 2 : 0, h)} rx="3" fill="#A95D7C" fillOpacity={d.value ? 0.9 : 0.2}><title>{`${d.label}: ${d.value}`}</title></rect>{i % Math.ceil(data.length / 6) === 0 && <text x={cx} y={H - 6} fontSize="11" fill="#F6EEF2" fillOpacity="0.4" textAnchor="middle">{d.label}</text>}</g>;
      })}
    </svg>
  );
}

export function HBars({ data, format }: { data: { label: string; value: number; sub?: string }[]; format: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <p className="text-[13.5px] text-cream/45">Noch keine Verkäufe.</p>;
  return (
    <ul className="space-y-3.5">
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-1.5 flex justify-between gap-3 text-[13px]"><span className="truncate">{d.label}</span><span className="tabular-nums text-cream/60">{format(d.value)}</span></div>
          <div className="h-1.5 rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-300" style={{ width: `${(d.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}
