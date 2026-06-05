/**
 * Embedded rule data — matches alibaba/open-code-review's rule_docs/ exactly.
 * Loaded at module init; no filesystem reads needed at runtime.
 */
import type { SystemRule, PathRule } from '../core/types.js';

// ---- rule_docs content (embedded) ----

const DEFAULT_MD = `#### Correctness
Is the logic correct? Are there missing boundary conditions?
Are exceptions handled properly?
Is it thread-safe in concurrent scenarios?
#### Security
Are there security vulnerabilities such as SQL injection or XSS?
Is sensitive information handled correctly?
Is permission validation complete?
#### Performance
Are there obvious performance issues (e.g., N+1 queries, unnecessary loops)?
Are resources properly released?
#### Maintainability
Is the code clear and easy to understand?
Do names accurately express intent?
Does it follow the project's existing code style and architecture patterns?
#### Test Coverage
Do critical logic paths have corresponding test cases?
Do test cases cover boundary conditions?`;

const TS_JS_TSX_JSX_MD = `#### 明确的错别字或拼写错误识别
- 变量名、函数名、组件名、Props 属性名中的拼写错误
- 日志或错误信息中的字符串包含影响阅读理解的拼写错误

#### 死代码
- 永远不会被执行到的代码块（如条件恒为 false 的分支、return 语句后的代码）
- 声明后从未被读取或引用的变
- 已注释掉的大段代码块（无明显保留意图的注释代码）

#### 代码质量检查
- **重复代码**：检查是否有可以抽取的公共逻辑
- **代码注释**：复杂业务逻辑是否有清晰的注释说明（避免显而易见的代码注释）
- **硬编码检查**：禁止使用业务相关的硬编码字符串，特别是 URL 路径、业务数字；简单 UI 文本可适当放宽
- **变量声明**：严格禁止使用 var，必须使用 let 或 const
- **相等比较**：禁止使用==和!=，必须使用严格相等===和!==
- **TypeScript 类型**：避免使用 any 类型，如需使用请注释说明原因
- **空值判断**：在取值或解构赋值时进行空值判断，避免空指针异常
- **三元表达式**：不允许嵌套三元表达式
 
#### React 最佳实践
- **Hooks 使用**：是否遵循 Hooks 规则（只在顶层调用、只在 React 函数中调用）
- **状态管理**：状态是否放在合适的层级，避免不必要的状态提升
- **副作用处理**：useEffect 是否正确处理依赖和清理函数
- **性能优化**：是否合理使用 React.memo、useMemo、useCallback（基于性能分析，避免过度优化）
- **render 副作用**：严格禁止在 React 组件的 render 方法中进行副作用操作（如 API 调用、DOM 操作
- **内联样式**：避免使用内联 style 样式，动态样式除外
- **内部组件**：禁止在组件内部声明一个新组件，如有需要请使用方法的方式来渲染，如\`renderItem\` ,而不是\`<Item/>\`
 
#### 异步处理规范
- **错误处理**：异步函数必须包含适当的错误处理，并提供用户友好的错误提示
- **async/await 优先**：相较于 Promise 更推荐使用 async/await，禁止使用回调地狱
- **循环异步**：区分独立异步操作（用 Promise.all 并行）和依赖性异步操作（用串行），优先考虑 Promise.all 来提升性能
 
#### 代码安全性检查
- **XSS 防护**：是否对用户输入进行适当的转义
- **innerHTML 安全**：禁止使用 innerHTML 直接插入用户输入内容，必须使用 textContent 或进行 XSS 防护
- **代码注入防护**：严格禁止使用 eval()、Function()构造函数和 setTimeout/setInterval 的字符串参数形式
- **危险方法**：禁止使用 document.write()，会导致页面重绘和安全问题
- **敏感信息**：是否暴露了 API 密钥或敏感数据
- **原型链安全**：禁止修改原生对象的原型链（如 Array.prototype、Object.prototype`;

const JAVA_MD = `#### 明确的错别字或拼写错误
- 定义处的变量名、方法名、类名中的拼写错误（通过\`code.search\`搜索同类命名规范确认）
- 日志或异常信息中的字符串包含影响阅读理解的拼写错误
- 请不要报告引用处的拼写错误，因为这些通常是由定义决定的

#### 死代码
- 永远不会被执行到的代码块（如条件恒为 false 的分支、return 语句后的代码）
- 声明后从未被读取或引用的变
- 已注释掉的大段代码块（无明显保留意图的注释代码）

#### 逻辑错误识别
- if 条件逻辑错误（使用\`file.read\`查看上下文确认预期逻辑）
- 边界条件处理错误（特别关注索引、数组长度判断等）
- 布尔逻辑运算符误用（优先级、短路评估问题）
- 明显的死循环或递归中无终止条件
- 在不应该退出的地方使用 return/break/continue
- switch case 缺少 break 语句导致的意外穿透
- 有意的穿透但缺少注释说明
- 可能导致NPE的代码模式（通过\`file.read\`和\`code.search\`检查数据来源调用链确认风险）
- 逻辑表达式缺少括号导致执行顺序可能与预期不一致

#### 严重性能隐患
- 在循环内部执行数据库查询（通过\`code.search\`确认方法调用是否涉及数据库操作）
- N+1查询问题（应建议批量查询优化）
- 未分页的大数据集处理（可通过\`file.read\`了解数据规模和处理上下文）
- 嵌套循环中的低效算法实现（O(n²)及以上复杂度但有更优解法）

#### 线程安全问题识别
仅在以下情况下才指出线程安全问题：
- **竞态条件**：存在"检查-然后-执行"模式，中间状态可能被其他线程改变
- **复合操作原子性缺失**：多步操作需要保证原子性但未使用同步机制
- **不安全的懒加载**：单例模式或缓存实现中的双重检查锁定缺陷
- **线程不安全集合的并发写操作**：多线程环境下对ArrayList、HashMap等非线程安全集合的修改

以下情况下不应报告：
- **方法内部的局部变量**：这些天然线程安全，每个线程都有独立副本
- **单线程上下文的使用**：未发现明显的多线程调用（可通过\`code.search\`搜索相关调用上下文确认）
- **只读操作**：即使使用非线程安全的数据结构，如果只进行读取操作
- **不可变对象**：final字段且指向不可变对象的引用
- **已有适当同步机制**：代码已使用synchronized、Lock、原子类等正确同步
- **设计为单线程使用的组件**：如Builder模式的构建过程、临时数据传输对象等`;

const CPP_MD = `#### 明确的错别字或拼写错误识别
- 定义处的变量名、常量名、函数名中包含拼写错误，请不要报告调用处的拼写错误
- 日志或异常信息中的字符串包含影响阅读理解的拼写错误

#### 死代码
- 永远不会被执行到的代码块（如条件恒为 false 的分支、return 语句后的代码）
- 声明后从未被读取或引用的变
- 已注释掉的大段代码块（无明显保留意图的注释代码）

#### 智能指针使用
**检查要点：**
- 优先使用\`std::unique_ptr\`管理独占资源
- 使用\`std::shared_ptr\`管理共享资源
- 避免使用裸指针管理动态内存
- 正确使用\`std::weak_ptr\`打破循环引用

**示例：**
\`\`\`cpp
// ❌ 避免使用裸指针
Widget* widget = new Widget();
delete widget; // 容易忘记或异常时不执行

// ✅ 使用智能指针
auto widget = std::make_unique<Widget>();
// 自动析构，异常安全
\`\`\`

#### RAII原则
**检查要点：**
- 资源在构造函数中获取
- 资源在析构函数中释放
- 使用栈对象管理资源
- 避免手动资源管理

#### STL容器和算法
**检查要点：**
- 优先使用STL容器而非数组
- 使用STL算法而非手写循环
- 选择合适的容器类型
- 了解容器的性能特征

**示例：**
\`\`\`cpp
// ❌ 手写循环
std::vector<int> vec = {1, 2, 3, 4, 5};
for (int i = 0; i < vec.size(); ++i) {
    vec[i] *= 2;
}

// ✅ 使用算法
std::transform(vec.begin(), vec.end(), vec.begin(),
               [](int x) { return x * 2; });
\`\`\`

#### auto关键字
**检查要点：**
- 类型复杂时使用auto
- 避免在简单类型上滥用auto
- 使用auto&和const auto&避免拷贝

#### 异常处理完整性
**检查要点：**
- 捕获具体异常类型而非...
- 异常处理不要忽略错误

#### const正确性
**检查要点：**
- 成员函数const修饰
- 参数const引用传递
- 指针和引用的const位置
- const成员变量合理使用`;

const C_MD = `#### 明确的错别字或拼写错误识别
- 定义处的变量名、常量名、函数名中包含拼写错误，请不要报告调用处的拼写错误
- 日志或异常信息中的字符串包含影响阅读理解的拼写错误

#### malloc/free配对使用
**检查要点：**
- 每个\`malloc()\`都有对应的\`free()\`
- 避免重复释放同一内存块
- 释放后将指针设为NULL

**示例：**
\`\`\`c
// ❌ 错误示例
char* buffer = malloc(1024);
// 使用buffer...
// 忘记释放内存

// ✅ 正确示例
char* buffer = malloc(1024);
if (buffer != NULL) {
    // 使用buffer...
    free(buffer);
    buffer = NULL;
}
\`\`\`

#### 内存泄漏检查
**检查要点：**
- 所有分配的内存在函数退出前都被释放
- 错误处理路径中也要释放内存
- 使用工具如Valgrind进行检测

#### 缓冲区溢出防护
**检查要点：**
- 数组访问前检查边界
- 字符串操作使用安全函数
- 循环边界条件正确

**示例：**
\`\`\`c
// ❌ 危险操作
char buffer[100];
strcpy(buffer, user_input); // 可能溢出

// ✅ 安全操作
char buffer[100];
strncpy(buffer, user_input, sizeof(buffer) - 1);
buffer[sizeof(buffer) - 1] = '\\0';
\`\`\`

#### 字符串操作安全
**推荐使用的安全函数：**
- \`strncpy()\` 替代 \`strcpy()\`
- \`strncat()\` 替代 \`strcat()\`
- \`snprintf()\` 替代 \`sprintf()\`

#### 命名规范
**要求：**
- 使用snake_case命名方式
- 变量名要有意义
- 常量使用UPPER_CASE`;

const KOTLIN_MD = `### 1. 空安全（Null Safety）
- **问题**：未正确处理可空类型，导致潜在的\`NullPointerException\`。
- **检查点**：
  - 避免滥用\`!!\`（非空断言），优先使用安全调用\`?.\`或Elvis操作符\`?:\`。
  - 数据类或API返回的可空属性是否合理处理。
- **坏例子**：
  \`\`\`kotlin
  val length: Int = text!!.length // 风险：text可能为null
  \`\`\`
- **改进**：
  \`\`\`kotlin
  val length: Int = text?.length ?: 0 // 安全处理
  \`\`\`

#### 死代码
- 永远不会被执行到的代码块（如条件恒为 false 的分支、return 语句后的代码）
- 声明后从未被读取或引用的变
- 已注释掉的大段代码块（无明显保留意图的注释代码）

### 2. 函数与表达式简洁性
- **问题**：冗余代码破坏Kotlin的简洁性。
- **检查点**：
  - 单表达式函数是否用\`=\`简化（如\`fun sum(a: Int, b: Int) = a + b\`）。
  - 是否用\`when\`替代复杂\`if-else\`链。
  - 避免不必要的\`return\`（如Lambda中直接使用表达式结果）。
- **坏例子**：
  \`\`\`kotlin
  fun getGrade(score: Int): String {
      if (score >= 90) return "A"
      else if (score >= 80) return "B"
      else return "C"
  }
  \`\`\`
- **改进**：
  \`\`\`kotlin
  fun getGrade(score: Int) = when {
      score >= 90 -> "A"
      score >= 80 -> "B"
      else -> "C"
  }
  \`\`\`

### 3. 集合操作优化
- **问题**：低效的集合操作导致性能问题。
- **检查点**：
  - 优先使用\`Sequence\`处理大型集合（惰性求值减少中间对象）。
  - 避免重复操作（如多次\`filter\`合并为一次）。
  - 使用\`groupBy\`、\`associate\`等替代手动迭代。
- **坏例子**：
  \`\`\`kotlin
  val evenSquares = listOf(1, 2, 3).map { it * it }.filter { it % 2 == 0 } // 产生中间集合
  \`\`\`
- **改进**：
  \`\`\`kotlin
  val evenSquares = listOf(1, 2, 3).asSequence()
      .map { it * it }
      .filter { it % 2 == 0 }
      .toList() // 惰性计算
  \`\`\`

### 4. 协程（Coroutines）正确使用
- **问题**：协程泄漏或异常处理不当。
- **检查点**：
  - 使用结构化并发（\`coroutineScope\`或\`supervisorScope\`管理生命周期）。
  - 避免\`GlobalScope\`（易导致资源泄漏）。
  - 异常处理：用\`try/catch\`包裹\`withContext\`或\`async\`。
- **坏例子**：
  \`\`\`kotlin
  GlobalScope.launch { // 脱离作用域，可能泄漏
      fetchData()
  }
  \`\`\`
- **改进**：
  \`\`\`kotlin
  viewModelScope.launch { // 结构化并发
      try {
          withContext(Dispatchers.IO) { fetchData() }
      } catch (e: Exception) { /* 处理异常 */ }
  }
  \`\`\`

### 5. 类与对象设计
- **问题**：未合理使用Kotlin特性导致冗余。
- **检查点**：
  - **数据类**：纯数据对象用\`data class\`（自动生成\`equals\`/\`hashCode\`）。
  - **密封类/接口**：受限类型层次用\`sealed class\`（完善\`when\`分支检查）。
  - **委托**：属性委托（如\`by lazy\`）或类委托（\`by\`实现装饰器模式）。

### 6. 资源管理与作用域函数
- **问题**：资源未释放或作用域函数滥用。
- **检查点**：
  - 文件/网络资源用\`use\`自动关闭（如\`FileInputStream().use { ... }\`）。
  - 作用域函数（\`let\`、\`apply\`等）需保持可读性，避免嵌套过深。`;

const JSON_MD = '检查JSON文件中的json-key是否存在拼写错误，忽略json-value的内容。';

const YAML_MD = '检查YAML文件中的yaml-key是否存在拼写错误，忽略yaml-value的内容。';

const PROPERTIES_MD = `#### 明确的错别字或拼写错误识别
- 键名中的拼写错误，特别是常用配置项的标准拼写

#### 配置错误识别
- 当前文件中存在可见范围内重复的键定义导致配置覆盖问题
- 键值对格式错误（缺少等号、多余空格等）
- 特殊字符未正确转义（如路径中的反斜杠、Unicode字符等）

#### 严重的安全问题
- 敏感信息（密码、API密钥、数据库连接串等）以明文形式存储`;

const POM_XML_MD = '新增的代码中，version不允许包含snapshot字段，只允许引入其他的任何版本。注意：代码中没有声明版本号是因为版本号在父pom中管理，当版本号并非新增的代码行时请忽略。';

const BUILD_GRADLE_MD = '避免引入snapshot版本的依赖发布线上环境，建议引入具体的版本号。注意：版本号并非新增的代码行时请忽略。';

const PACKAGE_JSON_MD = `- 避免引入版本为 latest 或 *，建议引入具体的版本号。注意：版本号并非新增的代码行时请忽略
- 依赖冲突或重复声明：同一依赖同时存在于 dependencies 和 devDependencies
- 必需工具依赖未声明：scripts 里出现如 eslint、jest、prettier 等工具名称但未在 devDependencies 中体现`;

const MAPPER_DAO_XML_MD = `#### 明确拼写错误识别
- SQL关键字的拼写错误
- mapper接口方法名与XML中id不匹配的拼写错误
- 动态SQL标签中的属性名拼写错误（如 \`test\` 条件中的字段名）

#### SQL逻辑错误识别
- **条件判断错误**：WHERE条件中的逻辑运算符误用（AND/OR混淆）
- **JOIN条件错误**：关联条件使用错误的字段或缺少必要的关联条件
- **动态SQL逻辑错误**：\`<if test="">\` 条件判断错误，如空值判断、类型判断错误
- **SQL语法错误**：明显的语法错误，如缺少逗号、括号不匹配

#### 严重的性能问题
- **全表扫描风险**：WHERE条件缺失
- **大数据量查询缺少分页**：可能返回大量数据但未使用LIMIT或分页机制
- **重复子查询**：同一个子查询在多处使用，建议提取为临时表或优化SQL结构

#### SQL注入安全风险识别

**应该报告的真实安全风险：**
- **直接字符串拼接**：使用\`${'${'}\`拼接用户输入的参数到SQL语句中，存在SQL注入风险
- **LIKE查询拼接**：直接拼接LIKE条件而非使用安全的参数绑定方式

**不应该报告的情况：**
- **正确使用 #{} 参数绑定**：MyBatis会自动进行参数转义，安全性有保障
- **静态SQL语句**：不涉及动态参数的固定SQL语句

**审查原则：**
- 重点关注可能导致数据错误、性能问题或安全风险的严重问题
- 考虑SQL语句的实际执行效率和数据库性能影响
- 优先识别可能导致生产环境故障的关键问题
- 上下文不明时保持谨慎：当无法确定SQL执行的完整上下文时，应选择忽略而不是误报
- 需要充分证据：只有在有明确证据表明存在问题时才进行报告
- 宁可漏报不要误报：保持高精度的问题识别，避免因过多误报而干扰对真实问题的关注`;

// ---- Mapping (matches system-rules.json) ----

interface RuleMap {
  default_rule: string;
  path_rule_map: Record<string, string>;
}

const RULE_MAP: RuleMap = {
  default_rule: 'default.md',
  path_rule_map: {
    '**/*.properties': 'properties.md',
    '**/*{mapper,dao}*.xml': 'mapper_dao_xml.md',
    '**/pom.xml': 'pom_xml.md',
    '**/build.gradle': 'build_gradle.md',
    '**/package.json': 'package_json.md',
    '**/*.json': 'json.md',
    '**/*.{yaml,yml}': 'yaml.md',
    '**/*.java': 'java.md',
    '**/*.{ts,js,tsx,jsx}': 'ts_js_tsx_jsx.md',
    '**/*.{kt}': 'kotlin.md',
    '**/*.{cpp,cc,hpp}': 'cpp.md',
    '**/*.c': 'c.md',
  },
};

const RULE_CONTENT: Record<string, string> = {
  'default.md': DEFAULT_MD,
  'properties.md': PROPERTIES_MD,
  'mapper_dao_xml.md': MAPPER_DAO_XML_MD,
  'pom_xml.md': POM_XML_MD,
  'build_gradle.md': BUILD_GRADLE_MD,
  'package_json.md': PACKAGE_JSON_MD,
  'json.md': JSON_MD,
  'yaml.md': YAML_MD,
  'java.md': JAVA_MD,
  'ts_js_tsx_jsx.md': TS_JS_TSX_JSX_MD,
  'kotlin.md': KOTLIN_MD,
  'cpp.md': CPP_MD,
  'c.md': C_MD,
};

/**
 * Build the embedded SystemRule — equivalent to Go's LoadDefault().
 * Inlines markdown content so no filesystem access is needed at runtime.
 */
export function buildEmbeddedRules(): SystemRule {
  const defaultRule = RULE_CONTENT[RULE_MAP.default_rule] ?? '';
  const pathRules: PathRule[] = [];
  for (const [pattern, ruleFile] of Object.entries(RULE_MAP.path_rule_map)) {
    const content = RULE_CONTENT[ruleFile] ?? '';
    pathRules.push({ pattern, rule: content });
  }
  return { defaultRule, pathRules };
}
