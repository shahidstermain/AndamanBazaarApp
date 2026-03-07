import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const webhookFile = resolve(process.cwd(), 'supabase/functions/cashfree-webhook/index.ts')
const source = readFileSync(webhookFile, 'utf8')

describe('cashfree webhook security guards', () => {
  it('contains timestamp freshness validation to reduce replay window', () => {
    expect(source).toContain('x-webhook-timestamp')
    expect(source).toContain('Math.floor(Date.now() / 1000)')
    expect(source).toContain('Math.abs(nowSeconds - tsSeconds) > 300')
    expect(source).toContain('webhook_timestamp_invalid')
  })

  it('contains signature verification before processing order payload', () => {
    const signatureLine = source.indexOf('Cashfree.PGVerifyWebhookSignature')
    const processLine = source.indexOf('PAYMENT_SUCCESS_WEBHOOK')

    expect(signatureLine).toBeGreaterThan(-1)
    expect(processLine).toBeGreaterThan(-1)
    expect(signatureLine).toBeLessThan(processLine)
  })

  it('contains idempotency guard for already paid boosts', () => {
    expect(source).toContain('if (boost.status === "paid")')
    expect(source).toContain('Already processed')
  })
})
