import { StarIcon } from "./Icons";

export function Stars({ value, count, size = 16 }: { value: number; count?: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1.5 text-rose-300" aria-label={`${value.toFixed(1)} von 5 Sternen`}>
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => <StarIcon key={i} filled={i <= full} width={size} height={size} />)}
      </span>
      {count != null && <span className="text-[12.5px] text-cream/55">{count > 0 ? `${value.toFixed(1)} (${count})` : "Noch keine Bewertungen"}</span>}
    </span>
  );
}
