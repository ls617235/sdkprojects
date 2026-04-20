/**
 * 图片资源处理工具
 * 支持将图片转换为 base64 格式，用于嵌入 SDK
 */

export interface ImageResource {
  filename: string;
  path: string;
  mimeType: string;
  base64: string;
  dataUrl: string;
  size: number;
  width?: number;
  height?: number;
}

/**
 * 获取图片的 MIME 类型
 */
export function getImageMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'bmp': 'image/bmp',
  };
  return mimeTypes[ext || ''] || 'image/png';
}

/**
 * 检查文件是否为图片
 */
export function isImageFile(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop();
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp'].includes(ext || '');
}

/**
 * 将 File 对象转换为 base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 移除 data:image/xxx;base64, 前缀
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 将 File 对象转换为 Data URL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 获取图片尺寸
 */
export function getImageDimensions(
  dataUrl: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * 处理图片文件，返回 ImageResource
 */
export async function processImageFile(
  file: File,
  basePath: string = '/images'
): Promise<ImageResource> {
  const dataUrl = await fileToDataUrl(file);
  const base64 = dataUrl.split(',')[1];
  const mimeType = getImageMimeType(file.name);
  
  let dimensions: { width: number; height: number } | undefined;
  
  // SVG 无法获取尺寸，跳过
  if (!file.name.toLowerCase().endsWith('.svg')) {
    try {
      dimensions = await getImageDimensions(dataUrl);
    } catch {
      // 忽略尺寸获取失败
    }
  }
  
  const filename = file.name;
  const path = `${basePath}/${filename}`;
  
  return {
    filename,
    path,
    mimeType,
    base64,
    dataUrl,
    size: file.size,
    ...dimensions,
  };
}

/**
 * 生成图片资源映射
 * 用于在 SDK 中快速查找图片
 */
export function generateImageMap(images: ImageResource[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const img of images) {
    map[img.path] = img.dataUrl;
    map[img.filename] = img.dataUrl;
    // 支持不带路径的查找
    const nameWithoutExt = img.filename.replace(/\.[^.]+$/, '');
    map[nameWithoutExt] = img.dataUrl;
  }
  return map;
}

/**
 * 在 HTML 中替换图片引用为 base64
 */
export function replaceImageRefsInHtml(
  html: string,
  images: ImageResource[]
): string {
  let result = html;
  
  for (const img of images) {
    // 替换 src="xxx.png" 形式
    const patterns = [
      new RegExp(`src=["']([^"']*${img.filename})["']`, 'g'),
      new RegExp(`src=["']${img.path}["']`, 'g'),
      new RegExp(`src=["']\\.\\./images/${img.filename}["']`, 'g'),
      new RegExp(`src=["']\\.\\/images/${img.filename}["']`, 'g'),
      new RegExp(`src=["']\\/images/${img.filename}["']`, 'g'),
    ];
    
    for (const pattern of patterns) {
      result = result.replace(pattern, `src="${img.dataUrl}"`);
    }
    
    // 替换 url(xxx.png) 形式
    const urlPatterns = [
      new RegExp(`url\\(["']?${img.filename}["']?\\)`, 'g'),
      new RegExp(`url\\(["']?${img.path}["']?\\)`, 'g'),
      new RegExp(`url\\(["']?\\.\\./images/${img.filename}["']?\\)`, 'g'),
      new RegExp(`url\\(["']?\\.\\/images/${img.filename}["']?\\)`, 'g'),
      new RegExp(`url\\(["']?\\/images/${img.filename}["']?\\)`, 'g'),
    ];
    
    for (const pattern of urlPatterns) {
      result = result.replace(pattern, `url("${img.dataUrl}")`);
    }
  }
  
  return result;
}

/**
 * 在 CSS 中替换图片引用为 base64
 */
export function replaceImageRefsInCss(
  css: string,
  images: ImageResource[]
): string {
  let result = css;
  
  for (const img of images) {
    const urlPatterns = [
      new RegExp(`url\\(["']?${img.filename}["']?\\)`, 'g'),
      new RegExp(`url\\(["']?${img.path}["']?\\)`, 'g'),
      new RegExp(`url\\(["']?\\.\\./images/${img.filename}["']?\\)`, 'g'),
      new RegExp(`url\\(["']?\\.\\/images/${img.filename}["']?\\)`, 'g'),
      new RegExp(`url\\(["']?\\/images/${img.filename}["']?\\)`, 'g'),
    ];
    
    for (const pattern of urlPatterns) {
      result = result.replace(pattern, `url("${img.dataUrl}")`);
    }
  }
  
  return result;
}

/**
 * 生成图片资源的 SDK 代码
 * 将图片作为内置资源嵌入到 SDK 中
 */
export function generateImageResourcesCode(images: ImageResource[]): string {
  if (images.length === 0) return '{}';
  
  const entries = images.map(img => {
    return `    "${img.path}": "${img.dataUrl}"`;
  });
  
  return `{
${entries.join(',\n')}
  }`;
}

/**
 * 生成 SDK 的图片资源管理器代码
 */
export function generateImageSDKCode(images: ImageResource[]): string {
  const imageMap = generateImageMap(images);
  const entries = Object.entries(imageMap).map(([key, value]) => {
    return `    "${key}": "${value}"`;
  });
  
  return `
  // 内置图片资源
  const SDK_IMAGES = {
${entries.join(',\n')}
  };

  // 获取图片资源
  function getImage(name) {
    return SDK_IMAGES[name] || SDK_IMAGES['/images/' + name] || SDK_IMAGES['images/' + name] || null;
  }
`;
}
