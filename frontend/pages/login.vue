<template>
  <main class="flex min-h-dvh items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
    <div
      class="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40"
    >
      <div class="mb-6">
        <NuxtLink to="/" class="text-sm font-medium text-slate-400 transition hover:text-slate-200">
          ← Back
        </NuxtLink>
        <h1 class="mt-4 text-3xl font-semibold tracking-tight text-white">Sign in</h1>
        <p class="mt-2 text-sm text-slate-400">
          Access your Vocali workspace to upload audio, review history, and manage transcripts.
        </p>
      </div>

      <div
        v-if="configWarning"
        class="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200"
      >
        <p class="font-medium">Sign-in is not available yet.</p>
        <p class="mt-1 text-amber-100/80">
          This environment still needs authentication settings before you can access your account.
        </p>
      </div>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label for="email" class="mb-2 block text-sm font-medium text-slate-200"> Email </label>
          <input
            id="email"
            v-model.trim="form.email"
            type="email"
            autocomplete="email"
            required
            class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <div class="mb-2 flex items-center justify-between">
            <label for="password" class="block text-sm font-medium text-slate-200">
              Password
            </label>
            <NuxtLink
              to="/register"
              class="text-xs font-medium text-cyan-300 transition hover:text-cyan-200"
            >
              Need an account?
            </NuxtLink>
          </div>
          <input
            id="password"
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            required
            class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
            placeholder="Enter your password"
          />
        </div>

        <div
          v-if="errorMessage"
          class="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
        >
          {{ errorMessage }}
        </div>

        <button
          type="submit"
          :disabled="isSubmitting || configWarning"
          class="inline-flex w-full items-center justify-center rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
        >
          <span v-if="isSubmitting">Signing in…</span>
          <span v-else>Sign in</span>
        </button>
      </form>

      <div class="mt-6 border-t border-slate-800 pt-4 text-sm text-slate-400">
        <p>
          Don’t have an account?
          <NuxtLink to="/register" class="font-medium text-cyan-300 transition hover:text-cyan-200">
            Create one
          </NuxtLink>
        </p>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
defineOptions({
  name: 'LoginPage',
});

definePageMeta({
  middleware: 'guest',
});

const router = useRouter();
const auth = useAuth();

const form = reactive({
  email: '',
  password: '',
});

const errorMessage = ref('');
const isSubmitting = computed(() => auth.isLoading.value);
const configWarning = computed(() => !auth.isConfigured.value);

useSeoMeta({
  title: 'Login | Vocali',
  description: 'Sign in to Vocali to manage your audio transcriptions.',
});

const handleSubmit = async () => {
  errorMessage.value = '';

  if (!form.email || !form.password) {
    errorMessage.value = 'Please enter both your email and password.';
    return;
  }

  try {
    const result = await auth.login({
      email: form.email,
      password: form.password,
    });

    if (result.nextStep === 'CONFIRM_SIGN_UP') {
      await router.push({
        path: '/register',
        query: {
          email: form.email,
          pendingConfirmation: '1',
        },
      });
      return;
    }

    if (!auth.isAuthenticated.value) {
      errorMessage.value = result.message ?? 'Unable to sign in right now. Please try again.';
      return;
    }

    await router.push('/dashboard');
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Unable to sign in right now. Please try again.';
  }
};
</script>
