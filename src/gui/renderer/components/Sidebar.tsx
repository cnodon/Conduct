import React from 'react';
import { useI18n } from '../i18n/useI18n';

type TabId = 'local' | 'marketplace' | 'settings';

interface SidebarProps {
  activeView: TabId;
  onChangeView: (view: TabId) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onChangeView }) => {
  const { strings } = useI18n();

  const getIcon = (view: TabId) => {
    switch (view) {
      case 'local': return 'inventory_2';
      case 'marketplace': return 'storefront';
      case 'settings': return 'settings';
    }
  };

  const NavItem: React.FC<{ view: TabId; label: string }> = ({ view, label }) => {
    const isActive = activeView === view;
    return (
      <button
        onClick={() => onChangeView(view)}
        title={label}
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isActive ? 'rgba(25, 93, 230, 0.2)' : 'transparent',
          color: isActive ? 'white' : '#64748b',
          border: isActive ? '1px solid rgba(25, 93, 230, 0.3)' : '1px solid transparent',
          cursor: 'pointer',
          transition: 'all 0.2s',
          marginBottom: '8px'
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>{getIcon(view)}</span>
      </button>
    );
  };

  return (
    <aside style={{
      width: '72px',
      height: '100%',
      background: 'rgba(15, 17, 21, 0.95)',
      borderRight: '1px solid var(--glass-border)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '16px 0',
      zIndex: 60
    }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          width: '40px', height: '40px',
          color: 'var(--primary)',
          background: 'rgba(25, 93, 230, 0.1)',
          borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <span className="material-symbols-outlined">hub</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center' }}>
        <NavItem view="local" label={strings.sidebar.local} />
        <NavItem view="marketplace" label={strings.sidebar.marketplace} />
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center' }}>
        <NavItem view="settings" label={strings.sidebar.settings} />
      </div>
    </aside>
  );
};
