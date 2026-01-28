import React from 'react';
import { useI18n } from '../i18n/useI18n';

type TabId = 'claude' | 'codex' | 'gemini';

interface HeaderProps {
  activeTab: TabId;
  onChangeTab: (tab: TabId) => void;
  counts: Record<string, number | null>;
  onRefresh: () => void;
  onAddSkill: () => void;
  loading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  activeTab, 
  onChangeTab, 
  counts,
  onRefresh,
  onAddSkill,
  loading 
}) => {
  const { strings } = useI18n();

  const getLabel = (id: string, label: string) => {
    const count = counts[id];
    return count !== null ? `${label} (${count})` : label;
  };

  return (
    <header className="flex-none px-6 py-4 border-b border-glass-border bg-background-dark/80 backdrop-blur-md sticky top-0 z-50" style={{
      borderBottom: '1px solid var(--glass-border)',
      background: 'rgba(15, 17, 21, 0.8)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '32px'
    }}>
      {/* Tabs */}
      <div style={{
        display: 'flex',
        background: 'rgba(24, 27, 33, 0.5)',
        padding: '4px',
        borderRadius: '8px',
        border: '1px solid var(--glass-border)',
      }}>
        {(['claude', 'codex', 'gemini'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const platformLabel = tab === 'claude'
            ? strings.platform.claude
            : tab === 'codex'
              ? strings.platform.codex
              : strings.platform.gemini;
          return (
            <button
              key={tab}
              onClick={() => onChangeTab(tab)}
              style={{
                padding: '6px 16px',
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: '6px',
                border: isActive ? '1px solid rgba(25, 93, 230, 0.3)' : '1px solid transparent',
                cursor: 'pointer',
                background: isActive ? 'rgba(25, 93, 230, 0.2)' : 'transparent',
                color: isActive ? 'white' : '#94a3b8',
                transition: 'all 160ms ease',
                outline: 'none'
              }}
            >
              {getLabel(tab, platformLabel)}
            </button>
          );
        })}
      </div>

      {/* Right Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Search - Visual only for now */}
        <div style={{ position: 'relative', display: 'none' }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '18px' }}>search</span>
          <input 
            type="text" 
            placeholder={strings.header.searchPlaceholder} 
            style={{
              background: '#181b21',
              border: '1px solid var(--glass-border)',
              borderRadius: '999px',
              padding: '8px 16px 8px 36px',
              fontSize: '14px',
              color: 'white',
              width: '200px',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onAddSkill}
            title={strings.header.addSkillTitle}
            style={{
              width: '36px', height: '36px',
              borderRadius: '8px',
              border: '1px solid var(--glass-border)',
              background: 'transparent',
              color: '#e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <span className="material-symbols-outlined">add</span>
          </button>
          
          <button
            onClick={onRefresh}
            disabled={loading}
            title={strings.header.refreshTitle}
            style={{
              width: '36px', height: '36px',
              borderRadius: '8px',
              border: '1px solid var(--glass-border)',
              background: 'transparent',
              color: '#e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.background = 'transparent')}
          >
            <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>
      </div>
    </header>
  );
};
