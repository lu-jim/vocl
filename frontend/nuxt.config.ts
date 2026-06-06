import tailwindcss from '@tailwindcss/vite';
import { boneyardPlugin } from 'boneyard-js/vite';

const vitePlugins = [tailwindcss(), boneyardPlugin()];

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
    plugins: vitePlugins,
  },
  modules: ['@nuxt/eslint', 'shadcn-nuxt', '@vercel/analytics'],
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
      /** When true (NUXT_PUBLIC_E2E), useAuth uses localStorage mocks — Cypress AUT has no window.Cypress */
      e2e: false,
    },
  },
});
