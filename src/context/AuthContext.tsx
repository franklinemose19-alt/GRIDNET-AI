import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

type Role = 'user' | 'provider' | 'admin'

interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  role: Role
  business_name: string | null
  referral_code: string | null
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string, phone: string, asProvider: boolean, referralCode?: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadOrCreateProfile(userId: string, fallbackName: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()

    if (data) {
      setProfile(data as Profile)
      return
    }

    // no profile yet (first-time Google sign-in) - create a basic one now, then load it
    const { error: insertError } = await supabase.from('profiles').insert({
      id: userId,
      full_name: fallbackName,
      phone: null,
      role: 'user',
    })

    if (!insertError) {
      const { data: created } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      if (created) setProfile(created as Profile)
    }
  }

  async function refreshProfile() {
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (data) setProfile(data as Profile)
    }
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      if (session?.user) {
        const fallbackName = session.user.email ? session.user.email.split('@')[0] : 'there'
        await loadOrCreateProfile(session.user.id, fallbackName)
      }
      setLoading(false)
    }
    init()

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        setLoading(true)
        const fallbackName = session.user.email ? session.user.email.split('@')[0] : 'there'
        await loadOrCreateProfile(session.user.id, fallbackName)
        setLoading(false)
      } else {
        setProfile(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signUp(email: string, password: string, fullName: string, phone: string, asProvider: boolean, referralCode?: string) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message }
    if (!data.user) return { error: 'Sign up failed, try again.' }

    let referredBy: string | null = null
    if (referralCode) {
      const { data: referrer } = await supabase
        .from('profiles').select('id').eq('referral_code', referralCode.toUpperCase()).maybeSingle()
      if (referrer) referredBy = referrer.id
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: fullName,
      phone,
      role: asProvider ? 'provider' : 'user',
      referred_by: referredBy,
    })
    if (profileError) return { error: profileError.message }

    if (referredBy) {
      await supabase.from('referrals').insert({
        referrer_id: referredBy,
        referred_id: data.user.id,
        status: 'pending',
      })
    }

    await loadOrCreateProfile(data.user.id, fullName)
    return { error: null }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/discover' },
    })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signInWithGoogle, resetPassword, updatePassword, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
