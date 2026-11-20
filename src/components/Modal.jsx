import { useEffect, useRef } from 'react'

export default function Modal({ title, onClose, children, actions }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    if (!d.open) d.showModal()
    return () => d.open && d.close()
  }, [])
  return (
    <dialog ref={ref} className="modal" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <div className="modal-head">
        <h2>{title}</h2>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
      </div>
      <div className="modal-body">{children}</div>
      {actions && <div className="modal-actions">{actions}</div>}
    </dialog>
  )
}
