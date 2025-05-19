import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getURL } from '@/utils/helpers';

export async function POST() {
  const supabase = await createClient();
  
  await supabase.auth.signOut();
  
  return NextResponse.redirect(new URL('/', getURL()));
} 