import { DEFAULT_DESCRIPTION, DEFAULT_REMARK, FIELDS } from '../cab/fields.js'

const input = (bill, setBill, key) => ({
  id: `f-${key}`, value: bill[key],
  onChange: (e) => setBill({ ...bill, [key]: e.target.value }),
})
const label = (key) => FIELDS.find((f) => f.key === key).label
const req = (key) => FIELDS.find((f) => f.key === key).required

function Field({ k, bill, setBill, children, hint, className = '' }) {
  return (
    <div className={`field ${className}`}>
      <label htmlFor={`f-${k}`}>{label(k)}{req(k) && <span className="req"> *</span>}</label>
      {children || <input type="text" autoComplete="off" {...input(bill, setBill, k)} />}
      {hint && <p className="hint">{hint}</p>}
    </div>
  )
}

export default function BillForm({ bill, setBill, stamp, setStamp, fileBase }) {
  const p = { bill, setBill }
  return (
    <div className="form-grid">
      <Field k="customerName" {...p} />
      <Field k="rideId" {...p} />
      <Field k="driverName" {...p} />
      <Field k="vehicleNumber" {...p} />
      <Field k="vehicleMode" {...p}>
        <input type="text" list="vehicle-modes" autoComplete="off" {...input(bill, setBill, 'vehicleMode')} />
        <datalist id="vehicle-modes"><option value="Car" /><option value="Bike" /><option value="Auto" /><option value="Cab" /></datalist>
      </Field>
      <Field k="rideTime" {...p} hint="Printed as e.g. Oct 30th 2026, 7:16 AM">
        <input type="datetime-local" {...input(bill, setBill, 'rideTime')} />
      </Field>
      <Field k="price" {...p} hint="Digits only. The ₹ sign is added for you.">
        <input type="text" inputMode="decimal" autoComplete="off" {...input(bill, setBill, 'price')} />
      </Field>
      <Field k="selectedPrice" {...p} hint="Shown in the price box. Leave empty to show Price.">
        <input type="text" inputMode="decimal" autoComplete="off" {...input(bill, setBill, 'selectedPrice')} />
      </Field>
      <Field k="from" {...p} className="wide">
        <textarea rows="2" {...input(bill, setBill, 'from')} />
      </Field>
      <Field k="to" {...p} className="wide">
        <textarea rows="2" {...input(bill, setBill, 'to')} />
      </Field>
      <Field k="description" {...p} className="wide" hint="Times New Roman 9 pt. Empty = standard wording.">
        <textarea rows="4" placeholder={DEFAULT_DESCRIPTION} {...input(bill, setBill, 'description')} />
      </Field>
      <Field k="remark" {...p} className="wide" hint="Times New Roman 9 pt. Empty = standard wording.">
        <textarea rows="2" placeholder={DEFAULT_REMARK} {...input(bill, setBill, 'remark')} />
      </Field>
      <fieldset className="wide filebox">
        <legend>File name</legend>
        <div className="form-grid inner">
          <div className="field">
            <label htmlFor="f-fileName">Name (optional)</label>
            <input id="f-fileName" type="text" autoComplete="off" placeholder="Leave empty to use a timestamp" value={bill.fileName}
              onChange={(e) => setBill({ ...bill, fileName: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="f-stamp">Timestamp date</label>
            <div className="row nowrap">
              <input id="f-stamp" type="datetime-local" value={stamp} onChange={(e) => setStamp(e.target.value)} />
              <button type="button" className="btn btn-sm" disabled={!stamp} onClick={() => setStamp('')}>Auto</button>
            </div>
            <p className="hint">{stamp ? 'Custom date used for the file name.' : 'Auto: the file name uses the Time of ride.'}</p>
          </div>
        </div>
        <p className="hint">Saved as <code>{fileBase}</code> + .pdf or .docx</p>
      </fieldset>
    </div>
  )
}
