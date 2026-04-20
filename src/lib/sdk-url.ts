/**
 * SDK 平台 URL 工具函数
 * 用于生成嵌入代码时使用完整的 URL，解决跨域问题
 */

/**
 * 获取 SDK 平台的基础 URL
 * 优先使用环境变量配置的域名，否则使用当前页面域名
 */
export function getSDKPlatformUrl(): string {
  // 1. 检查环境变量中的域名配置（生产环境）
  if (typeof window === 'undefined') {
    // 服务端：使用环境变量
    const frontendDomain = process.env.FRONTEND_DOMAIN || process.env.COZE_PROJECT_DOMAIN_DEFAULT;
    if (frontendDomain) {
      return frontendDomain.replace(/\/$/, ''); // 移除末尾的斜杠
    }
    // 如果没有配置域名，返回空字符串（相对路径）
    return '';
  }

  // 2. 客户端：使用当前页面的 origin
  return window.location.origin;
}

/**
 * 获取 SDK 平台的基础 URL（强制使用环境变量配置）
 * 用于生成嵌入代码，确保第三方系统能正确访问
 */
export function getSDKPlatformUrlForEmbed(): string {
  // 1. 首先检查环境变量（服务端和客户端都优先使用配置的域名）
  const frontendDomain = process.env.FRONTEND_DOMAIN || 
                         process.env.COZE_PROJECT_DOMAIN_DEFAULT ||
                         process.env.NEXT_PUBLIC_FRONTEND_DOMAIN;
  
  if (frontendDomain) {
    return frontendDomain.replace(/\/$/, ''); // 移除末尾的斜杠
  }

  // 2. 如果没有配置，在服务端返回空字符串，在客户端使用当前 origin
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.origin;
}

/**
 * 获取 SDK 嵌入脚本的完整 URL
 * @param token SDK 分享 token
 * @returns 完整的脚本 URL
 */
export function getEmbedScriptUrl(token: string): string {
  const baseUrl = getSDKPlatformUrlForEmbed();
  if (baseUrl) {
    return `${baseUrl}/api/sdk/${token}/embed`;
  }
  // 如果没有配置域名，返回相对路径（开发环境）
  return `/api/sdk/${token}/embed`;
}

/**
 * 获取 SDK 预览页面的完整 URL
 * @param token SDK 分享 token
 * @returns 完整的预览 URL
 */
export function getPreviewUrl(token: string): string {
  const baseUrl = getSDKPlatformUrl();
  if (baseUrl) {
    return `${baseUrl}/sdk/${token}/preview`;
  }
  return `/sdk/${token}/preview`;
}

/**
 * 获取 SDK 信息 API 的完整 URL
 * @param token SDK 分享 token
 * @returns 完整的 API URL
 */
export function getSDKInfoUrl(token: string): string {
  const baseUrl = getSDKPlatformUrl();
  if (baseUrl) {
    return `${baseUrl}/api/sdk/${token}/info`;
  }
  return `/api/sdk/${token}/info`;
}

/**
 * 获取后端 API 基础 URL
 * 用于 SDK 预览时配置 apiBaseUrl，确保请求发送到正确的后端地址
 */
export function getBackendApiUrl(): string {
  // 1. 检查环境变量中的后端域名配置（生产环境）
  if (typeof window === 'undefined') {
    // 服务端：使用环境变量
    const backendDomain = process.env.BACKEND_DOMAIN || process.env.LINGTONG_BASE_URL;
    if (backendDomain) {
      return backendDomain.replace(/\/$/, ''); // 移除末尾的斜杠
    }
    // 如果没有配置，返回空字符串（使用相对路径）
    return '';
  }

  // 2. 客户端：优先使用环境变量，否则使用当前页面 origin
  // 注意：开发环境下前端和后端可能在不同端口，需要配置 BACKEND_DOMAIN
  const backendDomain = process.env.BACKEND_DOMAIN || process.env.LINGTONG_BASE_URL;
  if (backendDomain) {
    return backendDomain.replace(/\/$/, '');
  }

  // 3. 如果没有配置，使用当前页面的 origin（假设前后端同域或反向代理）
  return window.location.origin;
}

/**
 * 获取后端 API 基础 URL（强制使用环境变量配置）
 * 用于生成嵌入代码，确保第三方系统能正确访问后端 API
 */
export function getBackendApiUrlForEmbed(): string {
  // 1. 首先检查环境变量（服务端和客户端都优先使用配置的域名）
  const backendDomain = process.env.BACKEND_DOMAIN || 
                        process.env.LINGTONG_BASE_URL ||
                        process.env.NEXT_PUBLIC_BACKEND_DOMAIN;
  
  if (backendDomain) {
    return backendDomain.replace(/\/$/, ''); // 移除末尾的斜杠
  }

  // 2. 如果没有配置，在服务端返回空字符串，在客户端使用当前 origin
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.origin;
}

/**
 * 获取嵌入代码生成时使用的基础 URL
 * 优先使用环境变量中的域名配置（生产环境），否则使用当前页面 origin
 * 这是推荐配置方式，确保第三方系统能正确访问 SDK 平台
 */
export function getEmbedCodeBaseUrl(): string {
  // 1. 优先使用环境变量中的域名配置（生产环境）
  const frontendDomain = process.env.FRONTEND_DOMAIN || 
                         process.env.COZE_PROJECT_DOMAIN_DEFAULT ||
                         process.env.NEXT_PUBLIC_FRONTEND_URL;
  if (frontendDomain) {
    return frontendDomain.replace(/\/$/, '');
  }
  // 2. 如果没有配置，使用当前页面 origin（开发环境）
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}
