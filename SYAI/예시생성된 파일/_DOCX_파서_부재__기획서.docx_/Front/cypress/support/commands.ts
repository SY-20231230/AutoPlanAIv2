/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable<Subject = any> {
    /**
     * Custom command to log in a user.
     * @example cy.login('username', 'password')
     */
    login(username?: string, password?: string): Chainable<any>;

    /**
     * Custom command to select DOM element by data-cy attribute.
     * @example cy.getByDataCy('submit-button')
     */
    getByDataCy(selector: string, options?: Partial<Cypress.Loggable & Cypress.Timeoutable & Cypress.Withinable & Cypress.Shadowable>): Chainable<JQuery<HTMLElement>>;

    /**
     * Custom command to fill a form with an object of values.
     * Assumes input fields have 'name' attributes matching object keys.
     * @example cy.fillForm({ name: 'John Doe', email: 'john@example.com' })
     */
    fillForm(formData: { [key: string]: string | number | boolean }): Chainable<any>;
  }
}

Cypress.Commands.add('login', (username = 'testuser', password = 'password123') => {
  cy.visit('/login'); // Adjust this URL as needed
  cy.get('input[name="username"]').type(username);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('not.include', '/login'); // Assert successful login
});

Cypress.Commands.add('getByDataCy', (selector, options) => {
  return cy.get(`[data-cy="${selector}"]`, options);
});

Cypress.Commands.add('fillForm', (formData) => {
  for (const key in formData) {
    if (Object.prototype.hasOwnProperty.call(formData, key)) {
      const value = formData[key];
      cy.get(`[name="${key}"]`).type(value.toString());
    }
  }
});