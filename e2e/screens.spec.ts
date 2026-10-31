// Screenshots for LOOKING at the app (see @meddleware/frontend-config/shots). Run: npm run shots. The connected states go through the e2e
// build's mock wallet.
import { defineShots } from '@meddleware/frontend-config/shots'
import { confirm, connected, decrypt, decryptReady, details, disconnected, sealed, unlock } from './open.js'

defineShots({ disconnected, encrypt: connected, details, confirm, sealed, decrypt, decryptReady, unlock })
