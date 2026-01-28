import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { useSkillsStore } from '../store/useSkillsStore';
import { useI18n } from '../i18n/useI18n';
import type { SkillPlatform, ValidationError } from '../../../types/index.js';

interface FileNodeProps {
  node: {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: any[];
  };
  level?: number;
}

const FileNode: React.FC<FileNodeProps> = ({ node, level = 0 }) => {
  const [expanded, setExpanded] = React.useState(level < 1);
  const paddingLeft = level * 16 + 12;

  const handleOpen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'file') {
      await invoke('open_in_editor', { path: node.path });
    } else {
      setExpanded(!expanded);
    }
  };

  return (
    <div>
      <div 
        onClick={handleOpen}
        style={{
          padding: `6px 12px 6px ${paddingLeft}px`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: node.type === 'directory' ? '#e2e8f0' : '#94a3b8',
          borderRadius: '4px',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
           e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        }}
        onMouseLeave={(e) => {
           e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span className="material-symbols-outlined" style={{ 
          fontSize: '18px', 
          color: node.type === 'directory' ? 'var(--primary)' : '#64748b' 
        }}>
          {node.type === 'directory' ? (expanded ? 'folder_open' : 'folder') : 'description'}
        </span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name}
        </span>
      </div>
      {node.type === 'directory' && expanded && node.children && (
        <div style={{ marginLeft: '8px', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
          {node.children.map((child, index) => (
            <FileNode key={index} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

interface DetailPanelProps {
  activePlatform: SkillPlatform;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({ activePlatform }) => {
  const { selectedSkill, currentSkillFiles, loadSkills, loadCodexSkills, loadGeminiSkills } = useSkillsStore();
  const { strings } = useI18n();
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [installTarget, setInstallTarget] = useState<SkillPlatform>('claude');
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);

  const openInEditor = async () => {
    if (!selectedSkill) return;
    const skillMdPath = selectedSkill.path + '/SKILL.md';
    await invoke('open_in_editor', { path: skillMdPath });
  };

  const showInFinder = async () => {
    if (!selectedSkill) return;
    await invoke('show_in_finder', { path: selectedSkill.path });
  };

  const availableTargets = (['claude', 'codex', 'gemini'] as SkillPlatform[])
    .filter((platform) => platform !== activePlatform);

  useEffect(() => {
    const nextTarget = availableTargets[0] ?? activePlatform;
    setInstallTarget(nextTarget);
  }, [activePlatform, selectedSkill?.path]);

  const handleInstallTo = async () => {
    if (!selectedSkill) return;
    setInstalling(true);
    setInstallError(null);
    try {
      await invoke('install_local_skill', { platform: installTarget, sourcePath: selectedSkill.path });
      if (installTarget === 'claude') await loadSkills();
      if (installTarget === 'codex') await loadCodexSkills();
      if (installTarget === 'gemini') await loadGeminiSkills();
      setInstallModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setInstallError(message || strings.detail.installFailed);
    } finally {
      setInstalling(false);
    }
  };

  if (!selectedSkill) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#64748b',
        fontSize: '14px',
        fontFamily: 'Space Grotesk'
      }}>
        {strings.detail.emptyState}
      </div>
    );
  }

  const metadata = selectedSkill.metadata;
  const validation = selectedSkill.validationResult;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header Section */}
      <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '11px', fontFamily: 'JetBrains Mono' }}>
            <span>{selectedSkill.type.toUpperCase()}</span>
            <span>/</span>
            <span style={{ color: '#94a3b8' }}>{selectedSkill.path.split('/').pop()}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', fontFamily: 'Space Grotesk' }}>
                {metadata?.name}
              </h2>
              {validation?.valid && (
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  color: '#10b981',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>verified</span>
                  {strings.detail.verified}
                </span>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={showInFinder} className="btn-secondary" title={strings.detail.reveal} style={actionButtonStyle}>
                <span className="material-symbols-outlined">folder_open</span>
                {strings.detail.reveal}
              </button>
              <button onClick={openInEditor} className="btn-secondary" title={strings.detail.open} style={actionButtonStyle}>
                <span className="material-symbols-outlined">open_in_new</span>
                {strings.detail.open}
              </button>
              <button
                onClick={() => {
                  setInstallError(null);
                  setInstallModalOpen(true);
                }}
                className="btn-secondary"
                style={actionButtonStyle}
              >
                <span className="material-symbols-outlined">download</span>
                {strings.detail.installTo}
              </button>
            </div>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '8px', lineHeight: '1.5' }}>
            {metadata?.description}
          </p>
        </div>

        {/* Metadata Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '16px', 
          paddingTop: '16px',
          borderTop: '1px solid var(--glass-border)'
        }}>
          <MetaItem label={strings.detail.version} value={metadata?.version || strings.detail.fallbackVersion} />
          <MetaItem label={strings.detail.license} value={metadata?.license || strings.detail.fallbackLicense} />
          <MetaItem label={strings.detail.model} value={metadata?.model || strings.detail.fallbackModel} />
          <MetaItem label={strings.detail.context} value={metadata?.context || strings.detail.fallbackContext} />
        </div>
      </div>

      {/* Scrollable Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Validation Issues */}
        {!validation?.valid && (
          <div style={{
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '12px'
          }}>
            <h3 style={{ color: '#fca5a5', fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined">error</span>
              {strings.detail.validationIssues}
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {validation?.errors.map((err: ValidationError, i: number) => (
                <li key={i} style={{ color: '#fca5a5', fontSize: '13px' }}>• {err.message}</li>
              ))}
              {validation?.warnings.map((warn: ValidationError, i: number) => (
                <li key={i} style={{ color: '#fcd34d', fontSize: '13px' }}>• {warn.message}</li>
              ))}
            </ul>
          </div>
        )}

        {/* File Structure Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ color: 'white', fontSize: '14px', fontWeight: '600', fontFamily: 'Space Grotesk', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {strings.detail.skillStructure}
          </h3>
          <div style={{ 
            background: 'rgba(0,0,0,0.2)', 
            border: '1px solid var(--glass-border)', 
            borderRadius: '12px',
            padding: '8px',
            minHeight: '100px'
          }}>
            {currentSkillFiles ? (
              currentSkillFiles.map((node, index) => (
                <FileNode key={index} node={node} />
              ))
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                {strings.detail.loadingFiles}
              </div>
            )}
          </div>
        </div>

        {/* Supporting Files Summary */}
        {selectedSkill.supportingFiles && selectedSkill.supportingFiles.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ color: 'white', fontSize: '14px', fontWeight: '600', fontFamily: 'Space Grotesk', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {strings.detail.resources}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {selectedSkill.supportingFiles.map((file: string, i: number) => (
                <div key={i} style={{
                  padding: '6px 12px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '6px',
                  color: '#e2e8f0',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#64748b' }}>attach_file</span>
                  {file}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {installModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200
        }}>
          <div className="glass-panel" style={{
            background: '#181b21',
            padding: '24px',
            borderRadius: '12px',
            width: '420px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <h3 style={{ marginTop: 0, color: 'white', fontFamily: 'Space Grotesk' }}>
              {strings.detail.installTitle}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
              {strings.detail.installDescription(metadata?.name ?? '')}
            </p>

            <div style={{ marginTop: '12px', color: '#94a3b8', fontSize: '12px' }}>
              {strings.detail.installTarget}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              {availableTargets.map((platform) => {
                const label = platform === 'claude'
                  ? strings.platform.claude
                  : platform === 'codex'
                    ? strings.platform.codex
                    : strings.platform.gemini;
                return (
                  <label key={platform} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: `1px solid ${installTarget === platform ? 'var(--primary)' : 'var(--glass-border)'}`,
                    background: installTarget === platform ? 'rgba(25, 93, 230, 0.12)' : 'transparent',
                    cursor: 'pointer',
                  }}>
                    <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>
                      {label}
                    </span>
                    <input
                      type="radio"
                      name="installTarget"
                      checked={installTarget === platform}
                      onChange={() => setInstallTarget(platform)}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                  </label>
                );
              })}
            </div>

            {installError && (
              <div style={{ marginTop: '12px', color: '#fca5a5', fontSize: '12px' }}>
                {installError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button
                onClick={() => setInstallModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {strings.localView.cancel}
              </button>
              <button
                onClick={handleInstallTo}
                disabled={installing}
                style={{
                  padding: '8px 16px',
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: installing ? 'not-allowed' : 'pointer',
                  opacity: installing ? 0.7 : 1
                }}
              >
                {installing ? strings.localView.installing : strings.localView.install}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MetaItem: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <span style={{ color: '#64748b', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    <span style={{ color: '#e2e8f0', fontSize: '13px', fontFamily: 'JetBrains Mono' }}>{value}</span>
  </div>
);

const actionButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: '#181b21',
  border: '1px solid var(--glass-border)',
  borderRadius: '8px',
  color: '#94a3b8',
  fontSize: '13px',
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s'
};
