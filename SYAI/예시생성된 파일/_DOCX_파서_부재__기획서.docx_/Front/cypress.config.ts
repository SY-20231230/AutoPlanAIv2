import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    baseUrl: 'http://localhost:3000',
  },
  component: {
    devServer: {
      framework: 'react', // Or 'vue', 'angular', etc. based on your frontend framework
      bundler: 'webpack', // Or 'vite'
    },
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}',
  },
})