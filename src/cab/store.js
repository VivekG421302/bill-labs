import { useEffect, useState } from 'react'

// useState that survives reloads. Private browsing / full storage just means "not saved".
export function useStored(key, initial) {
  const [value, setValue] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial } catch { return initial }
  })
  const [error, setError] = useState('')
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); setError('') }
    catch { setError('Browser storage is full or blocked, so changes will not be kept after reload.') }
  }, [key, value])
  return [value, setValue, error]
}
