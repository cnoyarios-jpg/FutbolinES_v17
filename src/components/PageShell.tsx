import { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
  title?: string;
  noPadding?: boolean;
  noBottomPad?: boolean;
}

export default function PageShell({ children, title, noPadding, noBottomPad }: PageShellProps) {
  return (
    <div className={`min-h-screen ${noBottomPad ? '' : 'pb-24'}`}>
      {title && (
        <header className="sticky top-0 z-40 border-b border-border/30 bg-card/80 backdrop-blur-xl px-5 py-4">
          <h1 className="font-display text-lg font-bold tracking-tight">{title}</h1>
        </header>
      )}
      <main className={noPadding ? '' : 'px-5 py-5'}>
        {children}
      </main>
    </div>
  );
}
