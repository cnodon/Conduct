# 技术实现原理

本文档描述 Conduct 工具的核心技术实现方案。

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                        Conduct                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐              ┌──────────────┐            │
│  │   CLI Mode   │              │   GUI Mode   │            │
│  └──────┬───────┘              └──────┬───────┘            │
│         │                             │                     │
│         └─────────────┬───────────────┘                     │
│                       │                                     │
│              ┌────────▼────────┐                            │
│              │   Core Engine   │                            │
│              └────────┬────────┘                            │
│                       │                                     │
│         ┌─────────────┼─────────────┐                       │
│         │             │             │                       │
│    ┌────▼─────┐  ┌────▼──────┐  ┌─▼────────┐              │
│    │ Scanner  │  │ Validator │  │ Reporter │              │
│    └──────────┘  └───────────┘  └──────────┘              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 核心模块

### 1. Location Resolver (位置解析器)

**职责:** 确定所有可能的 Skills 存储位置

**实现原理:**

```typescript
interface SkillLocation {
  type: 'enterprise' | 'personal' | 'project' | 'plugin' | 'nested';
  path: string;
  priority: number;
}

class LocationResolver {
  // 1. 读取 Claude Code 配置获取企业级 Skills 路径
  getEnterpriseLocations(): SkillLocation[]

  // 2. 获取个人全局 Skills 目录
  getPersonalLocation(): SkillLocation {
    // 通常为 ~/.claude/skills/
    return path.join(os.homedir(), '.claude', 'skills')
  }

  // 3. 扫描当前项目及嵌套子目录
  getProjectLocations(rootDir: string): SkillLocation[] {
    // 扫描 .claude/skills/ 和 packages/*/.claude/skills/
    return findNestedSkillDirs(rootDir)
  }

  // 4. 读取已安装插件的 Skills
  getPluginLocations(): SkillLocation[] {
    // 扫描 ~/.claude/plugins/*/skills/
    return scanPluginSkills()
  }
}
```

**关键技术:**
- 文件系统递归遍历
- 目录存在性检测
- 配置文件解析 (`~/.claude/config.json`)
- 符号链接处理

---

### 2. Scanner (扫描器)

**职责:** 遍历指定位置,识别 Skill 目录

**实现原理:**

```typescript
interface SkillDirectory {
  location: SkillLocation;
  skillPath: string;
  hasSkillMd: boolean;
  supportingFiles: string[];
}

class Scanner {
  async scanLocation(location: SkillLocation): Promise<SkillDirectory[]> {
    const skillDirs = [];

    // 遍历目录,每个子目录可能是一个 Skill
    for (const dir of listDirectories(location.path)) {
      const skillMdPath = path.join(dir, 'SKILL.md');

      if (await exists(skillMdPath)) {
        skillDirs.push({
          location,
          skillPath: dir,
          hasSkillMd: true,
          supportingFiles: await detectSupportingFiles(dir)
        });
      }
    }

    return skillDirs;
  }

  private detectSupportingFiles(dir: string): string[] {
    const files = [];
    // 检测 reference.md, examples.md, scripts/
    if (exists(path.join(dir, 'reference.md'))) files.push('reference.md');
    if (exists(path.join(dir, 'examples.md'))) files.push('examples.md');
    if (exists(path.join(dir, 'scripts'))) files.push('scripts/');
    return files;
  }
}
```

**关键技术:**
- 目录结构遍历
- 文件存在性批量检测
- 异步并发扫描优化

---

### 3. Parser (解析器)

**职责:** 解析 SKILL.md 的 YAML frontmatter 和 Markdown 内容

**实现原理:**

```typescript
interface SkillMetadata {
  // 必需字段
  name: string;
  description: string;

  // 可选字段
  allowedTools?: string[];
  model?: string;
  context?: 'fork' | 'inline';
  agent?: 'Explore' | 'Plan' | 'general-purpose';
  hooks?: {
    PreToolUse?: string;
    PostToolUse?: string;
    Stop?: string;
  };
  userInvocable?: boolean;
}

interface ParsedSkill {
  metadata: SkillMetadata;
  content: string;
  rawYaml: string;
}

class Parser {
  async parseSkill(skillMdPath: string): Promise<ParsedSkill> {
    const content = await readFile(skillMdPath, 'utf-8');

    // 提取 YAML frontmatter (以 --- 包裹的部分)
    const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);

    if (!yamlMatch) {
      throw new Error('Missing YAML frontmatter');
    }

    const rawYaml = yamlMatch[1];
    const metadata = yaml.parse(rawYaml) as SkillMetadata;
    const markdownContent = content.slice(yamlMatch[0].length).trim();

    return { metadata, content: markdownContent, rawYaml };
  }
}
```

**关键技术:**
- YAML 解析库 (js-yaml)
- Markdown frontmatter 提取
- 错误边界处理
- 字符编码处理 (UTF-8)

---

### 4. Validator (验证器)

**职责:** 验证 Skill 配置的合法性

**实现原理:**

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

class Validator {
  validate(skill: ParsedSkill): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 1. 必需字段检查
    if (!skill.metadata.name) {
      errors.push({
        field: 'name',
        message: 'Missing required field: name',
        severity: 'error'
      });
    }

    // 2. name 格式验证
    if (skill.metadata.name) {
      const nameRegex = /^[a-z0-9-]+$/;
      if (!nameRegex.test(skill.metadata.name)) {
        errors.push({
          field: 'name',
          message: 'Name must contain only lowercase letters, numbers, and hyphens',
          severity: 'error'
        });
      }

      if (skill.metadata.name.length > 64) {
        errors.push({
          field: 'name',
          message: 'Name must be 64 characters or less',
          severity: 'error'
        });
      }
    }

    // 3. description 验证
    if (!skill.metadata.description) {
      errors.push({
        field: 'description',
        message: 'Missing required field: description',
        severity: 'error'
      });
    } else if (skill.metadata.description.length > 1024) {
      errors.push({
        field: 'description',
        message: 'Description must be 1024 characters or less',
        severity: 'error'
      });
    }

    // 4. allowed-tools 验证
    if (skill.metadata.allowedTools) {
      const validTools = ['Read', 'Write', 'Edit', 'Grep', 'Glob', 'Bash', /* ... */];
      const invalidTools = skill.metadata.allowedTools.filter(
        tool => !validTools.includes(tool)
      );

      if (invalidTools.length > 0) {
        warnings.push({
          field: 'allowed-tools',
          message: `Unknown tools: ${invalidTools.join(', ')}`,
          severity: 'warning'
        });
      }
    }

    // 5. model 验证
    if (skill.metadata.model) {
      const validModels = [
        'claude-sonnet-4-20250514',
        'claude-opus-4-20241129',
        'claude-haiku-4-20250110'
      ];
      if (!validModels.some(m => skill.metadata.model?.startsWith(m))) {
        warnings.push({
          field: 'model',
          message: 'Unknown model version',
          severity: 'warning'
        });
      }
    }

    // 6. context + agent 组合验证
    if (skill.metadata.context === 'fork' && !skill.metadata.agent) {
      warnings.push({
        field: 'agent',
        message: 'context=fork usually requires specifying an agent type',
        severity: 'warning'
      });
    }

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings
    };
  }

  // 验证支持文件引用
  validateReferences(skill: ParsedSkill, skillDir: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // 检测 Markdown 中的文件引用
    const fileRefs = extractFileReferences(skill.content);

    for (const ref of fileRefs) {
      const refPath = path.join(skillDir, ref);
      if (!existsSync(refPath)) {
        errors.push({
          field: 'content',
          message: `Referenced file not found: ${ref}`,
          severity: 'warning'
        });
      }
    }

    return errors;
  }
}
```

**关键技术:**
- 正则表达式验证
- 字段类型检查
- 枚举值验证
- 交叉字段验证
- 文件引用完整性检查

---

### 5. Conflict Analyzer (冲突分析器)

**职责:** 识别同名 Skills 的优先级和覆盖关系

**实现原理:**

```typescript
interface SkillConflict {
  name: string;
  instances: Array<{
    location: SkillLocation;
    path: string;
    active: boolean; // 是否实际生效
  }>;
  effectiveSkill: string; // 实际生效的 Skill 路径
}

class ConflictAnalyzer {
  analyzeConflicts(skills: ParsedSkill[]): SkillConflict[] {
    // 按 name 分组
    const skillsByName = groupBy(skills, s => s.metadata.name);

    const conflicts: SkillConflict[] = [];

    for (const [name, instances] of Object.entries(skillsByName)) {
      if (instances.length > 1) {
        // 按优先级排序
        const sorted = instances.sort((a, b) =>
          a.location.priority - b.location.priority
        );

        conflicts.push({
          name,
          instances: sorted.map((skill, index) => ({
            location: skill.location,
            path: skill.skillPath,
            active: index === 0 // 优先级最高的生效
          })),
          effectiveSkill: sorted[0].skillPath
        });
      }
    }

    return conflicts;
  }
}
```

**关键技术:**
- 数据分组与聚合
- 优先级排序算法
- 覆盖关系计算

---

### 6. Reporter (报告生成器)

**职责:** 生成人类可读的配置状态报告

**实现原理:**

```typescript
class Reporter {
  generateReport(
    skills: ParsedSkill[],
    validations: Map<string, ValidationResult>,
    conflicts: SkillConflict[]
  ): Report {
    return {
      summary: this.generateSummary(skills, validations),
      byLocation: this.groupByLocation(skills),
      validationIssues: this.summarizeIssues(validations),
      conflicts: this.formatConflicts(conflicts),
      recommendations: this.generateRecommendations(skills, validations)
    };
  }

  private generateSummary(skills: ParsedSkill[], validations: Map): Summary {
    const total = skills.length;
    const valid = Array.from(validations.values())
      .filter(v => v.valid).length;
    const hasErrors = total - valid;

    return {
      totalSkills: total,
      validSkills: valid,
      skillsWithErrors: hasErrors,
      locations: {
        enterprise: skills.filter(s => s.location.type === 'enterprise').length,
        personal: skills.filter(s => s.location.type === 'personal').length,
        project: skills.filter(s => s.location.type === 'project').length,
        plugin: skills.filter(s => s.location.type === 'plugin').length
      }
    };
  }

  // 格式化输出
  formatAsMarkdown(report: Report): string {
    // 生成 Markdown 格式报告
  }

  formatAsJSON(report: Report): string {
    // 生成 JSON 格式报告
  }

  formatAsTerminal(report: Report): string {
    // 生成带颜色的终端输出
  }
}
```

**关键技术:**
- 数据聚合与统计
- 多格式输出 (Markdown / JSON / 终端)
- 颜色编码 (chalk / colors)
- 表格格式化 (cli-table3)

---

## 数据流

```
1. [启动] → LocationResolver.resolveAll()
   ↓
2. [扫描] → Scanner.scan(locations)
   ↓
3. [解析] → Parser.parse(SKILL.md files)
   ↓
4. [验证] → Validator.validate(parsed skills)
   ↓
5. [冲突] → ConflictAnalyzer.analyze(skills)
   ↓
6. [报告] → Reporter.generate(all data)
   ↓
7. [输出] → Console / File
```

## 技术栈建议

### 语言选择
- **TypeScript** - 类型安全,适合复杂数据结构处理
- **Node.js** - 跨平台,丰富的文件系统 API

### 核心依赖
```json
{
  "dependencies": {
    "js-yaml": "^4.1.0",           // YAML 解析
    "glob": "^10.3.0",             // 文件模式匹配
    "chalk": "^5.3.0",             // 终端颜色
    "cli-table3": "^0.6.3",        // 表格输出
    "commander": "^11.1.0",        // CLI 框架
    "zod": "^3.22.0"               // 运行时类型验证
  }
}
```

### 性能优化

1. **并发扫描**
   - 使用 `Promise.all()` 并发扫描多个位置
   - 文件读取使用 `fs.promises` 异步 API

2. **缓存机制**
   - 缓存已解析的 YAML 元数据
   - 使用文件 mtime 检测变更

3. **增量扫描**
   - 仅扫描变更的 Skills 目录
   - 保存上次扫描的快照

---

## 扩展性设计

### 插件架构

```typescript
interface ValidatorPlugin {
  name: string;
  validate(skill: ParsedSkill): ValidationError[];
}

class Validator {
  private plugins: ValidatorPlugin[] = [];

  registerPlugin(plugin: ValidatorPlugin) {
    this.plugins.push(plugin);
  }

  validate(skill: ParsedSkill): ValidationResult {
    const errors = this.builtInValidations(skill);

    // 运行所有插件验证
    for (const plugin of this.plugins) {
      errors.push(...plugin.validate(skill));
    }

    return { valid: errors.length === 0, errors };
  }
}
```

### 自定义报告格式

```typescript
interface ReportFormatter {
  format(report: Report): string;
}

class Reporter {
  private formatters = new Map<string, ReportFormatter>();

  registerFormatter(name: string, formatter: ReportFormatter) {
    this.formatters.set(name, formatter);
  }

  export(report: Report, format: string): string {
    const formatter = this.formatters.get(format);
    return formatter ? formatter.format(report) : this.defaultFormat(report);
  }
}
```

---

## CLI 接口设计

```bash
# 扫描当前项目
conduct scan

# 扫描指定项目
conduct scan --project /path/to/project

# 扫描全局 Skills
conduct scan --global

# 扫描所有位置
conduct scan --all

# 输出 JSON 格式
conduct scan --format json

# 仅显示错误
conduct scan --errors-only

# 详细模式
conduct scan --verbose

# 修复建议
conduct scan --suggest-fixes

# 启动 GUI 界面
conduct gui

# 启动 GUI 并指定项目
conduct gui --project /path/to/project
```

---

## GUI 实现方案

### 技术选型

**前端框架:**
- **Electron** - 跨平台桌面应用框架
- **React** - UI 组件库
- **TailwindCSS** - 样式框架
- **Ant Design** / **shadcn/ui** - 组件库

**状态管理:**
- **Zustand** / **Redux Toolkit** - 全局状态管理

**数据可视化:**
- **React Flow** - 树形图和关系图
- **Recharts** - 统计图表

### GUI 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                     Electron Main Process                    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐         ┌──────────────────────────┐     │
│  │  IPC Server  │◄───────►│   Core Engine (Node.js)  │     │
│  └──────┬───────┘         └──────────────────────────┘     │
│         │                                                    │
└─────────┼────────────────────────────────────────────────────┘
          │
          │ IPC Communication
          │
┌─────────▼────────────────────────────────────────────────────┐
│                  Electron Renderer Process                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │             React Application                       │    │
│  ├────────────────────────────────────────────────────┤    │
│  │                                                     │    │
│  │  ┌──────────────┐  ┌──────────────────────────┐   │    │
│  │  │   Header     │  │   Statistics Panel       │   │    │
│  │  └──────────────┘  └──────────────────────────┘   │    │
│  │                                                     │    │
│  │  ┌──────────────────────────────────────────────┐ │    │
│  │  │         Main Content Area                    │ │    │
│  │  ├──────────────────────────────────────────────┤ │    │
│  │  │                                              │ │    │
│  │  │  ┌────────────────┐  ┌──────────────────┐  │ │    │
│  │  │  │  Skills Tree   │  │  Detail Panel    │  │ │    │
│  │  │  │   (Left)       │  │    (Right)       │  │ │    │
│  │  │  │                │  │                  │  │ │    │
│  │  │  │  - Personal    │  │  - Metadata      │  │ │    │
│  │  │  │  - Project     │  │  - Validation    │  │ │    │
│  │  │  │    └─ Nested   │  │  - Conflicts     │  │ │    │
│  │  │  │  - Plugin      │  │  - Content       │  │ │    │
│  │  │  └────────────────┘  └──────────────────┘  │ │    │
│  │  │                                              │ │    │
│  │  └──────────────────────────────────────────────┘ │    │
│  │                                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 核心 GUI 模块

#### 1. Skills Tree Component (Skills 树形组件)

**职责:** 分层级显示所有 Skills

**数据结构:**

```typescript
interface SkillTreeNode {
  id: string;
  type: 'personal' | 'project' | 'nested' | 'plugin' | 'enterprise';
  name: string;
  path: string;
  status: 'valid' | 'warning' | 'error' | 'overridden';
  children?: SkillTreeNode[];
  metadata?: SkillMetadata;
  validationResult?: ValidationResult;
}

interface SkillsTreeData {
  personal: SkillTreeNode[];      // 个人全局 Skills
  project: {                       // 项目级 Skills
    root: SkillTreeNode[];         // 项目根目录 Skills
    nested: {                      // 嵌套目录 Skills
      path: string;
      skills: SkillTreeNode[];
    }[];
  };
  plugin: SkillTreeNode[];         // 插件 Skills
  enterprise: SkillTreeNode[];     // 企业级 Skills
}
```

**UI 组件实现:**

```typescript
const SkillsTree: React.FC = () => {
  const [treeData, setTreeData] = useState<SkillsTreeData | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillTreeNode | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  // 从主进程加载数据
  useEffect(() => {
    const loadSkills = async () => {
      const data = await window.electronAPI.scanSkills();
      setTreeData(data);
    };
    loadSkills();
  }, []);

  return (
    <div className="skills-tree">
      {/* 个人全局 Skills 区域 */}
      <TreeSection
        title="🌐 个人全局 Skills"
        path={`~/.claude/skills/`}
        nodes={treeData?.personal || []}
        onSelect={setSelectedSkill}
        expandedKeys={expandedKeys}
        onExpand={setExpandedKeys}
      />

      {/* 项目级 Skills 区域 */}
      <TreeSection
        title="📁 项目级 Skills"
        path={`.claude/skills/`}
        nodes={treeData?.project.root || []}
        onSelect={setSelectedSkill}
        expandedKeys={expandedKeys}
        onExpand={setExpandedKeys}
      >
        {/* 嵌套目录 Skills */}
        {treeData?.project.nested.map(nested => (
          <NestedSection
            key={nested.path}
            title={`📂 ${nested.path}`}
            nodes={nested.skills}
            onSelect={setSelectedSkill}
            expandedKeys={expandedKeys}
            onExpand={setExpandedKeys}
          />
        ))}
      </TreeSection>

      {/* 插件 Skills 区域 */}
      <TreeSection
        title="🔌 插件 Skills"
        nodes={treeData?.plugin || []}
        onSelect={setSelectedSkill}
        expandedKeys={expandedKeys}
        onExpand={setExpandedKeys}
      />
    </div>
  );
};
```

**节点渲染:**

```typescript
const SkillNode: React.FC<{ node: SkillTreeNode }> = ({ node }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'overridden': return '🔄';
      default: return '📄';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      case 'overridden': return 'text-gray-400';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={`skill-node ${getStatusColor(node.status)}`}>
      <span className="status-icon">{getStatusIcon(node.status)}</span>
      <span className="skill-name">{node.name}</span>
      {node.status === 'overridden' && (
        <span className="badge">被覆盖</span>
      )}
    </div>
  );
};
```

---

#### 2. Detail Panel Component (详情面板组件)

**职责:** 显示选中 Skill 的详细信息

```typescript
const DetailPanel: React.FC<{ skill: SkillTreeNode | null }> = ({ skill }) => {
  if (!skill) {
    return <EmptyState message="请从左侧选择一个 Skill 查看详情" />;
  }

  return (
    <div className="detail-panel">
      {/* 基本信息卡片 */}
      <Card title="基本信息">
        <Descriptions>
          <Descriptions.Item label="名称">
            {skill.metadata?.name}
          </Descriptions.Item>
          <Descriptions.Item label="描述">
            {skill.metadata?.description}
          </Descriptions.Item>
          <Descriptions.Item label="路径">
            <code>{skill.path}</code>
          </Descriptions.Item>
          <Descriptions.Item label="类型">
            {skill.type}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 元数据卡片 */}
      <Card title="元数据配置">
        <MetadataView metadata={skill.metadata} />
      </Card>

      {/* 验证结果卡片 */}
      {skill.validationResult && (
        <Card title="验证结果">
          <ValidationResultView result={skill.validationResult} />
        </Card>
      )}

      {/* YAML 配置卡片 */}
      <Card title="YAML 配置">
        <SyntaxHighlighter language="yaml">
          {skill.metadata?.rawYaml}
        </SyntaxHighlighter>
      </Card>

      {/* 支持文件列表 */}
      <Card title="支持文件">
        <SupportingFilesList files={skill.supportingFiles} />
      </Card>

      {/* 操作按钮 */}
      <div className="actions">
        <Button onClick={() => openInEditor(skill.path)}>
          在编辑器中打开
        </Button>
        <Button onClick={() => showInFinder(skill.path)}>
          在文件管理器中显示
        </Button>
        <Button onClick={() => revalidate(skill)}>
          重新验证
        </Button>
      </div>
    </div>
  );
};
```

---

#### 3. Statistics Panel Component (统计面板组件)

**职责:** 显示全局统计信息

```typescript
interface Statistics {
  total: number;
  valid: number;
  warnings: number;
  errors: number;
  byLocation: {
    personal: number;
    project: number;
    nested: number;
    plugin: number;
    enterprise: number;
  };
  conflicts: number;
}

const StatisticsPanel: React.FC<{ stats: Statistics }> = ({ stats }) => {
  return (
    <div className="statistics-panel grid grid-cols-4 gap-4">
      <StatCard
        title="总计 Skills"
        value={stats.total}
        icon="📊"
        color="blue"
      />
      <StatCard
        title="配置正确"
        value={stats.valid}
        icon="✅"
        color="green"
      />
      <StatCard
        title="警告"
        value={stats.warnings}
        icon="⚠️"
        color="yellow"
      />
      <StatCard
        title="错误"
        value={stats.errors}
        icon="❌"
        color="red"
      />

      {/* 按位置统计的饼图 */}
      <div className="col-span-2">
        <Card title="按位置分布">
          <PieChart data={[
            { name: '个人全局', value: stats.byLocation.personal },
            { name: '项目级', value: stats.byLocation.project },
            { name: '嵌套目录', value: stats.byLocation.nested },
            { name: '插件', value: stats.byLocation.plugin },
            { name: '企业级', value: stats.byLocation.enterprise },
          ]} />
        </Card>
      </div>

      {/* 冲突警告 */}
      {stats.conflicts > 0 && (
        <div className="col-span-2">
          <Alert
            type="warning"
            message={`发现 ${stats.conflicts} 个同名 Skills 冲突`}
            description="点击查看详情"
          />
        </div>
      )}
    </div>
  );
};
```

---

#### 4. IPC 通信层

**职责:** 连接前端 UI 和后端核心引擎

**Main Process (主进程):**

```typescript
// electron/main.ts
import { ipcMain } from 'electron';
import { LocationResolver } from './core/LocationResolver';
import { Scanner } from './core/Scanner';
import { Parser } from './core/Parser';
import { Validator } from './core/Validator';

// 注册 IPC 处理器
ipcMain.handle('scan-skills', async (event, options) => {
  try {
    // 1. 解析位置
    const resolver = new LocationResolver();
    const locations = resolver.resolveAll(options);

    // 2. 扫描 Skills
    const scanner = new Scanner();
    const skills = await scanner.scanAll(locations);

    // 3. 解析和验证
    const parser = new Parser();
    const validator = new Validator();

    const results = await Promise.all(
      skills.map(async (skill) => {
        const parsed = await parser.parseSkill(skill.skillMdPath);
        const validation = validator.validate(parsed);

        return {
          ...skill,
          metadata: parsed.metadata,
          validationResult: validation,
        };
      })
    );

    // 4. 构建树形数据
    const treeData = buildTreeData(results);

    return {
      success: true,
      data: treeData,
      statistics: calculateStatistics(results),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
});

ipcMain.handle('open-in-editor', async (event, filePath) => {
  const { shell } = require('electron');
  await shell.openPath(filePath);
});

ipcMain.handle('show-in-finder', async (event, filePath) => {
  const { shell } = require('electron');
  shell.showItemInFolder(filePath);
});
```

**Preload Script (预加载脚本):**

```typescript
// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  scanSkills: (options?: any) => ipcRenderer.invoke('scan-skills', options),
  openInEditor: (filePath: string) => ipcRenderer.invoke('open-in-editor', filePath),
  showInFinder: (filePath: string) => ipcRenderer.invoke('show-in-finder', filePath),
  revalidateSkill: (skillPath: string) => ipcRenderer.invoke('revalidate-skill', skillPath),

  // 监听扫描进度
  onScanProgress: (callback: (progress: number) => void) => {
    ipcRenderer.on('scan-progress', (event, progress) => callback(progress));
  },
});
```

---

#### 5. Tree Data Builder (树形数据构建器)

**职责:** 将扫描结果转换为树形结构

```typescript
class TreeDataBuilder {
  buildTreeData(skills: ParsedSkill[]): SkillsTreeData {
    const personal: SkillTreeNode[] = [];
    const projectRoot: SkillTreeNode[] = [];
    const projectNested: Map<string, SkillTreeNode[]> = new Map();
    const plugin: SkillTreeNode[] = [];
    const enterprise: SkillTreeNode[] = [];

    for (const skill of skills) {
      const node = this.createNode(skill);

      switch (skill.location.type) {
        case 'personal':
          personal.push(node);
          break;
        case 'project':
          projectRoot.push(node);
          break;
        case 'nested':
          const nestedPath = skill.location.path;
          if (!projectNested.has(nestedPath)) {
            projectNested.set(nestedPath, []);
          }
          projectNested.get(nestedPath)!.push(node);
          break;
        case 'plugin':
          plugin.push(node);
          break;
        case 'enterprise':
          enterprise.push(node);
          break;
      }
    }

    return {
      personal,
      project: {
        root: projectRoot,
        nested: Array.from(projectNested.entries()).map(([path, skills]) => ({
          path,
          skills,
        })),
      },
      plugin,
      enterprise,
    };
  }

  private createNode(skill: ParsedSkill): SkillTreeNode {
    return {
      id: skill.skillPath,
      type: skill.location.type,
      name: skill.metadata.name,
      path: skill.skillPath,
      status: this.determineStatus(skill),
      metadata: skill.metadata,
      validationResult: skill.validationResult,
      supportingFiles: skill.supportingFiles,
    };
  }

  private determineStatus(skill: ParsedSkill): SkillTreeNode['status'] {
    if (!skill.validationResult.valid) return 'error';
    if (skill.validationResult.warnings.length > 0) return 'warning';
    if (skill.isOverridden) return 'overridden';
    return 'valid';
  }
}
```

---

### 实时更新机制

**文件监听:**

```typescript
import chokidar from 'chokidar';

class SkillWatcher {
  private watchers: Map<string, chokidar.FSWatcher> = new Map();

  watchLocations(locations: SkillLocation[], onChange: () => void) {
    for (const location of locations) {
      const watcher = chokidar.watch(location.path, {
        ignored: /(^|[\/\\])\../, // 忽略隐藏文件
        persistent: true,
        ignoreInitial: true,
      });

      watcher
        .on('add', () => onChange())
        .on('change', () => onChange())
        .on('unlink', () => onChange());

      this.watchers.set(location.path, watcher);
    }
  }

  stopWatching() {
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();
  }
}
```

**前端实时更新:**

```typescript
const SkillsTree: React.FC = () => {
  const [treeData, setTreeData] = useState<SkillsTreeData | null>(null);

  useEffect(() => {
    // 初始加载
    loadSkills();

    // 监听文件变更
    const unsubscribe = window.electronAPI.onSkillsChanged(() => {
      loadSkills();
    });

    return () => unsubscribe();
  }, []);

  const loadSkills = async () => {
    const result = await window.electronAPI.scanSkills();
    if (result.success) {
      setTreeData(result.data);
    }
  };

  // ...
};
```

---

### GUI 依赖清单

```json
{
  "dependencies": {
    "electron": "^28.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.0",
    "antd": "^5.12.0",
    "tailwindcss": "^3.4.0",
    "react-syntax-highlighter": "^15.5.0",
    "recharts": "^2.10.0",
    "chokidar": "^3.5.3"
  },
  "devDependencies": {
    "electron-builder": "^24.9.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "vite": "^5.0.0",
    "vite-plugin-electron": "^0.15.0"
  }
}
```

---

## 测试策略

### 单元测试
- Parser: YAML 解析边界情况
- Validator: 每个验证规则的正负用例
- ConflictAnalyzer: 优先级计算逻辑

### 集成测试
- 端到端扫描流程
- 多位置 Skills 发现
- 冲突检测准确性

### 测试数据
- 创建 `fixtures/` 目录模拟各种 Skills 配置
- 包含有效配置、无效配置、边界情况
