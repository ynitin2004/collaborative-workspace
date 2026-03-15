'use server';

import { z } from 'zod';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { FormSchema } from '../types';
import { cookies } from 'next/headers';
import db from '../supabase/db';
import { users } from '../supabase/schema';
import { eq } from 'drizzle-orm';

export async function actionLoginUser({
  email,
  password,
}: z.infer<typeof FormSchema>) {
  const supabase = createServerComponentClient({ cookies });
  const response = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return response;
}

export async function actionSignUpUser({
  email,
  password,
}: z.infer<typeof FormSchema>) {
  const supabase = createServerComponentClient({ cookies });
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('email', email);

  if (data?.length) return { error: { message: 'User already exists', data } };
  const response = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}api/auth/callback`,
    },
  });

  // After successful sign-up, create a user record in the database
  if (!response.error && response.data?.user) {
    try {
      await db.insert(users).values({
        id: response.data.user.id,
        email: response.data.user.email || email,
      }).onConflictDoNothing();
    } catch (err) {
      console.error('Error creating user record in DB:', err);
    }
  }

  return response;
}
