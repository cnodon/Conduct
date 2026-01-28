import * as fs from 'fs/promises';
import * as path from 'path';
import yaml from 'js-yaml';
import type { SkillDirectory, ParsedSkill, SkillMetadata } from '../types/index.js';

/**
 * Parser - 解析 SKILL.md 文件
 */
export class Parser {
  /**
   * 解析所有 Skills
   */
  async parseAll(skillDirs: SkillDirectory[]): Promise<ParsedSkill[]> {
    const results = await Promise.all(
      skillDirs.map(dir => this.parseSkill(dir))
    );

    return results.filter((skill): skill is ParsedSkill => skill !== null);
  }

  /**
   * 解析单个 Skill
   */
  async parseSkill(skillDir: SkillDirectory): Promise<ParsedSkill | null> {
    const skillMdPath = path.join(skillDir.skillPath, 'SKILL.md');

    try {
      const content = await fs.readFile(skillMdPath, 'utf-8');
      const { metadata, markdownContent, rawYaml } = this.extractFrontmatter(content);

      return {
        location: skillDir.location,
        skillPath: skillDir.skillPath,
        metadata,
        content: markdownContent,
        rawYaml,
        supportingFiles: skillDir.supportingFiles,
        validationResult: {
          valid: true,
          errors: [],
          warnings: [],
        },
      };
    } catch (error) {
      console.error(`解析 Skill 失败 ${skillMdPath}:`, error);
      return null;
    }
  }

  /**
   * 提取 YAML frontmatter
   */
  private extractFrontmatter(content: string): {
    metadata: SkillMetadata;
    markdownContent: string;
    rawYaml: string;
  } {
    // 匹配 YAML frontmatter (以 --- 包裹)
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      throw new Error('缺少 YAML frontmatter');
    }

    const rawYaml = match[1];
    const markdownContent = content.slice(match[0].length).trim();

    // 解析 YAML
    let metadata: SkillMetadata;
    try {
      const parsed = yaml.load(rawYaml) as Record<string, unknown>;
      metadata = this.normalizeMetadata(parsed);
    } catch (error) {
      throw new Error(`YAML 解析失败: ${error}`);
    }

    return { metadata, markdownContent, rawYaml };
  }

  /**
   * 规范化元数据
   */
  private normalizeMetadata(data: Record<string, unknown>): SkillMetadata {
    return {
      name: String(data.name || ''),
      description: String(data.description || ''),
      allowedTools: this.normalizeStringArray(data['allowed-tools'] || data.allowedTools),
      model: data.model ? String(data.model) : undefined,
      context: this.normalizeContext(data.context),
      agent: this.normalizeAgent(data.agent),
      hooks: this.normalizeHooks(data.hooks),
      userInvocable: data['user-invocable'] !== undefined
        ? Boolean(data['user-invocable'])
        : data.userInvocable !== undefined
        ? Boolean(data.userInvocable)
        : undefined,
    };
  }

  /**
   * 规范化字符串数组
   */
  private normalizeStringArray(value: unknown): string[] | undefined {
    if (!value) return undefined;
    if (Array.isArray(value)) {
      return value.map(v => String(v));
    }
    if (typeof value === 'string') {
      return value.split(',').map(s => s.trim());
    }
    return undefined;
  }

  /**
   * 规范化 context 字段
   */
  private normalizeContext(value: unknown): 'fork' | 'inline' | undefined {
    if (value === 'fork' || value === 'inline') {
      return value;
    }
    return undefined;
  }

  /**
   * 规范化 agent 字段
   */
  private normalizeAgent(value: unknown): 'Explore' | 'Plan' | 'general-purpose' | undefined {
    if (value === 'Explore' || value === 'Plan' || value === 'general-purpose') {
      return value;
    }
    return undefined;
  }

  /**
   * 规范化 hooks 字段
   */
  private normalizeHooks(value: unknown): SkillMetadata['hooks'] | undefined {
    if (!value || typeof value !== 'object') return undefined;

    const hooks = value as Record<string, unknown>;
    return {
      PreToolUse: hooks.PreToolUse ? String(hooks.PreToolUse) : undefined,
      PostToolUse: hooks.PostToolUse ? String(hooks.PostToolUse) : undefined,
      Stop: hooks.Stop ? String(hooks.Stop) : undefined,
    };
  }
}
