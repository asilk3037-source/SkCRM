import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Body =
  | { action: 'create'; company_id: string; name: string; email: string; password: string }
  | { action: 'edit'; company_id: string; user_id: string; name: string }
  | { action: 'reset_password'; company_id: string; user_id: string }
  | { action: 'set_active'; company_id: string; user_id: string; active: boolean }
  | { action: 'delete'; company_id: string; user_id: string }
  | { action: 'last_sign_in'; company_id: string; user_ids: string[] }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autenticado.' }, 401)

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Cliente com o JWT de quem chamou: usado só para descobrir quem é e
    // validar o papel dele via RLS de verdade (não confia em nada que o
    // corpo da requisição diga sobre permissões).
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: authData, error: authErr } = await callerClient.auth.getUser()
    if (authErr || !authData.user) return json({ error: 'Sessão inválida.' }, 401)
    const caller = authData.user

    const body = (await req.json()) as Body
    if (!body?.action || !body?.company_id) return json({ error: 'Parâmetros inválidos.' }, 400)

    const callerDb = callerClient.schema('skcrm')
    const { data: company } = await callerDb.from('companies').select('id, org_id').eq('id', body.company_id).single()
    if (!company) return json({ error: 'Empresa não encontrada.' }, 404)

    const { data: membership } = await callerDb
      .from('org_members')
      .select('role')
      .eq('org_id', company.org_id)
      .eq('user_id', caller.id)
      .maybeSingle()

    if (!membership || !['admin', 'supervisor'].includes(membership.role)) {
      return json({ error: 'Você não tem permissão para gerenciar usuários desta empresa.' }, 403)
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const adminDb = admin.schema('skcrm')

    if (body.action === 'create') {
      if (!body.name?.trim() || !body.email?.trim() || !body.password) {
        return json({ error: 'Nome, e-mail e senha são obrigatórios.' }, 400)
      }
      if (body.password.length < 8) {
        return json({ error: 'A senha precisa ter pelo menos 8 caracteres.' }, 400)
      }

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: body.email.trim().toLowerCase(),
        password: body.password,
        email_confirm: true,
        user_metadata: { skip_org_creation: true, display_name: body.name.trim() },
      })
      if (createErr) return json({ error: createErr.message }, 400)

      const { error: linkErr } = await adminDb.from('company_members').insert({
        org_id: company.org_id,
        company_id: body.company_id,
        user_id: created.user.id,
        active: true,
      })
      if (linkErr) {
        // Não deixa um usuário Auth órfão (sem vínculo com a empresa) para trás.
        await admin.auth.admin.deleteUser(created.user.id)
        return json({ error: linkErr.message }, 400)
      }

      return json({ ok: true, user_id: created.user.id })
    }

    if (body.action === 'edit') {
      if (!body.user_id || !body.name?.trim()) return json({ error: 'Dados inválidos.' }, 400)
      const { error } = await adminDb.from('profiles').update({ display_name: body.name.trim() }).eq('user_id', body.user_id)
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    if (body.action === 'reset_password') {
      if (!body.user_id) return json({ error: 'Dados inválidos.' }, 400)
      const { data: userData, error: getErr } = await admin.auth.admin.getUserById(body.user_id)
      if (getErr || !userData.user?.email) return json({ error: 'Usuário não encontrado.' }, 404)

      const { data: siteUrlSecret } = await adminDb.rpc('get_secret', { secret_name: 'site_url' })
      const siteUrl = (siteUrlSecret as string | null) || 'https://sk-crm-six.vercel.app'

      const { error } = await callerClient.auth.resetPasswordForEmail(userData.user.email, {
        redirectTo: `${siteUrl}/redefinir-senha`,
      })
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    if (body.action === 'set_active') {
      if (!body.user_id || typeof body.active !== 'boolean') return json({ error: 'Dados inválidos.' }, 400)
      const { error } = await adminDb
        .from('company_members')
        .update({ active: body.active })
        .eq('company_id', body.company_id)
        .eq('user_id', body.user_id)
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    if (body.action === 'delete') {
      if (!body.user_id) return json({ error: 'Dados inválidos.' }, 400)
      const { error } = await admin.auth.admin.deleteUser(body.user_id)
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    if (body.action === 'last_sign_in') {
      if (!Array.isArray(body.user_ids)) return json({ error: 'Dados inválidos.' }, 400)
      // A Admin API não expõe last_sign_in_at em lote — busca usuário a usuário
      // (lista por empresa, então é um número pequeno de chamadas).
      const results = await Promise.all(
        body.user_ids.map(async (uid) => {
          const { data } = await admin.auth.admin.getUserById(uid)
          return { user_id: uid, last_sign_in_at: data.user?.last_sign_in_at ?? null }
        }),
      )
      return json({ ok: true, users: results })
    }

    return json({ error: 'Ação desconhecida.' }, 400)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Erro desconhecido' }, 500)
  }
})
