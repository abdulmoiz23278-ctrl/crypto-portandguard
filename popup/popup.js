const COINGECKO_API = 'https://api.coingecko.com/api/v3'
let portfolio = []
let isDark = false

// DOM elements
const totalValueEl = document.getElementById('totalValue')
const totalChangeEl = document.getElementById('totalChange')
const portfolioListEl = document.getElementById('portfolioList')

const coinIdInput = document.getElementById('coinIdInput')
const amountInput = document.getElementById('amountInput')
const buyPriceInput = document.getElementById('buyPriceInput')

const addCoinBtn = document.getElementById('addCoinBtn')
const refreshBtn = document.getElementById('refreshBtn')
const darkModeToggle = document.getElementById('darkModeToggle')

// Modal elements
const chartModal = document.getElementById('chartModal')
const chartTitle = document.getElementById('chartTitle')
const chartSvg = document.getElementById('chartSvg')
const chartStats = document.getElementById('chartStats')
const closeChartBtn = document.getElementById('closeChartBtn')

// --- Storage helpers ---

function loadState() {
  return new Promise(resolve => {
    chrome.storage.local.get(['portfolio', 'darkMode'], result => {
      portfolio = Array.isArray(result.portfolio) ? result.portfolio : []
      isDark = !!result.darkMode
      updateDarkMode()
      resolve()
    })
  })
}

function savePortfolio() {
  return new Promise(resolve => {
    chrome.storage.local.set({ portfolio }, resolve)
  })
}

function saveDarkMode() {
  return new Promise(resolve => {
    chrome.storage.local.set({ darkMode: isDark }, resolve)
  })
}

// --- Dark mode ---

function updateDarkMode() {
  if (isDark) {
    document.body.classList.add('dark')
  } else {
    document.body.classList.remove('dark')
  }
}

// --- Portfolio logic ---

async function fetchPrices(coinIds) {
  if (!coinIds.length) return {}

  const idsParam = encodeURIComponent(coinIds.join(','))
  const url =
    `${COINGECKO_API}/simple/price?ids=${idsParam}` +
    `&vs_currencies=usd&include_24hr_change=true`

  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch prices')
  return res.json()
}

async function updatePortfolioUI() {
  portfolioListEl.innerHTML = ''

  if (!portfolio.length) {
    portfolioListEl.innerHTML =
      '<p style="font-size:12px;color:#6b7280;">No coins yet. Add one above.</p>'
    totalValueEl.textContent = '$0.00'
    totalChangeEl.textContent = '0.00%'
    totalChangeEl.className = 'value neutral'
    return
  }

  const coinIds = portfolio.map(c => c.id)
  let priceData = {}
  try {
    priceData = await fetchPrices(coinIds)
  } catch (err) {
    console.error(err)
  }

  let totalValue = 0
  let weightedChange = 0

  portfolio.forEach(coin => {
    const info = priceData[coin.id] || {}
    const price = info.usd ?? 0
    const change24h = info.usd_24h_change ?? 0

    const value = coin.amount * price
    totalValue += value
    weightedChange += value * change24h

    const card = document.createElement('div')
    card.className = 'coin-card'

    const header = document.createElement('div')
    header.className = 'coin-header'

    const left = document.createElement('div')
    const nameEl = document.createElement('div')
    nameEl.className = 'coin-name'
    nameEl.textContent = coin.id

    const amountEl = document.createElement('div')
    amountEl.className = 'coin-amount'
    amountEl.textContent = `${coin.amount} @ current $${price.toFixed(4)}`

    left.appendChild(nameEl)
    left.appendChild(amountEl)

    const valueEl = document.createElement('div')
    valueEl.className = 'coin-name'
    valueEl.textContent = `$${value.toFixed(2)}`

    header.appendChild(left)
    header.appendChild(valueEl)
    card.appendChild(header)

    const row1 = document.createElement('div')
    row1.className = 'coin-row'
    const label1 = document.createElement('span')
    label1.textContent = '24h change'
    const changeSpan = document.createElement('span')
    const changeStr = change24h.toFixed(2) + '%'
    changeSpan.textContent = changeStr
    changeSpan.style.color =
      change24h > 0 ? '#16a34a' : change24h < 0 ? '#dc2626' : '#6b7280'
    row1.appendChild(label1)
    row1.appendChild(changeSpan)
    card.appendChild(row1)

    if (coin.buyPrice && coin.buyPrice > 0) {
      const row2 = document.createElement('div')
      row2.className = 'coin-row'
      const label2 = document.createElement('span')
      label2.textContent = 'P/L vs buy'
      const plValue = (price - coin.buyPrice) * coin.amount
      const plPct =
        coin.buyPrice > 0 ? ((price - coin.buyPrice) / coin.buyPrice) * 100 : 0
      const plSpan = document.createElement('span')
      plSpan.textContent =
        `$${plValue.toFixed(2)} (${plPct.toFixed(2)}%)`
      plSpan.style.color =
        plValue > 0 ? '#16a34a' : plValue < 0 ? '#dc2626' : '#6b7280'
      row2.appendChild(label2)
      row2.appendChild(plSpan)
      card.appendChild(row2)
    }

    const actions = document.createElement('div')
    actions.className = 'coin-actions'

    const chartBtn = document.createElement('button')
    chartBtn.textContent = '30d chart'
    chartBtn.addEventListener('click', () => openChartModal(coin.id))

    const removeBtn = document.createElement('button')
    removeBtn.className = 'secondary'
    removeBtn.textContent = 'Remove'
    removeBtn.addEventListener('click', () => removeCoin(coin.id))

    actions.appendChild(chartBtn)
    actions.appendChild(removeBtn)
    card.appendChild(actions)

    portfolioListEl.appendChild(card)
  })

  totalValueEl.textContent = `$${totalValue.toFixed(2)}`

  let totalChangePct = 0
  if (totalValue > 0) {
    totalChangePct = weightedChange / totalValue
  }

  totalChangeEl.textContent = `${totalChangePct.toFixed(2)}%`
  totalChangeEl.className =
    'value ' +
    (totalChangePct > 0
      ? 'positive'
      : totalChangePct < 0
      ? 'negative'
      : 'neutral')
}

function addCoin() {
  const id = (coinIdInput.value || '').trim().toLowerCase()
  const amount = parseFloat(amountInput.value)
  const buyPrice = parseFloat(buyPriceInput.value)

  if (!id) {
    alert('Please enter a CoinGecko ID (e.g. bitcoin)')
    return
  }

  if (!amount || amount <= 0) {
    alert('Please enter a valid amount')
    return
  }

  const existing = portfolio.find(c => c.id === id)
  if (existing) {
    existing.amount += amount
    if (!isNaN(buyPrice) && buyPrice > 0) {
      existing.buyPrice = buyPrice
    }
  } else {
    portfolio.push({
      id,
      amount,
      buyPrice: !isNaN(buyPrice) && buyPrice > 0 ? buyPrice : null
    })
  }

  coinIdInput.value = ''
  amountInput.value = ''
  buyPriceInput.value = ''

  savePortfolio().then(updatePortfolioUI)
}

function removeCoin(id) {
  if (!confirm(`Remove ${id} from portfolio?`)) return
  portfolio = portfolio.filter(c => c.id !== id)
  savePortfolio().then(updatePortfolioUI)
}

async function refreshPrices() {
  updatePortfolioUI()
}

// --- Chart modal ---

async function openChartModal(coinId) {
  chartTitle.textContent = `📈 ${coinId} — last 30 days`
  chartSvg.innerHTML = ''
  chartStats.textContent = 'Loading…'
  chartModal.classList.remove('hidden')

  try {
    const data = await fetchChartData(coinId, 30)
    drawChart(data)
  } catch (err) {
    console.error(err)
    chartStats.textContent = 'Failed to load chart.'
  }
}

function closeChartModal() {
  chartModal.classList.add('hidden')
}

async function fetchChartData(coinId, days) {
  const url =
    `${COINGECKO_API}/coins/${encodeURIComponent(coinId)}/market_chart` +
    `?vs_currency=usd&days=${days}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch chart')
  const json = await res.json()
  return json.prices || []
}

function drawChart(pricePoints) {
  if (!pricePoints.length) {
    chartStats.textContent = 'No price data.'
    return
  }

  const prices = pricePoints.map(p => p[1])
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const first = prices[0]
  const last = prices[prices.length - 1]
  const change = ((last - first) / first) * 100

  chartStats.textContent =
    `Low: $${min.toFixed(4)} · High: $${max.toFixed(4)} · ` +
    `Change: ${change.toFixed(2)}%`

  const width = 320
  const height = 160
  const padding = 8

  chartSvg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  chartSvg.innerHTML = ''

  const range = max - min || 1
  const stepX = (width - padding * 2) / (prices.length - 1 || 1)

  let d = ''
  prices.forEach((price, i) => {
    const x = padding + i * stepX
    const y =
      height - padding - ((price - min) / range) * (height - padding * 2)
    d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`
  })

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', d)
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke-width', '2')
  path.setAttribute('stroke', change >= 0 ? '#22c55e' : '#ef4444')

  chartSvg.appendChild(path)
}

// --- Event listeners & init ---

addCoinBtn.addEventListener('click', addCoin)
refreshBtn.addEventListener('click', refreshPrices)

darkModeToggle.addEventListener('click', () => {
  isDark = !isDark
  updateDarkMode()
  saveDarkMode()
})

coinIdInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') addCoin()
})
amountInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') addCoin()
})
buyPriceInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') addCoin()
})

closeChartBtn.addEventListener('click', closeChartModal)
chartModal.addEventListener('click', e => {
  if (e.target === chartModal || e.target.classList.contains('modal-backdrop')) {
    closeChartModal()
  }
})

loadState().then(updatePortfolioUI)
