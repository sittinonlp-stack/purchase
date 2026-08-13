/* global React */
// ============================
// The main form: PurchaseForm
// Used for both materials and machine rentals (type prop switches some labels/cats)
// ============================


function ProjectPicker({ value, onChange, projects, onAdd }) {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 300 });
  const btnRef = useRef(null);
  const cur = projects.find((p) => p.id === value);
  // ซ่อนโครงการที่เก็บถาวร — แต่คงโครงการปัจจุบันของบิลไว้ (เผื่อเปิดบิลเก่ามาดู)
  const visibleProjects = projects.filter((p) => p.status !== 'archived' || p.id === value);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const dropH = Math.min(visibleProjects.length * 46 + 52, 340);
      const top = spaceBelow < dropH && r.top > dropH ? r.top - dropH - 2 : r.bottom + 4;
      setDropPos({ top, left: r.left, width: r.width });
    }
    setOpen(v => !v);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button ref={btnRef} type="button" className="input"
        style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        onClick={handleToggle}>
        {cur ? (
          <>
            <span className="proj-chip-dot" style={{ background: cur.color }}></span>
            <span style={{ flex: 1 }}>
              <span className="mono" style={{ color: 'var(--ink-3)', fontSize: 11, marginRight: 8 }}>{cur.code}</span>
              <span>{cur.name}</span>
            </span>
          </>
        ) : (
          <span style={{ flex: 1, color: 'var(--ink-4)' }}>เลือกโครงการ...</span>
        )}
        <Icon name="chevron" size={14} stroke={2} />
      </button>
      {open && (
        <>
          {/* Transparent overlay — catches outside clicks */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 9990 }} onClick={() => setOpen(false)} />
          {/* Dropdown — always on top via fixed + high z-index */}
          <div style={{
            position: 'fixed',
            top: dropPos.top,
            left: dropPos.left,
            width: dropPos.width,
            zIndex: 9999,
            background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.22)', overflow: 'hidden', maxHeight: 340, overflowY: 'auto'
          }}>
            {visibleProjects.map((p) => (
              <button key={p.id} type="button"
                onClick={() => { onChange(p.id); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
                  fontSize: 13, textAlign: 'left', fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span className="proj-chip-dot" style={{ background: p.color }}></span>
                <span className="mono" style={{ color: 'var(--ink-3)', fontSize: 11 }}>{p.code}</span>
                <span style={{ flex: 1 }}>{p.name}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{p.client}</span>
              </button>
            ))}
            <button type="button" onClick={() => { setOpen(false); onAdd && onAdd(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '12px 14px', border: 'none', cursor: 'pointer',
                background: 'var(--bg-2)', borderTop: '1px solid var(--line)', fontFamily: 'inherit',
                fontSize: 13, color: 'var(--accent-ink)', fontWeight: 500
              }}>
              <Icon name="plus" size={14} /> เพิ่มโครงการใหม่
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function CategorySelect({ value, onChange, cats, onAdd, placeholder = 'เลือก' }) {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, minWidth: 260 });
  const btnRef = useRef(null);
  const cur = cats.find((c) => c.id === value);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      // flip upward if not enough space below
      const spaceBelow = window.innerHeight - r.bottom;
      const dropH = Math.min(cats.length * 36 + 48, 280);
      const top = spaceBelow < dropH && r.top > dropH ? r.top - dropH - 2 : r.bottom + 2;
      setDropPos({ top, left: r.left, minWidth: Math.max(r.width, 260) });
    }
    setOpen(v => !v);
  };


  return (
    <div style={{ position: 'relative' }}>
      <button ref={btnRef} type="button" className="cell-input"
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', cursor: 'pointer', textAlign: 'left' }}
        onClick={handleToggle}>
        {cur ? <><span className="cat-dot" style={{ background: cur.color, flexShrink: 0 }}></span><span style={{ flex: 1, fontSize: 12.5, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cur.name}</span></>
             : <span style={{ flex: 1, color: 'var(--ink-4)', fontSize: 12.5, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{placeholder}</span>}
        <Icon name="chevron" size={11} stroke={2} />
      </button>
      {open && (
        <>
          {/* Transparent overlay — catches outside clicks */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 9990 }} onClick={() => setOpen(false)} />
          {/* Dropdown — always on top of everything */}
          <div style={{
            position: 'fixed',
            top: dropPos.top,
            left: dropPos.left,
            minWidth: dropPos.minWidth,
            zIndex: 9999,
            background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.22)', overflow: 'hidden', maxHeight: 280, overflowY: 'auto',
          }}>
            {cats.map((c) => (
              <button key={c.id} type="button"
                onClick={() => { onChange(c.id); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '9px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
                  fontSize: 13, textAlign: 'left', fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span className="cat-dot" style={{ background: c.color }}></span>
                <span>{c.name}</span>
              </button>
            ))}
            {onAdd && (
              <button type="button" onClick={() => { setOpen(false); onAdd(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '10px 14px', border: 'none', cursor: 'pointer',
                  background: 'var(--bg-2)', borderTop: '1px solid var(--line)', fontFamily: 'inherit',
                  fontSize: 12, color: 'var(--accent-ink)', fontWeight: 500,
                }}>
                <Icon name="plus" size={12} /> เพิ่มหมวดหมู่
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
window.CategorySelect = CategorySelect;
window.ProjectPicker = ProjectPicker;

function ItemsTable({ items, setItems, cats, onAddCat, type }) {
  const app = window.useApp();
  const updateItem = (id, patch) => setItems(items.map((i) => i.id === id ? { ...i, ...patch } : i));
  const removeItem = (id) => setItems(items.filter((i) => i.id !== id));
  const addItem = () => setItems([...items, { id: newId(), name: '', categoryId: '', qty: 1, unit: type === 'machine' ? 'วัน' : 'ชิ้น', price: 0 }]);

  // ── สแกนรายการจากรูปด้วย AI ──────────────────────────
  const [scanning, setScanning] = useState(false);
  const scanInputRef = useRef(null);

  // ย่อรูปด้วย canvas ก่อนส่ง (ลด payload + ค่า API + เลี่ยง body limit ของ Vercel)
  const resizeToBase64 = (file) => new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxW = 1600;
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]); // เฉพาะส่วน base64
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('โหลดรูปไม่สำเร็จ')); };
    img.src = url;
  });

  const handleScanFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // reset ให้เลือกไฟล์เดิมซ้ำได้
    if (!file) return;
    setScanning(true);
    try {
      const base64 = await resizeToBase64(file);
      const resp = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image: base64, mediaType: 'image/jpeg' }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        const msg = (data && data.error) || `เรียก API ไม่สำเร็จ (HTTP ${resp.status}) — ตรวจสอบการ deploy และ ANTHROPIC_API_KEY`;
        throw new Error(msg);
      }
      if (!data) throw new Error('ข้อมูลที่ได้รับไม่ถูกต้อง (ไม่ใช่ JSON) — ตรวจสอบการ deploy');
      const scanned = (data.items || []).filter(it => (it.name || '').trim());
      if (!scanned.length) { app.pushToast('ไม่พบรายการสินค้าในรูป ลองถ่ายให้ชัดขึ้น', 'error'); return; }
      const newRows = scanned.map(it => ({
        id: newId(),
        name: String(it.name || '').trim(),
        categoryId: '',
        qty: Number(it.qty) > 0 ? Number(it.qty) : 1,
        unit: String(it.unit || '').trim() || (type === 'machine' ? 'วัน' : 'ชิ้น'),
        price: Number(it.price) >= 0 ? Number(it.price) : 0,
      }));
      // คงแถวที่กรอกชื่อไว้แล้ว แทนแถวว่าง แล้วต่อด้วยรายการที่สแกนได้
      const nonEmpty = items.filter(it => (it.name || '').trim());
      setItems([...nonEmpty, ...newRows]);
      app.pushToast(`สแกนสำเร็จ — เพิ่ม ${newRows.length} รายการ`);
    } catch (err) {
      console.error('[scan] error:', err);
      app.pushToast(err.message || 'อ่านรูปไม่สำเร็จ ลองใหม่อีกครั้ง', 'error');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="col gap-8" style={{ overflowX: 'auto' }}>
      <table className="items-table" style={{ tableLayout: 'fixed', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ width: '34%' }}>{type === 'machine' ? 'เครื่องจักร / อุปกรณ์' : 'รายการวัสดุ'}</th>
            <th style={{ width: '18%' }}>หมวดหมู่</th>
            <th style={{ width: '10%' }} className="num">จำนวน</th>
            <th style={{ width: '11%' }}>หน่วย</th>
            <th style={{ width: '13%' }} className="num">ราคา/หน่วย</th>
            <th style={{ width: '14%' }} className="num">รวม</th>
            <th style={{ width: 34 }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={it.id}>
              <td data-label={type === 'machine' ? 'เครื่องจักร / อุปกรณ์' : 'รายการวัสดุ'}>
                <input className="cell-input" placeholder={type === 'machine' ? 'เช่น รถเครน 25 ตัน + คนขับ' : 'เช่น เหล็กข้ออ้อย DB16'}
                  value={it.name} onChange={(e) => updateItem(it.id, { name: e.target.value })} />
              </td>
              <td data-label="หมวดหมู่">
                <CategorySelect value={it.categoryId} onChange={(v) => updateItem(it.id, { categoryId: v })} cats={cats} onAdd={onAddCat} placeholder="—" />
              </td>
              <td data-label="จำนวน">
                <input className="cell-input num" type="number" min="0" step="any" value={it.qty}
                  onChange={(e) => updateItem(it.id, { qty: e.target.value })} />
              </td>
              <td data-label="หน่วย">
                <input className="cell-input" value={it.unit} onChange={(e) => updateItem(it.id, { unit: e.target.value })} />
              </td>
              <td data-label="ราคา/หน่วย">
                <input className="cell-input num" type="number" min="0" step="any" value={it.price}
                  onChange={(e) => updateItem(it.id, { price: e.target.value })} />
              </td>
              <td className="num mono" data-label="รวม" style={{ paddingRight: 10, color: 'var(--ink-2)' }}>
                {fmt(Number(it.qty || 0) * Number(it.price || 0))}
              </td>
              <td className="item-del">
                <button type="button" className="topbar-icon-btn" style={{ width: 28, height: 28 }} onClick={() => removeItem(it.id)} title="ลบรายการ">
                  <Icon name="trash" size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row gap-8" style={{ alignSelf: 'flex-start', marginTop: 4, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}>
          <Icon name="plus" size={13} /> เพิ่มรายการ
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={scanning}
          onClick={() => scanInputRef.current && scanInputRef.current.click()}
          title="ถ่าย/เลือกรูปใบสั่งซื้อหรือใบเสร็จ แล้วให้ AI กรอกรายการให้อัตโนมัติ">
          <Icon name="camera" size={13} /> {scanning ? 'กำลังสแกน…' : 'สแกนจากรูป'}
        </button>
        <input ref={scanInputRef} type="file" accept="image/*" capture="environment"
          style={{ display: 'none' }} onChange={handleScanFile} />
      </div>
    </div>
  );
}
window.ItemsTable = ItemsTable;

function DocTypeRow({ selected, onToggle }) {
  return (
    <div className="option-row">
      {DOC_TYPES.map((d) => (
        <button key={d.id} type="button"
          className={"option-pill" + (selected.includes(d.id) ? " selected" : "")}
          onClick={() => onToggle(d.id)}
          style={{ padding: '12px 14px', alignItems: 'flex-start', textAlign: 'left' }}
        >
          <span className="pill-check">
            {selected.includes(d.id) && <Icon name="check" size={12} stroke={2.5} />}
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontWeight: 500, fontSize: 13.5 }}>{d.label}</span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 400 }}>{d.sub}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

// ── DocInfoSection — ฟิลด์ข้อมูลสำหรับออกเอกสาร (shared ทุก form) ──
function DocInfoSection({ docInfo, onChange, autoFilled }) {
  const set = (patch) => onChange({ ...(docInfo || {}), ...patch });
  const v = docInfo || { name: '', taxId: '', address: '' };
  return (
    <div style={{
      padding: '14px 16px', borderRadius: 10, marginTop: 4,
      border: '1.5px solid rgba(37,99,235,0.3)',
      background: 'rgba(37,99,235,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#1d4ed8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          ข้อมูลผู้รับเงิน/ผู้ขาย (สำหรับออกเอกสาร)
        </span>
        {autoFilled && (
          <span style={{ fontSize: 11, background: 'rgba(5,150,105,0.12)', color: '#059669', border: '1px solid rgba(5,150,105,0.3)', borderRadius: 20, padding: '1px 8px', fontWeight: 600 }}>
            ✓ ดึงจากข้อมูลทีมช่าง
          </span>
        )}
      </div>
      <div className="form-grid">
        <div className="field">
          <label className="field-label">ชื่อ-นามสกุล / ชื่อนิติบุคคล <span className="req">*</span></label>
          <input className="input" placeholder="ชื่อจริง-นามสกุลจริง หรือชื่อบริษัท"
            value={v.name} onChange={e => set({ name: e.target.value })} />
        </div>
        <div className="field">
          <label className="field-label">เลขบัตรประชาชน / เลขผู้เสียภาษี <span className="req">*</span></label>
          <input className="input mono" placeholder="0-0000-00000-00-0" maxLength={17}
            value={v.taxId} onChange={e => set({ taxId: e.target.value })} />
        </div>
        <div className="field full">
          <label className="field-label">ที่อยู่ <span className="req">*</span></label>
          <textarea className="textarea" rows={2}
            placeholder="เลขที่ หมู่ ถนน ตำบล/แขวง อำเภอ/เขต จังหวัด รหัสไปรษณีย์"
            value={v.address} onChange={e => set({ address: e.target.value })} />
        </div>
      </div>
    </div>
  );
}
window.DocInfoSection = DocInfoSection;

function VatModeRow({ value, onChange, allowCash }) {
  return (
    <div className="option-row">
      <button type="button" className={"option-pill" + (value === 'exclusive' ? ' selected' : '')} onClick={() => onChange('exclusive')}>
        <span className="pill-radio"></span>
        <span>ราคา <strong>ไม่รวม</strong> Vat (บวก Vat เพิ่ม)</span>
      </button>
      <button type="button" className={"option-pill" + (value === 'inclusive' ? ' selected' : '')} onClick={() => onChange('inclusive')}>
        <span className="pill-radio"></span>
        <span>ราคา <strong>รวม</strong> Vat แล้ว</span>
      </button>
      {allowCash && (
        <button type="button" className={"option-pill" + (value === 'cash' ? ' selected' : '')} onClick={() => onChange('cash')}>
          <span className="pill-radio"></span>
          <span>บิล<strong>เงินสด</strong> (ไม่มี Vat)</span>
        </button>
      )}
    </div>
  );
}
window.VatModeRow = VatModeRow;

window.PurchaseForm = function PurchaseForm({ type, initial, onSubmit, onCancel }) {
  const app = window.useApp();
  const cats = type === 'machine' ? app.machCats : app.matCats;
  const addCat = type === 'machine' ? app.addMachCat : app.addMatCat;

  const blank = () => ({
    type,
    docNo: (type === 'machine' ? 'RT-' : 'PO-') + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000 + 1000)),
    date: todayStr(),
    projectId: '',
    vendor: '',
    items: [{ id: newId(), name: '', categoryId: '', qty: 1, unit: type === 'machine' ? 'วัน' : 'ชิ้น', price: 0 }],
    vatMode: 'exclusive',
    vatRate: 7,
    whtEnabled: false,
    whtRate: 3,
    discountEnabled: false,
    discountType: 'baht',
    discountValue: 0,
    docs: [],
    note: '',
    images: [],
    depositAmount: 0,
    depositStatus: 'none',
    depositReturnDate: '',
    depositReturnImages: [],
    depositReturnNote: '',
    docInfo: { name: '', taxId: '', address: '' },
  });

  const [form, setForm] = useState(() => initial ? { ...initial, docInfo: { name:'', taxId:'', address:'', ...(initial.docInfo||{}) } } : blank());
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [projModalOpen, setProjModalOpen] = useState(false);

  const totals = useMemo(() => computeTotals(form), [form]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggleDoc = (id) => set({ docs: form.docs.includes(id) ? form.docs.filter(d => d !== id) : [...form.docs, id] });

  const handleSubmit = () => {
    if (!form.projectId) return app.pushToast('โปรดเลือกโครงการก่อนบันทึก', 'error');
    if (!form.vendor.trim()) return app.pushToast('โปรดระบุชื่อผู้ขาย/ผู้ให้เช่า', 'error');
    if (!form.items.some(it => it.name.trim() && Number(it.qty) > 0)) return app.pushToast('โปรดเพิ่มรายการอย่างน้อย 1 รายการ', 'error');
    if (form.docs.length > 0) {
      const di = form.docInfo || {};
      if (!di.name?.trim())    return app.pushToast('โปรดระบุชื่อ-นามสกุล สำหรับออกเอกสาร', 'error');
      if (!di.taxId?.trim())   return app.pushToast('โปรดระบุเลขบัตรประชาชน/เลขผู้เสียภาษี', 'error');
      if (!di.address?.trim()) return app.pushToast('โปรดระบุที่อยู่ สำหรับออกเอกสาร', 'error');
    }
    onSubmit(form);
  };

  const title = type === 'machine' ? 'บันทึกการเช่าเครื่องจักร' : 'บันทึกการจัดซื้อวัสดุ';
  const sub = type === 'machine' ? 'กรอกรายการเครื่องจักร / อุปกรณ์เช่า แนบเอกสารและรูปภาพประกอบ' : 'กรอกรายการวัสดุที่จัดซื้อ แนบเอกสารและรูปภาพประกอบ';

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <div className="page-sub">{sub}</div>
        </div>
        <div className="row gap-8">
          <button className="btn btn-ghost" onClick={onCancel}><Icon name="x" size={14} /> ยกเลิก</button>
          <button className="btn btn-accent" onClick={handleSubmit}><Icon name="save" size={14} /> บันทึกรายการ</button>
        </div>
      </div>

      <div className="col gap-16" style={{ minWidth: 0 }}>
          {/* Card 1: header info */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">ข้อมูลเอกสาร</div>
                <div className="card-sub">เลขที่เอกสาร โครงการ และผู้ขาย</div>
              </div>
              <span className="badge amber dot">{type === 'machine' ? 'ใบเช่าเครื่องจักร' : 'ใบสั่งซื้อวัสดุ'}</span>
            </div>
            <div className="card-body">
              <div className="form-grid">
                <div className="field">
                  <label className="field-label">เลขที่เอกสาร <span className="req">*</span></label>
                  <input className="input mono" value={form.docNo} onChange={(e) => set({ docNo: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field-label">วันที่ <span className="req">*</span></label>
                  <input className="input" type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
                </div>
                <div className="field full">
                  <label className="field-label">โครงการ <span className="req">*</span></label>
                  <ProjectPicker value={form.projectId} onChange={(v) => set({ projectId: v })} projects={app.projects} onAdd={() => setProjModalOpen(true)} />
                </div>
                <div className="field full">
                  <label className="field-label">ผู้ขาย / ผู้ให้เช่า <span className="req">*</span></label>
                  <input className="input" list="vendor-list" placeholder="กรอกชื่อร้านหรือเลือกจากรายการ" value={form.vendor} onChange={(e) => set({ vendor: e.target.value })} />
                  <datalist id="vendor-list">
                    {['บจก. ไทยคอน สตีล', 'หจก. ปูนซีเมนต์รวมเจริญ', 'ร้านวัสดุภัทรชัย', 'บจก. อีเล็คทริค พรีเมียร์', 'บจก. ไฮดรอลิค เซอร์วิส', 'หจก. ก่อสร้างเครื่องจักรไทย'].map(v => <option key={v} value={v} />)}
                  </datalist>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: items */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">{type === 'machine' ? 'รายการเครื่องจักร' : 'รายการวัสดุ'}</div>
                <div className="card-sub">ระบุชื่อ หมวดหมู่ จำนวน หน่วย และราคา</div>
              </div>
              <span className="badge gray mono">{form.items.length} รายการ</span>
            </div>
            <div className="card-body">
              <ItemsTable items={form.items} setItems={(items) => set({ items })} cats={cats} onAddCat={() => setCatModalOpen(true)} type={type} />
            </div>
          </div>

          {/* Card 2.5: product security deposit */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">เงินค่าประกันสินค้า</div>
                <div className="card-sub">มัดจำ / ประกันที่วางกับผู้ขาย — รับคืนหลังส่งสินค้าคืน</div>
              </div>
              {Number(form.depositAmount) > 0 && (
                <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600,
                  background:'rgba(59,130,246,0.15)', color:'#3b82f6', border:'1px solid rgba(59,130,246,0.3)' }}>
                  มีเงินประกัน
                </span>
              )}
            </div>
            <div className="card-body">
              <div className="form-grid">
                <div className="field">
                  <label className="field-label"><Icon name="money" size={13} /> ยอดเงินค่าประกัน</label>
                  <div className="input-affix">
                    <div className="input-affix-prefix">฿</div>
                    <input className="input mono" type="number" min="0" step="any"
                      value={form.depositAmount}
                      onChange={(e) => set({ depositAmount: e.target.value, depositStatus: Number(e.target.value) > 0 ? 'pending' : 'none' })}
                      placeholder="0.00" />
                  </div>
                  <div className="field-hint">กรอก 0 ถ้าไม่มีเงินค่าประกัน — ระบบจะสร้างการแจ้งเตือนให้ติดตามเงินคืนโดยอัตโนมัติ</div>
                </div>
              </div>
              {Number(form.depositAmount) > 0 && (
                <div style={{ marginTop:12, padding:'10px 14px', borderRadius:10,
                  background:'rgba(59,130,246,0.07)', border:'1px solid rgba(59,130,246,0.2)',
                  fontSize:12.5, color:'#3b82f6', display:'flex', alignItems:'center', gap:8 }}>
                  <Icon name="bell" size={13} />
                  ระบบจะแจ้งเตือนในโครงการนี้ว่ามีเงินค่าประกัน <strong>฿{fmt(Number(form.depositAmount))}</strong> รอรับคืน
                </div>
              )}
            </div>
          </div>

          {/* Card 3: docs + tax */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">เอกสาร และภาษี</div>
                <div className="card-sub">เลือกเอกสารที่ต้องออก พร้อมเงื่อนไข Vat และหัก ณ ที่จ่าย</div>
              </div>
            </div>
            <div className="card-body col gap-20">
              <div className="field">
                <label className="field-label"><Icon name="receipt" size={14} /> เอกสารที่ต้องออก (เลือกได้หลายรายการ)</label>
                <DocTypeRow selected={form.docs} onToggle={toggleDoc} />
                {form.docs.length > 0 && (
                  <DocInfoSection
                    docInfo={form.docInfo}
                    onChange={v => set({ docInfo: v })}
                  />
                )}
              </div>

              <div className="field">
                <label className="field-label"><Icon name="money" size={14} /> เงื่อนไข Vat</label>
                <VatModeRow value={form.vatMode} allowCash onChange={(v) => set(v === 'cash' ? { vatMode: v, vatRate: 0 } : { vatMode: v })} />
                {form.vatMode === 'cash' ? (
                  <div className="mt-12" style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
                    บิลเงินสด — ไม่คิด Vat (อัตรา Vat = 0%)
                  </div>
                ) : (
                  <div className="row gap-8 mt-12">
                    <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>อัตรา Vat</span>
                    <div className="input-affix" style={{ width: 110 }}>
                      <input className="input mono" type="number" step="0.5" value={form.vatRate} onChange={(e) => set({ vatRate: e.target.value })} />
                      <div className="input-affix-suffix">%</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="field">
                <label className="field-label"><Icon name="percent" size={14} /> หัก ณ ที่จ่าย</label>
                <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <Switch
                      on={form.whtEnabled}
                      onChange={(v) => set({ whtEnabled: v })}
                      label={form.whtEnabled ? 'เปิดใช้งานหัก ณ ที่จ่าย' : 'ไม่หัก ณ ที่จ่าย'}
                      sub={form.whtEnabled ? 'คำนวณจากยอดก่อน Vat โดยอัตโนมัติ' : 'แตะเพื่อเปิดใช้งาน'}
                    />
                  </div>
                  {form.whtEnabled && (
                    <div className="col" style={{ minWidth: 220 }}>
                      <div className="field-label" style={{ fontSize: 11.5 }}>อัตราหัก ณ ที่จ่าย</div>
                      <div className="option-row">
                        {[1, 2, 3, 5].map((r) => (
                          <OptionPill key={r} mode="radio" selected={Number(form.whtRate) === r} onClick={() => set({ whtRate: r })}>
                            <span className="mono">{r}%</span>
                          </OptionPill>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="field">
                <label className="field-label"><Icon name="tag" size={14} /> ส่วนลด</label>
                <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <Switch
                      on={form.discountEnabled}
                      onChange={(v) => set({ discountEnabled: v })}
                      label={form.discountEnabled ? 'มีส่วนลด' : 'ไม่มีส่วนลด'}
                      sub={form.discountEnabled ? 'หักจากยอดรวมก่อน Vat' : 'แตะเพื่อใส่ส่วนลด / คูปอง'}
                    />
                  </div>
                  {form.discountEnabled && (
                    <div className="col gap-8" style={{ minWidth: 220 }}>
                      <div className="field-label" style={{ fontSize: 11.5 }}>รูปแบบส่วนลด</div>
                      <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
                        <div className="option-row">
                          <OptionPill mode="radio" selected={form.discountType === 'baht'} onClick={() => set({ discountType: 'baht' })}>฿ บาท</OptionPill>
                          <OptionPill mode="radio" selected={form.discountType === 'percent'} onClick={() => set({ discountType: 'percent' })}>% เปอร์เซ็นต์</OptionPill>
                        </div>
                        <div className="input-affix" style={{ width: 150 }}>
                          <input className="input mono" type="number" min="0" step="any" placeholder="0" value={form.discountValue} onChange={(e) => set({ discountValue: e.target.value })} />
                          <div className="input-affix-suffix">{form.discountType === 'percent' ? '%' : '฿'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: images + note */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">รูปภาพและหมายเหตุ</div>
                <div className="card-sub">แนบใบเสร็จ / รูปสินค้า / รูปหน้างาน (สูงสุด 10 รูป)</div>
              </div>
            </div>
            <div className="card-body col gap-16">
              <ImageUploader images={form.images} onChange={(imgs) => set({ images: imgs })} max={10} />
              <div className="field">
                <label className="field-label">หมายเหตุ</label>
                <textarea className="textarea" placeholder="เช่น งวดงานเหล็กฐานราก, ใช้งานในวันที่ 24-25 พ.ค." value={form.note} onChange={(e) => set({ note: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Summary bar — full width, below all cards */}
          <div className="card form-summary-bottom">
            <div className="card-body form-summary-bar">
              <div className="summary-chips">
                <span className="badge amber dot">{form.vatMode === 'cash' ? 'บิลเงินสด' : form.vatMode === 'inclusive' ? 'รวม Vat แล้ว' : 'ไม่รวม Vat'}</span>
                {form.discountEnabled && Number(form.discountValue) > 0 && (
                  <div className="summary-chip">
                    <span className="chip-label">ส่วนลด{form.discountType === 'percent' ? ` ${form.discountValue}%` : ''}</span>
                    <span className="chip-value" style={{ color: 'var(--danger)' }}>− {fmt(totals.discountAmt)}</span>
                  </div>
                )}
                <div className="summary-chip">
                  <span className="chip-label">ยอดก่อนภาษี</span>
                  <span className="chip-value">{fmt(totals.subTotal)}</span>
                </div>
                <div className="summary-chip">
                  <span className="chip-label">Vat {form.vatMode === 'cash' ? 0 : form.vatRate}%</span>
                  <span className="chip-value">{fmt(totals.vat)}</span>
                </div>
                {form.whtEnabled && (
                  <div className="summary-chip">
                    <span className="chip-label">หัก ณ ที่จ่าย {form.whtRate}%</span>
                    <span className="chip-value" style={{ color: 'var(--danger)' }}>− {fmt(totals.wht)}</span>
                  </div>
                )}
                {Number(form.depositAmount) > 0 && (
                  <div className="summary-chip">
                    <span className="chip-label"><Icon name="bell" size={10} /> เงินค่าประกัน</span>
                    <span className="chip-value" style={{ color: '#3b82f6' }}>฿{fmt(Number(form.depositAmount))}</span>
                  </div>
                )}
                <div className="summary-chip total">
                  <span className="chip-label">ยอดสุทธิ</span>
                  <span className="chip-value">{fmt(totals.total)} <span className="chip-unit">บาท</span></span>
                </div>
              </div>
              <div className="row gap-8 summary-bar-actions">
                <button className="btn btn-accent" onClick={handleSubmit}><Icon name="save" size={14} /> บันทึก</button>
                <button className="btn btn-ghost" onClick={onCancel}>ยกเลิก</button>
              </div>
            </div>
            {form.docs.length > 0 && (
              <div style={{ padding: '0 20px 14px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>เอกสาร:</span>
                {form.docs.map((d) => {
                  const doc = DOC_TYPES.find(x => x.id === d);
                  return <span key={d} className="badge amber">{doc?.label}</span>;
                })}
              </div>
            )}
          </div>
        </div>

      {/* Add category modal */}
      <AddCategoryModal open={catModalOpen} onClose={() => setCatModalOpen(false)} onAdd={(c) => { addCat(c); app.pushToast('เพิ่มหมวดหมู่แล้ว'); setCatModalOpen(false); }} title={type === 'machine' ? 'เพิ่มหมวดหมู่เครื่องจักร' : 'เพิ่มหมวดหมู่วัสดุ'} />
      <AddProjectModal open={projModalOpen} onClose={() => setProjModalOpen(false)} onAdd={(p) => { app.addProject(p); app.pushToast('เพิ่มโครงการแล้ว'); setProjModalOpen(false); }} />
    </>
  );
};

// ---- OtherExpenseForm ----
window.OtherExpenseForm = function OtherExpenseForm({ initial, onSubmit, onCancel }) {
  const app = window.useApp();
  const cats = app.otherCats || [];
  const addCat = app.addOtherCat;

  const blank = () => ({
    type: 'other',
    docNo: 'EX-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000 + 1000)),
    date: todayStr(),
    projectId: '',
    vendor: '',
    items: [{ id: newId(), name: '', categoryId: '', qty: 1, unit: 'รายการ', price: 0 }],
    vatMode: 'exclusive',
    vatRate: 7,
    whtEnabled: false,
    whtRate: 3,
    discountEnabled: false,
    discountType: 'baht',
    discountValue: 0,
    docs: [],
    note: '',
    images: [],
  });

  const [form, setForm] = useState(() => initial ? { ...initial } : blank());
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [projModalOpen, setProjModalOpen] = useState(false);

  const totals = useMemo(() => computeTotals(form), [form]);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggleDoc = (id) => set({ docs: form.docs.includes(id) ? form.docs.filter(d => d !== id) : [...form.docs, id] });

  const handleSubmit = () => {
    if (!form.projectId) return app.pushToast('โปรดเลือกโครงการก่อนบันทึก', 'error');
    if (!form.vendor.trim()) return app.pushToast('โปรดระบุชื่อผู้รับเงิน / ผู้ให้บริการ', 'error');
    if (!form.items.some(it => it.name.trim() && Number(it.qty) > 0)) return app.pushToast('โปรดเพิ่มรายการอย่างน้อย 1 รายการ', 'error');
    onSubmit(form);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">บันทึกค่าใช้จ่ายอื่นๆ</h1>
          <div className="page-sub">ค่าออกแบบ ค่าเดินทาง ค่าสาธารณูปโภค หรือรายจ่ายอื่นๆ ที่ไม่ใช่วัสดุ/เครื่องจักร/ค่าแรง</div>
        </div>
        <div className="row gap-8">
          <button className="btn btn-ghost" onClick={onCancel}><Icon name="x" size={14} /> ยกเลิก</button>
          <button className="btn btn-accent" onClick={handleSubmit}><Icon name="save" size={14} /> บันทึกรายการ</button>
        </div>
      </div>

      <div className="col gap-16" style={{ minWidth: 0 }}>
          {/* Card 1: header */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">ข้อมูลเอกสาร</div>
                <div className="card-sub">เลขที่เอกสาร โครงการ และผู้รับเงิน</div>
              </div>
              <span className="badge" style={{ background:'rgba(99,102,241,0.15)', color:'#6366f1', border:'1px solid rgba(99,102,241,0.3)' }}>ค่าใช้จ่ายอื่นๆ</span>
            </div>
            <div className="card-body">
              <div className="form-grid">
                <div className="field">
                  <label className="field-label">เลขที่เอกสาร <span className="req">*</span></label>
                  <input className="input mono" value={form.docNo} onChange={(e) => set({ docNo: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field-label">วันที่ <span className="req">*</span></label>
                  <input className="input" type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
                </div>
                <div className="field full">
                  <label className="field-label">โครงการ <span className="req">*</span></label>
                  <ProjectPicker value={form.projectId} onChange={(v) => set({ projectId: v })} projects={app.projects} onAdd={() => setProjModalOpen(true)} />
                </div>
                <div className="field full">
                  <label className="field-label">ผู้รับเงิน / ผู้ให้บริการ <span className="req">*</span></label>
                  <input className="input" placeholder="เช่น บจก. ออกแบบสถาปัตย์, ค่าน้ำ-ไฟ, ค่าเดินทาง" value={form.vendor} onChange={(e) => set({ vendor: e.target.value })} />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: items */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">รายการค่าใช้จ่าย</div>
                <div className="card-sub">ระบุรายการ หมวดหมู่ จำนวน และราคา</div>
              </div>
              <span className="badge gray mono">{form.items.length} รายการ</span>
            </div>
            <div className="card-body">
              <ItemsTable items={form.items} setItems={(items) => set({ items })} cats={cats} onAddCat={() => setCatModalOpen(true)} type="other" />
            </div>
          </div>

          {/* Card 3: docs + tax */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">เอกสาร และภาษี</div>
                <div className="card-sub">เลือกเอกสารที่ต้องออก พร้อมเงื่อนไข Vat และหัก ณ ที่จ่าย</div>
              </div>
            </div>
            <div className="card-body col gap-20">
              <div className="field">
                <label className="field-label"><Icon name="receipt" size={14} /> เอกสารที่ต้องออก (เลือกได้หลายรายการ)</label>
                <DocTypeRow selected={form.docs} onToggle={toggleDoc} />
              </div>
              <div className="field">
                <label className="field-label"><Icon name="money" size={14} /> เงื่อนไข Vat</label>
                <VatModeRow value={form.vatMode} allowCash onChange={(v) => set(v === 'cash' ? { vatMode: v, vatRate: 0 } : { vatMode: v })} />
                {form.vatMode === 'cash' ? (
                  <div className="mt-12" style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
                    บิลเงินสด — ไม่คิด Vat (อัตรา Vat = 0%)
                  </div>
                ) : (
                  <div className="row gap-8 mt-12">
                    <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>อัตรา Vat</span>
                    <div className="input-affix" style={{ width: 110 }}>
                      <input className="input mono" type="number" step="0.5" value={form.vatRate} onChange={(e) => set({ vatRate: e.target.value })} />
                      <div className="input-affix-suffix">%</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="field">
                <label className="field-label"><Icon name="percent" size={14} /> หัก ณ ที่จ่าย</label>
                <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <Switch on={form.whtEnabled} onChange={(v) => set({ whtEnabled: v })}
                      label={form.whtEnabled ? 'เปิดใช้งานหัก ณ ที่จ่าย' : 'ไม่หัก ณ ที่จ่าย'}
                      sub={form.whtEnabled ? 'คำนวณจากยอดก่อน Vat โดยอัตโนมัติ' : 'แตะเพื่อเปิดใช้งาน'} />
                  </div>
                  {form.whtEnabled && (
                    <div className="col" style={{ minWidth: 220 }}>
                      <div className="field-label" style={{ fontSize: 11.5 }}>อัตราหัก ณ ที่จ่าย</div>
                      <div className="option-row">
                        {[1, 2, 3, 5].map((r) => (
                          <OptionPill key={r} mode="radio" selected={Number(form.whtRate) === r} onClick={() => set({ whtRate: r })}>
                            <span className="mono">{r}%</span>
                          </OptionPill>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="field">
                <label className="field-label"><Icon name="tag" size={14} /> ส่วนลด</label>
                <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <Switch
                      on={form.discountEnabled}
                      onChange={(v) => set({ discountEnabled: v })}
                      label={form.discountEnabled ? 'มีส่วนลด' : 'ไม่มีส่วนลด'}
                      sub={form.discountEnabled ? 'หักจากยอดรวมก่อน Vat' : 'แตะเพื่อใส่ส่วนลด / คูปอง'}
                    />
                  </div>
                  {form.discountEnabled && (
                    <div className="col gap-8" style={{ minWidth: 220 }}>
                      <div className="field-label" style={{ fontSize: 11.5 }}>รูปแบบส่วนลด</div>
                      <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
                        <div className="option-row">
                          <OptionPill mode="radio" selected={form.discountType === 'baht'} onClick={() => set({ discountType: 'baht' })}>฿ บาท</OptionPill>
                          <OptionPill mode="radio" selected={form.discountType === 'percent'} onClick={() => set({ discountType: 'percent' })}>% เปอร์เซ็นต์</OptionPill>
                        </div>
                        <div className="input-affix" style={{ width: 150 }}>
                          <input className="input mono" type="number" min="0" step="any" placeholder="0" value={form.discountValue} onChange={(e) => set({ discountValue: e.target.value })} />
                          <div className="input-affix-suffix">{form.discountType === 'percent' ? '%' : '฿'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: images + note */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">รูปภาพและหมายเหตุ</div>
                <div className="card-sub">แนบใบเสร็จ / ใบแจ้งหนี้ / รูปภาพประกอบ (สูงสุด 10 รูป)</div>
              </div>
            </div>
            <div className="card-body col gap-16">
              <ImageUploader images={form.images} onChange={(imgs) => set({ images: imgs })} max={10} />
              <div className="field">
                <label className="field-label">หมายเหตุ</label>
                <textarea className="textarea" placeholder="เช่น ค่าออกแบบงวด 1, ค่าน้ำ-ไฟเดือน พ.ค." value={form.note} onChange={(e) => set({ note: e.target.value })} />
              </div>
            </div>
          </div>
        </div>


          {/* Summary bar — full width, below all cards */}
          <div className="card form-summary-bottom">
            <div className="card-body form-summary-bar">
              <div className="summary-chips">
                <span className="badge amber dot">{form.vatMode === 'cash' ? 'บิลเงินสด' : form.vatMode === 'inclusive' ? 'รวม Vat แล้ว' : 'ไม่รวม Vat'}</span>
                {form.discountEnabled && Number(form.discountValue) > 0 && (
                  <div className="summary-chip">
                    <span className="chip-label">ส่วนลด{form.discountType === 'percent' ? ` ${form.discountValue}%` : ''}</span>
                    <span className="chip-value" style={{ color: 'var(--danger)' }}>− {fmt(totals.discountAmt)}</span>
                  </div>
                )}
                <div className="summary-chip">
                  <span className="chip-label">ยอดก่อนภาษี</span>
                  <span className="chip-value">{fmt(totals.subTotal)}</span>
                </div>
                <div className="summary-chip">
                  <span className="chip-label">Vat {form.vatMode === 'cash' ? 0 : form.vatRate}%</span>
                  <span className="chip-value">{fmt(totals.vat)}</span>
                </div>
                {form.whtEnabled && (
                  <div className="summary-chip">
                    <span className="chip-label">หัก ณ ที่จ่าย {form.whtRate}%</span>
                    <span className="chip-value" style={{ color: 'var(--danger)' }}>− {fmt(totals.wht)}</span>
                  </div>
                )}
                <div className="summary-chip total">
                  <span className="chip-label">ยอดสุทธิ</span>
                  <span className="chip-value">{fmt(totals.total)} <span className="chip-unit">บาท</span></span>
                </div>
              </div>
              <div className="row gap-8 summary-bar-actions">
                <button className="btn btn-accent" onClick={handleSubmit}><Icon name="save" size={14} /> บันทึก</button>
                <button className="btn btn-ghost" onClick={onCancel}>ยกเลิก</button>
              </div>
            </div>
          </div>

      <AddCategoryModal open={catModalOpen} onClose={() => setCatModalOpen(false)} onAdd={(c) => { addCat(c); app.pushToast('เพิ่มหมวดหมู่แล้ว'); setCatModalOpen(false); }} title="เพิ่มหมวดหมู่ค่าใช้จ่าย" />
      <AddProjectModal open={projModalOpen} onClose={() => setProjModalOpen(false)} onAdd={(p) => { app.addProject(p); app.pushToast('เพิ่มโครงการแล้ว'); setProjModalOpen(false); }} />
    </>
  );
};

// ---- IncomeForm (บันทึกรายรับ) ----
window.IncomeForm = function IncomeForm({ initial, onSubmit, onCancel }) {
  const app = window.useApp();

  const blank = () => ({
    // เก็บเป็น type 'other' + meta.kind='income' เพื่อไม่ต้องแก้ schema (DB เดิมรับได้ทันที)
    type: 'other',
    meta: { kind: 'income' },
    docNo: 'IN-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000 + 1000)),
    date: todayStr(),
    projectId: '',
    vendor: '',
    period: 'งวดงานตามสัญญา', // ประเภทงวดงาน: งวดงานตามสัญญา | งวดงานเพิ่ม
    items: [{ id: newId(), name: '', categoryId: '', qty: 1, unit: 'รายการ', price: 0 }],
    vatMode: 'exclusive',
    vatRate: 0,
    whtEnabled: false,
    whtRate: 0,
    docs: [],
    note: '',
    images: [],
    accountingPosted: false,
  });

  const [form, setForm] = useState(() => initial
    ? { ...initial, meta: { ...(initial.meta || {}), kind: 'income' }, period: initial.period || 'งวดงานตามสัญญา' }
    : blank());
  const [projModalOpen, setProjModalOpen] = useState(false);

  const totals = useMemo(() => computeTotals(form), [form]);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const setItem = (id, patch) => set({ items: form.items.map(it => it.id === id ? { ...it, ...patch } : it) });
  const addItem = () => set({ items: [...form.items, { id: newId(), name: '', categoryId: '', qty: 1, unit: 'รายการ', price: 0 }] });
  const removeItem = (id) => set({ items: form.items.length > 1 ? form.items.filter(it => it.id !== id) : form.items });

  // เลือกโครงการ → ดึงชื่อลูกค้าของโครงการมาใส่ "ผู้จ่าย/แหล่งรายรับ" อัตโนมัติ
  // (เติมเมื่อช่องยังว่าง หรือยังเป็นชื่อลูกค้าของโครงการเดิม — ไม่ทับสิ่งที่ผู้ใช้พิมพ์เอง)
  const setProject = (projectId) => {
    const p = app.projects.find(x => x.id === projectId);
    const patch = { projectId };
    if (p && p.client) {
      const prevProj = app.projects.find(x => x.id === form.projectId);
      if (!form.vendor.trim() || (prevProj && form.vendor === prevProj.client)) {
        patch.vendor = p.client;
      }
    }
    set(patch);
  };

  const handleSubmit = () => {
    if (!form.projectId) return app.pushToast('โปรดเลือกโครงการก่อนบันทึก', 'error');
    if (!form.vendor.trim()) return app.pushToast('โปรดระบุแหล่งที่มาของรายรับ / ผู้จ่าย', 'error');
    if (!form.items.some(it => it.name.trim() && Number(it.price) > 0)) return app.pushToast('โปรดเพิ่มรายการรายรับอย่างน้อย 1 รายการ', 'error');
    onSubmit(form);
  };

  const isEditing = !!initial;
  const posted = !!form.accountingPosted;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEditing ? 'แก้ไขบันทึกรายรับ' : 'บันทึกรายรับ'}</h1>
          <div className="page-sub">เงินที่ได้รับเข้าโครงการ เช่น เงินงวดจากลูกค้า เงินมัดจำ หรือรายรับอื่นๆ</div>
        </div>
        <div className="row gap-8">
          <button className="btn btn-ghost" onClick={onCancel}><Icon name="x" size={14} /> ยกเลิก</button>
          <button className="btn btn-accent" onClick={handleSubmit}><Icon name="save" size={14} /> บันทึกรายการ</button>
        </div>
      </div>

      <div className="col gap-16" style={{ minWidth: 0 }}>
          {/* Card 1: header */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">ข้อมูลรายรับ</div>
                <div className="card-sub">เลขที่เอกสาร โครงการ และแหล่งที่มา</div>
              </div>
              <span className="badge" style={{ background:'rgba(5,150,105,0.15)', color:'#059669', border:'1px solid rgba(5,150,105,0.3)' }}>รายรับ</span>
            </div>
            <div className="card-body">
              <div className="form-grid">
                <div className="field">
                  <label className="field-label">เลขที่เอกสาร <span className="req">*</span></label>
                  <input className="input mono" value={form.docNo} onChange={(e) => set({ docNo: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field-label">วันที่รับเงิน <span className="req">*</span></label>
                  <input className="input" type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
                </div>
                <div className="field full">
                  <label className="field-label">โครงการ <span className="req">*</span></label>
                  <ProjectPicker value={form.projectId} onChange={setProject} projects={app.projects} onAdd={() => setProjModalOpen(true)} />
                </div>
                <div className="field full">
                  <label className="field-label">ผู้จ่าย / แหล่งรายรับ <span className="req">*</span></label>
                  <input className="input" placeholder="เช่น ลูกค้า บจก. ABC, เงินงวดที่ 1, เงินมัดจำ" value={form.vendor} onChange={(e) => set({ vendor: e.target.value })} />
                  {(() => {
                    const p = app.projects.find(x => x.id === form.projectId);
                    return p && p.client
                      ? <div className="text-small text-muted" style={{ marginTop: 4 }}>ลูกค้าของโครงการ: <strong>{p.client}</strong> (ดึงมาให้อัตโนมัติ — แก้ไขได้)</div>
                      : null;
                  })()}
                </div>
                <div className="field full">
                  <label className="field-label">ประเภทงวดงาน <span className="req">*</span></label>
                  <div className="option-row">
                    {['งวดงานตามสัญญา', 'งวดงานเพิ่ม'].map((opt) => (
                      <button key={opt} type="button"
                        className={"option-pill" + (form.period === opt ? " selected" : "")}
                        onClick={() => set({ period: opt })}>
                        <span className="pill-radio"></span>
                        <span>{opt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: รายการรายรับ */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">รายการรายรับ</div>
                <div className="card-sub">ระบุรายละเอียดและจำนวนเงินที่ได้รับ</div>
              </div>
              <span className="badge gray mono">{form.items.length} รายการ</span>
            </div>
            <div className="card-body">
              <table className="items-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>รายละเอียด</th>
                    <th style={{ width: 160, textAlign: 'right' }}>จำนวนเงิน (บาท)</th>
                    <th style={{ width: 44 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((it) => (
                    <tr key={it.id}>
                      <td data-label="รายละเอียด">
                        <input className="cell-input" placeholder="เช่น เงินงวดที่ 1 งานโครงสร้าง"
                          value={it.name} onChange={(e) => setItem(it.id, { name: e.target.value })} />
                      </td>
                      <td data-label="จำนวนเงิน (บาท)">
                        <input className="cell-input mono" type="number" step="0.01" style={{ textAlign: 'right' }}
                          value={it.price} onChange={(e) => setItem(it.id, { price: e.target.value, qty: 1 })} placeholder="0.00" />
                      </td>
                      <td className="item-del" style={{ textAlign: 'center' }}>
                        <button type="button" className="topbar-icon-btn" style={{ width: 28, height: 28 }} onClick={() => removeItem(it.id)} title="ลบ">
                          <Icon name="trash" size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addItem} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
                <Icon name="plus" size={13} /> เพิ่มรายการรายรับ
              </button>
            </div>
          </div>

          {/* Card 3: บัญชี (เครื่องหมายถูกสีเขียว) */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">สถานะบัญชี</div>
                <div className="card-sub">ทำเครื่องหมายเมื่อบันทึกรายรับนี้ลงบัญชีแล้ว</div>
              </div>
            </div>
            <div className="card-body">
              <button type="button" onClick={() => set({ accountingPosted: !posted })}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                  padding: '10px 16px', borderRadius: 10, fontFamily: 'inherit', fontSize: 14,
                  border: posted ? '2px solid #059669' : '2px solid #d1d5db',
                  background: posted ? 'rgba(5,150,105,0.1)' : '#fff',
                  color: posted ? '#059669' : 'var(--ink-3)', fontWeight: posted ? 600 : 400,
                }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  border: posted ? 'none' : '2px solid #d1d5db',
                  background: posted ? '#059669' : 'transparent',
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>{posted ? '✓' : ''}</span>
                {posted ? 'ลงบัญชีแล้ว' : 'ยังไม่ลงบัญชี — คลิกเพื่อทำเครื่องหมาย'}
              </button>
            </div>
          </div>

          {/* Card 4: images + note */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">รูปภาพและหมายเหตุ</div>
                <div className="card-sub">แนบสลิป / หลักฐานการรับเงิน (สูงสุด 10 รูป)</div>
              </div>
            </div>
            <div className="card-body col gap-16">
              <ImageUploader images={form.images} onChange={(imgs) => set({ images: imgs })} max={10} />
              <div className="field">
                <label className="field-label">หมายเหตุ</label>
                <textarea className="textarea" placeholder="เช่น โอนผ่านธนาคาร, เช็คเลขที่..." value={form.note} onChange={(e) => set({ note: e.target.value })} />
              </div>
            </div>
          </div>
        </div>


          {/* Summary bar — full width, below all cards */}
          <div className="card form-summary-bottom">
            <div className="card-body form-summary-bar">
              <div className="summary-chips">
                {posted && <span className="badge dot" style={{ background:'rgba(5,150,105,0.12)', color:'#059669', borderColor:'rgba(5,150,105,0.3)' }}>✓ ลงบัญชีแล้ว</span>}
                <div className="summary-chip total">
                  <span className="chip-label">ยอดรายรับรวม</span>
                  <span className="chip-value" style={{ color: '#059669' }}>{fmt(totals.total)} <span className="chip-unit">บาท</span></span>
                </div>
              </div>
              <div className="row gap-8 summary-bar-actions">
                <button className="btn btn-accent" onClick={handleSubmit}><Icon name="save" size={14} /> บันทึก</button>
                <button className="btn btn-ghost" onClick={onCancel}>ยกเลิก</button>
              </div>
            </div>
          </div>

      <AddProjectModal open={projModalOpen} onClose={() => setProjModalOpen(false)} onAdd={(p) => { app.addProject(p); app.pushToast('เพิ่มโครงการแล้ว'); setProjModalOpen(false); }} />
    </>
  );
};

// ---- Add category modal ----
function AddCategoryModal({ open, onClose, onAdd, title }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#d97706');
  useEffect(() => { if (open) { setName(''); setColor('#d97706'); } }, [open]);
  const colors = ['#d97706', '#dc2626', '#a855f7', '#0ea5e9', '#16a34a', '#eab308', '#64748b', '#a16207'];
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-accent" onClick={() => name.trim() && onAdd({ name: name.trim(), color })}>
          <Icon name="plus" size={14} /> เพิ่มหมวดหมู่
        </button>
      </>}>
      <div className="col gap-16">
        <div className="field">
          <label className="field-label">ชื่อหมวดหมู่</label>
          <input className="input" autoFocus placeholder="เช่น งานหลังคา, งานสี" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">สีประจำหมวด</label>
          <div className="row gap-8">
            {colors.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} style={{
                width: 32, height: 32, borderRadius: 8, background: c, border: color === c ? '2px solid var(--ink-1)' : '2px solid transparent', cursor: 'pointer', position: 'relative'
              }}>
                {color === c && <Icon name="check" size={14} stroke={2.5} />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
window.AddCategoryModal = AddCategoryModal;

// ---- Add project modal ----
function AddProjectModal({ open, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [client, setClient] = useState('');
  const [color, setColor] = useState('#d97706');
  const [trackBills, setTrackBills] = useState(false);
  useEffect(() => {
    if (open) {
      setName(''); setClient(''); setColor('#d97706'); setTrackBills(false);
      setCode('PJ-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 900 + 100)));
    }
  }, [open]);
  const colors = ['#d97706', '#dc2626', '#a855f7', '#0ea5e9', '#16a34a', '#eab308'];
  return (
    <Modal open={open} onClose={onClose} title="เพิ่มโครงการใหม่"
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-accent" onClick={() => name.trim() && onAdd({ name: name.trim(), code, client, color, status: 'active', trackBills })}>
          <Icon name="plus" size={14} /> เพิ่มโครงการ
        </button>
      </>}>
      <div className="col gap-16">
        <div className="form-grid">
          <div className="field">
            <label className="field-label">รหัสโครงการ</label>
            <input className="input mono" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">สีประจำโครงการ</label>
            <div className="row gap-6">
              {colors.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)} style={{
                  width: 28, height: 28, borderRadius: 6, background: c, border: color === c ? '2px solid var(--ink-1)' : '2px solid transparent', cursor: 'pointer'
                }} />
              ))}
            </div>
          </div>
          <div className="field full">
            <label className="field-label">ชื่อโครงการ</label>
            <input className="input" autoFocus placeholder="เช่น อาคารพาณิชย์ 4 ชั้น สุขุมวิท" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field full">
            <label className="field-label">เจ้าของ / ลูกค้า</label>
            <input className="input" placeholder="ชื่อ-นามสกุล หรือ บริษัท" value={client} onChange={(e) => setClient(e.target.value)} />
          </div>
          <div className="field full">
            <label className="field-label">ตามบิล (ใบกำกับภาษี/ใบเสร็จจากร้าน)</label>
            <button type="button" onClick={() => setTrackBills(v => !v)}
              className={"status-chip" + (trackBills ? " on approve" : "")}
              style={{ alignSelf: 'flex-start' }}>
              <span className="tick">{trackBills ? '✓' : ''}</span> {trackBills ? 'เปิดตามบิลโครงการนี้' : 'ปิด (ไม่ตามบิล)'}
            </button>
            <div className="field-hint">เปิดถ้าโครงการนี้ต้องเก็บใบกำกับภาษี/ใบเสร็จตัวจริงจากร้านไว้ยื่นภาษีซื้อ (เปิด/ปิดภายหลังได้)</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
window.AddProjectModal = AddProjectModal;

// ---- Edit project details ----
function EditProjectModal({ project, onClose, onSave }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [client, setClient] = useState('');
  const [color, setColor] = useState('#d97706');
  const [trackBills, setTrackBills] = useState(false);
  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setCode(project.code || '');
      setClient(project.client || '');
      setColor(project.color || '#d97706');
      setTrackBills(!!project.trackBills);
    }
  }, [project]);
  const base = ['#d97706', '#dc2626', '#a855f7', '#0ea5e9', '#16a34a', '#eab308'];
  const colors = base.includes(color) ? base : [color, ...base];
  return (
    <Modal open={!!project} onClose={onClose} title="แก้ไขรายละเอียดโครงการ"
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-accent" onClick={() => name.trim() && onSave({ name: name.trim(), code, client, color, trackBills })}>
          <Icon name="save" size={14} /> บันทึกการแก้ไข
        </button>
      </>}>
      <div className="col gap-16">
        <div className="form-grid">
          <div className="field">
            <label className="field-label">รหัสโครงการ</label>
            <input className="input mono" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">สีประจำโครงการ</label>
            <div className="row gap-6">
              {colors.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)} style={{
                  width: 28, height: 28, borderRadius: 6, background: c, border: color === c ? '2px solid var(--ink-1)' : '2px solid transparent', cursor: 'pointer'
                }} />
              ))}
            </div>
          </div>
          <div className="field full">
            <label className="field-label">ชื่อโครงการ</label>
            <input className="input" autoFocus placeholder="เช่น อาคารพาณิชย์ 4 ชั้น สุขุมวิท" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field full">
            <label className="field-label">เจ้าของ / ลูกค้า</label>
            <input className="input" placeholder="ชื่อ-นามสกุล หรือ บริษัท" value={client} onChange={(e) => setClient(e.target.value)} />
          </div>
          <div className="field full">
            <label className="field-label">ตามบิล (ใบกำกับภาษี/ใบเสร็จจากร้าน)</label>
            <button type="button" onClick={() => setTrackBills(v => !v)}
              className={"status-chip" + (trackBills ? " on approve" : "")}
              style={{ alignSelf: 'flex-start' }}>
              <span className="tick">{trackBills ? '✓' : ''}</span> {trackBills ? 'เปิดตามบิลโครงการนี้' : 'ปิด (ไม่ตามบิล)'}
            </button>
            <div className="field-hint">เปิดเมื่อโครงการนี้ต้องเก็บใบกำกับภาษี/ใบเสร็จตัวจริงจากร้านไว้ยื่นภาษีซื้อ — รายการวัสดุ/เครื่องจักรของโครงการนี้จะขึ้นสถานะ "รอรับบิล" ให้ตามจนครบ</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
window.EditProjectModal = EditProjectModal;
