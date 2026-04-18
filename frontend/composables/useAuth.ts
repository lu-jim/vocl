import { computed } from 'vue';
import { useRuntimeConfig, useState } from 'nuxt/app';
import {
  confirmSignUp,
  fetchAuthSession,
  getCurrentUser,
  signIn,
  signOut,
  signUp,
} from 'aws-amplify/auth';

type AuthUser = {
  userId: string;
  username: string;
  signInDetails?: unknown;
};

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

type RegisterInput = {
  email: string;
  password: string;
};

type ConfirmRegisterInput = {
  email: string;
  code: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type AuthActionResult = {
  nextStep?: string;
  message?: string;
};

const getAuthConfigStatus = () => {
  const config = useRuntimeConfig();

  return Boolean(
    config.public.awsRegion &&
    config.public.cognitoUserPoolId &&
    config.public.cognitoUserPoolClientId
  );
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'An unexpected authentication error occurred.';
};

export const useAuth = () => {
  const isConfigured = useState<boolean>('auth:isConfigured', () => getAuthConfigStatus());
  const user = useState<AuthUser | null>('auth:user', () => null);
  const status = useState<AuthStatus>('auth:status', () => 'idle');
  const isLoading = useState<boolean>('auth:isLoading', () => false);
  const lastError = useState<string | null>('auth:lastError', () => null);
  const pendingConfirmationEmail = useState<string | null>(
    'auth:pendingConfirmationEmail',
    () => null
  );

  const isAuthenticated = computed(() => status.value === 'authenticated');

  const clearError = () => {
    lastError.value = null;
  };

  const ensureConfigured = () => {
    isConfigured.value = getAuthConfigStatus();

    if (!isConfigured.value) {
      const message =
        'Missing Cognito runtime config. Set NUXT_PUBLIC_AWS_REGION, NUXT_PUBLIC_COGNITO_USER_POOL_ID, and NUXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID.';
      lastError.value = message;
      throw new Error(message);
    }
  };

  const setLoading = (value: boolean) => {
    isLoading.value = value;
    if (value) {
      status.value = user.value ? 'authenticated' : 'loading';
    }
  };

  const loadUser = async () => {
    if (!isConfigured.value) {
      user.value = null;
      status.value = 'unauthenticated';
      return null;
    }

    setLoading(true);
    clearError();

    try {
      const session = await fetchAuthSession();

      if (!session.tokens) {
        user.value = null;
        status.value = 'unauthenticated';
        return null;
      }

      const currentUser = await getCurrentUser();

      user.value = {
        userId: currentUser.userId,
        username: currentUser.username,
        signInDetails: currentUser.signInDetails,
      };
      status.value = 'authenticated';

      return user.value;
    } catch {
      user.value = null;
      status.value = 'unauthenticated';
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const register = async ({ email, password }: RegisterInput): Promise<AuthActionResult> => {
    ensureConfigured();
    setLoading(true);
    clearError();

    try {
      const result = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
          },
        },
      });

      pendingConfirmationEmail.value = email;

      return {
        nextStep: result.nextStep.signUpStep,
        message:
          result.nextStep.signUpStep === 'DONE'
            ? 'Registration completed successfully.'
            : 'Registration created. Please confirm your email with the verification code.',
      };
    } catch (error) {
      const message = getErrorMessage(error);
      lastError.value = message;
      throw new Error(message);
    } finally {
      isLoading.value = false;
      if (!user.value) {
        status.value = 'unauthenticated';
      }
    }
  };

  const confirmRegistration = async ({
    email,
    code,
  }: ConfirmRegisterInput): Promise<AuthActionResult> => {
    ensureConfigured();
    setLoading(true);
    clearError();

    try {
      const result = await confirmSignUp({
        username: email,
        confirmationCode: code,
      });

      if (result.isSignUpComplete) {
        pendingConfirmationEmail.value = null;
      }

      return {
        nextStep: result.nextStep.signUpStep,
        message: result.isSignUpComplete
          ? 'Email confirmed successfully. You can now sign in.'
          : 'Confirmation received. Additional sign-up steps may still be required.',
      };
    } catch (error) {
      const message = getErrorMessage(error);
      lastError.value = message;
      throw new Error(message);
    } finally {
      isLoading.value = false;
      if (!user.value) {
        status.value = 'unauthenticated';
      }
    }
  };

  const login = async ({ email, password }: LoginInput): Promise<AuthActionResult> => {
    ensureConfigured();
    setLoading(true);
    clearError();

    try {
      const result = await signIn({
        username: email,
        password,
      });

      if (result.isSignedIn) {
        await loadUser();

        return {
          nextStep: result.nextStep.signInStep,
          message: 'Signed in successfully.',
        };
      }

      status.value = 'unauthenticated';

      return {
        nextStep: result.nextStep.signInStep,
        message: `Additional sign-in step required: ${result.nextStep.signInStep}`,
      };
    } catch (error) {
      const message = getErrorMessage(error);
      lastError.value = message;
      user.value = null;
      status.value = 'unauthenticated';
      throw new Error(message);
    } finally {
      isLoading.value = false;
    }
  };

  const logout = async () => {
    ensureConfigured();
    setLoading(true);
    clearError();

    try {
      await signOut();
    } finally {
      user.value = null;
      status.value = 'unauthenticated';
      isLoading.value = false;
    }
  };

  return {
    user,
    status,
    isLoading,
    isConfigured,
    isAuthenticated,
    lastError,
    pendingConfirmationEmail,
    clearError,
    loadUser,
    register,
    confirmRegistration,
    login,
    logout,
  };
};
