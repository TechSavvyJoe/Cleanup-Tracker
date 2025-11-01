/**
 * Advanced Real-Time Notification System
 * Toast notifications, alerts, and notification center
 */

import React, { useState, useCallback } from 'react';

// ============================================================================
// NOTIFICATION CONTEXT & HOOK
// ============================================================================

const NotificationContext = React.createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback((notification) => {
    const id = Date.now();
    const notif = {
      id,
      type: 'info',
      duration: 5000,
      ...notification,
    };

    setNotifications((prev) => [...prev, notif]);

    if (notif.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, notif.duration);
    }

    return id;
  }, [removeNotification]);

  return (
    <NotificationContext.Provider value={{ addNotification, removeNotification }}>
      {children}
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

// ============================================================================
// NOTIFICATION TOAST
// ============================================================================

export const NotificationToast = ({ notification, onRemove }) => {
  const typeConfig = {
    success: {
      bg: 'bg-gradient-to-r from-green-500 to-emerald-600',
      icon: '✅',
      textColor: 'text-white',
    },
    error: {
      bg: 'bg-gradient-to-r from-red-500 to-rose-600',
      icon: '❌',
      textColor: 'text-white',
    },
    info: {
      bg: 'bg-gradient-to-r from-blue-500 to-cyan-600',
      icon: 'ℹ️',
      textColor: 'text-white',
    },
    warning: {
      bg: 'bg-gradient-to-r from-yellow-400 to-orange-500',
      icon: '⚠️',
      textColor: 'text-white',
    },
  };

  const config = typeConfig[notification.type] || typeConfig.info;

  return (
    <div
      className={`
        ${config.bg} ${config.textColor}
        rounded-xl px-6 py-4 shadow-2xl
        flex items-center gap-4
        animate-in slide-in-from-right
        transform transition-all duration-300
      `}
    >
      <span className="text-2xl flex-shrink-0">{config.icon}</span>
      <div className="flex-1">
        {notification.title && (
          <p className="font-bold text-sm">{notification.title}</p>
        )}
        <p className="text-sm opacity-90">{notification.message}</p>
      </div>
      <button
        onClick={() => onRemove(notification.id)}
        className="flex-shrink-0 opacity-70 hover:opacity-100 text-xl"
      >
        ×
      </button>
    </div>
  );
};

// ============================================================================
// NOTIFICATION CONTAINER
// ============================================================================

export const NotificationContainer = ({ notifications, onRemove }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-md">
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

// ============================================================================
// NOTIFICATION CENTER
// ============================================================================

export const NotificationCenter = ({ onClose }) => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'success',
      title: 'Job Completed',
      message: '2023 Toyota Camry - Detail Service completed successfully',
      timestamp: new Date(Date.now() - 5 * 60000),
      read: false,
    },
    {
      id: 2,
      type: 'info',
      title: 'New Assignment',
      message: 'You have been assigned to a new job',
      timestamp: new Date(Date.now() - 15 * 60000),
      read: false,
    },
    {
      id: 3,
      type: 'warning',
      title: 'Low Inventory',
      message: 'Cleaning supplies running low',
      timestamp: new Date(Date.now() - 30 * 60000),
      read: true,
    },
  ]);

  const [filter, setFilter] = useState('all');

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-96 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">Notifications</h2>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Mark all as read
              </button>
            )}
            <button
              onClick={onClose}
              className="text-2xl text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-gray-100 flex gap-2">
          {['all', 'unread'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-4 py-2 rounded-full font-medium text-sm transition-all
                ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'unread' && unreadCount > 0 && (
                <span className="ml-2 bg-red-600 text-white text-xs rounded-full px-2 py-0.5">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <div className="text-4xl mb-2">📭</div>
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`
                    p-4 hover:bg-gray-50 cursor-pointer transition-colors
                    ${!notif.read ? 'bg-blue-50' : ''}
                  `}
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className="flex gap-3">
                    <div className="text-2xl flex-shrink-0">
                      {notif.type === 'success' && '✅'}
                      {notif.type === 'error' && '❌'}
                      {notif.type === 'warning' && '⚠️'}
                      {notif.type === 'info' && 'ℹ️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">
                        {notif.title}
                        {!notif.read && (
                          <span className="ml-2 w-2 h-2 bg-blue-600 rounded-full inline-block" />
                        )}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {notif.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatTime(notif.timestamp)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif.id);
                      }}
                      className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// NOTIFICATION BELL (For Header)
// ============================================================================

export const NotificationBell = ({ count = 0, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
    >
      <span className="text-2xl">🔔</span>
      {count > 0 && (
        <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
};

// ============================================================================
// HELPER FUNCTION
// ============================================================================

const formatTime = (date) => {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
};

const NotificationSystem = {
  NotificationProvider,
  useNotification,
  NotificationToast,
  NotificationCenter,
  NotificationBell,
};

export default NotificationSystem;
