import type { ParsedSkill, SkillConflict } from '../types/index.js';

/**
 * Conflict Analyzer - 分析 Skills 冲突
 */
export class ConflictAnalyzer {
  /**
   * 分析所有冲突
   */
  analyze(skills: ParsedSkill[]): {
    conflicts: SkillConflict[];
    skillsWithOverrides: ParsedSkill[];
  } {
    // 按 name 分组
    const skillsByName = new Map<string, ParsedSkill[]>();

    for (const skill of skills) {
      const name = skill.metadata.name;
      if (!skillsByName.has(name)) {
        skillsByName.set(name, []);
      }
      skillsByName.get(name)!.push(skill);
    }

    const conflicts: SkillConflict[] = [];
    const updatedSkills = [...skills];

    // 检测冲突
    for (const [name, instances] of skillsByName.entries()) {
      if (instances.length > 1) {
        // 按优先级排序
        const sorted = instances.sort((a, b) =>
          a.location.priority - b.location.priority
        );

        // 标记被覆盖的 Skills
        for (let i = 1; i < sorted.length; i++) {
          const skillIndex = updatedSkills.findIndex(s => s === sorted[i]);
          if (skillIndex !== -1) {
            updatedSkills[skillIndex] = {
              ...updatedSkills[skillIndex],
              isOverridden: true,
            };
          }
        }

        conflicts.push({
          name,
          instances: sorted.map((skill, index) => ({
            location: skill.location,
            path: skill.skillPath,
            active: index === 0,
          })),
          effectiveSkill: sorted[0].skillPath,
        });
      }
    }

    return {
      conflicts,
      skillsWithOverrides: updatedSkills,
    };
  }
}
