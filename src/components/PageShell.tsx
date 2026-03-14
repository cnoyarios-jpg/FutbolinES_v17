import { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
  title?: string;
  noPadding?: boolean;
  noBottomPad?: boolean;
}

export default function PageShell({ children, title, noPadding, noBottomPad }: PageShellProps) {
  return (
    <div className={`min-h-screen ${noBottomPad ? '' : 'pb-20'}`}>
      {title && (
        <header className="sticky top-0 z-40 border-b border-border/60 bg-card/80 backdrop-blur-xl px-4 py-3.5">
          <h1 className="font-display text-lg font-bold tracking-tight">{title}</h1>
        </header>
      )}
      <main className={noPadding ? '' : 'px-4 py-4'}>
        {children}
      </main>
    </div>
  );
}
