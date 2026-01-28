import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { useI18n } from '../i18n/useI18n';
import { useSkillsStore } from '../store/useSkillsStore';
import versionInfo from '../version.json';

const SettingSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: '32px' }}>
    <h3 style={{ color: 'white', fontSize: '16px', fontWeight: 600, marginBottom: '16px', fontFamily: 'Space Grotesk' }}>{title}</h3>
    <div className="glass-panel" style={{ borderRadius: '12px', overflow: 'hidden' }}>
      {children}
    </div>
  </div>
);

const SettingItem: React.FC<{ 
  label: string; 
  description?: string; 
  control: React.ReactNode; 
  last?: boolean 
}> = ({ label, description, control, last }) => (
  <div style={{ 
    padding: '20px', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    borderBottom: last ? 'none' : '1px solid var(--glass-border)'
  }}>
    <div>
      <div style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 500 }}>{label}</div>
      {description && <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>{description}</div>}
    </div>
    <div>{control}</div>
  </div>
);

const Select: React.FC<{ options: { value: string; label: string }[]; value: string; onChange?: (value: string) => void }> = ({ options, value, onChange }) => (
  <select style={{
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid var(--glass-border)',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none'
  }} value={value} onChange={(event) => onChange?.(event.target.value)}>
    {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
  </select>
);

const Switch: React.FC<{ checked?: boolean }> = ({ checked }) => (
  <div style={{
    width: '40px',
    height: '24px',
    background: checked ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
    borderRadius: '999px',
    position: 'relative',
    cursor: 'pointer',
    transition: 'background 0.2s'
  }}>
    <div style={{
      width: '18px',
      height: '18px',
      background: 'white',
      borderRadius: '50%',
      position: 'absolute',
      top: '3px',
      left: checked ? '19px' : '3px',
      transition: 'left 0.2s',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    }}></div>
  </div>
);

export const SettingsView: React.FC = () => {
  const { strings, language, setLanguage } = useI18n();
  const { refreshTreeLabels } = useSkillsStore();
  const [skillsRepoPath, setSkillsRepoPath] = useState(strings.settings.skillsRepoLabel);
  const [appVersion, setAppVersion] = useState<string>(versionInfo?.build ?? versionInfo?.base ?? '0.0.0');
  const [marketplaceCount, setMarketplaceCount] = useState<number | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    invoke<string | null>('get_skills_repo_path')
      .then((path) => {
        if (!mounted) return;
        setSkillsRepoPath(path ?? strings.settings.skillsRepoLabel);
      })
      .catch(() => {
        if (!mounted) return;
        setSkillsRepoPath(strings.settings.skillsRepoLabel);
      });

    invoke<unknown[]>('read_marketplace_cache')
      .then((data) => {
        if (!mounted) return;
        setMarketplaceCount(Array.isArray(data) ? data.length : 0);
      })
      .catch(() => {
        if (!mounted) return;
        setMarketplaceCount(0);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setAppVersion(versionInfo?.build ?? versionInfo?.base ?? '0.0.0');
  }, [language]);

  const handleOpenSkillsRepo = async () => {
    setOpenError(null);
    if (!skillsRepoPath || skillsRepoPath === strings.settings.skillsRepoLabel) {
      setOpenError(strings.settings.openError);
      return;
    }
    try {
      await invoke('open_in_editor', { path: skillsRepoPath });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setOpenError(message || strings.settings.openError);
    }
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '32px 48px' }}>
      <h1 style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', fontFamily: 'Space Grotesk', marginBottom: '32px' }}>
        {strings.settings.title}
      </h1>

      <SettingSection title={strings.settings.appearance}>
        <SettingItem 
          label={strings.settings.theme} 
          description={strings.settings.themeDescription}
          control={<Select options={[
            { value: 'system', label: strings.settings.themeOptions.system },
            { value: 'dark', label: strings.settings.themeOptions.dark },
            { value: 'light', label: strings.settings.themeOptions.light },
          ]} value="dark" onChange={() => {}} />} 
        />
        <SettingItem 
          label={strings.settings.language} 
          description={strings.settings.languageDescription}
          control={<Select options={[
            { value: 'en', label: strings.settings.languageOptions.en },
            { value: 'zh', label: strings.settings.languageOptions.zh },
          ]} value={language} onChange={(value) => {
            setLanguage(value === 'zh' ? 'zh' : 'en');
            refreshTreeLabels();
          }} />} 
          last
        />
      </SettingSection>

      <SettingSection title={strings.settings.skillPaths}>
        <SettingItem 
          label={strings.settings.claudePath} 
          description={strings.settings.claudePathDescription}
          control={<input type="text" placeholder={strings.settings.claudePathPlaceholder} className="glass-input" style={{ background: 'transparent', border: '1px solid var(--glass-border)', padding: '6px 10px', borderRadius: '4px', color: '#94a3b8', fontSize: '13px', width: '200px' }} />} 
        />
        <SettingItem 
          label={strings.settings.codexPath} 
          description={strings.settings.codexPathDescription}
          control={<input type="text" placeholder={strings.settings.codexPathPlaceholder} className="glass-input" style={{ background: 'transparent', border: '1px solid var(--glass-border)', padding: '6px 10px', borderRadius: '4px', color: '#94a3b8', fontSize: '13px', width: '200px' }} />} 
        />
        <SettingItem 
          label={strings.settings.geminiPath} 
          description={strings.settings.geminiPathDescription}
          control={<input type="text" placeholder={strings.settings.geminiPathPlaceholder} className="glass-input" style={{ background: 'transparent', border: '1px solid var(--glass-border)', padding: '6px 10px', borderRadius: '4px', color: '#94a3b8', fontSize: '13px', width: '200px' }} />} 
          last
        />
      </SettingSection>

      <SettingSection title={strings.settings.marketplace}>
        <SettingItem
          label={strings.settings.skillsRepoLabel}
          description={strings.settings.skillsRepoDescription}
          control={(
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                readOnly
                value={skillsRepoPath}
                className="glass-input"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--glass-border)',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  color: '#94a3b8',
                  fontSize: '13px',
                  width: '240px'
                }}
              />
              <button
                onClick={handleOpenSkillsRepo}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {strings.settings.openSkillsRepo}
              </button>
            </div>
          )}
        />
        <SettingItem
          label={strings.settings.marketplaceSkillsLabel}
          description={strings.settings.marketplaceSkillsDescription}
          control={(
            <div style={{
              minWidth: '72px',
              textAlign: 'center',
              padding: '6px 10px',
              borderRadius: '999px',
              border: '1px solid var(--glass-border)',
              color: '#e2e8f0',
              fontSize: '12px',
              fontWeight: 600
            }}>
              {marketplaceCount === null ? strings.settings.loading : marketplaceCount}
            </div>
          )}
          last
        />
        {openError && (
          <div style={{ padding: '0 20px 16px', color: '#fca5a5', fontSize: '12px' }}>
            {openError}
          </div>
        )}
      </SettingSection>

      <SettingSection title={strings.settings.preferences}>
        <SettingItem 
          label={strings.settings.autoRefresh} 
          description={strings.settings.autoRefreshDescription}
          control={<Switch checked={true} />} 
        />
        <SettingItem 
          label={strings.settings.notifications} 
          description={strings.settings.notificationsDescription}
          control={<Switch checked={false} />} 
          last
        />
      </SettingSection>

      <div style={{ marginTop: '48px', borderTop: '1px solid var(--glass-border)', paddingTop: '24px', color: '#64748b', fontSize: '12px' }}>
        <p>{strings.settings.versionLine} {appVersion}</p>
        <p style={{ marginTop: '4px' }}>{strings.settings.copyright}</p>
      </div>
    </div>
  );
};
