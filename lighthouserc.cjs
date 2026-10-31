// Lighthouse CI on the built app: accessibility 100, best practices ≥ 0.95, script and stylesheet budgets (free, results to
// test-results/lighthouse). (.cjs because Lighthouse CI loads its config with `require`; Node loads the ES module factory through it.)
const { lighthouseConfig } = require('@meddleware/frontend-config/lighthouserc')

module.exports = lighthouseConfig({ port: 4291 })
