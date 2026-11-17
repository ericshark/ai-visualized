import type { SVGProps } from "react";
import type { NodeId } from "@/lessons/types";

const base: SVGProps<SVGSVGElement> = {
  width: 26,
  height: 26,
  viewBox: "0 0 26 26",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export function BrowserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="20" height="16" rx="3" />
      <path d="M3 10h20" />
      <path d="M7 7.6h.01M10 7.6h.01" />
    </svg>
  );
}

export function ServerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="4" width="18" height="7" rx="2.5" />
      <rect x="4" y="15" width="18" height="7" rx="2.5" />
      <path d="M8 7.5h.01M8 18.5h.01M13 7.5h5M13 18.5h5" />
    </svg>
  );
}

export function ProviderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M7.5 19.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18.4 9.6a4.95 4.95 0 0 1-.4 9.9H7.5Z" />
      <path d="M10 15.5h6" />
    </svg>
  );
}

export function ModelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="5.5" cy="7" r="2" />
      <circle cx="5.5" cy="19" r="2" />
      <circle cx="13" cy="13" r="2" />
      <circle cx="20.5" cy="7" r="2" />
      <circle cx="20.5" cy="19" r="2" />
      <path d="M7.3 8l4-.01M7.3 18l4 -3.9M14.8 12l4-3.9M14.8 14l4 3.9M7.4 8.2l4 3.8M7.4 17.8l4-3.8" />
    </svg>
  );
}

export const NODE_ICONS: Record<NodeId, (p: SVGProps<SVGSVGElement>) => React.JSX.Element> = {
  browser: BrowserIcon,
  backend: ServerIcon,
  provider: ProviderIcon,
  model: ModelIcon,
};

export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden {...props}>
      <path d="M4.5 11h13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="0.1 4.4" />
      <circle cx="4.5" cy="11" r="3" fill="currentColor" />
      <circle cx="17.5" cy="11" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
