/**
 * Conduct 核心类型定义
 */

/**
 * Skill 平台类型
 */
export type SkillPlatform = 'claude' | 'codex' | 'gemini';

/**
 * Skill 存储位置类型
 */
export type SkillLocationType = 
  | 'enterprise' 
  | 'personal' 
  | 'project' 
  | 'nested' 
  | 'plugin'
  | 'repo'
  | 'user'
  | 'admin'
  | 'system';

/**
 * Skill 位置信息
 */
export interface SkillLocation {
  /** 平台类型 */
  platform: SkillPlatform;
  /** 位置类型 */
  type: SkillLocationType;
  /** 文件系统路径 */
  path: string;
  /** 优先级 (1-5, 1最高) */
  priority: number;
}

/**
 * Skill 元数据 (YAML frontmatter)
 */
export interface SkillMetadata {
  /** Skill 名称 (必需) */
  name: string;
  /** Skill 描述 (必需) */
  description: string;
  /** 版本 */
  version?: string;
  /** 许可证 */
  license?: string;
  /** 允许使用的工具列表 */
  allowedTools?: string[];
  /** 指定的 Claude 模型 */
  model?: string;
  /** 上下文模式 */
  context?: 'fork' | 'inline';
  /** 子代理类型 */
  agent?: 'Explore' | 'Plan' | 'general-purpose';
  /** 事件钩子 */
  hooks?: {
    PreToolUse?: string;
    PostToolUse?: string;
    Stop?: string;
  };
  /** 用户可调用性 */
  userInvocable?: boolean;
}

/**
 * 验证错误/警告
 */
export interface ValidationError {
  /** 字段名称 */
  field: string;
  /** 错误消息 */
  message: string;
  /** 严重级别 */
  severity: 'error' | 'warning';
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误列表 */
  errors: ValidationError[];
  /** 警告列表 */
  warnings: ValidationError[];
}

/**
 * 解析后的 Skill
 */
export interface ParsedSkill {
  /** 位置信息 */
  location: SkillLocation;
  /** Skill 目录路径 */
  skillPath: string;
  /** 元数据 */
  metadata: SkillMetadata;
  /** Markdown 内容 */
  content: string;
  /** 原始 YAML */
  rawYaml: string;
  /** 支持文件列表 */
  supportingFiles: string[];
  /** 验证结果 */
  validationResult: ValidationResult;
  /** 是否被覆盖 */
  isOverridden?: boolean;
}

/**
 * Skill 目录信息
 */
export interface SkillDirectory {
  /** 位置信息 */
  location: SkillLocation;
  /** Skill 目录路径 */
  skillPath: string;
  /** 是否有 SKILL.md */
  hasSkillMd: boolean;
  /** 支持文件列表 */
  supportingFiles: string[];
}

/**
 * Skill 冲突信息
 */
export interface SkillConflict {
  /** Skill 名称 */
  name: string;
  /** 所有实例 */
  instances: Array<{
    location: SkillLocation;
    path: string;
    active: boolean;
  }>;
  /** 实际生效的 Skill 路径 */
  effectiveSkill: string;
}

/**
 * 扫描选项
 */
export interface ScanOptions {
  /** 目标平台 */
  platform?: SkillPlatform;
  /** 项目根目录 */
  projectDir?: string;
  /** 是否扫描全局 Skills */
  includeGlobal?: boolean;
  /** 是否扫描项目 Skills */
  includeProject?: boolean;
  /** 是否扫描插件 Skills */
  includePlugin?: boolean;
  /** 是否详细输出 */
  verbose?: boolean;
}

/**
 * 统计信息
 */
export interface Statistics {
  /** 总数 */
  total: number;
  /** 有效数量 */
  valid: number;
  /** 警告数量 */
  warnings: number;
  /** 错误数量 */
  errors: number;
  /** 按位置统计 */
  byLocation: {
    enterprise: number;
    personal: number;
    project: number;
    nested: number;
    plugin: number;
  };
  /** 冲突数量 */
  conflicts: number;
}

/**
 * Skill 树节点 (GUI)
 */
export interface SkillTreeNode {
  /** 唯一 ID */
  id: string;
  /** 位置类型 */
  type: SkillLocationType;
  /** 名称 */
  name: string;
  /** 路径 */
  path: string;
  /** 状态 */
  status: 'valid' | 'warning' | 'error' | 'overridden';
  /** 子节点 */
  children?: SkillTreeNode[];
  /** 元数据 */
  metadata?: SkillMetadata;
  /** 验证结果 */
  validationResult?: ValidationResult;
  /** 支持文件 */
  supportingFiles?: string[];
}

/**
 * 树形结构节点 (Generic)
 */
export interface TreeSection {
  id: string;
  title: string;
  icon: string;
  path?: string;
  description?: string;
  items: SkillTreeNode[];
  subSections?: TreeSection[];
}

/**
 * Skills 树形数据 (GUI)
 */
export type SkillsTreeData = TreeSection[];

/**
 * 报告格式
 */
export type ReportFormat = 'markdown' | 'json' | 'terminal' | 'html';

/**
 * 扫描结果报告
 */
export interface ScanReport {
  /** 统计信息 */
  summary: Statistics;
  /** 按位置分组的 Skills */
  byLocation: {
    enterprise: ParsedSkill[];
    personal: ParsedSkill[];
    project: ParsedSkill[];
    nested: ParsedSkill[];
    plugin: ParsedSkill[];
  };
  /** 验证问题 */
  validationIssues: Array<{
    skill: string;
    errors: ValidationError[];
    warnings: ValidationError[];
  }>;
  /** 冲突列表 */
  conflicts: SkillConflict[];
  /** 建议 */
  recommendations: string[];
}
