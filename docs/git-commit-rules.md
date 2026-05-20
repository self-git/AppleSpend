# Git 提交规范

本项目使用 Conventional Commits 风格，提交信息必须清晰说明“改了什么”和“为什么改”。格式如下：

```text
<type>(<scope>): <subject>
```

## type

- `feat`：新增功能或用户可见能力。
- `fix`：修复缺陷、错误行为或数据问题。
- `docs`：只修改文档、注释或说明材料。
- `style`：只调整格式、排版、空白、命名等不影响行为的内容。
- `refactor`：重构代码但不改变外部行为。
- `perf`：性能优化。
- `test`：新增或修改测试。
- `build`：构建系统、依赖、打包配置变更。
- `ci`：CI/CD、自动化流程配置变更。
- `chore`：维护性工作，不属于以上类型。
- `revert`：回滚提交。

## scope

`scope` 使用小写短名，表示影响范围。常用范围：

- `import`：数据导入、CSV/ZIP 解析。
- `ledger`：账本列表、交易详情、筛选和导出。
- `dashboard`：首页统计和图表。
- `store-credit`：Apple 账户余额、充值、消费和流水。
- `subscriptions`：订阅页面、订阅事件和订阅聚合。
- `assets`：设备资产、维修、AppleCare。
- `reports`：年度报告和 Markdown 导出。
- `rules`：规则配置、别名、分类和现金口径。
- `db`：IndexedDB、存储结构和迁移。
- `ui`：通用组件和视觉样式。
- `docs`：文档。

如果改动横跨多个范围，可以省略 scope：

```text
feat: support Apple data export zip import
```

## subject

- 使用英文祈使句或简短中文短句，控制在 72 个字符以内。
- 首字母不强制大写。
- 末尾不加句号。
- 必须描述结果，不写笼统内容，例如避免 `update code`、`fix bug`。

## body

当改动包含重要背景、口径变化、迁移风险或测试说明时，增加正文：

```text
fix(store-credit): localize Apple account balance labels

Use Apple official Chinese terms for Store Credit display while keeping
internal enum values unchanged to avoid parser regressions.
```

## breaking change

如果有不兼容变更，在 footer 写明：

```text
BREAKING CHANGE: IndexedDB schema version is upgraded and old local data must be re-imported.
```

## 示例

```text
feat(import): support Apple data export zip files
fix(store-credit): use balance labels in timeline
docs(docs): add git commit rules
refactor(rules): centralize transaction display labels
build: add markdown renderer dependency
```

## 提交前检查

- 只提交与当前任务相关的文件。
- 确认 `git diff --cached --check` 没有空白错误。
- 涉及 TypeScript/Vue 代码时运行 `pnpm -s typecheck`。
- 不提交本地工具目录、缓存、临时文件和隐私数据。
