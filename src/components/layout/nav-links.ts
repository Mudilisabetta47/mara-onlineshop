export const MAIN_NAV = [
  { href: "/shop/junge", label: "Junge" },
  { href: "/shop/maedchen", label: "Mädchen" },
  { href: "/shop/schuhe", label: "Schuhe" },
  { href: "/shop/dies-und-das", label: "Dies & Das" },
] as const;

export const SECONDARY_NAV = [
  { href: "/shop?sort=new&new=1", label: "Neu" },
  { href: "/shop?sort=bestseller", label: "Bestseller" },
  { href: "/shop?sale=1", label: "Angebote" },
] as const;
