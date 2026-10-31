// The shared accessibility sweep (WCAG 2.2 AA and AAA in every colour mode × season, reflow, text size, forced colours, reduced motion,
// keyboard) over the screens a visitor meets in each tab, step by step. The e2e build's mock wallet, stub chain and stand-in Seal controller
// make the connected ones reachable.
import { defineA11ySuite } from '@meddleware/frontend-config/a11y'
import { confirm, connected, decrypt, decryptReady, details, disconnected, sealed, unlock } from './open.js'

defineA11ySuite(
  {
    disconnected,
    'encrypt: policy': connected,
    'encrypt: details': details,
    'encrypt: confirm': confirm,
    'encrypt: sealed': sealed,
    decrypt,
    'decrypt: policy fields': decryptReady,
    unlock,
  },
  { aaa: 'gate' },
)
