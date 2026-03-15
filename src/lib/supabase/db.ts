import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as schema from '../../../migrations/schema';

// DNS fix for Neon DB — only needed on machines where local DNS
// refuses to resolve neon.tech. Safe to run everywhere (no-op if DNS works).
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  try {
    const dns = require('dns');
    const { Resolver } = dns;
    const resolver = new Resolver();
    resolver.setServers(['8.8.8.8', '8.8.4.4']);

    const _lookup = dns.lookup;
    dns.lookup = function patchedLookup(
      hostname: any,
      options: any,
      callback: any
    ) {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      if (typeof options === 'number') {
        options = { family: options };
      }
      options = options || {};

      if (hostname && hostname.includes('neon.tech')) {
        resolver.resolve4(hostname, (err: any, addresses: string[]) => {
          if (err || !addresses || !addresses.length) {
            return _lookup.call(dns, hostname, options, callback);
          }
          if (options.all) {
            return callback(
              null,
              addresses.map((addr: string) => ({ address: addr, family: 4 }))
            );
          }
          return callback(null, addresses[0], 4);
        });
      } else {
        return _lookup.call(dns, hostname, options, callback);
      }
    };
  } catch (_) {
    // dns module not available (edge runtime, browser) — skip
  }
}

dotenv.config({ path: '.env' });

if (!process.env.DATABASE_URL) {
  console.log('🔴 No database URL found in environment variables');
}

const client = postgres(process.env.DATABASE_URL as string, { max: 1 });
const db = drizzle(client, { schema });

export default db;