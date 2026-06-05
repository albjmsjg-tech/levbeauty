'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Preencha email e senha.' }
  }

  const supabase = await createClient()
  const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Email ou senha incorretos.' }
  }

  // Lê role do app_metadata (vem no response, sem query DB)
  let role = signInData.user?.app_metadata?.role as string | undefined

  // Fallback para usuários legados sem app_metadata.role
  if (!role) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', signInData.user.id)
      .single()
    role = (profile?.role as string | undefined) ?? 'client'

    // Backfill app_metadata para que próximos logins não precisem da query
    try {
      const admin = createAdminClient()
      await admin.auth.admin.updateUserById(signInData.user.id, {
        app_metadata: { role },
      })
    } catch { /* non-blocking */ }
  }

  revalidatePath('/', 'layout')
  redirect(role === 'owner' ? '/painel/dashboard' : '/app')
}
