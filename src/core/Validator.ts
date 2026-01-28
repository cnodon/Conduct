import type { ParsedSkill, ValidationResult, ValidationError } from '../types/index.js';

/**
 * Validator - 验证 Skill 配置有效性
 */
export class Validator {
  /**
   * 已知的有效工具列表
   */
  private readonly VALID_TOOLS = [
    'Read', 'Write', 'Edit', 'Grep', 'Glob', 'Bash',
    'Task', 'TodoWrite', 'AskUserQuestion', 'Skill',
    'WebFetch', 'WebSearch', 'EnterPlanMode', 'ExitPlanMode',
  ];

  /**
   * 已知的 Claude 模型
   */
  private readonly VALID_MODELS = [
    'claude-sonnet-4',
    'claude-opus-4',
    'claude-haiku-4',
    'sonnet',
    'opus',
    'haiku',
  ];

  /**
   * 验证所有 Skills
   */
  validateAll(skills: ParsedSkill[]): ParsedSkill[] {
    return skills.map(skill => ({
      ...skill,
      validationResult: this.validate(skill),
    }));
  }

  /**
   * 验证单个 Skill
   */
  validate(skill: ParsedSkill): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // 1. 必需字段检查
    this.validateRequiredFields(skill, errors);

    // 2. name 格式验证
    this.validateName(skill, errors);

    // 3. description 长度验证
    this.validateDescription(skill, errors);

    // 4. allowed-tools 验证
    this.validateAllowedTools(skill, warnings);

    // 5. model 验证
    this.validateModel(skill, warnings);

    // 6. context + agent 组合验证
    this.validateContextAgent(skill, warnings);

    const valid = errors.length === 0;

    return {
      valid,
      errors,
      warnings,
    };
  }

  /**
   * 验证必需字段
   */
  private validateRequiredFields(skill: ParsedSkill, errors: ValidationError[]): void {
    if (!skill.metadata.name) {
      errors.push({
        field: 'name',
        message: '缺少必需字段: name',
        severity: 'error',
      });
    }

    if (!skill.metadata.description) {
      errors.push({
        field: 'description',
        message: '缺少必需字段: description',
        severity: 'error',
      });
    }
  }

  /**
   * 验证 name 格式
   */
  private validateName(skill: ParsedSkill, errors: ValidationError[]): void {
    const { name } = skill.metadata;

    if (!name) return;

    // 格式验证: 小写字母、数字、连字符
    const nameRegex = /^[a-z0-9-]+$/;
    if (!nameRegex.test(name)) {
      errors.push({
        field: 'name',
        message: 'name 必须只包含小写字母、数字和连字符',
        severity: 'error',
      });
    }

    // 长度验证
    if (name.length > 64) {
      errors.push({
        field: 'name',
        message: 'name 长度不能超过 64 个字符',
        severity: 'error',
      });
    }

    // 不能以连字符开头或结尾
    if (name.startsWith('-') || name.endsWith('-')) {
      errors.push({
        field: 'name',
        message: 'name 不能以连字符开头或结尾',
        severity: 'error',
      });
    }
  }

  /**
   * 验证 description 长度
   */
  private validateDescription(skill: ParsedSkill, errors: ValidationError[]): void {
    const { description } = skill.metadata;

    if (!description) return;

    if (description.length > 1024) {
      errors.push({
        field: 'description',
        message: 'description 长度不能超过 1024 个字符',
        severity: 'error',
      });
    }

    if (description.length < 10) {
      errors.push({
        field: 'description',
        message: 'description 应该至少包含 10 个字符，以便 Claude 准确触发',
        severity: 'warning',
      });
    }
  }

  /**
   * 验证 allowed-tools
   */
  private validateAllowedTools(skill: ParsedSkill, warnings: ValidationError[]): void {
    const { allowedTools } = skill.metadata;

    if (!allowedTools || allowedTools.length === 0) return;

    const unknownTools = allowedTools.filter(
      tool => !this.VALID_TOOLS.includes(tool)
    );

    if (unknownTools.length > 0) {
      warnings.push({
        field: 'allowed-tools',
        message: `未知的工具: ${unknownTools.join(', ')}`,
        severity: 'warning',
      });
    }
  }

  /**
   * 验证 model
   */
  private validateModel(skill: ParsedSkill, warnings: ValidationError[]): void {
    const { model } = skill.metadata;

    if (!model) return;

    const isKnownModel = this.VALID_MODELS.some(validModel =>
      model.startsWith(validModel)
    );

    if (!isKnownModel) {
      warnings.push({
        field: 'model',
        message: `未知的模型版本: ${model}`,
        severity: 'warning',
      });
    }
  }

  /**
   * 验证 context + agent 组合
   */
  private validateContextAgent(skill: ParsedSkill, warnings: ValidationError[]): void {
    const { context, agent } = skill.metadata;

    if (context === 'fork' && !agent) {
      warnings.push({
        field: 'agent',
        message: '当 context=fork 时，建议指定 agent 类型',
        severity: 'warning',
      });
    }

    if (agent && context !== 'fork') {
      warnings.push({
        field: 'context',
        message: '指定了 agent 但 context 不是 fork',
        severity: 'warning',
      });
    }
  }
}
