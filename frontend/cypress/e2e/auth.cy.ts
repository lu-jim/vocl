describe('authentication flow', () => {
  it('redirects unauthenticated users to login, signs in, and logs out', () => {
    cy.visit('/history');
    cy.url().should('include', '/login');
    cy.get('[data-testid="login-page"]').should('be.visible');

    cy.get('[data-testid="login-email"]').type('cypress@example.com');
    cy.get('[data-testid="login-password"]').type('Password123');
    cy.get('[data-testid="login-submit"]').click();

    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="dashboard-page"]').should('be.visible');
    cy.get('[data-testid="logout-button"]').click();

    cy.url().should('include', '/login');
    cy.get('[data-testid="login-page"]').should('be.visible');
  });
});
