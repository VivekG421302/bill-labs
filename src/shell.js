import { useEffect, useRef } from 'react'

// Tells the shared navbar what the current page offers (see public/shell/shell.js).
// `get` is called when the Download window opens, so it always sees the latest state.
export function usePage(get) {
  const ref = useRef(get)
  ref.current = get
  useEffect(() => {
    const BL = window.BillLabs
    if (!BL) return undefined
    BL.page({ downloads: () => ref.current().downloads })
    return () => BL.page({})
  }, [])
}

// A message the Download window shows as-is (instead of "Could not make the file").
export const friendly = (msg) => Object.assign(new Error(msg), { friendly: true })
