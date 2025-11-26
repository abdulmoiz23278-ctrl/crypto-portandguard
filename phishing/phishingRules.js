// Simple phishing scoring engine

const CG_BLOCKLIST = {
  'metamask-bonus.xyz': true,
  'uniswap-airdrop.app': true,
  'binannce.com': true,
  'coinba5e.com': true
}

const CG_BRANDS = [
  'metamask.io',
  'uniswap.org',
  'binance.com',
  'coinbase.com',
  'kraken.com',
  'bybit.com',
  'okx.com'
]

const CG_HOST_KEYWORDS = [
  'airdrop',
  'bonus',
  'giveaway',
  'gift',
  'promo',
  'promotion',
  'reward',
  'double',
  'claim',
  'free',
  'mint',
  'drop',
  'connectwallet',
  'walletconnect',
  'wallet-connect',
  'reconnect'
]

const CG_PATH_KEYWORDS = [
  'airdrop',
  'bonus',
  'giveaway',
  'gift',
  'reward',
  'double',
  'claim',
  'free-nft',
  'free-nfts',
  'mint-free',
  'mint',
  'claim-nft',
  'login-bonus',
  'verify-wallet',
  'connect-wallet',
  'wallet-connect',
  'reconnect-wallet',
  'airdrop-claim'
]

const CG_SUSPICIOUS_TLDS = [
  'xyz',
  'top',
  'click',
  'link',
  'work',
  'live',
  'info',
  'online',
  'cn',
  'tk',
  'gq',
  'ml',
  'ga'
]

function cgEditDistance(a, b) {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      )
    }
  }
  return dp[m][n]
}

function cgIsBlockedDomain(host) {
  const h = host.toLowerCase()
  if (CG_BLOCKLIST[h]) return true
  if (h.startsWith('www.') && CG_BLOCKLIST[h.slice(4)]) return true
  return false
}

function cgIsIpAddress(host) {
  const parts = host.split('.')
  if (parts.length === 4 && parts.every(p => /^\d+$/.test(p))) return true
  return false
}

function cgGetTld(host) {
  const parts = host.split('.')
  if (parts.length < 2) return null
  return parts[parts.length - 1].toLowerCase()
}

function cgLooksLikeBrand(host) {
  const h = host.toLowerCase()
  let bestMatch = null
  let bestDistance = Infinity

  for (const brandDomain of CG_BRANDS) {
    const brand = brandDomain.toLowerCase()
    const hostMain = h.split('.').slice(-2).join('.')
    const brandMain = brand.split('.').slice(-2).join('.')
    const d = cgEditDistance(hostMain, brandMain)
    if (d < bestDistance) {
      bestDistance = d
      bestMatch = brandMain
    }
  }
  return { match: bestMatch, distance: bestDistance }
}

// MAIN: scoreUrl(rawUrl) → { level: 'ok'|'warn'|'block', reason, details[] }
function scoreUrl(rawUrl) {
  let url
  try {
    url = new URL(rawUrl)
  } catch (e) {
    return {
      level: 'warn',
      reason: 'Could not safely parse URL',
      details: ['URL structure is invalid']
    }
  }

  const host = url.hostname.toLowerCase()
  const fullPath = (url.pathname + url.search).toLowerCase()

  // 1) Known malicious domain
  if (cgIsBlockedDomain(host)) {
    return {
      level: 'block',
      reason: 'Known malicious domain',
      details: ['Domain appears on Crypto Guard blocklist']
    }
  }

  let score = 0
  const details = []

  // 2) Punycode
  if (host.startsWith('xn--')) {
    score += 4
    details.push('Punycode / IDN domain (often used to mimic legit brands)')
  }

  // 3) Brand lookalike
  const brandLike = cgLooksLikeBrand(host)
  if (brandLike.match && brandLike.distance > 0 && brandLike.distance <= 2) {
    score += 4
    details.push(`Domain looks like ${brandLike.match} (possible typo-squat)`)
  }

  // 4) Suspicious TLD
  const tld = cgGetTld(host)
  if (tld && CG_SUSPICIOUS_TLDS.includes(tld)) {
    score += 2
    details.push(`Suspicious top-level domain: .${tld}`)
  }

  // 5) Deep subdomains
  const subdomains = host.split('.')
  if (subdomains.length > 3) {
    score += 1
    details.push('Unusually deep subdomain structure')
  }

  // 6) Raw IP
  if (cgIsIpAddress(host)) {
    score += 2
    details.push('Raw IP address used instead of normal domain')
  }

  // 7) Host keywords
  if (CG_HOST_KEYWORDS.some(k => host.includes(k))) {
    score += 3
    details.push('Suspicious marketing / promo keywords in domain name')
  }

  // 8) Path/query keywords
  if (CG_PATH_KEYWORDS.some(k => fullPath.includes(k))) {
    score += 3
    details.push('Suspicious promotional / airdrop keywords in URL path')
  }

  // 9) "@" in URL (phishing trick)
  if (rawUrl.includes('@') && !CG_BRANDS.some(b => host.endsWith(b))) {
    score += 2
    details.push('URL contains "@" which can hide the real destination')
  }

  // Decision
  if (score >= 8) {
    return {
      level: 'block',
      reason: 'High-risk phishing indicators detected',
      details
    }
  }

  if (score >= 4) {
    return {
      level: 'warn',
      reason: 'Suspicious indicators detected',
      details
    }
  }

  return {
    level: 'ok',
    reason: 'No strong phishing indicators found',
    details
  }
}
