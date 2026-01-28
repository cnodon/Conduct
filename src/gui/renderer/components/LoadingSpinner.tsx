import React from 'react';
import { useI18n } from '../i18n/useI18n';

export const LoadingSpinner: React.FC = () => {
  const { strings } = useI18n();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      flexDirection: 'column',
      gap: '24px',
      background: 'var(--bg-dark)',
      position: 'relative',
      zIndex: 100
    }}>
      {/* Ambient glow behind spinner */}
      <div style={{
        position: 'absolute',
        width: '200px',
        height: '200px',
        background: 'var(--primary)',
        filter: 'blur(100px)',
        opacity: 0.15,
        zIndex: -1
      }}></div>

      <div style={{ position: 'relative' }}>
        <div
          className="animate-spin"
          style={{
            width: '48px',
            height: '48px',
            border: '2px solid rgba(255,255,255,0.05)',
            borderTop: '2px solid var(--primary)',
            borderRadius: '50%',
          }}
        />
        <div style={{
          position: 'absolute',
          inset: '-8px',
          border: '1px solid rgba(25, 93, 230, 0.1)',
          borderRadius: '50%',
          animation: 'pulse 2s infinite'
        }}></div>
      </div>

      <div style={{ 
        fontSize: '14px', 
        color: '#94a3b8', 
        fontFamily: 'Space Grotesk',
        letterSpacing: '0.05em',
        textTransform: 'uppercase'
      }}>
        {strings.app.initializing}
      </div>
    </div>
  );
};
