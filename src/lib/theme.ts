export type Theme = 'auto' | 'light' | 'dark'

export const getTheme = (): Theme => {
  try {
    return (localStorage.getItem('theme') as Theme) || 'auto'
  } catch {
    return 'auto'
  }
}

export const applyTheme = (t: Theme) => {
  const root = document.documentElement
  if (t === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', t)
  const dark = t === 'dark' || (t === 'auto' && !window.matchMedia('(prefers-color-scheme: light)').matches)
  const color = dark ? '#0f1115' : '#f3f4f0'
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    if (t === 'auto') {
      // в авто-режиме — свой цвет для каждой темы телефона
      const isDarkMeta = m.getAttribute('media')?.includes('dark')
      m.setAttribute('content', isDarkMeta ? '#0f1115' : '#f3f4f0')
    } else m.setAttribute('content', color)
  })
}

export const setTheme = (t: Theme) => {
  try {
    localStorage.setItem('theme', t)
  } catch {
    /* ignore */
  }
  applyTheme(t)
}
