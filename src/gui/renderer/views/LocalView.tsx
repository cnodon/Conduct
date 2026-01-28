import React, { useEffect, useState } from 'react';
import { useSkillsStore } from '../store/useSkillsStore';
import { Header } from '../components/Header';
import { StatisticsPanel } from '../components/StatisticsPanel';
import { SkillsTree } from '../components/SkillsTree';
import { DetailPanel } from '../components/DetailPanel';
import { useI18n } from '../i18n/useI18n';

type TabId = 'claude' | 'codex' | 'gemini';

export const LocalView: React.FC = () => {
  const { 
    loading, 
    error, 
    loadSkills, 
    loadCodexSkills, 
    loadGeminiSkills,
    installSkill,
    counts,
    setSelectedSkill,
    setActivePlatform,
    init
  } = useSkillsStore();
  const { strings } = useI18n();
  const [activeTab, setActiveTab] = useState<TabId>('claude');
  const [showAddModal, setShowAddModal] = useState(false);
  const [skillUrl, setSkillUrl] = useState('');

  // Preload all data on mount
  useEffect(() => {
    init();
  }, []);

  const reload = () => {
    useSkillsStore.setState((state) => ({
      cache: { ...state.cache, [activeTab]: null }
    }));
    
    if (activeTab === 'claude') loadSkills();
    else if (activeTab === 'codex') loadCodexSkills();
    else loadGeminiSkills();
  };

  useEffect(() => {
    setSelectedSkill(null);
    setActivePlatform(activeTab);
    if (activeTab === 'claude') loadSkills();
    else if (activeTab === 'codex') loadCodexSkills();
    else if (activeTab === 'gemini') loadGeminiSkills();
  }, [activeTab]);

  const handleAddSkill = async () => {
    if (!skillUrl) return;
    await installSkill(activeTab, skillUrl);
    setSkillUrl('');
    setShowAddModal(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* 标题栏 */}
      <Header 
        activeTab={activeTab} 
        onChangeTab={setActiveTab} 
        counts={counts}
        onRefresh={reload}
        onAddSkill={() => setShowAddModal(true)}
        loading={loading}
      />

      {/* 进度条 */}
      {loading && (
        <div style={{ height: '2px', width: '100%', background: 'rgba(255,255,255,0.1)' }}>
          <div style={{
            height: '100%',
            background: 'var(--primary)',
            width: '30%',
            animation: 'progress 1s infinite linear',
            position: 'relative',
            left: '-30%'
          }} />
          <style>{`
            @keyframes progress {
              0% { left: -30%; width: 30%; }
              50% { left: 20%; width: 60%; }
              100% { left: 100%; width: 10%; }
            }
          `}</style>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.2)',
          color: '#fca5a5',
          borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '8px 16px',
          fontSize: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{error}</span>
          <button onClick={() => useSkillsStore.setState({ error: null })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      {/* 统计面板 */}
      <div style={{ padding: '24px 24px 8px 24px' }}>
        <StatisticsPanel />
      </div>

      {/* 主内容区域 */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        padding: '0 24px 24px 24px',
        gap: '24px',
      }}>
        <div className="glass-panel" style={{
          width: '320px',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          opacity: loading ? 0.6 : 1,
          transition: 'opacity 0.2s'
        }}>
          <SkillsTree />
        </div>

        <div className="glass-panel" style={{
          flex: 1,
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          opacity: loading ? 0.6 : 1,
          transition: 'opacity 0.2s'
        }}>
          <DetailPanel activePlatform={activeTab} />
        </div>
      </div>

      {/* Add Skill Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{
            background: '#181b21',
            padding: '24px',
            borderRadius: '12px',
            width: '400px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <h3 style={{ marginTop: 0, color: 'white', fontFamily: 'Space Grotesk' }}>
              {strings.localView.addSkillTitle(
                activeTab === 'claude'
                  ? strings.platform.claude
                  : activeTab === 'codex'
                    ? strings.platform.codex
                    : strings.platform.gemini
              )}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>{strings.localView.addSkillDescription}</p>
            <input
              type="text"
              value={skillUrl}
              onChange={(e) => setSkillUrl(e.target.value)}
              placeholder={strings.localView.addSkillPlaceholder}
              style={{
                width: '100%',
                padding: '10px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                borderRadius: '6px',
                marginBottom: '16px',
                outline: 'none'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setShowAddModal(false)}
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
                onClick={handleAddSkill}
                disabled={!skillUrl || loading}
                style={{
                  padding: '8px 16px',
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (!skillUrl || loading) ? 'not-allowed' : 'pointer',
                  opacity: (!skillUrl || loading) ? 0.7 : 1
                }}
              >
                {loading ? strings.localView.installing : strings.localView.install}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
