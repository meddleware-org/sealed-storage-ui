// Ambient types: Vite's client types, and a declaration so TypeScript accepts imports of single-file components.
/// <reference types="vite/client" />

// Every .vue file is a component; vue-tsc checks the real props and emits.
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
