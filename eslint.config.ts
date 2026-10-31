import { vueApp } from '@meddleware/frontend-config/eslint'

// The fleet's Vue + TypeScript + accessibility + browser-compat config plus the chain-access boundary.
export default vueApp({ name: 'sealed-storage-ui', sui: true })
