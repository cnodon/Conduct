import * as fs from 'fs/promises';
import * as path from 'path';
import type { SkillLocation, SkillDirectory } from '../types/index.js';

/**
 * Scanner - 扫描并识别 Skill 目录
 */
export class Scanner {
  /**
   * 扫描所有位置
   */
  async scanAll(locations: SkillLocation[]): Promise<SkillDirectory[]> {
    const results = await Promise.all(
      locations.map(location => this.scanLocation(location))
    );

    return results.flat();
  }

  /**
   * 扫描单个位置
   */
  async scanLocation(location: SkillLocation): Promise<SkillDirectory[]> {
    const skillDirs: SkillDirectory[] = [];

    try {
      const entries = await fs.readdir(location.path, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = path.join(location.path, entry.name);
          const skillMdPath = path.join(skillPath, 'SKILL.md');

          // 检查是否存在 SKILL.md
          const hasSkillMd = await this.fileExists(skillMdPath);

          if (hasSkillMd) {
            const supportingFiles = await this.detectSupportingFiles(skillPath);

            skillDirs.push({
              location,
              skillPath,
              hasSkillMd: true,
              supportingFiles,
            });
          }
        }
      }
    } catch (error) {
      // 忽略无法访问的目录
      console.error(`无法扫描目录 ${location.path}:`, error);
    }

    return skillDirs;
  }

  /**
   * 检测支持文件
   */
  private async detectSupportingFiles(skillPath: string): Promise<string[]> {
    const files: string[] = [];

    // 检测常见支持文件
    const supportingFileNames = [
      'reference.md',
      'examples.md',
      'README.md',
      'REFERENCE.md',
      'EXAMPLES.md',
    ];

    for (const fileName of supportingFileNames) {
      const filePath = path.join(skillPath, fileName);
      if (await this.fileExists(filePath)) {
        files.push(fileName);
      }
    }

    // 检测 scripts 目录
    const scriptsPath = path.join(skillPath, 'scripts');
    if (await this.directoryExists(scriptsPath)) {
      files.push('scripts/');
    }

    return files;
  }

  /**
   * 检查文件是否存在
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(filePath);
      return stat.isFile();
    } catch {
      return false;
    }
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
