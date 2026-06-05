'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function signUpClient(formData: FormData) {
  const email    = formData.get('email') as string
  const password = formData.get('password') as string
  const name     = formData.get('name') as string
  const phone    = ((formData.get('phone') as string) ?? '').replace(/\D/g, '')

  if (!email || !password || !phone) {
    return { error: 'Preencha todos os campos.' }
  }

  const supabase = await createClient()
  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  })

  if (error) return { error: error.message }

  const newUserId = authData.user?.id

  // Persiste role='client' no app_metadata para que middleware leia do JWT sem query DB
  if (newUserId) {
    try {
      const admin = createAdminClient()
      await admin.auth.admin.updateUserById(newUserId, {
        app_metadata: { role: 'client' },
      })
    } catch { /* non-blocking — signup já concluído */ }
  }

  // Auto-link: vincula clients com mesmo telefone ao novo profile (falha silenciosa)
  if (newUserId && phone) {
    try {
      const admin = createAdminClient()
      await admin
        .from('clients')
        .update({ profile_id: newUserId })
        .eq('phone', phone)
        .is('profile_id', null)
    } catch {
      // Signup já concluído — não bloqueia o fluxo
    }
  }

  revalidatePath('/', 'layout')
  redirect('/app')
}
