import { defineNuxtRouteMiddleware, navigateTo } from 'nuxt/app';
import type { RouteLocationNormalized } from 'vue-router';

import { useAuth } from '../composables/useAuth';

export default defineNuxtRouteMiddleware(async (_to: RouteLocationNormalized) => {
  if (typeof window === 'undefined') {
    return;
  }

  const auth = useAuth();

  if (auth.isLoading.value) {
    return;
  }

  if (!auth.isAuthenticated.value) {
    await auth.loadUser();
  }

  if (auth.isAuthenticated.value) {
    return navigateTo('/dashboard');
  }
});
