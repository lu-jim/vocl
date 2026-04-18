import { defineNuxtRouteMiddleware, navigateTo } from 'nuxt/app';
import type { RouteLocationNormalized } from 'vue-router';

import { useAuth } from '../composables/useAuth';

export default defineNuxtRouteMiddleware(async (to: RouteLocationNormalized) => {
  if (typeof window === 'undefined') {
    return;
  }

  const { isAuthenticated, isLoading, loadUser } = useAuth();

  if (isLoading.value) {
    return;
  }

  if (!isAuthenticated.value) {
    await loadUser();
  }

  if (!isAuthenticated.value) {
    return navigateTo({
      path: '/login',
      query: {
        redirect: to.fullPath,
      },
    });
  }
});
