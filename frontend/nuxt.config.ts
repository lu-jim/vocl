// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  telemetry: { enabled: false },
  modules: ['@nuxt/eslint', '@nuxtjs/tailwindcss'],
  runtimeConfig: {
    public: {
      apiBaseUrl: '',
      awsRegion: '',
      cognitoUserPoolId: '',
      cognitoUserPoolClientId: '',
    },
  },
});
