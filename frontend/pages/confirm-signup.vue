<script setup lang="ts">
defineOptions({
  name: 'ConfirmSignupPage',
});

const route = useRoute();
const router = useRouter();

const email = ref(typeof route.query.email === 'string' ? route.query.email : '');
const code = ref('');
const errorMessage = ref('');
const successMessage = ref('');

const { confirmRegistration, login, isLoading } = useAuth();

const canSubmit = computed(() => {
  return email.value.trim().length > 0 && code.value.trim().length > 0 && !isLoading.value;
});

const handleSubmit = async () => {
  if (!canSubmit.value) {
    return;
  }

  errorMessage.value = '';
  successMessage.value = '';

  try {
    await confirmRegistration({
      email: email.value,
      code: code.value,
    });

    successMessage.value =
      'Account confirmed successfully. You can now sign in with your credentials.';

    const password = sessionStorage.getItem(`pending-signup-password:${email.value}`);

    if (password) {
      try {
        await login({
          email: email.value,
          password,
        });
        sessionStorage.removeItem(`pending-signup-password:${email.value}`);
        await router.push('/dashboard');
        return;
      } catch {
        sessionStorage.removeItem(`pending-signup-password:${email.value}`);
      }
    }

    await router.push({
      path: '/login',
      query: {
        email: email.value,
        confirmed: '1',
      },
    });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Could not confirm your account.';
  }
};
</script>

<template>
  <div class="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-12">
    <div
      class="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/40"
    >
      <div class="mb-8">
        <p class="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">Vocali</p>
        <h1 class="mt-3 text-3xl font-semibold text-white">Confirm your account</h1>
        <p class="mt-2 text-sm text-slate-400">
          Enter the verification code sent to your email address to complete registration.
        </p>
      </div>

      <form class="space-y-5" @submit.prevent="handleSubmit">
        <div>
          <label class="mb-2 block text-sm font-medium text-slate-200" for="email"> Email </label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            required
            class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-500"
            placeholder="you@example.com"
          >
        </div>

        <div>
          <label class="mb-2 block text-sm font-medium text-slate-200" for="code">
            Verification code
          </label>
          <input
            id="code"
            v-model="code"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            required
            class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-500"
            placeholder="123456"
          >
        </div>

        <p
          v-if="errorMessage"
          class="rounded-xl border border-rose-900/60 bg-rose-950/40 px-4 py-3 text-sm text-rose-300"
        >
          {{ errorMessage }}
        </p>

        <p
          v-if="successMessage"
          class="rounded-xl border border-emerald-900/60 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300"
        >
          {{ successMessage }}
        </p>

        <button
          type="submit"
          :disabled="!canSubmit"
          class="w-full rounded-xl bg-cyan-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ isLoading ? 'Confirming…' : 'Confirm account' }}
        </button>
      </form>

      <div class="mt-6 text-sm text-slate-400">
        Already confirmed?
        <NuxtLink class="font-medium text-cyan-400 hover:text-cyan-300" to="/login">
          Go to login
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
