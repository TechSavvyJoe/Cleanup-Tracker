import React from 'react';

const EnterpriseShell = ({
  user,
  isOnline,
  currentView,
  onChangeView,
  views = [],
  metrics = [],
  onPrimaryAction,
  onSecondaryAction,
  onRefresh,
  onCommandPalette,
  onLogout,
  onOpenSettings,
  children,
  theme,
  onToggleTheme
}) => {
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'CT';

  const shellClass = ['enterprise-shell', theme === 'dark' ? 'dark' : ''].join(' ').trim();

  return (
    <div className={shellClass}>
      <header className="enterprise-header">
        <div className="enterprise-header__inner">
          <div className="enterprise-brand">
            <span className="enterprise-logo">CT</span>
            <div className="enterprise-title">
              <span className="enterprise-title__name">Cleanup Tracker Enterprise</span>
              <span className="enterprise-title__subtitle">Mission Ford Operations Command</span>
            </div>
          </div>
          <div className="enterprise-nav">
            {views.map((view) => (
              <button
                key={view.id}
                type="button"
                onClick={() => onChangeView(view.id)}
                className={view.id === currentView ? 'active' : ''}
              >
                {view.icon}
                <span>{view.label}</span>
                {view.badge != null && (
                  <span className="command-palette__badge">{view.badge}</span>
                )}
              </button>
            ))}
          </div>
          <div className="enterprise-header__actions">
            <div className="enterprise-status">
              <span className={`enterprise-status__dot ${isOnline ? '' : 'offline'}`} />
              <span>{isOnline ? 'Realtime Sync Online' : 'Offline Mode'}</span>
            </div>
            <button type="button" className="enterprise-action primary" onClick={onPrimaryAction}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              New Job
            </button>
            <button type="button" className="enterprise-action" onClick={onSecondaryAction}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M2.5 4.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M4.5 2.5v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M4.5 8.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M9.5 2.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M11.5 9.5h-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M9.5 8.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              VIN Scanner
            </button>
            <button type="button" className="enterprise-action" onClick={onRefresh}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path
                  d="M11.5 3.5v3h-3M2.5 10.5v-3h3"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M11.5 6.5a4.5 4.5 0 0 0-8.5-2.5M2.5 8.5a4.5 4.5 0 0 0 8.5 2.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Refresh Data
            </button>
            <button type="button" className="enterprise-action" onClick={onCommandPalette}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <rect x="2.5" y="2.5" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.4" />
                <path d="m5 7 2 2 2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Command (⌘K)
            </button>
            <button type="button" className="enterprise-action" onClick={onToggleTheme}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path
                  d="M7 1.5v2M7 10.5v2M10.596 3.404l-1.414 1.414M4.818 9.182 3.404 10.596M12.5 7h-2M3.5 7h-2M10.596 10.596l-1.414-1.414M4.818 4.818 3.404 3.404M7 9.5a2.5 2.5 0 1 0 0-5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
            {onOpenSettings && (
              <button type="button" className="enterprise-action" onClick={onOpenSettings}>
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path
                    d="M6.125 1.75h1.75l.35 1.4a3.9 3.9 0 0 1 1.137.66l1.39-.38 1.25 1.25-.38 1.39c.266.36.5.74.66 1.137l1.401.35v1.75l-1.401.35a3.9 3.9 0 0 1-.66 1.137l.38 1.39-1.25 1.25-1.39-.38a3.9 3.9 0 0 1-1.137.66l-.35 1.401h-1.75l-.35-1.401a3.9 3.9 0 0 1-1.137-.66l-1.39.38-1.25-1.25.38-1.39a3.9 3.9 0 0 1-.66-1.137l-1.401-.35v-1.75l1.401-.35c.16-.397.394-.777.66-1.137l-.38-1.39 1.25-1.25 1.39.38c.36-.266.74-.5 1.137-.66l.35-1.4Zm.75 4.2a2.05 2.05 0 1 0 0 4.1 2.05 2.05 0 0 0 0-4.1Z"
                    fill="currentColor"
                  />
                </svg>
                Settings
              </button>
            )}
            <div className="enterprise-user">
              <span className="enterprise-user__avatar">{initials}</span>
              <div className="enterprise-user__meta">
                <span>{user?.name || 'Unknown User'}</span>
                <span>{user?.role ? user.role.toUpperCase() : 'GUEST'}</span>
              </div>
              {onLogout && (
                <button type="button" className="enterprise-action" onClick={onLogout} aria-label="Sign out">
                  <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
                    <path
                      d="M6.5 2.5h-2a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2M9 8.5l2-2-2-2M11 6.5H5"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {metrics.length > 0 && (
        <section className="metrics-row">
          {metrics}
        </section>
      )}

      <main className="enterprise-main">{children}</main>
    </div>
  );
};

export default EnterpriseShell;
