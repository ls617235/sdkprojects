import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 输出模式：standalone（用于 Docker 部署）
  output: 'standalone',
  
  // outputFileTracingRoot: path.resolve(__dirname, '../../'),  // Uncomment and add 'import path from "path"' if needed
  /* config options here */
  allowedDevOrigins: ['*.dev.coze.site'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lf-coze-web-cdn.coze.cn',
        pathname: '/**',
      },
    ],
  },
  
  // API 代理配置 - 内网部署时使用环境变量或默认值
  rewrites: async () => {
    // 从内网部署配置读取后端地址，默认为本地 8000 端口
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
