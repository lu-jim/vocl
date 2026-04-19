<script setup lang="ts">
defineOptions({
  name: 'ConfirmSignupPage',
});

useSeoMeta({
  title: 'Confirm Account | Vocali',
  description: 'Enter your verification code to complete registration.',
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
  if (!canSubmit.value) return;

  errorMessage.value = '';
  successMessage.value = '';

  try {
    await confirmRegistration({
      email: email.value,
      code: code.value,
    });

    successMessage.value = 'Account confirmed successfully. Signing you in...';

    const password = sessionStorage.getItem(`pending-signup-password:${email.value}`);

    if (password) {
      try {
        await login({ email: email.value, password });
        sessionStorage.removeItem(`pending-signup-password:${email.value}`);
        await router.push('/dashboard');
        return;
      } catch {
        sessionStorage.removeItem(`pending-signup-password:${email.value}`);
      }
    }

    await router.push({
      path: '/login',
      query: { email: email.value, confirmed: '1' },
    });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Could not confirm your account.';
  }
};
</script>

<template>
  <div class="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
    <Card>
      <CardHeader>
        <CardTitle class="text-2xl">Confirm your account</CardTitle>
        <CardDescription>
          Enter the verification code sent to your email address to complete registration.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div class="space-y-2">
            <label class="text-sm font-medium" for="email">Email</label>
            <Input
              id="email"
              v-model="email"
              type="email"
              autocomplete="email"
              required
              placeholder="you@example.com"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium" for="code">Verification code</label>
            <Input
              id="code"
              v-model="code"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              required
              placeholder="123456"
            />
          </div>

          <AlertMessage v-if="errorMessage" variant="error">
            {{ errorMessage }}
          </AlertMessage>

          <AlertMessage v-if="successMessage" variant="success">
            {{ successMessage }}
          </AlertMessage>

          <Button type="submit" class="w-full" :disabled="!canSubmit">
            {{ isLoading ? 'Confirming...' : 'Confirm account' }}
          </Button>
        </form>
      </CardContent>

      <CardFooter class="border-t pt-6">
        <p class="text-sm text-muted-foreground">
          Already confirmed?
          <NuxtLink to="/login" class="font-medium text-foreground hover:underline">
            Go to login
          </NuxtLink>
        </p>
      </CardFooter>
    </Card>
  </div>
</template>
