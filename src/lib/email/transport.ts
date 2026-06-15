import { Resend } from 'resend'
import nodemailer from 'nodemailer'

/**
 * Unified email transport.
 *
 * Two providers are supported:
 *  1. Gmail SMTP (free, delivers to ANY recipient) — used when GMAIL_USER +
 *     GMAIL_APP_PASSWORD are set. This is the default for this project.
 *  2. Resend — used as a fallback when Gmail credentials are absent.
 *
 * Both return a normalized { id?, error? } shape so callers (and email_logs)
 * don't care which provider actually sent the message.
 */

const GMAIL_USER = process.env.GMAIL_USER
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '') // strip spaces from "abcd efgh ..."

const resend = new Resend(process.env.RESEND_API_KEY ?? 're_placeholder')

export function activeProvider(): 'gmail' | 'resend' {
  return GMAIL_USER && GMAIL_APP_PASSWORD ? 'gmail' : 'resend'
}

let _gmailTransport: nodemailer.Transporter | null = null
function getGmailTransport() {
  if (!_gmailTransport) {
    _gmailTransport = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    })
  }
  return _gmailTransport
}

export interface DeliverResult {
  id?: string
  error?: string
}

export async function deliverEmail({
  from,
  to,
  replyTo,
  subject,
  html,
}: {
  from: string
  to: string
  replyTo?: string
  subject: string
  html: string
}): Promise<DeliverResult> {
  // ── Gmail SMTP ──
  if (activeProvider() === 'gmail') {
    try {
      // Gmail rewrites the From to the authenticated account, so we present a
      // friendly display name but keep the real Gmail address as the sender.
      const fromHeader = from.includes('<') ? from : `Smart Support <${GMAIL_USER}>`
      // A plain-text alternative alongside the HTML improves deliverability and
      // keeps Gmail from flagging HTML-only mail as spam.
      const text = html
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      const info = await getGmailTransport().sendMail({
        from: fromHeader,
        to,
        replyTo: replyTo ?? GMAIL_USER,
        subject,
        html,
        text,
        headers: { 'X-Entity-Ref-ID': `smart-support-${Date.now()}` },
      })
      return { id: info.messageId }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Gmail send failed' }
    }
  }

  // ── Resend fallback ──
  const { data, error } = await resend.emails.send({
    from,
    to,
    ...(replyTo ? { replyTo } : {}),
    subject,
    html,
  })
  if (error || !data?.id) return { error: error?.message ?? 'Resend send failed' }
  return { id: data.id }
}
