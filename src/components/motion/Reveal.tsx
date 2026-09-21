import type { CSSProperties, ElementType, ReactNode } from "react";

export type RevealType = "fade" | "up" | "blur" | "clip" | "mask" | "scale" | "slide" | "slide-right";

/** Server-kompatibler Wrapper: setzt nur data-Attribute, die Animation übernimmt der RevealObserver. */
export function Reveal({
  type = "up", delay = 0, as, className, children, style,
}: { type?: RevealType; delay?: number; as?: ElementType; className?: string; children?: ReactNode; style?: CSSProperties }) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag data-reveal={type} className={className} style={{ ...(delay ? ({ "--d": `${delay}s` } as CSSProperties) : {}), ...style }}>
      {children}
    </Tag>
  );
}

/** Headline Wort für Wort (versetzt) – Wörter maskieren sich von unten ein. */
export function SplitWords({
  text, className, delay = 0, step = 0.07, as,
}: { text: string; className?: string; delay?: number; step?: number; as?: ElementType }) {
  const Tag = (as ?? "span") as ElementType;
  return (
    <Tag className={className} aria-label={text}>
      {text.split(" ").map((w, i) => (
        <span key={i} aria-hidden className="reveal-mask inline-block overflow-hidden pb-[0.2em] -mb-[0.08em] align-bottom">
          <span data-reveal="up" className="inline-block" style={{ "--d": `${(delay + i * step).toFixed(2)}s` } as CSSProperties}>
            {w}&nbsp;
          </span>
        </span>
      ))}
    </Tag>
  );
}
