import { LogoMark } from "./NodeIcons";

export function TopBar() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-15 max-w-7xl items-center justify-between px-5 sm:px-8">
        <div className="inline-flex items-center gap-3 font-semibold tracking-tight text-ink">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-white">
            <LogoMark />
          </span>
          AI Under the Hood
        </div>
        <a href="#journey" className="text-sm font-medium text-ink-2 underline-offset-4 hover:text-accent hover:underline">
          Request map
        </a>
      </div>
    </header>
  );
}
