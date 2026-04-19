<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next';

defineOptions({
  name: 'LoginPage',
});

definePageMeta({
  middleware: 'guest',
});

useSeoMeta({
  title: 'Login | Vocali',
  description: 'Sign in to Vocali to manage your audio transcriptions.',
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

<template>
  <div class="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
    <Card>
      <CardHeader>
        <div class="mb-2">
          <NuxtLink
            to="/"
            class="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft class="h-4 w-4" />
            Back
          </NuxtLink>
        </div>
        <CardTitle class="text-2xl">Sign in</CardTitle>
        <CardDescription>
          Access your Vocali workspace to upload audio, review history, and manage transcripts.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <AlertMessage v-if="configWarning" variant="warning" class="mb-4">
          <p class="font-medium">Sign-in is not available yet.</p>
          <p class="mt-1">
            This environment still needs authentication settings before you can access your account.
          </p>
        </AlertMessage>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div class="space-y-2">
            <label for="email" class="text-sm font-medium">Email</label>
            <Input
              id="email"
              v-model.trim="form.email"
              type="email"
              autocomplete="email"
              required
              placeholder="you@example.com"
            />
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label for="password" class="text-sm font-medium">Password</label>
              <NuxtLink
                to="/register"
                class="text-xs text-muted-foreground transition hover:text-foreground"
              >
                Need an account?
              </NuxtLink>
            </div>
            <Input
              id="password"
              v-model="form.password"
              type="password"
              autocomplete="current-password"
              required
              placeholder="Enter your password"
            />
          </div>

          <AlertMessage v-if="errorMessage" variant="error">
            {{ errorMessage }}
          </AlertMessage>

          <Button
            type="submit"
            class="w-full"
            :disabled="isSubmitting || configWarning"
          >
            {{ isSubmitting ? 'Signing in...' : 'Sign in' }}
          </Button>
        </form>
      </CardContent>

      <CardFooter class="flex-col items-start border-t pt-6">
        <p class="text-sm text-muted-foreground">
          Don't have an account?
          <NuxtLink to="/register" class="font-medium text-foreground hover:underline">
            Create one
          </NuxtLink>
        </p>
      </CardFooter>
    </Card>
  </div>
</template>
