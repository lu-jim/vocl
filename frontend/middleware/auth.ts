import { defineNuxtRouteMiddleware, navigateTo } from 'nuxt/app';
import type { RouteLocationNormalized } from 'vue-router';

import { useAuth } from '../composables/useAuth';

export default defineNuxtRouteMiddleware(async (to: RouteLocationNormalized) => {
  if (typeof window === 'undefined') {
    return;
  }

  const { isAuthenticated, isLoading, hasResolvedInitialSession, loadUser } = useAuth();

  if (!hasResolvedInitialSession.value && !isLoading.value) {
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
