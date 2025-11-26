function guardEthereum() {
  try {
    const w = window
    const eth = w.ethereum
    if (!eth || eth.__cryptoGuardPatched) return

    const originalRequest = eth.request && eth.request.bind(eth)
    if (!originalRequest) return

    eth.request = async args => {
      try {
        const method = (args && args.method ? args.method : '').toLowerCase()

        if (method === 'eth_sign' || method === 'personal_sign') {
          showBanner('Raw signature request blocked', [
            'This kind of signature can authorize actions off-site.',
            'Confirm the site is trusted before signing.'
          ])
          throw new Error('Blocked by Crypto Guard (raw signature)')
        }

        return await originalRequest(args)
      } catch (e) {
        throw e
      }
    }

    eth.__cryptoGuardPatched = true
  } catch (e) {
    console.error('Crypto Guard walletGuard error:', e)
  }
}
