import React from 'react';
import { MarketplaceSkill, getAccentColor, getIconForSkill, theme } from '../marketplaceUtils';
import { useI18n } from '../i18n/useI18n';

interface MarketplaceDetailProps {
  skill: MarketplaceSkill;
  onClose: () => void;
  onInstall: (skill: MarketplaceSkill) => void;
  isInstalled: boolean;
}

export const MarketplaceDetail: React.FC<MarketplaceDetailProps> = ({
  skill,
  onClose,
  onInstall,
  isInstalled,
}) => {
  const { strings } = useI18n();
  const isLocal = skill.url.startsWith('local:');
  const accent = getAccentColor(skill.name);
  const icon = getIconForSkill(skill);

  return (
    <div className="skill-detail-overlay" onClick={onClose}>
      <div className="skill-detail-panel" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="skill-detail-close" onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Header with Icon */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              flexShrink: 0,
              boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>
              {icon.value}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'white' }}>{skill.name}</h2>
              {skill.url.includes('anthropics/skills') && (
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: theme.accent }}>
                  verified
                </span>
              )}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '14px', color: theme.textSecondary }}>
              {strings.marketplace.byAuthor(skill.author.startsWith('@') ? skill.author : `@${skill.author}`)}
            </p>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '20px' }}>
          <h3
            style={{
              margin: '0 0 8px',
              fontSize: '13px',
              fontWeight: 600,
              color: theme.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {strings.marketplace.description}
          </h3>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: '#e7e5e4' }}>{skill.description}</p>
        </div>

        {/* Tags */}
        {skill.tags.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3
              style={{
                margin: '0 0 10px',
                fontSize: '13px',
                fontWeight: 600,
                color: theme.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {strings.marketplace.tags}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {skill.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: '12px',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    background: 'rgba(249, 115, 22, 0.12)',
                    border: `1px solid rgba(249, 115, 22, 0.3)`,
                    color: theme.accent,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
          {skill.stars > 0 && (
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: theme.textSecondary, fontSize: '14px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#fbbf24' }}>
                star
              </span>
              <span>{skill.stars} {strings.marketplace.starsLabel}</span>
            </div>
          )}
        </div>

        {/* URL */}
        <div style={{ marginBottom: '28px' }}>
          <h3
            style={{
              margin: '0 0 8px',
              fontSize: '13px',
              fontWeight: 600,
              color: theme.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {strings.marketplace.repository}
          </h3>
          <a
            href={skill.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: theme.accent,
              textDecoration: 'none',
              wordBreak: 'break-all',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              open_in_new
            </span>
            {skill.url}
          </a>
        </div>

        {/* Install Button */}
        <button
          onClick={() => {
            if (isLocal || isInstalled) return;
            onInstall(skill);
          }}
          disabled={isLocal || isInstalled}
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: '12px',
            border: 'none',
            background: isInstalled
              ? theme.surfaceHover
              : `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accentHover} 100%)`,
            color: 'white',
            fontSize: '15px',
            fontWeight: 700,
            cursor: isInstalled ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: isInstalled ? 'none' : '0 8px 24px rgba(249, 115, 22, 0.3)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!isInstalled) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 28px rgba(249, 115, 22, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            if (!isInstalled) {
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(249, 115, 22, 0.3)';
            }
          }}
        >
          {isLocal ? (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                folder
              </span>
              {strings.marketplace.localSkill}
            </>
          ) : isInstalled ? (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                check_circle
              </span>
              {strings.marketplace.installed}
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                download
              </span>
              {strings.marketplace.installButton}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
