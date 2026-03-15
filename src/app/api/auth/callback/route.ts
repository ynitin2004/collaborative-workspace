import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/supabase/db';
import { users } from '@/lib/supabase/schema';

export async function GET(req: NextRequest) {
  console.log('GET request received with URL:', req.url);
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');
  console.log('Code from URL search params:', code);

  if (code) {
    console.log('Code is present, exchanging code for session');
    const supabase = createRouteHandlerClient({ cookies });
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data?.user) {
      // Ensure user exists in our database
      try {
        await db.insert(users).values({
          id: data.user.id,
          email: data.user.email || '',
        }).onConflictDoNothing();
        console.log('User record ensured in database for:', data.user.email);
      } catch (err) {
        console.error('Error upserting user record:', err);
      }
    }
  } else {
    console.log('No code found in URL search params');
  }

  console.log('Redirecting to dashboard');
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
}