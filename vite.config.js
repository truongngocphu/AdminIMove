import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolveAdminProxyTarget } from './server/runtime_config.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const adminApi = resolveAdminProxyTarget({
    explicitUrl: env.VITE_ADMIN_API_URL,
    fallbackPort: 5060,
  });

  const proxyError = (proxy) => {
    proxy.on('error', (error, _req, res) => {
      if (!res || res.headersSent || res.writableEnded) return;
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        message: `Admin Gateway không phản hồi tại ${adminApi}: ${error.message}`,
        adminApi,
      }));
    });
  };

  return {
    plugins: [react()],
    server: {
      host: true,
      port: Number(env.VITE_DEV_PORT || 5173),
      strictPort: true,
      proxy: {
        '/api': {
          target: adminApi,
          changeOrigin: true,
          configure: proxyError,
        },
        '/core-api': {
          target: adminApi,
          changeOrigin: true,
          configure: proxyError,
        },
      },
    },
  };
});
