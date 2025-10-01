import React, { useState, useEffect } from 'react';
import { ModernTheme } from '../styles/ModernDesignSystem';

// Advanced Settings Panel Component
const SettingsPanel = ({ isOpen, onClose, currentTheme, onThemeChange, userRole }) => {
  const [settings, setSettings] = useState({
    theme: currentTheme || 'light',
    compactMode: false,
    showAnimations: true,
    autoRefresh: true,
    refreshInterval: 30,
    notifications: {
      desktop: true,
      sound: false,
      jobComplete: true,
      lowStock: true,
      teamUpdates: true,
    },
    display: {
      density: 'comfortable', // comfortable, compact, spacious
      fontSize: 'medium', // small, medium, large
      colorBlind: 'none', // none, protanopia, deuteranopia, tritanopia
    },
    advanced: {
      debugMode: false,
      performanceMode: false,
      experimentalFeatures: false,
    },
  });

  const [activeTab, setActiveTab] = useState('appearance');

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSettingChange = (category, key, value) => {
    const newSettings = { ...settings };
    if (category) {
      newSettings[category][key] = value;
    } else {
      newSettings[key] = value;
    }
    setSettings(newSettings);
    localStorage.setItem('userSettings', JSON.stringify(newSettings));
    
    // Apply theme change immediately
    if (key === 'theme') {
      onThemeChange(value);
    }
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cleanup-tracker-settings.json';
    link.click();
  };

  const importSettings = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          setSettings(imported);
          localStorage.setItem('userSettings', JSON.stringify(imported));
        } catch (error) {
          alert('Invalid settings file');
        }
      };
      reader.readAsText(file);
    }
  };

  if (!isOpen) return null;

  const theme = settings.theme === 'dark' ? ModernTheme.dark : ModernTheme.light;

  const tabs = [
    { id: 'appearance', label: '🎨 Appearance', icon: '🎨' },
    { id: 'notifications', label: '🔔 Notifications', icon: '🔔' },
    { id: 'display', label: '📱 Display', icon: '📱' },
    { id: 'advanced', label: '⚙️ Advanced', icon: '⚙️' },
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(8px)',
      zIndex: ModernTheme.zIndex.modal,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      animation: 'fadeIn 0.2s ease-out',
    }}>
      <div style={{
        backgroundColor: theme.background.primary,
        borderRadius: ModernTheme.borderRadius['2xl'],
        boxShadow: theme.shadow['2xl'],
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: `1px solid ${theme.border.default}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: ModernTheme.typography.fontSize['2xl'],
              fontWeight: ModernTheme.typography.fontWeight.bold,
              color: theme.text.primary,
            }}>
              ⚙️ Settings
            </h2>
            <p style={{
              margin: '0.25rem 0 0 0',
              fontSize: ModernTheme.typography.fontSize.sm,
              color: theme.text.secondary,
            }}>
              Customize your experience
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: theme.text.secondary,
              padding: '0.5rem',
              borderRadius: ModernTheme.borderRadius.lg,
              transition: ModernTheme.transition.fast,
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = theme.background.tertiary}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar Tabs */}
          <div style={{
            width: '200px',
            borderRight: `1px solid ${theme.border.default}`,
            padding: '1rem',
            overflowY: 'auto',
          }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  marginBottom: '0.5rem',
                  border: 'none',
                  borderRadius: ModernTheme.borderRadius.lg,
                  backgroundColor: activeTab === tab.id ? ModernTheme.colors.primary[500] : 'transparent',
                  color: activeTab === tab.id ? '#fff' : theme.text.primary,
                  cursor: 'pointer',
                  fontSize: ModernTheme.typography.fontSize.sm,
                  fontWeight: ModernTheme.typography.fontWeight.medium,
                  textAlign: 'left',
                  transition: ModernTheme.transition.fast,
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.backgroundColor = theme.background.tertiary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div style={{
            flex: 1,
            padding: '1.5rem',
            overflowY: 'auto',
          }}>
            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div>
                <h3 style={{
                  margin: '0 0 1.5rem 0',
                  fontSize: ModernTheme.typography.fontSize.lg,
                  fontWeight: ModernTheme.typography.fontWeight.semibold,
                  color: theme.text.primary,
                }}>
                  Appearance Settings
                </h3>

                {/* Theme Selector */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: ModernTheme.typography.fontSize.sm,
                    fontWeight: ModernTheme.typography.fontWeight.medium,
                    color: theme.text.primary,
                  }}>
                    Theme
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {['light', 'dark', 'auto'].map(themeOption => (
                      <button
                        key={themeOption}
                        onClick={() => handleSettingChange(null, 'theme', themeOption)}
                        style={{
                          flex: 1,
                          padding: '1rem',
                          border: `2px solid ${settings.theme === themeOption ? ModernTheme.colors.primary[500] : theme.border.default}`,
                          borderRadius: ModernTheme.borderRadius.lg,
                          backgroundColor: settings.theme === themeOption ? ModernTheme.colors.primary[50] : theme.background.secondary,
                          color: theme.text.primary,
                          cursor: 'pointer',
                          fontSize: ModernTheme.typography.fontSize.sm,
                          fontWeight: ModernTheme.typography.fontWeight.medium,
                          textTransform: 'capitalize',
                          transition: ModernTheme.transition.fast,
                        }}
                      >
                        {themeOption === 'light' && '☀️ Light'}
                        {themeOption === 'dark' && '🌙 Dark'}
                        {themeOption === 'auto' && '🔄 Auto'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Compact Mode */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  borderRadius: ModernTheme.borderRadius.lg,
                  backgroundColor: theme.background.secondary,
                  marginBottom: '0.75rem',
                }}>
                  <div>
                    <div style={{
                      fontSize: ModernTheme.typography.fontSize.sm,
                      fontWeight: ModernTheme.typography.fontWeight.medium,
                      color: theme.text.primary,
                    }}>
                      Compact Mode
                    </div>
                    <div style={{
                      fontSize: ModernTheme.typography.fontSize.xs,
                      color: theme.text.secondary,
                      marginTop: '0.25rem',
                    }}>
                      Reduce spacing for more content
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.compactMode}
                      onChange={(e) => handleSettingChange(null, 'compactMode', e.target.checked)}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <span>{settings.compactMode ? 'On' : 'Off'}</span>
                  </label>
                </div>

                {/* Show Animations */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  borderRadius: ModernTheme.borderRadius.lg,
                  backgroundColor: theme.background.secondary,
                  marginBottom: '0.75rem',
                }}>
                  <div>
                    <div style={{
                      fontSize: ModernTheme.typography.fontSize.sm,
                      fontWeight: ModernTheme.typography.fontWeight.medium,
                      color: theme.text.primary,
                    }}>
                      Animations
                    </div>
                    <div style={{
                      fontSize: ModernTheme.typography.fontSize.xs,
                      color: theme.text.secondary,
                      marginTop: '0.25rem',
                    }}>
                      Enable smooth transitions and effects
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.showAnimations}
                      onChange={(e) => handleSettingChange(null, 'showAnimations', e.target.checked)}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <span>{settings.showAnimations ? 'On' : 'Off'}</span>
                  </label>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div>
                <h3 style={{
                  margin: '0 0 1.5rem 0',
                  fontSize: ModernTheme.typography.fontSize.lg,
                  fontWeight: ModernTheme.typography.fontWeight.semibold,
                  color: theme.text.primary,
                }}>
                  Notification Preferences
                </h3>

                {Object.entries(settings.notifications).map(([key, value]) => (
                  <div key={key} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    borderRadius: ModernTheme.borderRadius.lg,
                    backgroundColor: theme.background.secondary,
                    marginBottom: '0.75rem',
                  }}>
                    <div style={{
                      fontSize: ModernTheme.typography.fontSize.sm,
                      fontWeight: ModernTheme.typography.fontWeight.medium,
                      color: theme.text.primary,
                      textTransform: 'capitalize',
                    }}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => handleSettingChange('notifications', key, e.target.checked)}
                        style={{ marginRight: '0.5rem' }}
                      />
                      <span>{value ? 'On' : 'Off'}</span>
                    </label>
                  </div>
                ))}

                {/* Auto Refresh */}
                <div style={{
                  padding: '1rem',
                  borderRadius: ModernTheme.borderRadius.lg,
                  backgroundColor: theme.background.secondary,
                  marginTop: '1.5rem',
                }}>
                  <label style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                  }}>
                    <span style={{
                      fontSize: ModernTheme.typography.fontSize.sm,
                      fontWeight: ModernTheme.typography.fontWeight.medium,
                      color: theme.text.primary,
                    }}>
                      Auto Refresh
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.autoRefresh}
                      onChange={(e) => handleSettingChange(null, 'autoRefresh', e.target.checked)}
                    />
                  </label>
                  {settings.autoRefresh && (
                    <div>
                      <label style={{
                        fontSize: ModernTheme.typography.fontSize.xs,
                        color: theme.text.secondary,
                      }}>
                        Refresh Interval: {settings.refreshInterval}s
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="120"
                        step="10"
                        value={settings.refreshInterval}
                        onChange={(e) => handleSettingChange(null, 'refreshInterval', parseInt(e.target.value))}
                        style={{ width: '100%', marginTop: '0.5rem' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Display Tab */}
            {activeTab === 'display' && (
              <div>
                <h3 style={{
                  margin: '0 0 1.5rem 0',
                  fontSize: ModernTheme.typography.fontSize.lg,
                  fontWeight: ModernTheme.typography.fontWeight.semibold,
                  color: theme.text.primary,
                }}>
                  Display Settings
                </h3>

                {/* Density */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: ModernTheme.typography.fontSize.sm,
                    fontWeight: ModernTheme.typography.fontWeight.medium,
                    color: theme.text.primary,
                  }}>
                    Density
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {['compact', 'comfortable', 'spacious'].map(density => (
                      <button
                        key={density}
                        onClick={() => handleSettingChange('display', 'density', density)}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          border: `2px solid ${settings.display.density === density ? ModernTheme.colors.primary[500] : theme.border.default}`,
                          borderRadius: ModernTheme.borderRadius.lg,
                          backgroundColor: settings.display.density === density ? ModernTheme.colors.primary[50] : theme.background.secondary,
                          color: theme.text.primary,
                          cursor: 'pointer',
                          fontSize: ModernTheme.typography.fontSize.sm,
                          textTransform: 'capitalize',
                        }}
                      >
                        {density}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: ModernTheme.typography.fontSize.sm,
                    fontWeight: ModernTheme.typography.fontWeight.medium,
                    color: theme.text.primary,
                  }}>
                    Font Size
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {['small', 'medium', 'large'].map(size => (
                      <button
                        key={size}
                        onClick={() => handleSettingChange('display', 'fontSize', size)}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          border: `2px solid ${settings.display.fontSize === size ? ModernTheme.colors.primary[500] : theme.border.default}`,
                          borderRadius: ModernTheme.borderRadius.lg,
                          backgroundColor: settings.display.fontSize === size ? ModernTheme.colors.primary[50] : theme.background.secondary,
                          color: theme.text.primary,
                          cursor: 'pointer',
                          fontSize: ModernTheme.typography.fontSize.sm,
                          textTransform: 'capitalize',
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Tab */}
            {activeTab === 'advanced' && (
              <div>
                <h3 style={{
                  margin: '0 0 1.5rem 0',
                  fontSize: ModernTheme.typography.fontSize.lg,
                  fontWeight: ModernTheme.typography.fontWeight.semibold,
                  color: theme.text.primary,
                }}>
                  Advanced Settings
                </h3>

                {Object.entries(settings.advanced).map(([key, value]) => (
                  <div key={key} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    borderRadius: ModernTheme.borderRadius.lg,
                    backgroundColor: theme.background.secondary,
                    marginBottom: '0.75rem',
                  }}>
                    <div style={{
                      fontSize: ModernTheme.typography.fontSize.sm,
                      fontWeight: ModernTheme.typography.fontWeight.medium,
                      color: theme.text.primary,
                      textTransform: 'capitalize',
                    }}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => handleSettingChange('advanced', key, e.target.checked)}
                        style={{ marginRight: '0.5rem' }}
                      />
                      <span>{value ? 'On' : 'Off'}</span>
                    </label>
                  </div>
                ))}

                {/* Import/Export */}
                <div style={{
                  marginTop: '2rem',
                  padding: '1.5rem',
                  borderRadius: ModernTheme.borderRadius.lg,
                  backgroundColor: theme.background.secondary,
                  border: `1px dashed ${theme.border.default}`,
                }}>
                  <h4 style={{
                    margin: '0 0 1rem 0',
                    fontSize: ModernTheme.typography.fontSize.sm,
                    fontWeight: ModernTheme.typography.fontWeight.semibold,
                    color: theme.text.primary,
                  }}>
                    Backup & Restore
                  </h4>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={exportSettings}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        border: 'none',
                        borderRadius: ModernTheme.borderRadius.lg,
                        backgroundColor: ModernTheme.colors.primary[500],
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: ModernTheme.typography.fontSize.sm,
                        fontWeight: ModernTheme.typography.fontWeight.medium,
                      }}
                    >
                      📥 Export Settings
                    </button>
                    <label style={{ flex: 1 }}>
                      <input
                        type="file"
                        accept=".json"
                        onChange={importSettings}
                        style={{ display: 'none' }}
                      />
                      <div style={{
                        padding: '0.75rem',
                        border: `2px solid ${ModernTheme.colors.primary[500]}`,
                        borderRadius: ModernTheme.borderRadius.lg,
                        backgroundColor: 'transparent',
                        color: ModernTheme.colors.primary[500],
                        cursor: 'pointer',
                        fontSize: ModernTheme.typography.fontSize.sm,
                        fontWeight: ModernTheme.typography.fontWeight.medium,
                        textAlign: 'center',
                      }}>
                        📤 Import Settings
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SettingsPanel;
