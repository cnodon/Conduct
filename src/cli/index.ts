#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs/promises';
import { ConductEngine } from '../core/index.js';
import type { ReportFormat } from '../types/index.js';

const program = new Command();

program
  .name('conduct')
  .description('Claude Code Skills 配置扫描和管理工具')
  .version('1.0.0');

// scan 命令
program
  .command('scan')
  .description('扫描并分析 Claude Code Skills 配置')
  .option('-p, --project <path>', '项目目录路径', process.cwd())
  .option('--global-only', '仅扫描全局 Skills')
  .option('--project-only', '仅扫描项目 Skills')
  .option('--no-global', '不扫描全局 Skills')
  .option('--no-project', '不扫描项目 Skills')
  .option('--no-plugin', '不扫描插件 Skills')
  .option('-f, --format <format>', '输出格式 (terminal, json, markdown)', 'terminal')
  .option('-o, --output <file>', '输出到文件')
  .option('--errors-only', '仅显示错误')
  .option('-v, --verbose', '详细输出')
  .action(async (options) => {
    const spinner = ora('正在扫描 Skills...').start();

    try {
      const engine = new ConductEngine();

      // 处理选项
      const scanOptions = {
        platform: 'claude' as const,
        projectDir: options.project,
        includeGlobal: options.globalOnly ? true : options.global !== false,
        includeProject: options.projectOnly ? true : options.project !== false,
        includePlugin: options.plugin !== false,
        verbose: options.verbose,
      };

      // 执行扫描
      const { report } = await engine.scan(scanOptions);

      spinner.succeed('扫描完成');

      // 过滤仅错误
      if (options.errorsOnly) {
        report.validationIssues = report.validationIssues.filter(
          issue => issue.errors.length > 0
        );
      }

      // 格式化输出
      const engine2 = new ConductEngine();
      const reporter = (engine2 as any).reporter;
      const format = options.format as ReportFormat;
      const output = reporter.format(report, format);

      // 输出
      if (options.output) {
        await fs.writeFile(options.output, output, 'utf-8');
        console.log(chalk.green(`✅ 报告已保存到: ${options.output}`));
      } else {
        console.log(output);
      }

      // 退出码
      if (report.summary.errors > 0) {
        process.exit(1);
      }
    } catch (error) {
      spinner.fail('扫描失败');
      console.error(chalk.red('错误:'), error);
      process.exit(1);
    }
  });

// codex-scan 命令
program
  .command('codex-scan')
  .description('扫描并分析 Codex Skills 配置')
  .option('-p, --project <path>', '项目目录路径', process.cwd())
  .option('-f, --format <format>', '输出格式 (terminal, json, markdown)', 'terminal')
  .option('-o, --output <file>', '输出到文件')
  .option('--errors-only', '仅显示错误')
  .option('-v, --verbose', '详细输出')
  .action(async (options) => {
    const spinner = ora('正在扫描 Codex Skills...').start();

    try {
      const engine = new ConductEngine();

      const scanOptions = {
        platform: 'codex' as const,
        projectDir: options.project,
        includeGlobal: true,
        includeProject: true,
        includePlugin: true,
        verbose: options.verbose,
      };

      const { report } = await engine.scan(scanOptions);

      spinner.succeed('扫描完成');

      if (options.errorsOnly) {
        report.validationIssues = report.validationIssues.filter(
          issue => issue.errors.length > 0
        );
      }

      const engine2 = new ConductEngine();
      const reporter = (engine2 as any).reporter;
      const format = options.format as ReportFormat;
      const output = reporter.format(report, format);

      if (options.output) {
        await fs.writeFile(options.output, output, 'utf-8');
        console.log(chalk.green(`✅ 报告已保存到: ${options.output}`));
      } else {
        console.log(output);
      }

      if (report.summary.errors > 0) {
        process.exit(1);
      }
    } catch (error) {
      spinner.fail('扫描失败');
      console.error(chalk.red('错误:'), error);
      process.exit(1);
    }
  });

// gemini-scan 命令
program
  .command('gemini-scan')
  .description('扫描并分析 Gemini Skills 配置')
  .option('-p, --project <path>', '项目目录路径', process.cwd())
  .option('-f, --format <format>', '输出格式 (terminal, json, markdown)', 'terminal')
  .option('-o, --output <file>', '输出到文件')
  .option('--errors-only', '仅显示错误')
  .option('-v, --verbose', '详细输出')
  .action(async (options) => {
    const spinner = ora('正在扫描 Gemini Skills...').start();

    try {
      const engine = new ConductEngine();

      const scanOptions = {
        platform: 'gemini' as const,
        projectDir: options.project,
        includeGlobal: true,
        includeProject: true,
        includePlugin: true,
        verbose: options.verbose,
      };

      const { report } = await engine.scan(scanOptions);

      spinner.succeed('扫描完成');

      if (options.errorsOnly) {
        report.validationIssues = report.validationIssues.filter(
          issue => issue.errors.length > 0
        );
      }

      const engine2 = new ConductEngine();
      const reporter = (engine2 as any).reporter;
      const format = options.format as ReportFormat;
      const output = reporter.format(report, format);

      if (options.output) {
        await fs.writeFile(options.output, output, 'utf-8');
        console.log(chalk.green(`✅ 报告已保存到: ${options.output}`));
      } else {
        console.log(output);
      }

      if (report.summary.errors > 0) {
        process.exit(1);
      }
    } catch (error) {
      spinner.fail('扫描失败');
      console.error(chalk.red('错误:'), error);
      process.exit(1);
    }
  });

// validate 命令
program
  .command('validate <skill-path>')
  .description('验证单个 Skill 的配置')
  .action(async (skillPath) => {
    console.log(chalk.blue(`正在验证: ${skillPath}`));
    // TODO: 实现单个 Skill 验证
    console.log(chalk.yellow('此功能即将推出...'));
  });

// list 命令
program
  .command('list')
  .description('列出所有发现的 Skills')
  .option('-p, --project <path>', '项目目录路径', process.cwd())
  .option('--global-only', '仅列出全局 Skills')
  .option('--project-only', '仅列出项目 Skills')
  .action(async (options) => {
    const spinner = ora('正在查找 Skills...').start();

    try {
      const engine = new ConductEngine();

      const scanOptions = {
        projectDir: options.project,
        includeGlobal: options.globalOnly ? true : !options.projectOnly,
        includeProject: options.projectOnly ? true : !options.globalOnly,
        includePlugin: !options.globalOnly && !options.projectOnly,
      };

      const { skills } = await engine.scan(scanOptions);

      spinner.succeed(`找到 ${skills.length} 个 Skills`);

      // 按位置分组显示
      const byLocation = {
        personal: skills.filter(s => s.location.type === 'personal'),
        project: skills.filter(s => s.location.type === 'project'),
        nested: skills.filter(s => s.location.type === 'nested'),
        plugin: skills.filter(s => s.location.type === 'plugin'),
      };

      if (byLocation.personal.length > 0) {
        console.log(chalk.bold('\n🌐 个人全局 Skills:'));
        for (const skill of byLocation.personal) {
          const status = skill.validationResult.valid ? chalk.green('✅') : chalk.red('❌');
          console.log(`  ${status} ${skill.metadata.name}`);
        }
      }

      if (byLocation.project.length > 0) {
        console.log(chalk.bold('\n📁 项目级 Skills:'));
        for (const skill of byLocation.project) {
          const status = skill.validationResult.valid ? chalk.green('✅') : chalk.red('❌');
          console.log(`  ${status} ${skill.metadata.name}`);
        }
      }

      if (byLocation.nested.length > 0) {
        console.log(chalk.bold('\n📂 嵌套目录 Skills:'));
        for (const skill of byLocation.nested) {
          const status = skill.validationResult.valid ? chalk.green('✅') : chalk.red('❌');
          console.log(`  ${status} ${skill.metadata.name} (${skill.location.path})`);
        }
      }

      if (byLocation.plugin.length > 0) {
        console.log(chalk.bold('\n🔌 插件 Skills:'));
        for (const skill of byLocation.plugin) {
          const status = skill.validationResult.valid ? chalk.green('✅') : chalk.red('❌');
          console.log(`  ${status} ${skill.metadata.name}`);
        }
      }

      console.log('');
    } catch (error) {
      spinner.fail('查找失败');
      console.error(chalk.red('错误:'), error);
      process.exit(1);
    }
  });

// 解析命令行参数
program.parse();
