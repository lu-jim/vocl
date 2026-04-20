<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  Home,
  Upload,
  Mic,
  History,
  LogOut,
  Menu,
  X,
} from 'lucide-vue-next';

import { useAuth } from '~/composables/useAuth';

const auth = useAuth();
const logoutPending = ref(false);
const sidebarOpen = ref(false);

const isLoading = computed(() => auth.isLoading.value);
const userLabel = computed(() => {
  const signInDetails = auth.user.value?.signInDetails as { loginId?: string } | undefined;
  return signInDetails?.loginId ?? auth.user.value?.username ?? 'User';
});

const handleLogout = async () => {
  logoutPending.value = true;
  try {
    await auth.logout();
    await navigateTo('/login');
  } finally {
    logoutPending.value = false;
  }
};

const navItems = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/transcribe', label: 'Batch Transcription', icon: Upload },
  { to: '/record', label: 'Live Recording', icon: Mic },
  { to: '/history', label: 'History', icon: History },
];

const route = useRoute();
const isActive = (path: string) => route.path === path;
</script>

<template>
  <div class="min-h-dvh bg-background text-foreground antialiased">
    <div class="flex min-h-dvh">
      <!-- Mobile sidebar toggle -->
      <Button
        variant="ghost"
        size="icon"
        class="fixed left-4 top-4 z-50 md:hidden"
        @click="sidebarOpen = !sidebarOpen"
      >
        <X v-if="sidebarOpen" class="h-5 w-5" />
        <Menu v-else class="h-5 w-5" />
      </Button>

      <!-- Sidebar backdrop (mobile) -->
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-40 bg-black/50 md:hidden"
        @click="sidebarOpen = false"
      />

      <!-- Sidebar -->
      <aside
        data-testid="dashboard-sidebar"
        :class="[
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform md:static md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ]"
      >
        <!-- Logo -->
        <div class="flex h-16 items-center border-b border-sidebar-border px-6">
          <NuxtLink to="/dashboard" class="flex items-center gap-2">
            <img
              src="/Vocali-logo.svg"
              alt="Vocali"
              class="h-8 w-auto"
            >
          </NuxtLink>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 space-y-1 px-3 py-4">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            :data-testid="`nav-link-${item.to.replace('/', '') || 'dashboard'}`"
            :class="[
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive(item.to)
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            ]"
            @click="sidebarOpen = false"
          >
            <component :is="item.icon" class="h-4 w-4" />
            {{ item.label }}
          </NuxtLink>
        </nav>

        <!-- User section -->
        <div class="border-t border-sidebar-border p-4">
          <ClientOnly>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <Avatar class="h-8 w-8">
                  <AvatarFallback>{{ userLabel.charAt(0).toUpperCase() }}</AvatarFallback>
                </Avatar>
                <div class="flex flex-col">
                  <span v-if="isLoading" class="text-sm text-muted-foreground">Loading...</span>
                  <span v-else class="truncate text-sm font-medium text-sidebar-foreground">
                    {{ userLabel }}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                data-testid="sidebar-logout-button"
                :disabled="logoutPending"
                @click="handleLogout"
              >
                <LogOut class="h-4 w-4" />
              </Button>
            </div>

            <template #fallback>
              <div class="flex items-center gap-3">
                <Skeleton class="h-8 w-8 rounded-full" />
                <Skeleton class="h-4 w-24" />
              </div>
            </template>
          </ClientOnly>
        </div>
      </aside>

      <!-- Main content -->
      <main class="flex-1 overflow-auto">
        <div class="mx-auto max-w-5xl px-4 py-8 md:px-8 md:pl-4">
          <div class="mb-6 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              data-testid="logout-button"
              :disabled="logoutPending"
              @click="handleLogout"
            >
              <LogOut class="mr-2 h-4 w-4" />
              {{ logoutPending ? 'Signing out...' : 'Logout' }}
            </Button>
          </div>
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
