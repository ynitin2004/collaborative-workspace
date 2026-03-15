require('./dns-fix.cjs');
require('dotenv').config({ path: '.env' });

const postgres = require('postgres');

async function test() {
  console.log('Testing Neon DB connection...');
  console.log('DATABASE_URL starts with:', process.env.DATABASE_URL.substring(0, 50) + '...');
  
  const sql = postgres(process.env.DATABASE_URL, { 
    max: 1,
    connect_timeout: 15,
    idle_timeout: 10,
  });
  
  try {
    const result = await sql`SELECT 1 as connected`;
    console.log('✅ Connected!', result);
    
    const tables = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `;
    console.log('📋 Tables:', tables.map(t => t.table_name));
    
    await sql.end();
    process.exit(0);
  } catch (e) {
    console.error('❌ Failed:', e.message);
    await sql.end();
    process.exit(1);
  }
}

test();
