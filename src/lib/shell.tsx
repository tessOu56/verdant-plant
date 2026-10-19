import React, { type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrandMark, Button, LiveStatusBadge } from '@is_tess/components';
import { resolveConsoleHref } from './nav';
import type { ConnStatus } from './useSocket';

export function boot(node: ReactNode) {
  document.documentElement.setAttribute('data-app', 'verdant');
  const el = document.getElementById('root');
  if (!el) throw new Error('#root missing');
  createRoot(el).render(node);
}

export function SkipLink() {
  return (
    <a href="#main" className="skip-link">
      跳到內容
    </a>
  );
}

export function ConnBadge({ status }: { status: ConnStatus }) {
  if (status === 'open') {
    return <LiveStatusBadge status="success">即時連線中</LiveStatusBadge>;
  }
  if (status === 'connecting') {
    return (
      <LiveStatusBadge status="warning" live={false}>
        連線中…
      </LiveStatusBadge>
    );
  }
  return (
    <LiveStatusBadge status="danger" live={false}>
      未連線
    </LiveStatusBadge>
  );
}

export function LiveRegion({ message }: { message: string }) {
  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}

type ShellProps = {
  title: string;
  description: string;
  conn?: ConnStatus;
  live?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function StationShell({ title, description, conn, live, actions, children }: ShellProps) {
  const back = resolveConsoleHref({
    port: location.port,
    pathname: location.pathname,
    referrer: document.referrer,
    protocol: location.protocol,
    hostname: location.hostname,
  });

  return (
    <div className="min-h-screen bg-background text-foreground" data-app="verdant">
      <SkipLink />
      <header className="border-b border-border bg-card/90 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {back ? (
              <Button asChild variant="ghost" size="sm">
                <a href={back}>← 控制台</a>
              </Button>
            ) : null}
            <BrandMark size="sm" aria-hidden />
            <div className="min-w-0">
              <h1 className="text-title font-semibold tracking-tight">{title}</h1>
              <p className="text-label text-muted-foreground">{description}</p>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {conn ? <ConnBadge status={conn} /> : null}
            {actions}
          </div>
        </div>
      </header>
      {conn === 'closed' ? (
        <div
          role="status"
          className="border-b border-border bg-muted px-4 py-3 text-sm text-foreground sm:px-6"
        >
          <p className="mx-auto max-w-6xl">
            即時通道未連上。從控制台啟動此站，或確認編排器仍在執行。這是標註的本機
            lab，不是託管產品。
          </p>
        </div>
      ) : null}
      <LiveRegion message={live ?? ''} />
      <main id="main" className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
        {children}
      </main>
    </div>
  );
}
