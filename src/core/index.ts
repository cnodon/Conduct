import { LocationResolver } from './LocationResolver.js';
import { Scanner } from './Scanner.js';
import { Parser } from './Parser.js';
import { Validator } from './Validator.js';
import { ConflictAnalyzer } from './ConflictAnalyzer.js';
import { Reporter } from './Reporter.js';
import type { ScanOptions, ScanReport, ParsedSkill } from '../types/index.js';

/**
 * Conduct Core Engine - 核心引擎
 */
export class ConductEngine {
  private locationResolver: LocationResolver;
  private scanner: Scanner;
  private parser: Parser;
  private validator: Validator;
  private conflictAnalyzer: ConflictAnalyzer;
  private reporter: Reporter;

  constructor() {
    this.locationResolver = new LocationResolver();
    this.scanner = new Scanner();
    this.parser = new Parser();
    this.validator = new Validator();
    this.conflictAnalyzer = new ConflictAnalyzer();
    this.reporter = new Reporter();
  }

  /**
   * 扫描并分析所有 Skills
   */
  async scan(options: ScanOptions = {}): Promise<{
    skills: ParsedSkill[];
    report: ScanReport;
  }> {
    // 1. 解析位置
    const locations = await this.locationResolver.resolveAll({
      platform: options.platform,
      projectDir: options.projectDir,
      includeGlobal: options.includeGlobal ?? true,
      includeProject: options.includeProject ?? true,
      includePlugin: options.includePlugin ?? true,
    });

    if (options.verbose) {
      console.log(`找到 ${locations.length} 个 Skills 位置`);
    }

    // 2. 扫描 Skills
    const skillDirs = await this.scanner.scanAll(locations);

    if (options.verbose) {
      console.log(`扫描到 ${skillDirs.length} 个 Skills`);
    }

    // 3. 解析 Skills
    const parsedSkills = await this.parser.parseAll(skillDirs);

    if (options.verbose) {
      console.log(`成功解析 ${parsedSkills.length} 个 Skills`);
    }

    // 4. 验证 Skills
    const validatedSkills = this.validator.validateAll(parsedSkills);

    // 5. 分析冲突
    const { conflicts, skillsWithOverrides } = this.conflictAnalyzer.analyze(validatedSkills);

    if (options.verbose && conflicts.length > 0) {
      console.log(`发现 ${conflicts.length} 个 Skills 冲突`);
    }

    // 6. 生成报告
    const report = this.reporter.generateReport(skillsWithOverrides, conflicts);

    return {
      skills: skillsWithOverrides,
      report,
    };
  }
}

// 导出所有核心模块
export { LocationResolver } from './LocationResolver.js';
export { Scanner } from './Scanner.js';
export { Parser } from './Parser.js';
export { Validator } from './Validator.js';
export { ConflictAnalyzer } from './ConflictAnalyzer.js';
export { Reporter } from './Reporter.js';
