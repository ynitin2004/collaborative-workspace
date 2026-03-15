import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as dns from 'dns';

// Fix for ENOTFOUND / DNS resolution issues
dns.setServers(['8.8.8.8', '1.1.1.1']);

// Override dns.lookup to use dns.resolve4 instead of the OS level DNS
const originalLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  if (hostname.includes('neon.tech')) {
    dns.resolve4(hostname, (err, addresses) => {
      if (err) {
        return originalLookup(hostname, options, callback);
      }
      callback(null, addresses[0], 4);
    });
  } else {
    originalLookup(hostname, options, callback);
  }
};

dotenv.config({ path: '.env' });

const migrationClient = postgres(process.env.DATABASE_URL as string, { max: 1 });
const db = drizzle(migrationClient);

const migrateDb = async () => {
  try {
    console.log('Starting migration...');
    await migrate(db, { migrationsFolder: 'migrations' });
    console.log('Successfully Migrated!');
    process.exit(0);
  } catch (error) {
    console.log('Error migrating client', error);
    process.exit(1);
  }
};

migrateDb();
