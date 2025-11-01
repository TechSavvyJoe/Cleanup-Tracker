/**
 * Enterprise Layout System
 * Professional navigation, sidebar, and layout structure
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Spinner } from '../ui/EnterpriseComponents';

// ============================================================================
// SIDEBAR NAVIGATION
// ============================================================================

export const Sidebar = ({
  isOpen = true,
  onClose,
  user,
  onLogout,
  items = [],
  activeItem,
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-screen bg-gray-900 text-white
        transition-transform duration-300 z-50 md:z-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        w-64 md:w-56 overflow-y-auto
      `}>
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">CleanHub</h1>
            <button
              onClick={onClose}
              className="md:hidden text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-400">Enterprise Management</p>
        </div>

        {/* User Info */}
        {user && (
          <div className="p-4 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center">
                <span className="text-white font-bold">
                  {user.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-gray-400 capitalize">{user.role}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="p-4 space-y-2">
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/${item.id}`}
              onClick={onClose}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg
                transition-all duration-200 font-medium
                ${activeItem === item.id
                  ? 'bg-sky-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }
              `}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-700 absolute bottom-0 w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            fullWidth
            className="text-white border-gray-600 hover:bg-gray-800"
          >
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  );
};

// ============================================================================
// TOP HEADER/NAVBAR
// ============================================================================

export const Header = ({
  title,
  subtitle,
  onMenuClick,
  actions,
  breadcrumbs = [],
}) => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="px-6 py-4">
        {/* Mobile Menu Button + Title */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
          </div>
          {actions && (
            <div className="flex items-center gap-4">{actions}</div>
          )}
        </div>

        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {breadcrumbs.map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && <span>/</span>}
                {item.href ? (
                  <a href={item.href} className="hover:text-gray-900 transition-colors">
                    {item.label}
                  </a>
                ) : (
                  <span>{item.label}</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};

// ============================================================================
// MAIN LAYOUT
// ============================================================================

export const MainLayout = ({
  user,
  currentPage,
  onLogout,
  children,
  isLoading = false,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'jobs', label: 'Jobs', icon: '📋' },
    { id: 'vehicles', label: 'Vehicles', icon: '🚗' },
    { id: 'technicians', label: 'Team', icon: '👥' },
    { id: 'reports', label: 'Reports', icon: '📈' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={onLogout}
        items={navigationItems}
        activeItem={currentPage}
      />

      {/* Main Content */}
      <main className="flex-1 md:ml-56 overflow-auto">
        <Header
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          title="Cleanup Tracker"
          subtitle="Enterprise Cleaning & Detailing Management"
        />

        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="p-6">
            {children}
          </div>
        )}
      </main>
    </div>
  );
};

// ============================================================================
// PAGE CONTAINER
// ============================================================================

export const PageContainer = ({
  title,
  subtitle,
  actions,
  breadcrumbs = [],
  children,
}) => {
  return (
    <div>
      <Header
        title={title}
        subtitle={subtitle}
        actions={actions}
        breadcrumbs={breadcrumbs}
      />
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

// ============================================================================
// GRID LAYOUT
// ============================================================================

export const Grid = ({
  cols = 1,
  gap = 6,
  children,
  className = '',
}) => {
  const colClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  const gapClass = {
    4: 'gap-4',
    6: 'gap-6',
    8: 'gap-8',
  };

  return (
    <div className={`
      grid
      ${colClass[cols]}
      ${gapClass[gap]}
      ${className}
    `}>
      {children}
    </div>
  );
};

export default {
  Sidebar,
  Header,
  MainLayout,
  PageContainer,
  Grid,
};
