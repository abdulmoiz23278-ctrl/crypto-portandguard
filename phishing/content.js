;(function () {
  try {
    // Protect wallet APIs first
    guardEthereum()

    // Analyze current page URL
    const risk = scoreUrl(location.href)

    if (risk.level === 'block') {
      showBlockOverlay(risk.reason, risk.details)
    } else if (risk.level === 'warn') {
      showBanner(risk.reason, risk.details)
    }
  } catch (e) {
    console.error('Crypto Guard content error:', e)
  }
})()
