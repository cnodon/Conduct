import chalk from 'chalk';
import type {
  ParsedSkill,
  SkillConflict,
  Statistics,
  ScanReport,
  ReportFormat,
} from '../types/index.js';

/**
 * Reporter - 生成报告
 */
export class Reporter {
  /**
   * 生成完整报告
   */
  generateReport(
    skills: ParsedSkill[],
    conflicts: SkillConflict[]
  ): ScanReport {
    return {
      summary: this.generateStatistics(skills, conflicts),
      byLocation: this.groupByLocation(skills),
      validationIssues: this.summarizeValidationIssues(skills),
      conflicts,
      recommendations: this.generateRecommendations(skills, conflicts),
    };
  }

  /**
   * 生成统计信息
   */
  private generateStatistics(
    skills: ParsedSkill[],
    conflicts: SkillConflict[]
  ): Statistics {
    const valid = skills.filter(s => s.validationResult.valid).length;
    const withWarnings = skills.filter(
      s => s.validationResult.warnings.length > 0
    ).length;
    const withErrors = skills.filter(
      s => !s.validationResult.valid
    ).length;

    return {
      total: skills.length,
      valid,
      warnings: withWarnings,
      errors: withErrors,
      byLocation: {
        enterprise: skills.filter(s => s.location.type === 'enterprise').length,
        personal: skills.filter(s => s.location.type === 'personal').length,
        project: skills.filter(s => s.location.type === 'project').length,
        nested: skills.filter(s => s.location.type === 'nested').length,
        plugin: skills.filter(s => s.location.type === 'plugin').length,
      },
      conflicts: conflicts.length,
    };
  }

  /**
   * 按位置分组
   */
  private groupByLocation(skills: ParsedSkill[]) {
    return {
      enterprise: skills.filter(s => s.location.type === 'enterprise'),
      personal: skills.filter(s => s.location.type === 'personal'),
      project: skills.filter(s => s.location.type === 'project'),
      nested: skills.filter(s => s.location.type === 'nested'),
      plugin: skills.filter(s => s.location.type === 'plugin'),
    };
  }

  /**
   * 汇总验证问题
   */
  private summarizeValidationIssues(skills: ParsedSkill[]) {
    return skills
      .filter(
        skill =>
          skill.validationResult.errors.length > 0 ||
          skill.validationResult.warnings.length > 0
      )
      .map(skill => ({
        skill: skill.metadata.name,
        errors: skill.validationResult.errors,
        warnings: skill.validationResult.warnings,
      }));
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    skills: ParsedSkill[],
    conflicts: SkillConflict[]
  ): string[] {
    const recommendations: string[] = [];

    // 错误建议
    const skillsWithErrors = skills.filter(s => !s.validationResult.valid);
    if (skillsWithErrors.length > 0) {
      recommendations.push(
        `修复 ${skillsWithErrors.length} 个配置错误的 Skills`
      );
    }

    // 冲突建议
    if (conflicts.length > 0) {
      recommendations.push(
        `解决 ${conflicts.length} 个同名 Skills 冲突，考虑重命名或删除低优先级的 Skills`
      );
    }

    // 描述太短的建议
    const shortDescriptions = skills.filter(
      s => s.metadata.description && s.metadata.description.length < 50
    );
    if (shortDescriptions.length > 0) {
      recommendations.push(
        `优化 ${shortDescriptions.length} 个 Skills 的 description，使其更详细以提高触发准确性`
      );
    }

    return recommendations;
  }

  /**
   * 格式化为终端输出
   */
  formatAsTerminal(report: ScanReport): string {
    const lines: string[] = [];

    // 标题
    lines.push('');
    lines.push(chalk.bold.blue('📊 Claude Code Skills 配置报告'));
    lines.push(chalk.gray('━'.repeat(60)));
    lines.push('');

    // 统计概览
    lines.push(chalk.bold('统计概览:'));
    lines.push(`  总计: ${chalk.cyan(report.summary.total)}`);
    lines.push(`  ${chalk.green('✅')} 配置正确: ${chalk.green(report.summary.valid)}`);
    lines.push(`  ${chalk.yellow('⚠️')}  警告: ${chalk.yellow(report.summary.warnings)}`);
    lines.push(`  ${chalk.red('❌')} 错误: ${chalk.red(report.summary.errors)}`);
    lines.push('');

    // 按位置统计
    lines.push(chalk.bold('按位置分布:'));
    lines.push(`  🌐 个人全局: ${report.summary.byLocation.personal}`);
    lines.push(`  📁 项目级: ${report.summary.byLocation.project}`);
    lines.push(`  📂 嵌套目录: ${report.summary.byLocation.nested}`);
    lines.push(`  🔌 插件: ${report.summary.byLocation.plugin}`);
    lines.push('');

    // 验证问题
    if (report.validationIssues.length > 0) {
      lines.push(chalk.bold.red('验证问题:'));
      for (const issue of report.validationIssues) {
        lines.push(`  ${chalk.red('❌')} ${chalk.bold(issue.skill)}`);

        for (const error of issue.errors) {
          lines.push(`     ${chalk.red(`[错误]`)} ${error.message}`);
        }

        for (const warning of issue.warnings) {
          lines.push(`     ${chalk.yellow(`[警告]`)} ${warning.message}`);
        }
      }
      lines.push('');
    }

    // 冲突
    if (report.conflicts.length > 0) {
      lines.push(chalk.bold.yellow('⚠️  发现 Skills 冲突:'));
      for (const conflict of report.conflicts) {
        lines.push(`  ${chalk.bold(conflict.name)}`);
        for (const instance of conflict.instances) {
          const icon = instance.active ? chalk.green('✅ 生效') : chalk.gray('🔄 覆盖');
          lines.push(`    ${icon}: ${instance.path}`);
        }
      }
      lines.push('');
    }

    // 建议
    if (report.recommendations.length > 0) {
      lines.push(chalk.bold.cyan('💡 建议:'));
      for (const rec of report.recommendations) {
        lines.push(`  • ${rec}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * 格式化为 JSON
   */
  formatAsJSON(report: ScanReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * 格式化为 Markdown
   */
  formatAsMarkdown(report: ScanReport): string {
    const lines: string[] = [];

    lines.push('# Claude Code Skills 配置报告');
    lines.push('');

    // 统计概览
    lines.push('## 统计概览');
    lines.push('');
    lines.push(`- **总计 Skills**: ${report.summary.total}`);
    lines.push(`- **✅ 配置正确**: ${report.summary.valid}`);
    lines.push(`- **⚠️ 警告**: ${report.summary.warnings}`);
    lines.push(`- **❌ 错误**: ${report.summary.errors}`);
    lines.push('');

    // 按位置分布
    lines.push('## 按位置分布');
    lines.push('');
    lines.push('| 位置 | 数量 |');
    lines.push('|------|------|');
    lines.push(`| 🌐 个人全局 | ${report.summary.byLocation.personal} |`);
    lines.push(`| 📁 项目级 | ${report.summary.byLocation.project} |`);
    lines.push(`| 📂 嵌套目录 | ${report.summary.byLocation.nested} |`);
    lines.push(`| 🔌 插件 | ${report.summary.byLocation.plugin} |`);
    lines.push('');

    // 验证问题
    if (report.validationIssues.length > 0) {
      lines.push('## 验证问题');
      lines.push('');
      for (const issue of report.validationIssues) {
        lines.push(`### ❌ ${issue.skill}`);
        lines.push('');

        if (issue.errors.length > 0) {
          lines.push('**错误:**');
          for (const error of issue.errors) {
            lines.push(`- [${error.field}] ${error.message}`);
          }
          lines.push('');
        }

        if (issue.warnings.length > 0) {
          lines.push('**警告:**');
          for (const warning of issue.warnings) {
            lines.push(`- [${warning.field}] ${warning.message}`);
          }
          lines.push('');
        }
      }
    }

    // 冲突
    if (report.conflicts.length > 0) {
      lines.push('## ⚠️ Skills 冲突');
      lines.push('');
      for (const conflict of report.conflicts) {
        lines.push(`### ${conflict.name}`);
        lines.push('');
        for (const instance of conflict.instances) {
          const status = instance.active ? '✅ 生效' : '🔄 被覆盖';
          lines.push(`- ${status}: \`${instance.path}\``);
        }
        lines.push('');
      }
    }

    // 建议
    if (report.recommendations.length > 0) {
      lines.push('## 💡 建议');
      lines.push('');
      for (const rec of report.recommendations) {
        lines.push(`- ${rec}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * 格式化输出
   */
  format(report: ScanReport, format: ReportFormat): string {
    switch (format) {
      case 'json':
        return this.formatAsJSON(report);
      case 'markdown':
        return this.formatAsMarkdown(report);
      case 'terminal':
      default:
        return this.formatAsTerminal(report);
    }
  }
}
