import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { LocalView } from './views/LocalView';
import { MarketplaceView } from './views/MarketplaceView';
import { SettingsView } from './views/SettingsView';
import { useUpdateStore } from './store/useUpdateStore';

type ViewId = 'local' | 'marketplace' | 'settings';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewId>('local');
  const autoCheckEnabled = useUpdateStore((state) => state.autoCheckEnabled);
  const checkForUpdates = useUpdateStore((state) => state.checkForUpdates);

  useEffect(() => {
    if (!autoCheckEnabled) return;
    void checkForUpdates();
  }, [autoCheckEnabled, checkForUpdates]);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--bg-dark)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      
      {/* Ambient Background Blobs (Global) */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '600px', height: '600px', borderRadius: '9999px', background: 'rgba(249, 115, 22, 0.05)', filter: 'blur(100px)' }}></div>
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '700px', height: '700px', borderRadius: '9999px', background: 'rgba(25, 93, 230, 0.1)', filter: 'blur(120px)' }}></div>
        <div style={{ position: 'absolute', top: '40%', left: '30%', width: '400px', height: '400px', borderRadius: '9999px', background: 'rgba(236, 72, 153, 0.05)', filter: 'blur(80px)' }}></div>
      </div>

      <Sidebar activeView={activeView} onChangeView={setActiveView} />

      <main style={{ flex: 1, position: 'relative', zIndex: 1, overflow: 'hidden' }}>
        {activeView === 'local' && <LocalView />}
        {activeView === 'marketplace' && <MarketplaceView />}
        {activeView === 'settings' && <SettingsView />}
      </main>
    </div>
  );
};
