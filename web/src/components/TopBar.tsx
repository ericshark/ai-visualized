import { LogoMark } from "./NodeIcons";

export function TopBar({ lessonTitle }: { lessonTitle: string }) {
  return (
    <header className="border-b border-line bg-paper/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2.5 text-ink">
          <LogoMark className="text-accent" />
          <span className="text-[15px] font-semibold tracking-tight">AI Under the Hood</span>
        </div>
        <p className="hidden truncate text-[14px] text-ink-2 sm:block">{lessonTitle}</p>
      </div>
    </header>
  );
}
