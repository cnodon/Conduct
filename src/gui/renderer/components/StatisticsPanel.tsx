import React from 'react';
import { useSkillsStore } from '../store/useSkillsStore';
import { useI18n } from '../i18n/useI18n';

const StatCard: React.FC<{
  title: string;
  value: number | string;
  icon: string;
  colorClass: string; // 'blue' | 'emerald' | 'amber' | 'rose'
}> = ({ title, value, icon, colorClass }) => {
  const getColors = (color: string) => {
    switch (color) {
      case 'blue': return { bg: 'rgba(59, 130, 246, 0.1)', text: 'rgba(59, 130, 246, 0.4)', bar: 'rgba(59, 130, 246, 0.5)' };
      case 'emerald': return { bg: 'rgba(16, 185, 129, 0.1)', text: 'rgba(16, 185, 129, 0.4)', bar: 'rgba(16, 185, 129, 0.5)' };
      case 'amber': return { bg: 'rgba(245, 158, 11, 0.1)', text: 'rgba(245, 158, 11, 0.4)', bar: 'rgba(245, 158, 11, 0.5)' };
      case 'rose': return { bg: 'rgba(244, 63, 94, 0.1)', text: 'rgba(244, 63, 94, 0.4)', bar: 'rgba(244, 63, 94, 0.5)' };
      default: return { bg: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.4)', bar: 'white' };
    }
  };

  const colors = getColors(colorClass);

  return (
    <div className="glass-panel" style={{
      padding: '16px',
      borderRadius: '12px',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      minWidth: '160px'
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '4px', height: '100%',
        background: colors.bar
      }}></div>
      
      <div>
        <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
          {title}
        </p>
        <p style={{ color: 'white', fontSize: '24px', fontFamily: 'Space Grotesk', fontWeight: 'bold' }}>
          {value}
        </p>
      </div>
      
      <span className="material-symbols-outlined" style={{
        color: colors.text,
        background: colors.bg,
        padding: '8px',
        borderRadius: '8px',
        fontSize: '24px'
      }}>
        {icon}
      </span>
    </div>
  );
};

export const StatisticsPanel: React.FC = () => {
  const { statistics } = useSkillsStore();
  const { strings } = useI18n();

  if (!statistics) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <StatCard title={strings.statistics.total} value="-" icon="dataset" colorClass="blue" />
        <StatCard title={strings.statistics.correct} value="-" icon="check_circle" colorClass="emerald" />
        <StatCard title={strings.statistics.warning} value="-" icon="warning" colorClass="amber" />
        <StatCard title={strings.statistics.error} value="-" icon="error" colorClass="rose" />
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
      <StatCard title={strings.statistics.total} value={statistics.total} icon="dataset" colorClass="blue" />
      <StatCard title={strings.statistics.correct} value={statistics.valid} icon="check_circle" colorClass="emerald" />
      <StatCard title={strings.statistics.warning} value={statistics.warnings} icon="warning" colorClass="amber" />
      <StatCard title={strings.statistics.error} value={statistics.errors} icon="error" colorClass="rose" />
    </div>
  );
};
