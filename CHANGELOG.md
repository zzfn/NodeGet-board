# NodeGet Board Change Log

## [2026-04-03] JsWorker 详情排版修正与高级日志组件上线

### 🚀 新增功能 (New Features)

- **高级日志检索面板**: 完美复刻 `cron-history` 的高级检索体验，在 JsWorker 日志模块顶部添加包含日期范围、状态过滤、限流条数和单点 ID 搜索组合组件，精准对齐复杂审计需求。
- **底层 API 强化支持**: 扩展 `useJsRuntime.ts` 中的 `getWorkerLogs`，允许传递组装后的 `condition` 数组以过滤检索请求；并按规实现 `deleteWorkerLog` 删除 API，并在表格附加单行快捷删除动作。
- **日志表格增强**: 在日志表格中加入了支持字数截断展示的 `Message` 列，直接将脚本可能产生的 `error_message` 高亮吐出以加速监控溯源。同时在表格底部引入了符合 Cron History 标准的**实时客户端分页器 (Pagination)**，提升大批量检索时的浏览体验。

### 🛠 修复与改进 (Fixes & Improvements)

- **重新布局内容控制流**: 通过 `Tabs` 替代原有冗余的 Grid 左右排列结构承载运行所需的 `Params` 与 `Env`，极大程度还原出了底部空间用于运行输出与 Iframe Web 页面的动态渲染。
- **解除组件级预览限制**: 干掉了强绑定的路由锁死状态（移除了 `v-if`），使得无论代码是否注入路由，“预览”按钮自身保持常存状态；如若点击进入空路由则友善地反馈中心引导语。
- **补全日志国际化字典**: 为全应用深度引入与过滤、查重相关连的词条（如“成功/失败”、“过滤状态”、“执行限制条数”等）防止控制台爆黄警告，强化多语言健壮性。

### 📂 改动文件清单 (Modified Files)

- [src/pages/dashboard/js-runtime/[id].vue](file:///e:/wenjian/code/personal/NodeGet-board/src/pages/dashboard/js-runtime/[id].vue)
- [src/composables/useJsRuntime.ts](file:///e:/wenjian/code/personal/NodeGet-board/src/composables/useJsRuntime.ts)
- [src/locales/zh_cn.ts](file:///e:/wenjian/code/personal/NodeGet-board/src/locales/zh_cn.ts)
- [src/locales/en.ts](file:///e:/wenjian/code/personal/NodeGet-board/src/locales/en.ts)

---

## [2026-04-03] 同步 JsWorker 官方 API 接口

### 🚀 新增功能 (New Features)

- **同步官方 API**: 根据官方文档，在 `useJsRuntime.ts` 中全面引入并实现了包括 `listAllWorkers` 和 `getRtPool` 等在内的所有接口，并补充了详细的 JSDoc 注释。

### 🛠 修复与改进 (Fixes & Improvements)

- **底层请求重构 (API 规范化)**: 根据最新官方标准，将脚本详细查询和操作接口（如 `deleteWorker`、`getWorker`、`updateWorker`、`runWorker`）的依赖参数强制从 `id` 更正为 `name`。并在底层 `getWorker` 封装集中处理了新旧结构映射与 Base64 自动解密，修复了因接口迭代导致的详情页无法打开、编辑器挂载失败问题。
- **关联组件响应式对接**: 移除了 UI 层级基于 `id` 发起的历史操作逻辑，在 `WorkerTable.vue` 和 `js-runtime.vue` 及详情动态路由中全面使用 `name` 响应新标准，保证页面的完好交互与无缝衔接。
- **组件结构语义化重构**: 遵循业务规范的要求，将 `js-runtime.vue` 及 `[id].vue` 中调用实际业务 API 的函数统一补齐 `Fun` 后缀（如 `loadWorkers` 改为 `listAllWorkersFun`，`handleAdd` 改为 `addWorkerFun`，`handleSaveContent` 改为 `updateWorkerContentFun`），建立更清晰且具有高辨识度与强一致性的调用链路。
- **嵌套路由 (Layout) 结构修复**: 解决了由于 `unplugin-vue-router` 语法机制（当同名文件与文件夹共存时默认按父级 Layout 处理）导致子级 `[id].vue` 在路由跳转时无法渲染、停留在列表界面的问题。为 `js-runtime.vue` 引入了对 `route.path` 的拦截，列表视图仅在根路径显示，并在模板最下方增加了 `<router-view v-else />` 提供了子节点入口，从而使详情页得以成功渲染。
- **Lint 与生态修正**: 补充了在 `WorkerTable` 和详情页触发的 TypeScript lint 提示修改（Type 断言补偿与 RouteMeta `title` 属性补全）；并在全局 `zh_cn` 和 `en` 中补充了用于新 Title 的国际化支持键值避免由于路由获取失败引发的卡死。
- **完全使用标准 API 获取列表**: 从 `useJsRuntime` 彻底移除了遗留的 `fetchWorkers` （调用未归档的 `js-worker_list`）方法。现 `js-runtime.vue` 的列表加载逻辑已全面变更为先调用 `listAllWorkers` 拿到全部 name，再并行调用 `getWorker` 获取详情的组合，使得应用完全遵循官方文档标准。

### 📂 改动文件清单 (Modified Files)

- [src/composables/useJsRuntime.ts](file:///e:/wenjian/code/personal/NodeGet-board/src/composables/useJsRuntime.ts)
- [src/components/js-runtime/WorkerTable.vue](file:///e:/wenjian/code/personal/NodeGet-board/src/components/js-runtime/WorkerTable.vue)
- [src/pages/dashboard/js-runtime/[id].vue](file:///e:/wenjian/code/personal/NodeGet-board/src/pages/dashboard/js-runtime/[id].vue)

---

## [2026-04-02] JS Runtime Feature Implementation

### 🚀 新增功能 (New Features)

- **Mock 模式代码级开关**: 移除了 UI 上的 Mock Mode 开关，改为在 `useJsRuntime.ts` 内部通过 `MOCK_ENABLED` 常量控制，方便开发者在代码中随时切换。
- **Mock 数据支持**: 新增了 `src/mocks/jsRuntimeData.ts`，并在 `useJsRuntime` 中实现了 Mock 模式，支持在无后端环境下验证页面交互功能。
- **JS Runtime 管理页面**: 实现了完整的 Worker 列表展示、添加、编辑和删除功能。
- **Worker 详情页**: 采用标签页结构，包含概览、代码编辑、执行测试和高级设置。
- **实时执行测试**: 支持 `onCall` 和 `onCron` 两种触发模式的实时测试，并可配置 Params 和 Env。
- **代码编辑器**: 集成 `vue-codemirror`，支持 JavaScript 语法高亮和主题切换。
- **环境变量管理**: 支持动态添加和修改 Worker 的环境变量。

### 🛠 修复与改进 (Fixes & Improvements)

- **移除 Mock 逻辑**: 按照项目原生架构（参考 `servers.vue`）移除了所有 Mock 相关逻辑和开关。现在 JS 扩展页面完全依赖真实后端接口，报错信息将直接透传给用户，确保开发体验与系统一致。
- **Mock 数据同步优化**: 修复了 `updateWorker` 方法中 Mock 模式下更新 `mockWorkers` 数组的同步问题（已在移除 Mock 前完成）。
- **侧边栏路由修复**: 修复了由于动态路由被误加入侧边栏导致缺失 "id" 参数的报错（在详情页增加了 `meta.hidden: true`）。
- **依赖修复**: 安装了缺失的 `@codemirror/lang-javascript` 依赖，解决了 Worker 编辑器无法加载的问题。
- **路由修复**: 修复了由于 `lucide-vue-next` 图标引用错误和 `useRoute` 类型不匹配导致的页面报错。
- **国际化**: 补充了 `jsRuntime` 相关的中英文翻译词条。
- **持久化通信**: 新增 `useJsRuntime` composable，封装了后端 RPC 调用逻辑。

### 📂 改动文件清单 (Modified Files)

- [src/pages/dashboard/js-runtime.vue](file:///e:/wenjian/code/personal/NodeGet-board/src/pages/dashboard/js-runtime.vue)
- [src/pages/dashboard/js-runtime/[id].vue](file:///e:/wenjian/code/personal/NodeGet-board/src/pages/dashboard/js-runtime/[id].vue)
- [src/components/js-runtime/WorkerTable.vue](file:///e:/wenjian/code/personal/NodeGet-board/src/components/js-runtime/WorkerTable.vue)
- [src/components/js-runtime/WorkerFormDialog.vue](file:///e:/wenjian/code/personal/NodeGet-board/src/components/js-runtime/WorkerFormDialog.vue)
- [src/composables/useJsRuntime.ts](file:///e:/wenjian/code/personal/NodeGet-board/src/composables/useJsRuntime.ts)
- [src/locales/zh_cn.ts](file:///e:/wenjian/code/personal/NodeGet-board/src/locales/zh_cn.ts)
- [src/locales/en.ts](file:///e:/wenjian/code/personal/NodeGet-board/src/locales/en.ts)

---

> Generated by Trae AI Assistant
