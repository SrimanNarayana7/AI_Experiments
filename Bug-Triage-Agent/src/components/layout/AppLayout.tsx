import type { ReactNode } from 'react';
import { BugIcon } from '../icons';

export function Header() {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            <BugIcon size={22} />
          </span>
          <div className="brand__text">
            <h1 className="brand__title">AI Bug Triage</h1>
            <p className="brand__subtitle">Enterprise AI-powered Jira defect analysis</p>
          </div>
        </div>
        <span className="app-header__badge">QA Platform</span>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-footer__inner">
        <span>AI Bug Triage</span>
        <span className="app-footer__divider" aria-hidden="true">
          ·
        </span>
        <span>Powered by Langflow</span>
      </div>
    </footer>
  );
}

export function Main({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="app-main">
      <div className="app-main__inner">{children}</div>
    </main>
  );
}
