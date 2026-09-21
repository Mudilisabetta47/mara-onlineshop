import type { SVGProps } from "react";

const base = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;
type P = SVGProps<SVGSVGElement>;

export const SearchIcon = (p: P) => <svg {...base} {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-3.6-3.6" /></svg>;
export const UserIcon = (p: P) => <svg {...base} {...p}><circle cx="12" cy="8.5" r="3.6" /><path d="M4.6 20c.9-3.6 3.7-5.4 7.4-5.4s6.5 1.8 7.4 5.4" /></svg>;
export const BagIcon = (p: P) => <svg {...base} {...p}><path d="M5.5 8h13l-1 11.5a1.5 1.5 0 0 1-1.5 1.4H8a1.5 1.5 0 0 1-1.5-1.4L5.5 8Z" /><path d="M9 8V7a3 3 0 0 1 6 0v1" /></svg>;
export const HeartIcon = ({ filled, ...p }: P & { filled?: boolean }) => (
  <svg {...base} {...p} fill={filled ? "currentColor" : "none"}><path d="M12 20.2S4 15.4 4 9.6A4.4 4.4 0 0 1 8.4 5.2c1.5 0 2.8.8 3.6 2 .8-1.2 2.1-2 3.6-2A4.4 4.4 0 0 1 20 9.6c0 5.8-8 10.6-8 10.6Z" /></svg>
);
export const MenuIcon = (p: P) => <svg {...base} {...p}><path d="M4 8h16M4 16h16" /></svg>;
export const CloseIcon = (p: P) => <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>;
export const ArrowRight = (p: P) => <svg {...base} strokeWidth={1.6} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const ArrowLeft = (p: P) => <svg {...base} strokeWidth={1.6} {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>;
export const ChevronDown = (p: P) => <svg {...base} strokeWidth={1.6} {...p}><path d="m6 9 6 6 6-6" /></svg>;
export const PlusIcon = (p: P) => <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>;
export const MinusIcon = (p: P) => <svg {...base} {...p}><path d="M5 12h14" /></svg>;
export const CheckIcon = (p: P) => <svg {...base} strokeWidth={2} {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
export const TrashIcon = (p: P) => <svg {...base} {...p}><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12M10 11v5M14 11v5" /></svg>;
export const TruckIcon = (p: P) => <svg {...base} {...p}><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.7" /><circle cx="17" cy="17.5" r="1.7" /></svg>;
export const ReturnIcon = (p: P) => <svg {...base} {...p}><path d="M9 7 4 12l5 5" /><path d="M4 12h10a6 6 0 0 1 0 12" transform="translate(0 -6)" /></svg>;
export const ShieldIcon = (p: P) => <svg {...base} {...p}><path d="M12 3 5 6v5.5c0 4.4 3 7.6 7 9.5 4-1.900 7-5.100 7-9.500V6l-7-3Z" /><path d="m9 12 2.200 2.200L15.500 10" /></svg>;
export const FilterIcon = (p: P) => <svg {...base} {...p}><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>;
export const StarIcon = ({ filled, ...p }: P & { filled?: boolean }) => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" {...p}>
    <path d="m12 3.500 2.600 5.400 5.900.8-4.300 4.100 1 5.900L12 16.900l-5.200 2.800 1-5.900L3.500 9.700l5.900-.8L12 3.500Z" />
  </svg>
);
