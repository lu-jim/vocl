import { defineNuxtRouteMiddleware, navigateTo } from 'nuxt/app';
import type { RouteLocationNormalized } from 'vue-router';

import { useAuth } from '../composables/useAuth';

export default defineNuxtRouteMiddleware(async (to: RouteLocationNormalized) => {
  if (import.meta.server) {
    return;
  }

  const boneyardBuildMode = !!(globalThis as { __BONEYARD_BUILD?: boolean }).__BONEYARD_BUILD;

  if (boneyardBuildMode) {
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
