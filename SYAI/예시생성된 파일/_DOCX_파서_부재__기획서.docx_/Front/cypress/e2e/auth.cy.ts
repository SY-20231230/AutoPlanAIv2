cypress/e2e/auth.cy.ts
describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should allow a user to log in successfully', () => {
    cy.get('input[name="username"]').type('testuser');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
    cy.contains('Welcome, testuser').should('be.visible');
  });

  it('should display an error for invalid credentials', () => {
    cy.get('input[name="username"]').type('wronguser');
    cy.get('input[name="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
    cy.get('.error-message').should('be.visible').and('contain', 'Invalid credentials');
    cy.url().should('include', '/login');
  });

  it('should allow a logged-in user to log out', () => {
    cy.get('input[name="username"]').type('testuser');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
    cy.get('button[data-cy="logout-button"]').click();
    cy.url().should('include', '/login');
    cy.contains('Login').should('be.visible');
  });
});