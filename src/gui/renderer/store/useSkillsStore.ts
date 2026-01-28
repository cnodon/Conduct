import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/tauri';
import type {
  ParsedSkill,
  SkillTreeNode,
  Statistics,
  ScanReport,
  SkillsTreeData,
  SkillPlatform,
  TreeSection
} from '../../../types/index.js';
import { STRINGS } from '../i18n/strings';
import { useUiStore } from './useUiStore';

interface ScanResult {
  skills: ParsedSkill[];
  report: ScanReport;
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface SkillsState {
  // 数据
  skills: ParsedSkill[];
  treeData: SkillsTreeData | null;
  statistics: Statistics | null;
  selectedSkill: SkillTreeNode | null;
  expandedKeys: string[];
  currentSkillFiles: FileNode[] | null;
  loading: boolean;
  error: string | null;
  counts: Record<string, number | null>;
  cache: Record<string, { skills: ParsedSkill[], treeData: any, stats: Statistics } | null>;
  activePlatform: SkillPlatform;

  // Actions
  setSkills: (skills: ParsedSkill[]) => void;
  setTreeData: (data: any) => void;
  setStatistics: (stats: Statistics) => void;
  setSelectedSkill: (skill: SkillTreeNode | null) => void;
  setExpandedKeys: (keys: string[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadSkills: () => Promise<void>;
  loadCodexSkills: () => Promise<void>;
  loadGeminiSkills: () => Promise<void>;
  loadSkillFiles: (path: string) => Promise<void>;
  installSkill: (platform: string, url: string) => Promise<void>;
  buildTreeData: (skills: ParsedSkill[], platform: string) => void;
  refreshTreeLabels: () => void;
  setActivePlatform: (platform: SkillPlatform) => void;
  init: () => Promise<void>;
}

const getStrings = () => {
  const language = useUiStore.getState().language;
  return STRINGS[language] ?? STRINGS.en;
};

export const useSkillsStore = create<SkillsState>((set, get) => ({
  // 初始状态
  skills: [],
  treeData: null,
  statistics: null,
  selectedSkill: null,
  expandedKeys: [],
  loading: false,
  error: null,
    counts: { claude: null, codex: null, gemini: null },
    cache: { claude: null, codex: null, gemini: null },
    currentSkillFiles: null,
    activePlatform: 'claude',
  
    // Actions
      setSkills: (skills) => set({ skills }),

    setTreeData: (data) => set({ treeData: data }),

  
  setStatistics: (stats) => set({ statistics: stats }),
  setSelectedSkill: (skill) => {
    set({ selectedSkill: skill, currentSkillFiles: null });
    if (skill) {
      get().loadSkillFiles(skill.path);
    }
  },
  setExpandedKeys: (keys) => set({ expandedKeys: keys }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setActivePlatform: (platform) => set({ activePlatform: platform }),

  // 加载 Skills
  loadSkills: async () => {
    // If we have cache, use it immediately (optimistic UI)
    // But we still fetch to update
    const { cache, activePlatform } = get();
    const isActive = activePlatform === 'claude';
    if (cache.claude) {
      if (isActive) {
        set({ 
          skills: cache.claude.skills,
          treeData: cache.claude.treeData,
          statistics: cache.claude.stats,
          // Don't set loading to true if we have cache, effectively "background refresh"
        });
      }
    } else {
      if (isActive) {
        set({ loading: true, error: null });
      }
    }

    try {
      const result = await invoke<ScanResult>('scan_skills', {
        options: {},
      });
      const { skills, report } = result;

      const strings = getStrings();
      const newTreeData = buildTreeSections(skills, 'claude', strings);

      set((state) => {
        const nextState = {
          counts: { ...state.counts, claude: skills.length },
          cache: { 
            ...state.cache, 
            claude: { skills, treeData: newTreeData, stats: report.summary } 
          }
        } as Partial<SkillsState>;

        if (state.activePlatform === 'claude') {
          Object.assign(nextState, {
            skills,
            statistics: report.summary,
            loading: false,
            treeData: newTreeData,
          });
        }

        return nextState;
      });
    } catch (error) {
      const strings = getStrings();
      if (get().activePlatform === 'claude') {
        set({
          error: error instanceof Error ? error.message : strings.errors.unknown,
          loading: false,
        });
      }
    }
  },

  loadCodexSkills: async () => {
    const { cache, activePlatform } = get();
    const isActive = activePlatform === 'codex';
    if (cache.codex) {
      if (isActive) {
        set({ 
          skills: cache.codex.skills,
          treeData: cache.codex.treeData,
          statistics: cache.codex.stats,
        });
      }
    } else {
      if (isActive) {
        set({ loading: true, error: null });
      }
    }

    try {
      const result = await invoke<ScanResult>('scan_codex_skills', {
        options: {},
      });
      const { skills, report } = result;

      const strings = getStrings();
      const newTreeData = buildTreeSections(skills, 'codex', strings);

      set((state) => {
        const nextState = {
          counts: { ...state.counts, codex: skills.length },
          cache: { 
            ...state.cache, 
            codex: { skills, treeData: newTreeData, stats: report.summary } 
          }
        } as Partial<SkillsState>;

        if (state.activePlatform === 'codex') {
          Object.assign(nextState, {
            skills,
            statistics: report.summary,
            loading: false,
            treeData: newTreeData,
          });
        }

        return nextState;
      });
    } catch (error) {
      const strings = getStrings();
      if (get().activePlatform === 'codex') {
        set({
          error: error instanceof Error ? error.message : strings.errors.unknown,
          loading: false,
        });
      }
    }
  },

  loadGeminiSkills: async () => {
    const { cache, activePlatform } = get();
    const isActive = activePlatform === 'gemini';
    if (cache.gemini) {
      if (isActive) {
        set({ 
          skills: cache.gemini.skills,
          treeData: cache.gemini.treeData,
          statistics: cache.gemini.stats,
        });
      }
    } else {
      if (isActive) {
        set({ loading: true, error: null });
      }
    }

    try {
      const result = await invoke<ScanResult>('scan_gemini_skills', {
        options: {},
      });
      const { skills, report } = result;

      const strings = getStrings();
      const newTreeData = buildTreeSections(skills, 'gemini', strings);

      set((state) => {
        const nextState = {
          counts: { ...state.counts, gemini: skills.length },
          cache: { 
            ...state.cache, 
            gemini: { skills, treeData: newTreeData, stats: report.summary } 
          }
        } as Partial<SkillsState>;

        if (state.activePlatform === 'gemini') {
          Object.assign(nextState, {
            skills,
            statistics: report.summary,
            loading: false,
            treeData: newTreeData,
          });
        }

        return nextState;
      });
    } catch (error) {
      const strings = getStrings();
      if (get().activePlatform === 'gemini') {
        set({
          error: error instanceof Error ? error.message : strings.errors.unknown,
          loading: false,
        });
      }
    }
  },

  loadSkillFiles: async (path: string) => {
    try {
      const files = await invoke<FileNode[]>('get_skill_files', { path });
      set({ currentSkillFiles: files });
    } catch (error) {
      const strings = getStrings();
      console.error(strings.errors.loadFilesFailed, error);
      // Don't set global error to avoid blocking UI, just log or show local error
    }
  },

  installSkill: async (platform: string, url: string) => {
    set({ loading: true, error: null });
    try {
      await invoke('install_skill', { platform, url });
      // Reload current tab skills after install
      // Note: We don't know which tab is active here easily without passing it, 
      // but the UI calling this usually knows or we can reload the one matching the platform.
      if (platform === 'claude') await get().loadSkills();
      else if (platform === 'codex') await get().loadCodexSkills();
      else if (platform === 'gemini') await get().loadGeminiSkills();
    } catch (error) {
       const strings = getStrings();
       set({
        error: error instanceof Error ? error.message : strings.errors.installFailed,
        loading: false,
      });
    }
  },

  init: async () => {
    // Preload all skills in parallel without setting global loading true
    // This allows the UI to render while data comes in
    
    // We intentionally don't await here to let them run in background
    // But we might want to know when they are done?
    // Since individual load* functions update the store, we can just fire them.
    
    // Trigger Claude (default active) first to ensure quick render
    await get().loadSkills();
    
    // Then trigger others
    get().loadCodexSkills();
    get().loadGeminiSkills();
  },

  buildTreeData: (skills: ParsedSkill[], platform: string) => {
    const strings = getStrings();
    const sections = buildTreeSections(skills, platform, strings);
    set({ treeData: sections });
  },
  refreshTreeLabels: () => {
    const strings = getStrings();
    const { cache, activePlatform, skills } = get();
    const nextCache = { ...cache };
    (['claude', 'codex', 'gemini'] as SkillPlatform[]).forEach((platform) => {
      const cached = cache[platform];
      if (cached) {
        const sections = buildTreeSections(cached.skills, platform, strings);
        nextCache[platform] = { ...cached, treeData: sections };
      }
    });

    const activeSections = buildTreeSections(skills, activePlatform, strings);
    set({ cache: nextCache, treeData: activeSections });
  },
}));

function buildTreeSections(skills: ParsedSkill[], platform: string, strings: typeof STRINGS.en): TreeSection[] {
  const createNode = (skill: ParsedSkill): SkillTreeNode => ({
    id: skill.skillPath,
    type: skill.location.type,
    name: skill.metadata.name,
    path: skill.skillPath,
    status: determineStatus(skill),
    metadata: skill.metadata,
    validationResult: skill.validationResult,
    supportingFiles: skill.supportingFiles,
  });

  const sections: TreeSection[] = [];

  if (platform === 'claude') {
    const personal = skills.filter(s => s.location.type === 'personal').map(createNode);
    const projectRoot = skills.filter(s => s.location.type === 'project').map(createNode);
    const nestedSkills = skills.filter(s => s.location.type === 'nested');
    const plugins = skills.filter(s => s.location.type === 'plugin').map(createNode);

    sections.push({
      id: 'personal',
      title: strings.tree.claude.personalTitle,
      icon: '🌐',
      description: strings.tree.claude.personalDescription,
      items: personal
    });

    const nestedGroups = new Map<string, SkillTreeNode[]>();
    nestedSkills.forEach(s => {
      const path = s.location.path;
      if (!nestedGroups.has(path)) nestedGroups.set(path, []);
      nestedGroups.get(path)!.push(createNode(s));
    });

    const nestedSections: TreeSection[] = [];
    nestedGroups.forEach((nodes, path) => {
      nestedSections.push({
        id: `nested-${path}`,
        title: strings.tree.claude.nestedTitle,
        icon: '📂',
        path: path,
        items: nodes
      });
    });

    sections.push({
      id: 'project',
      title: strings.tree.claude.projectTitle,
      icon: '📁',
      description: strings.tree.claude.projectDescription,
      items: projectRoot,
      subSections: nestedSections.length > 0 ? nestedSections : undefined
    });

    sections.push({
      id: 'plugins',
      title: strings.tree.claude.pluginTitle,
      icon: '🔌',
      description: strings.tree.claude.pluginDescription,
      items: plugins
    });
  } else if (platform === 'codex') {
    const repo = skills.filter(s => s.location.type === 'repo').map(createNode);
    const user = skills.filter(s => s.location.type === 'user').map(createNode);
    const system = skills.filter(s => ['admin', 'system'].includes(s.location.type)).map(createNode);

    sections.push({
      id: 'repo',
      title: strings.tree.codex.repoTitle,
      icon: '📦',
      description: strings.tree.codex.repoDescription,
      items: repo
    });

    sections.push({
      id: 'user',
      title: strings.tree.codex.userTitle,
      icon: '👤',
      description: strings.tree.codex.userDescription,
      items: user
    });

    sections.push({
      id: 'system',
      title: strings.tree.codex.systemTitle,
      icon: '⚙️',
      description: strings.tree.codex.systemDescription,
      items: system
    });
  } else if (platform === 'gemini') {
    const personal = skills.filter(s => s.location.type === 'personal').map(createNode);
    const project = skills.filter(s => s.location.type === 'project').map(createNode);
    const plugins = skills.filter(s => s.location.type === 'plugin').map(createNode);

    sections.push({
      id: 'personal',
      title: strings.tree.gemini.personalTitle,
      icon: '👤',
      description: strings.tree.gemini.personalDescription,
      items: personal
    });

    sections.push({
      id: 'project',
      title: strings.tree.gemini.projectTitle,
      icon: '🏢',
      description: strings.tree.gemini.projectDescription,
      items: project
    });

    sections.push({
      id: 'plugins',
      title: strings.tree.gemini.pluginTitle,
      icon: '🧩',
      items: plugins
    });
  }

  return sections;
}

/**
 * 确定 Skill 状态
 */
function determineStatus(skill: ParsedSkill): SkillTreeNode['status'] {
  if (!skill.validationResult.valid) return 'error';
  if (skill.validationResult.warnings.length > 0) return 'warning';
  if (skill.isOverridden) return 'overridden';
  return 'valid';
}
