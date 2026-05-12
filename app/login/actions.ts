'use server'

import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { serverEnv } from '@/lib/env'

export type AuthField =
  | 'email'
  | 'password'
  | 'password_confirm'
  | 'invite_code'

export type AuthState = { error?: string; field?: AuthField } | undefined

export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email) return { error: 'Email is required.', field: 'email' }
  if (!password) return { error: 'Password is required.', field: 'password' }

  const supabase = await getSupabaseServer()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    // Supabase doesn't tell us which side is wrong; flag the password as a sensible default.
    return { error: error.message, field: 'password' }
  }

  redirect('/')
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const passwordConfirm = String(formData.get('password_confirm') ?? '')
  const inviteCode = String(formData.get('invite_code') ?? '').trim()

  if (!email) return { error: 'Email is required.', field: 'email' }
  if (!password) return { error: 'Password is required.', field: 'password' }
  if (password.length < 8) {
    return {
      error: 'Password must be at least 8 characters.',
      field: 'password',
    }
  }
  if (password !== passwordConfirm) {
    return { error: "Passwords don't match.", field: 'password_confirm' }
  }
  if (!inviteCode)
    return { error: 'Invite code is required.', field: 'invite_code' }

  const expected = serverEnv('INVITE_CODE')
  if (!expected) {
    return {
      error: 'Signup is disabled (no invite code configured).',
      field: 'invite_code',
    }
  }
  if (inviteCode !== expected) {
    return { error: 'That invite code is not valid.', field: 'invite_code' }
  }

  const supabase = await getSupabaseServer()
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { error: error.message, field: 'email' }

  // Sign in explicitly so they land on the grid immediately instead of bouncing to /login.
  const signIn = await supabase.auth.signInWithPassword({ email, password })
  if (signIn.error) {
    return {
      error:
        'Account created, but auto-sign-in failed. Please try signing in manually.',
      field: 'email',
    }
  }

  redirect('/')
}

export async function signOutAction() {
  const supabase = await getSupabaseServer()
  await supabase.auth.signOut()
  redirect('/login')
}
