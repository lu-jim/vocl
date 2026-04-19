import tailwindcss from '@tailwindcss/vite';
import type { PluginOption } from 'vite';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  telemetry: { enabled: false },
  experimental: {
    serverAppConfig: false,
  },
  css: ['~/assets/css/tailwind.css'],
  vite: {
    plugins: [tailwindcss() as unknown as PluginOption],
  },
  modules: ['@nuxt/eslint', 'shadcn-nuxt'],
  shadcn: {
    prefix: '',
    componentDir: [
      '@/components/ui',
      {
        path: '@/components/elevenlabs-ui',
        prefix: '',
      },
    ],
  },
  runtimeConfig: {
    public: {
      apiBaseUrl: '',
      awsRegion: '',
      cognitoUserPoolId: '',
      cognitoUserPoolClientId: '',
    },
  },
});
