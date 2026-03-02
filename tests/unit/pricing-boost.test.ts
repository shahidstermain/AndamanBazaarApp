/**
 * PHASE 2 — Boost Activation & Pricing Logic Tests
 * Covers: tier selection, price lookup, tier validation, format helpers
 */
import { describe, it, expect } from 'vitest'
import { BOOST_TIERS, getTier, formatInr, formatInrDecimal } from '../../src/lib/pricing'

describe('BOOST_TIERS configuration', () => {
  it('has exactly 3 tiers', () => {
    expect(BOOST_TIERS).toHaveLength(3)
  })

  it('Spark tier is ₹49 for 3 days', () => {
    const spark = BOOST_TIERS.find(t => t.key === 'spark')!
    expect(spark.priceInr).toBe(49)
    expect(spark.pricePaise).toBe(4900)
    expect(spark.durationDays).toBe(3)
    expect(spark.popular).toBeUndefined()
  })

  it('Boost tier is ₹99 for 7 days and marked popular', () => {
    const boost = BOOST_TIERS.find(t => t.key === 'boost')!
    expect(boost.priceInr).toBe(99)
    expect(boost.pricePaise).toBe(9900)
    expect(boost.durationDays).toBe(7)
    expect(boost.popular).toBe(true)
  })

  it('Power tier is ₹199 for 30 days', () => {
    const power = BOOST_TIERS.find(t => t.key === 'power')!
    expect(power.priceInr).toBe(199)
    expect(power.pricePaise).toBe(19900)
    expect(power.durationDays).toBe(30)
  })

  it('all tiers have non-empty features array', () => {
    for (const tier of BOOST_TIERS) {
      expect(tier.features.length).toBeGreaterThan(0)
    }
  })

  it('pricePaise matches priceInr * 100 for every tier', () => {
    for (const tier of BOOST_TIERS) {
      expect(tier.pricePaise).toBe(tier.priceInr * 100)
    }
  })
})

describe('getTier()', () => {
  it('returns spark tier by key', () => {
    const tier = getTier('spark')
    expect(tier.key).toBe('spark')
    expect(tier.priceInr).toBe(49)
  })

  it('returns boost tier by key', () => {
    expect(getTier('boost').priceInr).toBe(99)
  })

  it('returns power tier by key', () => {
    expect(getTier('power').priceInr).toBe(199)
  })

  it('throws on unknown tier key', () => {
    expect(() => getTier('premium')).toThrow('Unknown boost tier: premium')
  })

  it('throws on empty string', () => {
    expect(() => getTier('')).toThrow()
  })
})

describe('formatInr()', () => {
  it('formats 49 as ₹49', () => {
    expect(formatInr(49)).toBe('₹49')
  })

  it('formats 1000 as ₹1,000', () => {
    expect(formatInr(1000)).toBe('₹1,000')
  })

  it('formats 100000 with Indian grouping', () => {
    const result = formatInr(100000)
    expect(result).toContain('1')
    expect(result).toContain('00')
    expect(result).toContain('000')
  })

  it('formats 0 as ₹0', () => {
    expect(formatInr(0)).toBe('₹0')
  })
})

describe('formatInrDecimal()', () => {
  it('formats 99 as ₹99.00', () => {
    expect(formatInrDecimal(99)).toBe('₹99.00')
  })

  it('formats 49.5 with two decimal places', () => {
    expect(formatInrDecimal(49.5)).toBe('₹49.50')
  })
})
