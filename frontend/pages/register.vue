<script setup lang="ts">
import { Check } from 'lucide-vue-next';

defineOptions({
  name: 'RegisterPage',
});

definePageMeta({
  middleware: 'guest',
});

useSeoMeta({
  title: 'Register | Vocali',
  description: 'Create your Vocali account to start transcribing audio.',
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
  { label: 'At least 8 characters', check: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', check: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', check: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', check: (p: string) => /[0-9]/.test(p) },
];

const validationError = computed(() => {
  if (!form.email || !form.password || !form.confirmPassword) return null;
  if (form.password !== form.confirmPassword) return 'Passwords do not match.';
  if (form.password.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(form.password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(form.password)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(form.password)) return 'Password must contain at least one number.';
  return null;
});

const submitState = ref<RegisterResult | null>(null);

const handleSubmit = async () => {
  submitState.value = null;

  if (validationError.value) {
    submitState.value = { status: 'error', message: validationError.value };
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
        message: 'Account created. Check your email for the confirmation code.',
        email: form.email.trim(),
      };

      await router.push({
        path: '/confirm-signup',
        query: { email: form.email.trim() },
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
      message: error instanceof Error
        ? error.message
        : 'Unable to create your account right now. Please try again.',
    };
  }
};
</script>

<template>
  <div class="grid gap-8 lg:grid-cols-2 lg:gap-12">
    <!-- Left: Info -->
    <div class="space-y-6">
      <div class="space-y-4">
        <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
          Create your account
        </h1>
        <p class="text-muted-foreground">
          Register to upload audio, request transcriptions, and keep track of your transcription
          history from one place.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">Password requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="space-y-2">
            <li
              v-for="rule in passwordRules"
              :key="rule.label"
              class="flex items-center gap-2 text-sm"
              :class="rule.check(form.password) ? 'text-foreground' : 'text-muted-foreground'"
            >
              <div
                :class="[
                  'flex h-4 w-4 items-center justify-center rounded-full border',
                  rule.check(form.password)
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border',
                ]"
              >
                <Check v-if="rule.check(form.password)" class="h-3 w-3" />
              </div>
              {{ rule.label }}
            </li>
          </ul>
        </CardContent>
      </Card>

      <p class="text-sm text-muted-foreground">
        Already have an account?
        <NuxtLink to="/login" class="font-medium text-foreground hover:underline">
          Sign in
        </NuxtLink>
      </p>
    </div>

    <!-- Right: Form -->
    <Card>
      <CardHeader>
        <CardTitle>Sign up</CardTitle>
        <CardDescription>Enter your details to create your account.</CardDescription>
      </CardHeader>

      <CardContent>
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div class="space-y-2">
            <label class="text-sm font-medium" for="email">Email</label>
            <Input
              id="email"
              v-model="form.email"
              type="email"
              autocomplete="email"
              required
              placeholder="you@example.com"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium" for="password">Password</label>
            <Input
              id="password"
              v-model="form.password"
              type="password"
              autocomplete="new-password"
              required
              placeholder="Create a password"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium" for="confirmPassword">Confirm password</label>
            <Input
              id="confirmPassword"
              v-model="form.confirmPassword"
              type="password"
              autocomplete="new-password"
              required
              placeholder="Repeat your password"
            />
          </div>

          <AlertMessage
            v-if="submitState"
            :variant="submitState.status === 'error' ? 'error' : submitState.status === 'confirm' ? 'warning' : 'success'"
          >
            {{ submitState.message }}
          </AlertMessage>

          <Button type="submit" class="w-full" :disabled="auth.isLoading.value">
            {{ auth.isLoading.value ? 'Creating account...' : 'Create account' }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
