import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const webhookPath = resolve(process.cwd(), 'supabase/functions/cashfree-webhook/index.ts')
const source = readFileSync(webhookPath, 'utf8')

describe('cashfree-webhook implementation contract', () => {
  it('reads signature and timestamp headers', () => {
    expect(source).toContain('x-webhook-signature')
    expect(source).toContain('x-webhook-timestamp')
  })

  it('rejects stale timestamps with a 5-minute window', () => {
    expect(source).toContain('Math.floor(Date.now() / 1000)')
    expect(source).toContain('Math.abs(nowSeconds - tsSeconds) > 300')
    expect(source).toContain('Invalid or stale timestamp')
  })

  it('verifies webhook signature before processing payment success', () => {
    const verifyIndex = source.indexOf('Cashfree.PGVerifyWebhookSignature')
    const successIndex = source.indexOf('PAYMENT_SUCCESS_WEBHOOK')

    expect(verifyIndex).toBeGreaterThan(-1)
    expect(successIndex).toBeGreaterThan(-1)
    expect(verifyIndex).toBeLessThan(successIndex)
  })

  it('contains idempotency guard for already paid boosts', () => {
    expect(source).toContain('if (boost.status === "paid")')
    expect(source).toContain('Already processed')
  })

  it('marks failed payment webhook records as failed', () => {
    expect(source).toContain('PAYMENT_FAILED_WEBHOOK')
    expect(source).toContain('.update({ status: "failed"')
  })
})
