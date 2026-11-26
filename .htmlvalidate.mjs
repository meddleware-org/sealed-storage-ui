// HTML-validate configuration for the built pages and index.html: the fleet's shared rule set, unchanged, from @meddleware/frontend-config
// (semantic markup, accessible names, no inline styles). `npm run lint:html` reads this file.
import { htmlValidateConfig } from '@meddleware/frontend-config/html-validate'

// The one export HTML-validate reads; the shared package supplies every rule.
export default htmlValidateConfig()
