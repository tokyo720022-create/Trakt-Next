import { Config } from '../core/Config.js';

// Placeholder for the Simkl side of the sync. Login and sync calls come in the next version.
export class SimklApi {
  get isConfigured() { return Boolean(Config.simklClientId); }
}
