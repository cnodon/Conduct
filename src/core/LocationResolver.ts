import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { glob } from 'glob';
import type { SkillLocation, SkillPlatform } from '../types/index.js';

/**
 * Location Resolver - 解析所有 Skills 存储位置
 */
export class LocationResolver {
  /**
   * 解析所有 Skills 位置
   */
  async resolveAll(options: {
    platform?: SkillPlatform;
    projectDir?: string;
    includeGlobal?: boolean;
    includeProject?: boolean;
    includePlugin?: boolean;
  } = {}): Promise<SkillLocation[]> {
    const {
      platform = 'claude',
      projectDir = process.cwd(),
      includeGlobal = true,
      includeProject = true,
      includePlugin = true,
    } = options;

    const locations: SkillLocation[] = [];

    // 1. 企业级 Skills (暂不支持，预留)
    // locations.push(...await this.getEnterpriseLocations(platform));

    // 2. 个人全局 Skills
    if (includeGlobal) {
      const personal = await this.getPersonalLocation(platform);
      if (personal) {
        locations.push(personal);
      }
    }

    // 3. 项目级 Skills
    if (includeProject) {
      locations.push(...await this.getProjectLocations(platform, projectDir));
    }

    // 4. 插件 Skills
    if (includePlugin) {
      locations.push(...await this.getPluginLocations(platform));
    }

    return locations;
  }

  /**
   * 获取配置目录名
   */
  private getConfigDirName(platform: SkillPlatform): string {
    switch (platform) {
      case 'claude':
        return '.claude';
      case 'codex':
        return '.codex';
      case 'gemini':
        return '.gemini';
      default:
        return '.claude';
    }
  }

  /**
   * 获取个人全局 Skills 位置
   */
  async getPersonalLocation(platform: SkillPlatform): Promise<SkillLocation | null> {
    const homeDir = os.homedir();
    const configDir = this.getConfigDirName(platform);
    const skillsPath = path.join(homeDir, configDir, 'skills');

    if (await this.directoryExists(skillsPath)) {
      return {
        platform,
        type: 'personal',
        path: skillsPath,
        priority: 2,
      };
    }

    return null;
  }

  /**
   * 获取项目级 Skills 位置（包括嵌套目录）
   */
  async getProjectLocations(platform: SkillPlatform, rootDir: string): Promise<SkillLocation[]> {
    const locations: SkillLocation[] = [];
    const configDir = this.getConfigDirName(platform);

    // Codex 特殊处理: 检查父级目录和 repo root (简化实现: 暂只检查当前目录和父目录)
    // TODO: 实现完整的 Codex 路径查找逻辑

    // 项目根目录
    const projectSkillsPath = path.join(rootDir, configDir, 'skills');
    if (await this.directoryExists(projectSkillsPath)) {
      locations.push({
        platform,
        type: 'project',
        path: projectSkillsPath,
        priority: 3,
      });
    }

    // 嵌套目录搜索
    try {
      const nestedPaths = await this.findNestedSkillDirs(platform, rootDir);
      for (const nestedPath of nestedPaths) {
        locations.push({
          platform,
          type: 'nested',
          path: nestedPath,
          priority: 3,
        });
      }
    } catch (error) {
      // 忽略搜索错误
    }

    return locations;
  }

  /**
   * 查找嵌套的 skills 目录
   */
  private async findNestedSkillDirs(platform: SkillPlatform, rootDir: string): Promise<string[]> {
    const configDir = this.getConfigDirName(platform);
    
    // 搜索模式: packages/*/.claude/skills, modules/*/.claude/skills 等
    const patterns = [
      `packages/*/${configDir}/skills`,
      `modules/*/${configDir}/skills`,
      `apps/*/${configDir}/skills`,
      `libs/*/${configDir}/skills`,
    ];

    const nestedDirs: string[] = [];

    for (const pattern of patterns) {
      try {
        const matches = await glob(pattern, {
          cwd: rootDir,
          absolute: true,
          ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
        });

        for (const match of matches) {
          if (await this.directoryExists(match)) {
            nestedDirs.push(match);
          }
        }
      } catch (error) {
        // 忽略单个模式的错误
      }
    }

    return nestedDirs;
  }

  /**
   * 获取插件 Skills 位置
   */
  async getPluginLocations(platform: SkillPlatform): Promise<SkillLocation[]> {
    const homeDir = os.homedir();
    const configDir = this.getConfigDirName(platform);
    const pluginsPath = path.join(homeDir, configDir, 'plugins');

    if (!(await this.directoryExists(pluginsPath))) {
      return [];
    }

    const locations: SkillLocation[] = [];

    try {
      const pluginDirs = await fs.readdir(pluginsPath, { withFileTypes: true });

      for (const dirent of pluginDirs) {
        if (dirent.isDirectory()) {
          const skillsPath = path.join(pluginsPath, dirent.name, 'skills');
          if (await this.directoryExists(skillsPath)) {
            locations.push({
              platform,
              type: 'plugin',
              path: skillsPath,
              priority: 4,
            });
          }
        }
      }
    } catch (error) {
      // 忽略读取错误
    }

    return locations;
  }

  /**
   * 检查目录是否存在
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }
}
