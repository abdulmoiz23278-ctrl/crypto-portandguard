function showBanner(reason, details) {
  if (document.getElementById('cg-banner')) return

  const div = document.createElement('div')
  div.id = 'cg-banner'
  div.style.cssText = `
    position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483647;
    background:#111827;color:#f9fafb;padding:12px 14px;border-radius:12px;
    font:13px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    box-shadow:0 4px 12px rgba(0,0,0,.3);
    display:flex;align-items:flex-start;gap:8px;
  `

  const icon = document.createElement('div')
  icon.textContent = '⚠️'
  icon.style.marginTop = '2px'

  const text = document.createElement('div')
  text.innerHTML =
    `<strong>${reason}</strong><br>` + (details || []).join(' · ')

  const close = document.createElement('button')
  close.textContent = 'Dismiss'
  close.style.cssText = `
    margin-left:auto;
    background:transparent;
    border:none;
    color:#9ca3af;
    cursor:pointer;
    font-size:12px;
  `
  close.onclick = () => div.remove()

  div.appendChild(icon)
  div.appendChild(text)
  div.appendChild(close)
  document.documentElement.appendChild(div)
}

function showBlockOverlay(reason, details) {
  if (document.getElementById('cg-block-overlay')) return

  const overlay = document.createElement('div')
  overlay.id = 'cg-block-overlay'
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:2147483647;
    background:rgba(15,23,42,0.96);
    color:#f9fafb;
    display:flex;align-items:center;justify-content:center;
    font-family:system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  `

  const box = document.createElement('div')
  box.style.cssText = `
    max-width:480px;width:100%;
    padding:24px;
    background:#020617;
    border-radius:16px;
    box-shadow:0 24px 80px rgba(0,0,0,0.6);
    text-align:left;
  `

  const title = document.createElement('div')
  title.style.cssText = 'font-size:18px;font-weight:600;margin-bottom:8px;'
  title.textContent = '🚫 Crypto Guard blocked this site'

  const reasonEl = document.createElement('div')
  reasonEl.style.cssText = 'font-size:14px;margin-bottom:8px;'
  reasonEl.textContent = reason

  const list = document.createElement('ul')
  list.style.cssText = 'font-size:13px;margin:0 0 16px 16px;padding:0;'
  ;(details || []).forEach(d => {
    const li = document.createElement('li')
    li.textContent = d
    list.appendChild(li)
  })

  const buttons = document.createElement('div')
  buttons.style.cssText = 'display:flex;gap:8px;'

  const leaveBtn = document.createElement('button')
  leaveBtn.textContent = 'Leave page'
  leaveBtn.style.cssText = `
    flex:1;
    background:#ef4444;
    border:none;
    color:white;
    padding:8px 12px;
    border-radius:999px;
    font-size:14px;
    cursor:pointer;
  `
  leaveBtn.onclick = () => {
    if (history.length > 1) {
      history.back()
    } else {
      location.href = 'about:blank'
    }
  }

  const continueBtn = document.createElement('button')
  continueBtn.textContent = 'Visit anyway (unsafe)'
  continueBtn.style.cssText = `
    flex:1;
    background:transparent;
    border:1px solid #4b5563;
    color:#9ca3af;
    padding:8px 12px;
    border-radius:999px;
    font-size:13px;
    cursor:pointer;
  `
  continueBtn.onclick = () => overlay.remove()

  buttons.appendChild(leaveBtn)
  buttons.appendChild(continueBtn)

  box.appendChild(title)
  box.appendChild(reasonEl)
  if (details && details.length) box.appendChild(list)
  box.appendChild(buttons)

  overlay.appendChild(box)
  document.documentElement.appendChild(overlay)
}
