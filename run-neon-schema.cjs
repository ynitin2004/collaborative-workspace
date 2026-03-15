// DNS Fix — must come BEFORE any other imports
const dns = require('dns');
const { Resolver } = require('dns');

// Create a custom resolver using Google DNS
const resolver = new Resolver();
resolver.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

// Monkey-patch dns.lookup to use our custom resolver for neon.tech domains
const origLookup = dns.lookup;
dns.lookup = function patchedLookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (typeof options === 'number') {
    options = { family: options };
  }
  options = options || {};
  
  if (hostname && hostname.includes('neon.tech')) {
    console.log(`[DNS] Resolving ${hostname} via Google DNS...`);
    resolver.resolve4(hostname, (err, addresses) => {
      if (err) {
        console.error(`[DNS] resolve4 failed:`, err.message);
        return origLookup.call(dns, hostname, options, callback);
      }
      const ip = addresses[0];
      console.log(`[DNS] Resolved -> ${ip}`);
      // Match the signature that net.connect expects: (err, address, family)
      return callback(null, ip, 4);
    });
  } else {
    return origLookup.call(dns, hostname, options, callback);
  }
};

// Now load everything else
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const postgres = require('postgres');

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not found in .env');
    process.exit(1);
  }
  
  console.log('🔌 Connecting to Neon DB...');
  
  const sql = postgres(dbUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 30,
  });
  
  try {
    // Test connection first
    const test = await sql`SELECT 1 as connected`;
    console.log('✅ Connected to Neon DB!');
    
    // Check existing tables
    const existingTables = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `;
    console.log('📋 Existing tables:', existingTables.map(t => t.table_name));
    
    // Read and execute the neon-schema.sql
    const schemaPath = path.join(__dirname, 'neon-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    
    console.log('🚀 Running neon-schema.sql...');
    await sql.unsafe(schemaSql);
    console.log('✅ Schema executed successfully!');
    
    // Verify tables after
    const tablesAfter = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `;
    console.log('📋 Tables after migration:', tablesAfter.map(t => t.table_name));
    
    // Count rows in users table
    const userCount = await sql`SELECT COUNT(*) as count FROM users`;
    console.log('👥 Users in database:', userCount[0].count);
    
    await sql.end();
    console.log('🎉 Done! Database is ready.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message || error);
    await sql.end();
    process.exit(1);
  }
}

main();
