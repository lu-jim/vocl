<script setup lang="ts">
defineOptions({
  name: 'RegisterPage',
});

definePageMeta({
  middleware: 'guest',
});

useHead({
  title: 'Register | Vocali',
});

type RegisterResult =
  | { status: 'success'; message: string }
  | { status: 'confirm'; message: string; email: string }
  | { status: 'error'; message: string };

const auth = useAuth();
const router = useRouter();

const form = reactive({
  email: '',
  password: '',
  confirmPassword: '',
});

const passwordRules = [
  'At least 8 characters',
  'One uppercase letter',
  'One lowercase letter',
  'One number',
];

const validationError = computed(() => {
  if (!form.email || !form.password || !form.confirmPassword) {
    return null;
  }

  if (form.password !== form.confirmPassword) {
    return 'Passwords do not match.';
  }

  if (form.password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }

  if (!/[A-Z]/.test(form.password)) {
    return 'Password must contain at least one uppercase letter.';
  }

  if (!/[a-z]/.test(form.password)) {
    return 'Password must contain at least one lowercase letter.';
  }

  if (!/[0-9]/.test(form.password)) {
    return 'Password must contain at least one number.';
  }

  return null;
});

const submitState = ref<RegisterResult | null>(null);

const handleSubmit = async () => {
  submitState.value = null;

  if (validationError.value) {
    submitState.value = {
      status: 'error',
      message: validationError.value,
    };
    return;
  }

  try {
    const result = await auth.register({
      email: form.email.trim(),
      password: form.password,
    });

    if (result.nextStep === 'CONFIRM_SIGN_UP') {
      if (import.meta.client) {
        sessionStorage.setItem(`pending-signup-password:${form.email.trim()}`, form.password);
      }

      submitState.value = {
        status: 'confirm',
        message: 'Account created. Check your email for the confirmation code before signing in.',
        email: form.email.trim(),
      };

      await router.push({
        path: '/confirm-signup',
        query: {
          email: form.email.trim(),
        },
      });
      return;
    }

    submitState.value = {
      status: 'success',
      message: 'Account created successfully. You can now sign in.',
    };

    await router.push('/login');
  } catch (error) {
    submitState.value = {
      status: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'Unable to create your account right now. Please try again.',
    };
  }
};
</script>

<template>
  <main class="mx-auto flex min-h-dvh w-full max-w-6xl items-center px-6 py-12">
    <div class="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
      <section class="space-y-6">
        <p
          class="inline-flex w-fit rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-cyan-200"
        >
          Vocali
        </p>

        <div class="space-y-4">
          <h1 class="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Create your account
          </h1>
          <p class="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Register to upload audio, request transcriptions, and keep track of your transcription
            history from one place.
          </p>
        </div>

        <div class="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Password requirements
          </h2>
          <ul class="mt-4 space-y-3 text-sm text-slate-300">
            <li v-for="rule in passwordRules" :key="rule" class="flex items-center gap-3">
              <span class="h-2 w-2 rounded-full bg-cyan-300" />
              <span>{{ rule }}</span>
            </li>
          </ul>
        </div>

        <p class="text-sm text-slate-400">
          Already have an account?
          <NuxtLink class="font-medium text-cyan-300 hover:text-cyan-200" to="/login">
            Sign in
          </NuxtLink>
        </p>
      </section>

      <section
        class="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40 sm:p-8"
      >
        <form class="space-y-6" @submit.prevent="handleSubmit">
          <div class="space-y-2">
            <label class="text-sm font-medium text-slate-200" for="email">Email</label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              autocomplete="email"
              required
              class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
              placeholder="you@example.com"
            >
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-slate-200" for="password"> Password </label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              autocomplete="new-password"
              required
              class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
              placeholder="Create a password"
            >
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-slate-200" for="confirmPassword">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              v-model="form.confirmPassword"
              type="password"
              autocomplete="new-password"
              required
              class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
              placeholder="Repeat your password"
            >
          </div>

          <div
            v-if="submitState"
            class="rounded-2xl border px-4 py-3 text-sm"
            :class="
              submitState.status === 'error'
                ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                : submitState.status === 'confirm'
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
            "
          >
            <p>{{ submitState.message }}</p>
          </div>

          <button
            type="submit"
            class="inline-flex w-full items-center justify-center rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="auth.isLoading"
          >
            {{ auth.isLoading ? 'Creating account...' : 'Create account' }}
          </button>
        </form>
      </section>
    </div>
  </main>
</template>
