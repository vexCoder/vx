// @ts-nocheck
import { defineConfig, loadEnv, ConfigEnv } from 'vite';
import swcReact from 'vite-plugin-swc-react'
import inspect from 'vite-plugin-inspect'
import path from 'path';

export default ({ mode }: ConfigEnv) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  const isProd = mode === 'production';

  const env: Record<string, string | undefined> = {};
  if (isProd) {
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith('VITE_')) {
        env[`import.meta.env.${key}`] = process.env[key];
      }
    });
  }

  const plugins = [];
  
  plugins.push(swcReact({
    reactFresh: mode === 'development'
  }));
  
  if(!isProd) plugins.push(inspect())

  return defineConfig({
    plugins,
    publicDir: './public',
    ...(isProd && { define: env }),
    resolve: {
      alias: {
        '@components': path.resolve(__dirname, 'src', 'components'),
        '@utils': path.resolve(__dirname, 'src', 'utils'),
        '@root': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 3001,
      host: true,
    },
    build: {
      chunkSizeWarningLimit: 2500,
    },
    optimizeDeps: {
      include: [

      ],
    },
  });
};
