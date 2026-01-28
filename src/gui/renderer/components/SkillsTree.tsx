import React from 'react';
import { useSkillsStore } from '../store/useSkillsStore';
import type { SkillTreeNode, TreeSection } from '../../../types/index.js';
import { useI18n } from '../i18n/useI18n';

export const SkillsTree: React.FC = () => {
  const { treeData, selectedSkill, setSelectedSkill } = useSkillsStore();
  const { strings } = useI18n();

  if (!treeData || treeData.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
        {strings.skillsTree.noData}
      </div>
    );
  }

  const getStatusIcon = (status: SkillTreeNode['status']) => {
    switch (status) {
      case 'valid': return <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#10b981' }}>check_circle</span>; // emerald-500
      case 'warning': return <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#f59e0b' }}>warning</span>; // amber-500
      case 'error': return <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#ef4444' }}>error</span>; // rose-500
      case 'overridden': return <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#64748b' }}>history</span>; // slate-500
      default: return <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#94a3b8' }}>description</span>;
    }
  };

  const SkillNode: React.FC<{ node: SkillTreeNode }> = ({ node }) => {
    const isSelected = selectedSkill?.id === node.id;

    return (
      <div
        onClick={() => setSelectedSkill(node)}
        style={{
          padding: '8px 12px',
          cursor: 'pointer',
          borderRadius: '6px',
          background: isSelected ? 'rgba(25, 93, 230, 0.2)' : 'transparent',
          border: isSelected ? '1px solid rgba(25, 93, 230, 0.3)' : '1px solid transparent',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: isSelected ? 'white' : '#94a3b8',
          transition: 'all 0.2s',
          marginBottom: '2px'
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = '#e2e8f0';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#94a3b8';
          }
        }}
      >
        {getStatusIcon(node.status)}
        <span style={{ fontSize: '13px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name}
        </span>
        {node.status === 'overridden' && (
          <span style={{ fontSize: '10px', color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
            {strings.skillsTree.overridden}
          </span>
        )}
      </div>
    );
  };

  const SectionRenderer: React.FC<{ section: TreeSection }> = ({ section }) => {
    // Determine if section is open by default
    const [isOpen, setIsOpen] = React.useState(true);

    return (
      <div style={{ marginBottom: '16px' }}>
        {/* Section Header */}
        <div 
          onClick={() => setIsOpen(!isOpen)}
          style={{
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            userSelect: 'none',
            color: '#e2e8f0'
          }}
        >
          <span 
            className="material-symbols-outlined" 
            style={{ 
              fontSize: '16px', 
              color: '#64748b', 
              transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}
          >
            arrow_forward_ios
          </span>
          <span style={{ fontSize: '20px' }}>{section.icon}</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{section.title}</span>
            {section.description && (
              <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{section.description}</span>
            )}
          </div>
        </div>

        {/* Section Content */}
        {isOpen && (
          <div style={{ paddingLeft: '16px', borderLeft: '1px solid rgba(255,255,255,0.05)', marginLeft: '19px', marginTop: '4px' }}>
            {/* Direct Items */}
            {section.items.length === 0 && (!section.subSections || section.subSections.length === 0) ? (
              <div style={{ padding: '8px', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                {strings.skillsTree.noSkillsFound}
              </div>
            ) : (
              section.items.map(node => (
                <SkillNode key={node.id} node={node} />
              ))
            )}

            {/* Sub Sections */}
            {section.subSections && section.subSections.map(sub => (
              <div key={sub.id} style={{ marginTop: '8px' }}>
                <SectionRenderer section={sub} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ color: 'white', fontFamily: 'Space Grotesk', fontSize: '18px', fontWeight: 'bold' }}>
          {strings.skillsTree.title}
        </h2>
      </div>
      {treeData.map((section: TreeSection) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </div>
  );
};
