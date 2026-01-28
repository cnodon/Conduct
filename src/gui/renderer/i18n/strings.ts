export type Language = 'en' | 'zh';

type MarketplaceSummary = (skills: number, repos: number) => string;
type NamedText = (name: string) => string;
type ByAuthorText = (author: string) => string;

type StringsShape = {
  app: {
    initializing: string;
  };
  sidebar: {
    local: string;
    marketplace: string;
    settings: string;
  };
  platform: {
    claude: string;
    codex: string;
    gemini: string;
  };
  header: {
    addSkillTitle: string;
    refreshTitle: string;
    searchPlaceholder: string;
  };
  localView: {
    addSkillTitle: (platformLabel: string) => string;
    addSkillDescription: string;
    addSkillPlaceholder: string;
    cancel: string;
    install: string;
    installing: string;
  };
  statistics: {
    total: string;
    correct: string;
    warning: string;
    error: string;
  };
  skillsTree: {
    title: string;
    noData: string;
    noSkillsFound: string;
    overridden: string;
  };
  detail: {
    emptyState: string;
    verified: string;
    reveal: string;
    open: string;
    validationIssues: string;
    skillStructure: string;
    loadingFiles: string;
    resources: string;
    version: string;
    license: string;
    model: string;
    context: string;
    fallbackVersion: string;
    fallbackLicense: string;
    fallbackModel: string;
    fallbackContext: string;
    installTo: string;
    installTitle: string;
    installDescription: NamedText;
    installTarget: string;
    installFailed: string;
  };
  settings: {
    title: string;
    appearance: string;
    theme: string;
    themeDescription: string;
    themeOptions: {
      system: string;
      dark: string;
      light: string;
    };
    language: string;
    languageDescription: string;
    languageOptions: {
      en: string;
      zh: string;
    };
    skillPaths: string;
    claudePath: string;
    claudePathDescription: string;
    claudePathPlaceholder: string;
    codexPath: string;
    codexPathDescription: string;
    codexPathPlaceholder: string;
    geminiPath: string;
    geminiPathDescription: string;
    geminiPathPlaceholder: string;
    preferences: string;
    autoRefresh: string;
    autoRefreshDescription: string;
    notifications: string;
    notificationsDescription: string;
    marketplace: string;
    skillsRepoLabel: string;
    skillsRepoDescription: string;
    openSkillsRepo: string;
    openError: string;
    marketplaceSkillsLabel: string;
    marketplaceSkillsDescription: string;
    loading: string;
    versionLine: string;
    copyright: string;
  };
  errors: {
    unknown: string;
    installFailed: string;
    loadFilesFailed: string;
  };
  tree: {
    claude: {
      personalTitle: string;
      personalDescription: string;
      projectTitle: string;
      projectDescription: string;
      nestedTitle: string;
      pluginTitle: string;
      pluginDescription: string;
    };
    codex: {
      repoTitle: string;
      repoDescription: string;
      userTitle: string;
      userDescription: string;
      systemTitle: string;
      systemDescription: string;
    };
    gemini: {
      personalTitle: string;
      personalDescription: string;
      projectTitle: string;
      projectDescription: string;
      pluginTitle: string;
    };
  };
  marketplace: {
    title: string;
    summary: MarketplaceSummary;
    searchPlaceholder: string;
    columnName: string;
    columnDescription: string;
    loading: string;
    noMatch: string;
    untitled: string;
    unknownAuthor: string;
    errorReadCache: string;
    errorRefresh: string;
    errorInstall: string;
    syncReadingCache: string;
    syncFetching: string;
    syncUpdated: (count: number) => string;
    syncFailed: string;
    syncStageIdle: string;
    syncStageCache: string;
    syncStageFetch: string;
    syncStageMerge: string;
    syncStageDone: string;
    syncStageError: string;
    syncStageCacheShort: string;
    syncStageFetchShort: string;
    syncStageMergeShort: string;
    syncCacheLoaded: (count: number) => string;
    syncUpdatedAt: (time: string) => string;
    syncButton: string;
    syncButtonUpdating: string;
    byAuthor: ByAuthorText;
    local: string;
    installed: string;
    installing: string;
    install: string;
    loadMore: string;
    loadAll: string;
    paginationStatus: (shown: number, total: number, page: number, pages: number) => string;
    description: string;
    tags: string;
    repository: string;
    starsLabel: string;
    installButton: string;
    localSkill: string;
    installModalTitle: string;
    installModalDescription: NamedText;
    cancel: string;
  };
};

export const STRINGS: Record<Language, StringsShape> = {
  en: {
    app: {
      initializing: 'Initializing Conduct...',
    },
    sidebar: {
      local: 'Local Skills',
      marketplace: 'Marketplace',
      settings: 'Settings',
    },
    platform: {
      claude: 'Claude Code',
      codex: 'Codex',
      gemini: 'Gemini',
    },
    header: {
      addSkillTitle: 'Add Skill',
      refreshTitle: 'Refresh',
      searchPlaceholder: 'Search skills...',
    },
    localView: {
      addSkillTitle: (platformLabel) => `Add Skill to ${platformLabel}`,
      addSkillDescription: 'Enter the Git URL of the skill repository.',
      addSkillPlaceholder: 'https://github.com/user/repo.git',
      cancel: 'Cancel',
      install: 'Install',
      installing: 'Installing...',
    },
    statistics: {
      total: 'Total Skills',
      correct: 'Correct',
      warning: 'Warning',
      error: 'Error',
    },
    skillsTree: {
      title: 'Skills Tree',
      noData: 'No data available',
      noSkillsFound: 'No skills found',
      overridden: 'Overridden',
    },
    detail: {
      emptyState: 'Select a Skill from the tree to view details',
      verified: 'Verified',
      reveal: 'Reveal',
      open: 'Open',
      validationIssues: 'Validation Issues',
      skillStructure: 'Skill Structure',
      loadingFiles: 'Loading files...',
      resources: 'Resources',
      version: 'Version',
      license: 'License',
      model: 'Model',
      context: 'Context',
      fallbackVersion: '1.0.0',
      fallbackLicense: 'MIT',
      fallbackModel: 'default',
      fallbackContext: 'inline',
      installTo: 'Replicate Skill',
      installTitle: 'Replicate Skill',
      installDescription: (name) => `Replicate "${name}" to another CLI.`,
      installTarget: 'Select a target CLI',
      installFailed: 'Replication failed',
    },
    settings: {
      title: 'Settings',
      appearance: 'Appearance',
      theme: 'Theme',
      themeDescription: 'Select the application interface theme',
      themeOptions: {
        system: 'System',
        dark: 'Dark',
        light: 'Light',
      },
      language: 'Language',
      languageDescription: 'Interface language',
      languageOptions: {
        en: 'English',
        zh: '中文 (简体)',
      },
      skillPaths: 'Skill Paths',
      claudePath: 'Claude Skills Path',
      claudePathDescription: 'Custom root directory for Claude skills',
      claudePathPlaceholder: '~/.claude/skills',
      codexPath: 'Codex Skills Path',
      codexPathDescription: 'Custom root directory for Codex skills',
      codexPathPlaceholder: '~/.codex/skills',
      geminiPath: 'Gemini Skills Path',
      geminiPathDescription: 'Custom root directory for Gemini skills',
      geminiPathPlaceholder: '~/.gemini/skills',
      preferences: 'Preferences',
      autoRefresh: 'Auto-refresh on focus',
      autoRefreshDescription: 'Refresh skills list when window gains focus',
      notifications: 'Notifications',
      notificationsDescription: 'Show system notifications for skill updates',
      marketplace: 'Marketplace',
      skillsRepoLabel: 'skills_repo.json',
      skillsRepoDescription: 'Marketplace repository list (read-only path)',
      openSkillsRepo: 'Open',
      openError: 'Failed to open skills_repo.json',
      marketplaceSkillsLabel: 'Marketplace Skills',
      marketplaceSkillsDescription: 'Current marketplace skill count (cached)',
      loading: 'Loading',
      versionLine: 'Conduct v1.0.0',
      copyright: '© 2026 Conduct Team. MIT License.',
    },
    errors: {
      unknown: 'Unknown error',
      installFailed: 'Install failed',
      loadFilesFailed: 'Failed to load skill files',
    },
    tree: {
      claude: {
        personalTitle: 'Personal Skills',
        personalDescription: '~/.claude/skills/',
        projectTitle: 'Project Skills',
        projectDescription: '.claude/skills/',
        nestedTitle: 'Nested',
        pluginTitle: 'Plugin Skills',
        pluginDescription: '~/.claude/plugins/',
      },
      codex: {
        repoTitle: '仓库 Skills',
        repoDescription: '.codex/skills (Current/Parent/Root)',
        userTitle: '用户全局 Skills',
        userDescription: '~/.codex/skills/',
        systemTitle: '系统/管理员 Skills',
        systemDescription: '/etc/codex/skills/',
      },
      gemini: {
        personalTitle: '用户 Skills',
        personalDescription: '~/.gemini/skills/',
        projectTitle: '工作区 Skills',
        projectDescription: '.gemini/skills/',
        pluginTitle: '扩展 Skills',
      },
    },
    marketplace: {
      title: 'Skills Marketplace',
      summary: (skills, repos) => `Skills: ${skills} · Repos: ${repos}`,
      searchPlaceholder: "Search for skills (e.g., 'Docker', 'Refactoring')...",
      columnName: 'Skill Name',
      columnDescription: 'Description',
      loading: 'Loading marketplace...',
      noMatch: 'No skills match your search.',
      untitled: 'Untitled',
      unknownAuthor: 'Unknown',
      errorReadCache: 'Failed to read marketplace cache',
      errorRefresh: 'Failed to refresh marketplace',
      errorInstall: 'Install failed',
      syncReadingCache: 'Reading marketplace cache...',
      syncFetching: 'Updating from skills_repo.json...',
      syncUpdated: (count) => `Updated · ${count} skills`,
      syncFailed: 'Marketplace update failed',
      syncStageIdle: 'Marketplace idle',
      syncStageCache: 'Reading cache',
      syncStageFetch: 'Fetching repositories',
      syncStageMerge: 'Refreshing list',
      syncStageDone: 'Marketplace updated',
      syncStageError: 'Marketplace error',
      syncStageCacheShort: 'Cache',
      syncStageFetchShort: 'Fetch',
      syncStageMergeShort: 'Update',
      syncCacheLoaded: (count) => `Cache · ${count} skills`,
      syncUpdatedAt: (time) => `Updated at ${time}`,
      syncButton: 'Update now',
      syncButtonUpdating: 'Updating...',
      byAuthor: (author) => `by ${author}`,
      local: 'Local',
      installed: 'Installed',
      installing: 'Installing...',
      install: 'Install',
      loadMore: 'Load more',
      loadAll: 'Show all',
      paginationStatus: (shown, total, page, pages) => `Showing ${shown}/${total} · Page ${page}/${pages}`,
      description: 'Description',
      tags: 'Tags',
      repository: 'Repository',
      starsLabel: 'stars',
      installButton: 'Install Skill',
      localSkill: 'Local Skill',
      installModalTitle: 'Install Skill',
      installModalDescription: (name) => `Choose a target CLI for ${name}.`,
      cancel: 'Cancel',
    },
  },
  zh: {
    app: {
      initializing: '正在初始化 Conduct...',
    },
    sidebar: {
      local: '本地技能',
      marketplace: '技能市场',
      settings: '设置',
    },
    platform: {
      claude: 'Claude Code',
      codex: 'Codex',
      gemini: 'Gemini',
    },
    header: {
      addSkillTitle: '添加技能',
      refreshTitle: '刷新',
      searchPlaceholder: '搜索技能...',
    },
    localView: {
      addSkillTitle: (platformLabel) => `安装技能到 ${platformLabel}`,
      addSkillDescription: '输入技能仓库的 Git URL。',
      addSkillPlaceholder: 'https://github.com/user/repo.git',
      cancel: '取消',
      install: '安装',
      installing: '安装中...',
    },
    statistics: {
      total: '技能总数',
      correct: '正确',
      warning: '警告',
      error: '错误',
    },
    skillsTree: {
      title: '技能树',
      noData: '暂无数据',
      noSkillsFound: '未找到技能',
      overridden: '被覆盖',
    },
    detail: {
      emptyState: '从左侧选择一个技能查看详情',
      verified: '已验证',
      reveal: '显示',
      open: '打开',
      validationIssues: '校验问题',
      skillStructure: '技能结构',
      loadingFiles: '加载文件中...',
      resources: '资源',
      version: '版本',
      license: '许可证',
      model: '模型',
      context: '上下文',
      fallbackVersion: '1.0.0',
      fallbackLicense: 'MIT',
      fallbackModel: 'default',
      fallbackContext: 'inline',
      installTo: '复刻技能',
      installTitle: '复刻技能',
      installDescription: (name) => `将 "${name}" 复刻到其他 CLI。`,
      installTarget: '选择目标 CLI',
      installFailed: '复刻失败',
    },
    settings: {
      title: '设置',
      appearance: '外观',
      theme: '主题',
      themeDescription: '选择应用界面主题',
      themeOptions: {
        system: '系统',
        dark: '深色',
        light: '浅色',
      },
      language: '语言',
      languageDescription: '界面语言',
      languageOptions: {
        en: 'English',
        zh: '中文 (简体)',
      },
      skillPaths: '技能路径',
      claudePath: 'Claude 技能路径',
      claudePathDescription: 'Claude 技能的自定义根目录',
      claudePathPlaceholder: '~/.claude/skills',
      codexPath: 'Codex 技能路径',
      codexPathDescription: 'Codex 技能的自定义根目录',
      codexPathPlaceholder: '~/.codex/skills',
      geminiPath: 'Gemini 技能路径',
      geminiPathDescription: 'Gemini 技能的自定义根目录',
      geminiPathPlaceholder: '~/.gemini/skills',
      preferences: '偏好设置',
      autoRefresh: '聚焦自动刷新',
      autoRefreshDescription: '窗口获得焦点时刷新技能列表',
      notifications: '通知',
      notificationsDescription: '显示技能更新的系统通知',
      marketplace: '市场',
      skillsRepoLabel: 'skills_repo.json',
      skillsRepoDescription: '市场仓库列表（只读路径）',
      openSkillsRepo: '打开',
      openError: '打开 skills_repo.json 失败',
      marketplaceSkillsLabel: '市场技能数量',
      marketplaceSkillsDescription: '当前缓存的市场技能数量',
      loading: '加载中',
      versionLine: 'Conduct v1.0.0',
      copyright: '© 2026 Conduct Team. MIT License.',
    },
    errors: {
      unknown: '未知错误',
      installFailed: '安装失败',
      loadFilesFailed: '读取技能文件失败',
    },
    tree: {
      claude: {
        personalTitle: '个人全局 Skills',
        personalDescription: '~/.claude/skills/',
        projectTitle: '项目级 Skills',
        projectDescription: '.claude/skills/',
        nestedTitle: '嵌套目录',
        pluginTitle: '插件 Skills',
        pluginDescription: '~/.claude/plugins/',
      },
      codex: {
        repoTitle: 'Repository Skills',
        repoDescription: '.codex/skills (Current/Parent/Root)',
        userTitle: 'User Global Skills',
        userDescription: '~/.codex/skills/',
        systemTitle: 'System/Admin Skills',
        systemDescription: '/etc/codex/skills/',
      },
      gemini: {
        personalTitle: 'User Skills',
        personalDescription: '~/.gemini/skills/',
        projectTitle: 'Workspace Skills',
        projectDescription: '.gemini/skills/',
        pluginTitle: 'Extension Skills',
      },
    },
    marketplace: {
      title: '技能市场',
      summary: (skills, repos) => `技能: ${skills} · 仓库: ${repos}`,
      searchPlaceholder: "搜索技能（如 'Docker'、'Refactoring'）...",
      columnName: '技能名称',
      columnDescription: '描述',
      loading: '正在加载市场...',
      noMatch: '没有匹配的技能。',
      untitled: '未命名',
      unknownAuthor: '未知',
      errorReadCache: '读取市场缓存失败',
      errorRefresh: '刷新市场失败',
      errorInstall: '安装失败',
      syncReadingCache: '读取市场缓存中...',
      syncFetching: '正在从 skills_repo.json 更新...',
      syncUpdated: (count) => `已更新 · ${count} 个技能`,
      syncFailed: '市场更新失败',
      syncStageIdle: '市场待命',
      syncStageCache: '读取缓存',
      syncStageFetch: '拉取仓库',
      syncStageMerge: '刷新列表',
      syncStageDone: '市场已更新',
      syncStageError: '市场异常',
      syncStageCacheShort: '缓存',
      syncStageFetchShort: '拉取',
      syncStageMergeShort: '刷新',
      syncCacheLoaded: (count) => `缓存 · ${count} 个技能`,
      syncUpdatedAt: (time) => `更新于 ${time}`,
      syncButton: '手动更新',
      syncButtonUpdating: '更新中...',
      byAuthor: (author) => `作者 ${author}`,
      local: '本地',
      installed: '已安装',
      installing: '安装中...',
      install: '安装',
      loadMore: '加载更多',
      loadAll: '全部显示',
      paginationStatus: (shown, total, page, pages) => `显示 ${shown}/${total} · 第 ${page}/${pages} 页`,
      description: '描述',
      tags: '标签',
      repository: '仓库',
      starsLabel: '星',
      installButton: '安装技能',
      localSkill: '本地技能',
      installModalTitle: '安装技能',
      installModalDescription: (name) => `选择 ${name} 的目标 CLI。`,
      cancel: '取消',
    },
  },
};
