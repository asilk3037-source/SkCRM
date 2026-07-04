import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FROM = 'SkCRM <onboarding@resend.dev>'

type Body = { event: 'ticket_created' | 'ticket_comment' | 'org_invite'; id: string }

function truncate(text: string, max = 400) {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { event, id } = (await req.json()) as Body
    if (!event || !id) {
      return new Response(JSON.stringify({ error: 'event e id são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const skcrm = db.schema('skcrm')

    const { data: apiKey } = await skcrm.rpc('get_secret', { secret_name: 'resend_api_key' })
    const { data: siteUrlSecret } = await skcrm.rpc('get_secret', { secret_name: 'site_url' })
    const siteUrl = (siteUrlSecret as string | null) || 'https://sk-crm-six.vercel.app'

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Provedor de e-mail não configurado' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let to: string[] = []
    let subject = ''
    let html = ''

    if (event === 'ticket_created') {
      const { data: ticket } = await skcrm
        .from('tickets')
        .select('id, number, subject, org_id, assignee_id')
        .eq('id', id)
        .single()
      if (!ticket) throw new Error('Chamado não encontrado')

      if (ticket.assignee_id) {
        const { data: profile } = await skcrm.from('profiles').select('email').eq('user_id', ticket.assignee_id).single()
        if (profile?.email) to = [profile.email]
      }
      if (to.length === 0) {
        const { data: admins } = await skcrm
          .from('org_members')
          .select('profile:profiles(email)')
          .eq('org_id', ticket.org_id)
          .eq('role', 'admin')
        to = ((admins ?? []) as unknown as Array<{ profile: { email: string } | null }>)
          .map((a) => a.profile?.email)
          .filter((e): e is string => !!e)
      }

      subject = `Novo chamado #${ticket.number}: ${ticket.subject}`
      html = `<p>Um novo chamado foi aberto.</p>
        <p><strong>#${ticket.number} — ${ticket.subject}</strong></p>
        <p><a href="${siteUrl}/chamados/${ticket.id}">Abrir chamado no SkCRM</a></p>`
    } else if (event === 'ticket_comment') {
      const { data: comment } = await skcrm
        .from('ticket_comments')
        .select('id, body, internal, owner_id, ticket_id')
        .eq('id', id)
        .single()
      if (!comment || comment.internal) {
        return new Response(JSON.stringify({ skipped: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: ticket } = await skcrm
        .from('tickets')
        .select('id, number, subject, org_id, assignee_id, contact_id')
        .eq('id', comment.ticket_id)
        .single()
      if (!ticket) throw new Error('Chamado não encontrado')

      const { data: membership } = await skcrm
        .from('org_members')
        .select('user_id')
        .eq('org_id', ticket.org_id)
        .eq('user_id', comment.owner_id)
        .maybeSingle()

      if (membership) {
        // staff respondeu -> avisa o cliente
        if (ticket.contact_id) {
          const { data: contact } = await skcrm.from('contacts').select('email').eq('id', ticket.contact_id).single()
          if (contact?.email) to = [contact.email]
        }
      } else {
        // cliente respondeu -> avisa o responsável (ou os admins)
        if (ticket.assignee_id) {
          const { data: profile } = await skcrm.from('profiles').select('email').eq('user_id', ticket.assignee_id).single()
          if (profile?.email) to = [profile.email]
        }
        if (to.length === 0) {
          const { data: admins } = await skcrm
            .from('org_members')
            .select('profile:profiles(email)')
            .eq('org_id', ticket.org_id)
            .eq('role', 'admin')
          to = ((admins ?? []) as unknown as Array<{ profile: { email: string } | null }>)
            .map((a) => a.profile?.email)
            .filter((e): e is string => !!e)
        }
      }

      subject = `Nova interação no chamado #${ticket.number}`
      html = `<p>Nova mensagem no chamado <strong>#${ticket.number} — ${ticket.subject}</strong>:</p>
        <blockquote>${truncate(comment.body)}</blockquote>
        <p><a href="${siteUrl}/chamados/${ticket.id}">Ver chamado no SkCRM</a></p>`
    } else if (event === 'org_invite') {
      const { data: invite } = await skcrm.from('org_invites').select('id, email, role, org_id').eq('id', id).single()
      if (!invite) throw new Error('Convite não encontrado')
      const { data: org } = await skcrm.from('orgs').select('name').eq('id', invite.org_id).single()

      to = [invite.email]
      subject = `Convite para ${org?.name ?? 'uma equipe'} no SkCRM`
      html = `<p>Você foi convidado(a) para entrar na equipe <strong>${org?.name ?? ''}</strong> no SkCRM.</p>
        <p>Crie sua conta usando este mesmo e-mail (<strong>${invite.email}</strong>) para entrar automaticamente:</p>
        <p><a href="${siteUrl}/cadastro">Criar conta no SkCRM</a></p>`
    }

    if (to.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: 'sem destinatário' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    })

    const resendBody = await resendRes.json().catch(() => null)

    return new Response(JSON.stringify({ ok: resendRes.ok, resend: resendBody }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Erro desconhecido' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
