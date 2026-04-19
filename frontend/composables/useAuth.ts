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

type E2EAuthState = {
  userId: string;
  username: string;
  loginId: string;
  idToken: string;
};

const E2E_AUTH_STORAGE_KEY = 'vocali:e2e-auth';
let loadUserPromise: Promise<AuthUser | null> | null = null;

const isCypressRuntime = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return 'Cypress' in window;
};

const readE2EAuthState = (): E2EAuthState | null => {
  if (!isCypressRuntime()) {
    return null;
  }

  const serialized = window.localStorage.getItem(E2E_AUTH_STORAGE_KEY);

  if (!serialized) {
    return null;
  }

  try {
    const parsed = JSON.parse(serialized) as Partial<E2EAuthState>;

    if (!parsed.userId || !parsed.username || !parsed.loginId || !parsed.idToken) {
      return null;
    }

    return {
      userId: parsed.userId,
      username: parsed.username,
      loginId: parsed.loginId,
      idToken: parsed.idToken,
    };
  } catch {
    return null;
  }
};

const writeE2EAuthState = (authState: E2EAuthState | null) => {
  if (!isCypressRuntime()) {
    return;
  }

  if (!authState) {
    window.localStorage.removeItem(E2E_AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(E2E_AUTH_STORAGE_KEY, JSON.stringify(authState));
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
  const hasResolvedInitialSession = useState<boolean>('auth:hasResolvedInitialSession', () => false);
  const lastError = useState<string | null>('auth:lastError', () => null);
  const pendingConfirmationEmail = useState<string | null>(
    'auth:pendingConfirmationEmail',
    () => null
  );

  const isAuthenticated = computed(() => status.value === 'authenticated');

  const applyE2EAuthState = (authState: E2EAuthState | null) => {
    if (!authState) {
      user.value = null;
      status.value = 'unauthenticated';
      return null;
    }

    user.value = {
      userId: authState.userId,
      username: authState.username,
      signInDetails: {
        loginId: authState.loginId,
      },
    };
    status.value = 'authenticated';

    return user.value;
  };

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

  const loadUser = async ({ force = false }: { force?: boolean } = {}) => {
    if (!force && hasResolvedInitialSession.value) {
      return user.value;
    }

    if (loadUserPromise) {
      return await loadUserPromise;
    }

    loadUserPromise = (async () => {
      const e2eAuthState = readE2EAuthState();

      if (isCypressRuntime()) {
        hasResolvedInitialSession.value = true;
        return applyE2EAuthState(e2eAuthState);
      }

      if (!isConfigured.value) {
        user.value = null;
        status.value = 'unauthenticated';
        hasResolvedInitialSession.value = true;
        return null;
      }

      setLoading(true);
      clearError();

      try {
        const session = await fetchAuthSession();

        if (!session.tokens) {
          user.value = null;
          status.value = 'unauthenticated';
          hasResolvedInitialSession.value = true;
          return null;
        }

        const currentUser = await getCurrentUser();

        user.value = {
          userId: currentUser.userId,
          username: currentUser.username,
          signInDetails: currentUser.signInDetails,
        };
        status.value = 'authenticated';
        hasResolvedInitialSession.value = true;

        return user.value;
      } catch {
        user.value = null;
        status.value = 'unauthenticated';
        hasResolvedInitialSession.value = true;
        return null;
      } finally {
        isLoading.value = false;
        loadUserPromise = null;
      }
    })();

    return await loadUserPromise;
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
      if (isCypressRuntime()) {
        const authState: E2EAuthState = {
          userId: 'cypress-user-id',
          username: email,
          loginId: email,
          idToken: 'cypress-id-token',
        };

        writeE2EAuthState(authState);
        applyE2EAuthState(authState);
        hasResolvedInitialSession.value = true;

        return {
          nextStep: 'DONE',
          message: 'Signed in successfully.',
        };
      }

      const result = await signIn({
        username: email,
        password,
      });

      if (result.isSignedIn) {
        await loadUser({ force: true });

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
      if (isCypressRuntime()) {
        writeE2EAuthState(null);
        return;
      }

      await signOut();
    } finally {
      user.value = null;
      status.value = 'unauthenticated';
      hasResolvedInitialSession.value = true;
      isLoading.value = false;
    }
  };

  const getIdToken = async () => {
    ensureConfigured();

    const e2eAuthState = readE2EAuthState();

    if (isCypressRuntime()) {
      return e2eAuthState?.idToken ?? null;
    }

    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() ?? null;
  };

  return {
    user,
    status,
    isLoading,
    hasResolvedInitialSession,
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
    getIdToken,
  };
};
