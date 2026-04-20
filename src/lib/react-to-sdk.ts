/**
 * React 项目转 JS SDK 工具 - 分层架构增强版
 * 支持 React/Vue/Ant Design/@ant-design/x 等复杂依赖
 * 支持多文件打包和内部模块解析
 * 
 * 架构原则：
 * 1. SDK层：只包含核心业务逻辑和UI组件
 * 2. 内嵌代码层：负责所有与外部系统的交互
 * 
 * 新增特性：
 * - 事件驱动通信机制
 * - 统一的数据服务层 (dataService)
 * - 完整的生命周期管理
 * - 安全的跨域通信
 * - Shadow DOM 样式隔离
 */

export interface ProjectFile {
  path: string;
  content: string;
}

export interface ProjectConfig {
  name: string;
  description?: string;
  files: ProjectFile[];
  entry?: string;
  dependencies?: Record<string, string>;
  externalDeps?: string[];
  framework?: 'react' | 'vue' | 'auto';
}

export interface BuildResult {
  success: boolean;
  bundle?: string;
  error?: string;
  warnings?: string[];
}

// ============================================
// 简易模块打包器 - 替代已删除的 module-bundler
// ============================================

interface ModuleFile {
  path: string;
  content: string;
}

interface BundleResult {
  code: string;
  warnings: string[];
  externalDeps: string[];
}

/**
 * 为缺失的模块生成模拟模块
 */
function generateMockModules(files: ModuleFile[]): Map<string, string> {
  const mockModules = new Map<string, string>();
  const existingPaths = new Set(files.map(f => f.path));
  const importedModules = new Set<string>();
  
  // 扫描所有导入
  files.forEach(file => {
    const importRegex = /from\s+['"](\.[^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(file.content)) !== null) {
      let importPath = match[1];
      // 尝试解析相对路径
      if (!importPath.endsWith('.ts') && !importPath.endsWith('.tsx') && 
          !importPath.endsWith('.js') && !importPath.endsWith('.jsx')) {
        importPath += '.ts';
      }
      importedModules.add(importPath);
    }
  });
  
  // 为缺失的模块生成空导出
  importedModules.forEach(importPath => {
    if (!existingPaths.has(importPath)) {
      mockModules.set(importPath, '// Mock module\nexport default {};\nexport {};\n');
    }
  });
  
  return mockModules;
}

/**
 * 简单打包多个文件
 */
function bundleFiles(files: ModuleFile[]): BundleResult {
  const warnings: string[] = [];
  const externalDeps = new Set<string>();
  
  // 扫描外部依赖
  files.forEach(file => {
    const importRegex = /from\s+['"]([^.'""][^'"]*)['"]/g;
    let match;
    while ((match = importRegex.exec(file.content)) !== null) {
      const dep = match[1];
      if (!dep.startsWith('.')) {
        externalDeps.add(dep);
      }
    }
  });
  
  // 将所有文件内容合并，使用注释分隔
  const code = files.map(file => {
    return `\n// === ${file.path} ===\n${file.content}`;
  }).join('\n');
  
  return {
    code,
    warnings,
    externalDeps: Array.from(externalDeps),
  };
}

// ============================================
// CDN 依赖配置
// 定义常用库的 CDN 地址和全局变量映射
// ============================================
export const CDN_DEPENDENCIES: Record<string, {
  cdn: string[];
  global: string;
  requires?: string[];
  isModule?: boolean;
}> = {
  // React 核心
  'react': {
    cdn: ['https://unpkg.com/react@18/umd/react.production.min.js'],
    global: 'React',
  },
  'react-dom': {
    cdn: ['https://unpkg.com/react-dom@18/umd/react-dom.production.min.js'],
    global: 'ReactDOM',
    requires: ['react'],
  },
  'react-dom/client': {
    cdn: ['https://unpkg.com/react-dom@18/umd/react-dom.production.min.js'],
    global: 'ReactDOM',
    requires: ['react'],
  },
  
  // Vue
  'vue': {
    cdn: ['https://unpkg.com/vue@3/dist/vue.global.prod.js'],
    global: 'Vue',
  },
  
  // Ant Design
  'antd': {
    cdn: [
      'https://unpkg.com/dayjs@1/dayjs.min.js',
      'https://unpkg.com/antd@5/dist/antd.min.js',
    ],
    global: 'antd',
    requires: ['react', 'react-dom'],
  },
  
  // Ant Design Icons
  '@ant-design/icons': {
    cdn: ['https://unpkg.com/@ant-design/icons@5/dist/index.umd.min.js'],
    global: 'icons',
    requires: ['react'],
  },
  
  // Ant Design X (聊天组件)
  '@ant-design/x': {
    cdn: ['https://unpkg.com/@ant-design/x@1/dist/umd/x.min.js'],
    global: 'AntDesignX',
    requires: ['react', 'react-dom', 'antd'],
  },
  
  // React Markdown
  'react-markdown': {
    cdn: ['https://esm.sh/react-markdown@9?deps=react@18'],
    global: 'ReactMarkdown',
    requires: ['react'],
    isModule: true,
  },
  
  // 常用工具库
  'lodash': {
    cdn: ['https://unpkg.com/lodash@4/lodash.min.js'],
    global: '_',
  },
  'axios': {
    cdn: ['https://unpkg.com/axios/dist/axios.min.js'],
    global: 'axios',
  },
  'dayjs': {
    cdn: ['https://unpkg.com/dayjs@1/dayjs.min.js'],
    global: 'dayjs',
  },
  
  // 图表库
  'echarts': {
    cdn: ['https://unpkg.com/echarts@5/dist/echarts.min.js'],
    global: 'echarts',
  },
  'echarts-for-react': {
    cdn: ['https://unpkg.com/echarts@5/dist/echarts.min.js'],
    global: 'echarts',
    requires: ['react', 'echarts'],
  },
};

/**
 * 获取依赖的 CDN 脚本标签
 */
export function getCDNScripts(deps: string[]): string {
  const scripts: string[] = [];
  const added = new Set<string>();
  
  // 递归添加依赖
  function addDep(dep: string) {
    if (added.has(dep)) return;
    added.add(dep);
    
    const config = CDN_DEPENDENCIES[dep];
    if (!config) return;
    
    // 先添加依赖项
    if (config.requires) {
      config.requires.forEach(addDep);
    }
    
    // 添加当前依赖的 CDN
    config.cdn.forEach(url => {
      if (!scripts.includes(url)) {
        scripts.push(url);
      }
    });
  }
  
  deps.forEach(addDep);
  
  return scripts.map(url => `<script src="${url}"></script>`).join('\n');
}

/**
 * 获取依赖的全局变量映射代码
 */
export function getGlobalMappings(deps: string[]): string {
  const mappings: string[] = [];
  const added = new Set<string>();
  
  function addDep(dep: string) {
    if (added.has(dep)) return;
    added.add(dep);
    
    const config = CDN_DEPENDENCIES[dep];
    if (!config) return;
    
    // 先处理依赖项
    if (config.requires) {
      config.requires.forEach(addDep);
    }
    
    // 添加全局变量映射
    const safeName = dep.replace(/[@\/\-]/g, '_').replace(/^_/, '');
    mappings.push(`const ${safeName} = window['${config.global}'];`);
  }
  
  deps.forEach(addDep);
  
  return mappings.join('\n');
}

/**
 * 检测项目框架类型
 */
export function detectFramework(files: ProjectFile[]): 'react' | 'vue' {
  for (const file of files) {
    const ext = file.path.split('.').pop()?.toLowerCase();
    if (ext === 'vue') return 'vue';
    
    const content = file.content;
    if (content.includes('from \'vue\'') || content.includes('from "vue"')) {
      return 'vue';
    }
    if (content.includes('from \'react\'') || content.includes('from "react"')) {
      return 'react';
    }
  }
  return 'react';
}

/**
 * 解析 Vue SFC
 */
export function parseVueSFC(content: string): {
  template: string;
  script: string;
  style: string;
  scriptSetup: string;
} {
  const result = {
    template: '',
    script: '',
    style: '',
    scriptSetup: '',
  };

  const templateMatch = content.match(/<template[^>]*>([\s\S]*?)<\/template>/i);
  if (templateMatch) {
    result.template = templateMatch[1].trim();
  }

  const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  if (scriptMatch) {
    result.script = scriptMatch[1].trim();
  }

  const scriptSetupMatch = content.match(/<script\s+setup[^>]*>([\s\S]*?)<\/script>/i);
  if (scriptSetupMatch) {
    result.scriptSetup = scriptSetupMatch[1].trim();
  }

  const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (styleMatch) {
    result.style = styleMatch[1].trim();
  }

  return result;
}

/**
 * 将 Vue SFC 转换为渲染函数代码
 */
export function convertVueToRender(vueContent: string, componentName: string): string {
  const { template, script, style, scriptSetup } = parseVueSFC(vueContent);
  
  let code = `
// Vue 组件: ${componentName}
const ${componentName} = {
  ${scriptSetup ? 'setup() {' + scriptSetup + '},' : ''}
  template: ${JSON.stringify(template)},
  ${script ? script.replace(/export default\s*\{?/, '').replace(/\}?$/, '') : ''}
};

// Vue 样式注入
${style ? `(function() {
  const style = document.createElement('style');
  style.textContent = ${JSON.stringify(style)};
  document.head.appendChild(style);
})();` : ''}
`;

  return code;
}

/**
 * 增强版 TypeScript/JSX 转换
 * 支持更多 npm 包的全局变量映射
 * 支持模板变量替换
 */
export function transpileEnhanced(code: string, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  // Vue 文件处理
  if (ext === 'vue') {
    return convertVueToRender(code, 'AppComponent');
  }
  
  let result = code;

  // 0. 处理环境变量和配置引用
  // 将 process.env.xxx 转换为 sdk.get() 调用
  result = result.replace(/process\.env\.([A-Z_]+)/g, (_, envName) => {
    const configKey = envName.toLowerCase().replace(/_/g, '');
    return `__SDK__.get('${configKey}', '')`;
  });
  
  // 将 import.meta.env.xxx 转换为 sdk.get() 调用
  result = result.replace(/import\.meta\.env\.([A-Z_]+)/g, (_, envName) => {
    const configKey = envName.toLowerCase().replace(/_/g, '');
    return `__SDK__.get('${configKey}', '')`;
  });
  
  // 将 __ASSETS_BASE_URL__ 等全局常量转换为 sdk.asset() 调用
  result = result.replace(/__ASSETS_BASE_URL__/g, '__SDK__.config.assetsBaseUrl');
  result = result.replace(/__API_BASE_URL__/g, '__SDK__.config.apiBaseUrl');
  
  // 处理 require.context (Webpack 特有)
  result = result.replace(/require\.context\([^)]+\)/g, '[] /* require.context not supported in SDK */');

  // 1. 移除 TypeScript 类型注解
  result = result.replace(/\(([^)]*)\)\s*:/g, (match, params) => {
    const cleanParams = params.replace(/:\s*[A-Z][a-zA-Z0-9<>[\]|&\s,]*(?=,|\)|$)/g, '');
    return `(${cleanParams})`;
  });
  
  result = result.replace(/:\s*[A-Z][a-zA-Z0-9<>[\]|&\s]*(?=[,)\]=;:}]\s*$)/gm, '');
  result = result.replace(/:\s*[A-Z][a-zA-Z0-9<>[\]|&\s]*$/gm, '');
  result = result.replace(/<[A-Z][a-zA-Z0-9,\s]*>(?=\()/g, '');
  
  // 2. 移除 import type
  result = result.replace(/import\s+type\s+\{[^}]*\}\s+from\s+['"][^'"]+['"];?/g, '');
  result = result.replace(/import\s+type\s+\w+\s+from\s+['"][^'"]+['"];?/g, '');
  
  // 3. 移除 interface/type 声明
  result = result.replace(/^interface\s+\w+\s*(?:<[^>]*>)?\s*\{[^}]*\}/gm, '');
  result = result.replace(/^type\s+\w+\s*(?:<[^>]*>)?\s*=\s*[^;]+;/gm, '');
  result = result.replace(/export\s+type\s+\w+\s*(?:<[^>]*>)?\s*=\s*[^;]+;/g, '');
  
  // 4. 转换各种 import 语句
  
  // React 相关
  result = result.replace(
    /import\s+(\w+)\s*,?\s*\{([^}]*)\}\s+from\s+['"]react['"];?/g,
    (_, defaultExport, namedExports) => {
      const exports = namedExports.split(',').map((e: string) => e.trim()).filter(Boolean);
      const globalRefs = exports.map((e: string) => `const ${e} = window.React.${e} || window.${e};`).join('\n');
      return `const ${defaultExport} = window.React;\n${globalRefs}`;
    }
  );
  
  result = result.replace(/import\s+(\w+)\s+from\s+['"]react['"];?/g, 'const $1 = window.React;');
  result = result.replace(/import\s+(\w+)\s+from\s+['"]react-dom['"];?/g, 'const $1 = window.ReactDOM;');
  
  result = result.replace(
    /import\s+\{([^}]*)\}\s+from\s+['"]react['"];?/g,
    (_, exports) => {
      const names = exports.split(',').map((e: string) => e.trim()).filter(Boolean);
      return names.map((n: string) => `const ${n} = window.React.${n} || window.${n};`).join('\n');
    }
  );
  
  // Vue 相关
  result = result.replace(
    /import\s+\{([^}]*)\}\s+from\s+['"]vue['"];?/g,
    (_, exports) => {
      const names = exports.split(',').map((e: string) => e.trim()).filter(Boolean);
      return names.map((n: string) => `const ${n} = window.Vue.${n} || window.${n};`).join('\n');
    }
  );
  
  // Ant Design
  result = result.replace(
    /import\s+\{([^}]*)\}\s+from\s+['"]antd['"];?/g,
    (_, exports) => {
      const names = exports.split(',').map((e: string) => e.trim()).filter(Boolean);
      return names.map((n: string) => `const ${n} = window.antd.${n} || window.antd['${n}'];`).join('\n');
    }
  );
  
  result = result.replace(/import\s+(\w+)\s+from\s+['"]antd['"];?/g, 'const $1 = window.antd;');
  
  // @ant-design/icons
  result = result.replace(
    /import\s+\{([^}]*)\}\s+from\s+['"]@ant-design\/icons['"];?/g,
    (_, exports) => {
      const names = exports.split(',').map((e: string) => e.trim()).filter(Boolean);
      return names.map((n: string) => `const ${n} = window.icons.${n} || window.icons['${n}'];`).join('\n');
    }
  );
  
  // @ant-design/x
  result = result.replace(
    /import\s+\{([^}]*)\}\s+from\s+['"]@ant-design\/x['"];?/g,
    (_, exports) => {
      const names = exports.split(',').map((e: string) => e.trim()).filter(Boolean);
      return names.map((n: string) => `const ${n} = window.AntDesignX.${n} || window.AntDesignX['${n}'];`).join('\n');
    }
  );
  
  result = result.replace(/import\s+(\w+)\s+from\s+['"]@ant-design\/x['"];?/g, 'const $1 = window.AntDesignX;');
  
  // @umijs/max 替换 (提供兼容层)
  result = result.replace(/import\s+\{([^}]*)\}\s+from\s+['"]@umijs\/max['"];?/g, (_, exports) => {
    const names = exports.split(',').map((e: string) => e.trim()).filter(Boolean);
    return names.map((n: string) => {
      // 提供兼容替代
      if (n === 'Helmet') return `const Helmet = ({ children }) => children;`;
      if (n === 'useNavigate') return `const useNavigate = () => () => console.warn('navigate not available in SDK');`;
      if (n === 'useLocation') return `const useLocation = () => ({ pathname: window.location.pathname });`;
      if (n === 'useParams') return `const useParams = () => ({});`;
      return `const ${n} = undefined; // @umijs/max not supported`;
    }).join('\n');
  });
  
  // react-markdown
  result = result.replace(/import\s+(\w+)\s+from\s+['"]react-markdown['"];?/g, 
    'const $1 = window.ReactMarkdown || ((props) => React.createElement("div", null, props.children));');
  
  // 其他常用库
  result = result.replace(/import\s+(\w+)\s+from\s+['"]lodash['"];?/g, 'const $1 = window._;');
  result = result.replace(/import\s+(\w+)\s+from\s+['"]axios['"];?/g, 'const $1 = window.axios;');
  result = result.replace(/import\s+(\w+)\s+from\s+['"]dayjs['"];?/g, 'const $1 = window.dayjs;');
  result = result.replace(/import\s+(\w+)\s+from\s+['"]echarts['"];?/g, 'const $1 = window.echarts;');

  return result;
}

/**
 * 处理项目文件（增强版 - 支持多文件打包）
 */
export function processProjectFilesEnhanced(files: ProjectFile[]): { 
  code: string; 
  framework: 'react' | 'vue';
  detectedDeps: string[];
  warnings: string[];
} {
  const framework = detectFramework(files);
  const detectedDeps = new Set<string>();
  const warnings: string[] = [];
  
  // 默认核心依赖
  if (framework === 'vue') {
    detectedDeps.add('vue');
  } else {
    detectedDeps.add('react');
    detectedDeps.add('react-dom');
  }
  
  // 检查是否有内部模块引用
  const hasInternalModules = files.some(f => 
    f.content.includes('@/') || 
    f.content.includes('../') ||
    files.length > 1
  );
  
  // 如果有多个文件或内部模块引用，使用打包模式
  if (hasInternalModules && files.length > 1) {
    // 生成缺失模块的模拟
    const mockModules = generateMockModules(files as ModuleFile[]);
    
    // 将模拟模块添加到文件列表
    const allFiles: ModuleFile[] = [...files as ModuleFile[]];
    mockModules.forEach((content: string, path: string) => {
      allFiles.push({ path, content });
    });
    
    // 打包所有文件
    const bundleResult = bundleFiles(allFiles);
    warnings.push(...bundleResult.warnings);
    bundleResult.externalDeps.forEach((dep: string) => detectedDeps.add(dep));
    
    // 对打包后的代码应用 JSX 转译
    const transpiledCode = transpileEnhanced(bundleResult.code, 'bundle.tsx');
    
    return {
      code: transpiledCode,
      framework,
      detectedDeps: Array.from(detectedDeps),
      warnings,
    };
  }
  
  // 单文件模式 - 原有逻辑
  const processedCode: string[] = [];
  
  // 检测所有文件的依赖
  files.forEach(file => {
    const content = file.content;
    
    const importRegex = /from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const dep = match[1];
      if (dep.startsWith('.')) continue;
      if (CDN_DEPENDENCIES[dep]) {
        detectedDeps.add(dep);
      }
    }
    
    if (content.includes('antd.') || content.includes('from "antd"') || content.includes("from 'antd'")) {
      detectedDeps.add('antd');
    }
    if (content.includes('@ant-design/icons') || content.includes('window.icons')) {
      detectedDeps.add('@ant-design/icons');
    }
    if (content.includes('@ant-design/x') || content.includes('window.AntDesignX')) {
      detectedDeps.add('@ant-design/x');
    }
    if (content.includes('react-markdown') || content.includes('window.ReactMarkdown')) {
      detectedDeps.add('react-markdown');
    }
    if (content.includes('from "lodash"') || content.includes("from 'lodash'") || content.includes('window._')) {
      detectedDeps.add('lodash');
    }
    if (content.includes('from "axios"') || content.includes("from 'axios'") || content.includes('window.axios')) {
      detectedDeps.add('axios');
    }
    if (content.includes('from "echarts"') || content.includes("from 'echarts'") || content.includes('window.echarts')) {
      detectedDeps.add('echarts');
    }
  });

  files.forEach(file => {
    const ext = file.path.split('.').pop()?.toLowerCase();
    
    if (ext === 'vue') {
      processedCode.push(transpileEnhanced(file.content, file.path));
      return;
    }
    
    if (ext === 'css') {
      processedCode.push(`
(function() {
  const style = document.createElement('style');
  style.textContent = ${JSON.stringify(file.content)};
  document.head.appendChild(style);
})();
`);
      return;
    }
    
    if (['tsx', 'ts', 'jsx', 'js'].includes(ext || '')) {
      processedCode.push(transpileEnhanced(file.content, file.path));
      return;
    }
    
    if (['txt', 'md', 'json'].includes(ext || '')) {
      const varName = file.path.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
      processedCode.push(`const ${varName} = ${JSON.stringify(file.content)};`);
      return;
    }
    
    processedCode.push(file.content);
  });

  return {
    code: processedCode.join('\n\n'),
    framework,
    detectedDeps: Array.from(detectedDeps),
    warnings,
  };
}

/**
 * 生成 SDK 包装代码（分层架构增强版）
 * 
 * 架构层次：
 * 1. SDK运行时层 - 事件系统、数据服务、生命周期、跨域通信
 * 2. 组件代码层 - 业务逻辑和UI
 * 3. 内嵌代码层 - 与宿主系统的交互
 */
export function generateSDKWrapperEnhanced(options: {
  componentName: string;
  componentCode: string;
  sdkToken: string;
  externalDeps: string[];
  framework?: 'react' | 'vue';
  styles?: string;
}): string {
  const { componentName, componentCode, sdkToken, externalDeps, framework = 'react', styles = '' } = options;
  
  const globalMappings = getGlobalMappings(externalDeps);
  const configKey = `SDK_CONFIG_${sdkToken.slice(0, 8).toUpperCase()}`;

  // 生命周期状态
  const lifecycleCode = `
  // ============== 生命周期管理 ==============
  const __lifecycle__ = {
    _state: 'idle',
    _hooks: {},
    
    register(hooks) {
      Object.assign(this._hooks, hooks);
    },
    
    async init(config) {
      if (this._state !== 'idle') return;
      this._state = 'initializing';
      try {
        __events__.emit('lifecycle:init', { config });
        if (this._hooks.onInit) await this._hooks.onInit(config);
        this._state = 'initialized';
        __events__.emit('lifecycle:initialized');
      } catch (err) {
        this._state = 'error';
        __events__.emit('lifecycle:error', { phase: 'init', error: err.message });
        if (this._hooks.onError) this._hooks.onError(err);
        throw err;
      }
    },
    
    async mount(container) {
      if (this._state === 'destroyed') throw new Error('SDK已销毁');
      this._state = 'mounting';
      try {
        __events__.emit('lifecycle:mount', { container });
        if (this._hooks.onMount) await this._hooks.onMount(container);
        this._state = 'mounted';
        __events__.emit('lifecycle:mounted');
      } catch (err) {
        this._state = 'error';
        __events__.emit('lifecycle:error', { phase: 'mount', error: err.message });
        if (this._hooks.onError) this._hooks.onError(err);
        throw err;
      }
    },
    
    async update(newConfig) {
      __events__.emit('lifecycle:update', { newConfig });
      if (this._hooks.onUpdate) await this._hooks.onUpdate(newConfig);
      __events__.emit('lifecycle:updated');
    },
    
    async destroy() {
      if (this._state === 'destroyed') return;
      this._state = 'destroying';
      try {
        __events__.emit('lifecycle:destroy');
        if (this._hooks.onDestroy) await this._hooks.onDestroy();
        this._state = 'destroyed';
        __events__.emit('lifecycle:destroyed');
      } catch (err) {
        __events__.emit('lifecycle:error', { phase: 'destroy', error: err.message });
        if (this._hooks.onError) this._hooks.onError(err);
      }
    },
    
    get state() { return this._state; }
  };
  `;

  // 事件系统
  const eventSystemCode = `
  // ============== 事件驱动通信系统 ==============
  const __events__ = {
    _handlers: new Map(),
    _history: [],
    
    emit(type, payload) {
      const event = { type, payload, timestamp: Date.now(), source: 'sdk' };
      this._history.push(event);
      if (this._history.length > 100) this._history.shift();
      
      // 触发内部监听器
      (this._handlers.get(type) || []).forEach(h => {
        try { h(event); } catch (e) { console.error('[SDK] Event handler error:', e); }
      });
      
      // 触发外部自定义事件（供内嵌代码监听）
      window.dispatchEvent(new CustomEvent('sdk:' + type, { detail: event }));
      
      if (__SDK__.config.debug) console.log('[SDK] Event:', type, payload);
    },
    
    on(type, handler) {
      if (!this._handlers.has(type)) this._handlers.set(type, []);
      this._handlers.get(type).push(handler);
      return () => this.off(type, handler);
    },
    
    off(type, handler) {
      if (!handler) { this._handlers.delete(type); return; }
      const handlers = this._handlers.get(type) || [];
      const idx = handlers.indexOf(handler);
      if (idx > -1) handlers.splice(idx, 1);
    }
  };
  `;

  // 数据服务层
  const dataServiceCode = `
  // ============== 统一数据服务层 ==============
  const __dataService__ = {
    _getUrl(path) {
      const base = __SDK__.config.apiBaseUrl || '';
      return base + (path.startsWith('/') ? path : '/' + path);
    },
    
    _getHeaders(customHeaders = {}) {
      const headers = { 'Content-Type': 'application/json' };
      if (__SDK__.config.apiKey) headers['X-API-Key'] = __SDK__.config.apiKey;
      if (__SDK__.config.token) headers['Authorization'] = 'Bearer ' + __SDK__.config.token;
      return { ...headers, ...customHeaders };
    },
    
    async _request(path, options = {}) {
      const url = this._getUrl(path);
      const startTime = Date.now();
      
      try {
        __events__.emit('request:start', { url, method: options.method || 'GET' });
        
        const response = await fetch(url, {
          ...options,
          headers: this._getHeaders(options.headers),
        });
        
        if (!response.ok) {
          const err = new Error('Request failed: ' + response.status);
          err.status = response.status;
          throw err;
        }
        
        const data = await response.json();
        __events__.emit('request:success', { url, duration: Date.now() - startTime });
        return data;
      } catch (err) {
        __events__.emit('request:error', { url, error: err.message });
        throw err;
      }
    },
    
    get(path, params = {}) {
      const query = new URLSearchParams(params).toString();
      return this._request(query ? path + '?' + query : path, { method: 'GET' });
    },
    
    post(path, data = {}) {
      return this._request(path, { method: 'POST', body: JSON.stringify(data) });
    },
    
    put(path, data = {}) {
      return this._request(path, { method: 'PUT', body: JSON.stringify(data) });
    },
    
    delete(path) {
      return this._request(path, { method: 'DELETE' });
    },
    
    async upload(path, file, options = {}) {
      const url = this._getUrl(path);
      const formData = new FormData();
      formData.append('file', file);
      if (options.fields) {
        Object.entries(options.fields).forEach(([k, v]) => formData.append(k, v));
      }
      
      const headers = {};
      if (__SDK__.config.apiKey) headers['X-API-Key'] = __SDK__.config.apiKey;
      if (__SDK__.config.token) headers['Authorization'] = 'Bearer ' + __SDK__.config.token;
      
      __events__.emit('upload:start', { fileName: file.name });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { ...headers, ...options.headers },
        body: formData
      });
      
      if (!response.ok) throw new Error('Upload failed: ' + response.status);
      const result = await response.json();
      __events__.emit('upload:success', { fileName: file.name });
      return result;
    },
    
    request(path, options) {
      return this._request(path, options);
    }
  };
  `;

  // 跨域通信
  const crossOriginCode = `
  // ============== 跨域通信安全机制 ==============
  const __messenger__ = {
    _handlers: new Map(),
    
    _isAllowed(origin) {
      const allowed = __SDK__.config.allowedOrigins || ['*'];
      if (allowed.includes('*')) return true;
      try {
        const host = new URL(origin).host;
        return allowed.some(a => a === '*' || new URL(a).host === host);
      } catch { return false; }
    },
    
    init() {
      window.addEventListener('message', (event) => {
        if (!this._isAllowed(event.origin)) {
          if (__SDK__.config.debug) console.warn('[SDK] Blocked message from:', event.origin);
          return;
        }
        if (!event.data || event.data._sdkToken !== SDK_TOKEN) return;
        
        const { type, payload } = event.data;
        __events__.emit('message:received', { type, payload, origin: event.origin });
        
        (this._handlers.get(type) || []).forEach(h => {
          try { h(payload, event.origin); } catch (e) {}
        });
      });
    },
    
    postMessage(type, data, targetOrigin = '*') {
      const message = { _sdkToken: SDK_TOKEN, type, payload: data, timestamp: Date.now() };
      
      if (window.parent !== window) window.parent.postMessage(message, targetOrigin);
      if (window.opener) window.opener.postMessage(message, targetOrigin);
      
      __events__.emit('message:sent', { type, targetOrigin });
    },
    
    onMessage(type, handler) {
      if (!this._handlers.has(type)) this._handlers.set(type, []);
      this._handlers.get(type).push(handler);
      return () => {
        const handlers = this._handlers.get(type) || [];
        const idx = handlers.indexOf(handler);
        if (idx > -1) handlers.splice(idx, 1);
      };
    }
  };
  `;

  // 渲染代码
  const renderCode = framework === 'vue' ? `
      // Vue 渲染
      if (typeof Vue !== 'undefined' && typeof ${componentName} !== 'undefined') {
        const app = Vue.createApp(${componentName});
        app.provide('sdk', __SDK__);
        app.config.globalProperties.$sdk = __SDK__;
        app.mount(mountPoint);
        __SDK__._vueApp = app;
      }
` : `
      // React 渲染
      if (typeof render === 'function') {
        render(mountPoint, __SDK__);
      } else if (typeof ${componentName} !== 'undefined' && typeof ReactDOM !== 'undefined') {
        const root = ReactDOM.createRoot(mountPoint);
        root.render(React.createElement(${componentName}, { sdk: __SDK__ }));
        __SDK__._reactRoot = root;
      }
`;

  // 完整SDK代码
  return `(function() {
  'use strict';

  // ========================================
  // SDK 分层架构 - 自动生成
  // ========================================
  // 1. SDK运行时层：事件系统、数据服务、生命周期、跨域通信
  // 2. 组件代码层：业务逻辑和UI
  // 3. 内嵌代码层：与宿主系统的交互
  // ========================================

  // SDK Token
  const SDK_TOKEN = '${sdkToken}';
  const CONFIG_KEY = '${configKey}';

  // 从宿主获取配置
  const HOST_CONFIG = window[CONFIG_KEY] || {};
  
  // 默认配置
  const DEFAULT_CONFIG = {
    assetsBaseUrl: '',
    apiBaseUrl: '',
    apiKey: '',
    token: '',
    custom: {},
    allowedOrigins: ['*'],
    useShadowDOM: true,
    debug: false
  };
  
  // 合并配置
  const SDK_CONFIG = { ...DEFAULT_CONFIG, ...HOST_CONFIG };

  ${eventSystemCode}

  ${dataServiceCode}

  ${crossOriginCode}

  ${lifecycleCode}

  // ============== SDK 主对象 ==============
  const __SDK__ = {
    config: SDK_CONFIG,
    
    // 事件系统
    events: {
      emit: (type, payload) => __events__.emit(type, payload),
      on: (type, handler) => __events__.on(type, handler),
      off: (type, handler) => __events__.off(type, handler)
    },
    
    // 数据服务
    data: __dataService__,
    
    // 资源URL
    asset(path) {
      const base = SDK_CONFIG.assetsBaseUrl || '';
      return base + (path.startsWith('/') ? path : '/' + path);
    },
    
    // API URL
    apiUrl(path) {
      const base = SDK_CONFIG.apiBaseUrl || '';
      return base + (path.startsWith('/') ? path : '/' + path);
    },
    
    // 获取配置
    get(key, defaultValue) {
      if (key.includes('.')) {
        const parts = key.split('.');
        let value = SDK_CONFIG;
        for (const part of parts) {
          value = value?.[part];
          if (value === undefined) break;
        }
        return value ?? defaultValue;
      }
      return SDK_CONFIG[key] ?? SDK_CONFIG.custom?.[key] ?? defaultValue;
    },
    
    // 更新配置
    setConfig(newConfig) {
      if (newConfig.custom) {
        SDK_CONFIG.custom = { ...SDK_CONFIG.custom, ...newConfig.custom };
        delete newConfig.custom;
      }
      Object.assign(SDK_CONFIG, newConfig);
      __lifecycle__.update(newConfig);
    },
    
    // 模板替换
    template(str) {
      return str
        .replace(/\\{\\{assets_base_url\\}\\}/g, SDK_CONFIG.assetsBaseUrl || '')
        .replace(/\\{\\{api_base_url\\}\\}/g, SDK_CONFIG.apiBaseUrl || '')
        .replace(/\\{\\{api_key\\}\\}/g, SDK_CONFIG.apiKey || '')
        .replace(/\\{\\{token\\}\\}/g, SDK_CONFIG.token || '')
        .replace(/\\{\\{custom\\.([^}]+)\\}\\}/g, (_, key) => SDK_CONFIG.custom?.[key] || '');
    },
    
    // 生命周期
    lifecycle: __lifecycle__,
    
    // 跨域通信
    postMessage: (type, data) => __messenger__.postMessage(type, data),
    onMessage: (type, handler) => __messenger__.onMessage(type, handler),
    
    // Shadow DOM 根节点
    shadowRoot: null,
    
    // ===== 向后兼容 API =====
    api: (path, options) => __dataService__.request(path, options),
    get: (path, params) => __dataService__.get(path, params),
    post: (path, data) => __dataService__.post(path, data),
    put: (path, data) => __dataService__.put(path, data),
    delete: (path) => __dataService__.delete(path),
    upload: (path, file, options) => __dataService__.upload(path, file, options)
  };

  // 初始化跨域通信
  __messenger__.init();

  // 外部依赖（由宿主系统提供）
  ${globalMappings}

  // ===== 打包后的组件代码 =====
  ${componentCode}
  // ===== 组件代码结束 =====

  // ============== 内嵌代码层 ==============
  // 注册生命周期钩子
  __lifecycle__.register({
    async onInit(config) {
      __events__.emit('sdk:ready', { config });
      window.dispatchEvent(new CustomEvent('sdk:initialized', { 
        detail: { config, token: SDK_TOKEN } 
      }));
    },
    
    async onMount(container) {
      // 创建 Shadow DOM 或普通容器
      const useShadow = SDK_CONFIG.useShadowDOM !== false;
      let mountPoint;
      
      if (useShadow && container.attachShadow) {
        __SDK__.shadowRoot = container.attachShadow({ mode: 'open' });
        
        // 注入样式
        ${styles ? `const styleEl = document.createElement('style');
        styleEl.textContent = ${JSON.stringify(styles)};
        __SDK__.shadowRoot.appendChild(styleEl);` : ''}
        
        // 创建挂载点
        mountPoint = document.createElement('div');
        mountPoint.style.cssText = 'width: 100%; height: 100%;';
        __SDK__.shadowRoot.appendChild(mountPoint);
      } else {
        mountPoint = container;
      }
      
      // 挂载组件
      try {
        ${renderCode}
      } catch (err) {
        console.error('[SDK] Render error:', err);
        mountPoint.innerHTML = '<div style="color:red;padding:20px;">SDK 加载失败: ' + err.message + '</div>';
      }
    },
    
    async onUpdate(newConfig) {
      window.dispatchEvent(new CustomEvent('sdk:config-updated', { 
        detail: { config: SDK_CONFIG } 
      }));
    },
    
    async onDestroy() {
      // 清理 Shadow DOM
      if (__SDK__.shadowRoot) {
        __SDK__.shadowRoot.innerHTML = '';
      }
      // 清理 React/Vue 实例
      if (__SDK__._reactRoot) {
        __SDK__._reactRoot.unmount();
      }
      if (__SDK__._vueApp) {
        __SDK__._vueApp.unmount();
      }
      window.dispatchEvent(new CustomEvent('sdk:destroyed', { 
        detail: { token: SDK_TOKEN } 
      }));
    },
    
    onError(error) {
      window.dispatchEvent(new CustomEvent('sdk:error', { 
        detail: { error: error.message } 
      }));
    }
  });

  // ===== SDK 初始化 =====
  async function initSDK() {
    const containers = document.querySelectorAll('[data-sdk-token="' + SDK_TOKEN + '"]');
    
    for (const container of containers) {
      if (container._sdkInitialized) continue;
      container._sdkInitialized = true;
      
      try {
        await __lifecycle__.init(SDK_CONFIG);
        await __lifecycle__.mount(container);
      } catch (err) {
        console.error('[SDK] Init failed:', err);
        container.innerHTML = '<div style="color:red;padding:20px;">SDK 初始化失败: ' + err.message + '</div>';
      }
    }
  }

  // DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSDK);
  } else {
    initSDK();
  }

  // 监听动态容器
  const observer = new MutationObserver(() => initSDK());
  observer.observe(document.body, { childList: true, subtree: true });

  // 页面卸载时销毁
  window.addEventListener('beforeunload', () => __lifecycle__.destroy());

  // 导出全局 API
  window['SDK_' + SDK_TOKEN.slice(0, 8)] = {
    init: initSDK,
    config: SDK_CONFIG,
    sdk: __SDK__,
    lifecycle: __lifecycle__,
    events: __events__,
    data: __dataService__
  };
  
  // 向后兼容
  window.__SDK__ = __SDK__;

})();
`;
}

/**
 * 验证项目结构
 */
export function validateProject(project: ProjectConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!project.name) {
    errors.push('项目名称不能为空');
  }

  if (!project.files || project.files.length === 0) {
    errors.push('至少需要一个文件');
  }

  const defaultEntries = ['App.tsx', 'App.vue', 'index.tsx', 'index.vue', 'main.tsx', 'main.vue'];
  const foundEntry = project.files.find(f => 
    defaultEntries.some(e => f.path === e || f.path.endsWith(e))
  );
  
  if (!foundEntry) {
    errors.push(`入口文件未找到，请上传 App.tsx 或 App.vue`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// 向后兼容的导出
export const transpileSimple = transpileEnhanced;
export const processProjectFiles = processProjectFilesEnhanced;
export const generateSDKWrapper = generateSDKWrapperEnhanced;
