/* eslint-disable @typescript-eslint/no-namespace */
const E2E_AUTH_STORAGE_KEY = 'vocali:e2e-auth';

type E2EAuthState = {
  userId: string;
  username: string;
  loginId: string;
  idToken: string;
};

const buildAuthState = (overrides: Partial<E2EAuthState> = {}): E2EAuthState => {
  const loginId = overrides.loginId ?? overrides.username ?? 'cypress@example.com';

  return {
    userId: overrides.userId ?? 'cypress-user-id',
    username: overrides.username ?? loginId,
    loginId,
    idToken: overrides.idToken ?? 'cypress-id-token',
  };
};

const applyAuthState = (win: Cypress.AUTWindow, authState: E2EAuthState) => {
  win.localStorage.setItem(E2E_AUTH_STORAGE_KEY, JSON.stringify(authState));
};

declare global {
  namespace Cypress {
    interface Chainable {
      loginBySession(overrides?: Partial<E2EAuthState>): Chainable<void>;
      visitAuthenticated(
        path: string,
        overrides?: Partial<E2EAuthState>,
        options?: Partial<VisitOptions>
      ): Chainable<AUTWindow>;
    }
  }
}

Cypress.Commands.add('loginBySession', (overrides: Partial<E2EAuthState> = {}) => {
  const authState = buildAuthState(overrides);

  cy.session(authState.loginId, () => {
    cy.visit('/login', {
      onBeforeLoad(win) {
        applyAuthState(win, authState);
      },
    });

    cy.url().should('include', '/dashboard');
  });
});

Cypress.Commands.add(
  'visitAuthenticated',
  (path: string, overrides: Partial<E2EAuthState> = {}, options: Partial<Cypress.VisitOptions> = {}) => {
    const authState = buildAuthState(overrides);

    cy.loginBySession(authState);

    cy.visit(path, {
      ...options,
      onBeforeLoad(win) {
        applyAuthState(win, authState);
        options.onBeforeLoad?.(win);
      },
    });
  }
);

export {};
