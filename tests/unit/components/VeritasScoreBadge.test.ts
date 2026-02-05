import { describe, it, expect } from 'vitest'

describe('VeritasScoreBadge', () => {
  const getScoreInfo = (score: number) => {
    if (score >= 90) {
      return { label: 'Exceptional', color: 'emerald', icon: 'shield-check' }
    }
    if (score >= 75) {
      return { label: 'High', color: 'blue', icon: 'check-badge' }
    }
    if (score >= 60) {
      return { label: 'Moderate', color: 'yellow', icon: 'exclamation-circle' }
    }
    if (score >= 40) {
      return { label: 'Limited', color: 'orange', icon: 'exclamation-triangle' }
    }
    return { label: 'Low', color: 'red', icon: 'x-circle' }
  }

  it('returns Exceptional for scores >= 90', () => {
    expect(getScoreInfo(90).label).toBe('Exceptional')
    expect(getScoreInfo(95).label).toBe('Exceptional')
    expect(getScoreInfo(100).label).toBe('Exceptional')
  })

  it('returns High for scores 75-89', () => {
    expect(getScoreInfo(75).label).toBe('High')
    expect(getScoreInfo(80).label).toBe('High')
    expect(getScoreInfo(89).label).toBe('High')
  })

  it('returns Moderate for scores 60-74', () => {
    expect(getScoreInfo(60).label).toBe('Moderate')
    expect(getScoreInfo(70).label).toBe('Moderate')
    expect(getScoreInfo(74).label).toBe('Moderate')
  })

  it('returns Limited for scores 40-59', () => {
    expect(getScoreInfo(40).label).toBe('Limited')
    expect(getScoreInfo(50).label).toBe('Limited')
    expect(getScoreInfo(59).label).toBe('Limited')
  })

  it('returns Low for scores < 40', () => {
    expect(getScoreInfo(0).label).toBe('Low')
    expect(getScoreInfo(20).label).toBe('Low')
    expect(getScoreInfo(39).label).toBe('Low')
  })

  it('returns correct colors', () => {
    expect(getScoreInfo(95).color).toBe('emerald')
    expect(getScoreInfo(80).color).toBe('blue')
    expect(getScoreInfo(65).color).toBe('yellow')
    expect(getScoreInfo(50).color).toBe('orange')
    expect(getScoreInfo(20).color).toBe('red')
  })
})
