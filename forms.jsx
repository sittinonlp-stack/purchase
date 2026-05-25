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

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const dropH = Math.min(projects.length * 46 + 52, 340);
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
            {projects.map((p) => (
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
        {cur ? <><span className="cat-dot" style={{ background: cur.color }}></span><span style={{ flex: 1, fontSize: 12.5 }}>{cur.name}</span></>
             : <span style={{ flex: 1, color: 'var(--ink-4)', fontSize: 12.5 }}>{placeholder}</span>}
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
  const updateItem = (id, patch) => setItems(items.map((i) => i.id === id ? { ...i, ...patch } : i));
  const removeItem = (id) => setItems(items.filter((i) => i.id !== id));
  const addItem = () => setItems([...items, { id: newId(), name: '', categoryId: '', qty: 1, unit: type === 'machine' ? 'วัน' : 'ชิ้น', price: 0 }]);
  return (
    <div className="col gap-8" style={{ overflowX: 'auto' }}>
      <table className="items-table" style={{ minWidth: 780 }}>
        <thead>
          <tr>
            <th style={{ width: '38%' }}>{type === 'machine' ? 'เครื่องจักร / อุปกรณ์' : 'รายการวัสดุ'}</th>
            <th style={{ width: '18%' }}>หมวดหมู่</th>
            <th style={{ width: '8%' }} className="num">จำนวน</th>
            <th style={{ width: '9%' }}>หน่วย</th>
            <th style={{ width: '12%' }} className="num">ราคา/หน่วย</th>
            <th style={{ width: '13%' }} className="num">รวม</th>
            <th style={{ width: 36 }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={it.id}>
              <td>
                <input className="cell-input" placeholder={type === 'machine' ? 'เช่น รถเครน 25 ตัน + คนขับ' : 'เช่น เหล็กข้ออ้อย DB16'}
                  value={it.name} onChange={(e) => updateItem(it.id, { name: e.target.value })} />
              </td>
              <td>
                <CategorySelect value={it.categoryId} onChange={(v) => updateItem(it.id, { categoryId: v })} cats={cats} onAdd={onAddCat} placeholder="—" />
              </td>
              <td>
                <input className="cell-input num" type="number" min="0" step="any" value={it.qty}
                  onChange={(e) => updateItem(it.id, { qty: e.target.value })} />
              </td>
              <td>
                <input className="cell-input" value={it.unit} onChange={(e) => updateItem(it.id, { unit: e.target.value })} />
              </td>
              <td>
                <input className="cell-input num" type="number" min="0" step="any" value={it.price}
                  onChange={(e) => updateItem(it.id, { price: e.target.value })} />
              </td>
              <td className="num mono" style={{ paddingRight: 10, color: 'var(--ink-2)' }}>
                {fmt(Number(it.qty || 0) * Number(it.price || 0))}
              </td>
              <td>
                <button type="button" className="topbar-icon-btn" style={{ width: 28, height: 28 }} onClick={() => removeItem(it.id)} title="ลบรายการ">
                  <Icon name="trash" size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="btn btn-ghost btn-sm" onClick={addItem} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
        <Icon name="plus" size={13} /> เพิ่มรายการ
      </button>
    </div>
  );
}

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

function VatModeRow({ value, onChange }) {
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
    </div>
  );
}

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
    docs: [],
    note: '',
    images: [],
    depositAmount: 0,
    depositStatus: 'none',
    depositReturnDate: '',
    depositReturnImages: [],
    depositReturnNote: '',
  });

  const [form, setForm] = useState(() => initial ? { ...initial } : blank());
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [projModalOpen, setProjModalOpen] = useState(false);

  const totals = useMemo(() => computeTotals(form), [form]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggleDoc = (id) => set({ docs: form.docs.includes(id) ? form.docs.filter(d => d !== id) : [...form.docs, id] });

  const handleSubmit = () => {
    if (!form.projectId) return app.pushToast('โปรดเลือกโครงการก่อนบันทึก', 'error');
    if (!form.vendor.trim()) return app.pushToast('โปรดระบุชื่อผู้ขาย/ผู้ให้เช่า', 'error');
    if (!form.items.some(it => it.name.trim() && Number(it.qty) > 0)) return app.pushToast('โปรดเพิ่มรายการอย่างน้อย 1 รายการ', 'error');
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18, alignItems: 'start' }} className="form-layout">
        {/* Left column: main form */}
        <div className="col gap-16">
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
              </div>

              <div className="field">
                <label className="field-label"><Icon name="money" size={14} /> เงื่อนไข Vat</label>
                <VatModeRow value={form.vatMode} onChange={(v) => set({ vatMode: v })} />
                <div className="row gap-8 mt-12">
                  <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>อัตรา Vat</span>
                  <div className="input-affix" style={{ width: 110 }}>
                    <input className="input mono" type="number" step="0.5" value={form.vatRate} onChange={(e) => set({ vatRate: e.target.value })} />
                    <div className="input-affix-suffix">%</div>
                  </div>
                </div>
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
        </div>

        {/* Right column: summary */}
        <div style={{ position: 'sticky', top: 84 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">สรุปยอด</div>
              <span className="badge amber dot">{form.vatMode === 'inclusive' ? 'รวม Vat แล้ว' : 'ไม่รวม Vat'}</span>
            </div>
            <div className="card-body">
              <div className="summary-rows">
                <div className="summary-row">
                  <span className="label">ยอดก่อนภาษี</span>
                  <span className="value">{fmt(totals.subTotal)}</span>
                </div>
                <div className="summary-row">
                  <span className="label">Vat {form.vatRate}%</span>
                  <span className="value">{fmt(totals.vat)}</span>
                </div>
                <div className="summary-row" style={{ borderTop: '1px dashed var(--line)', paddingTop: 10 }}>
                  <span className="label">รวมก่อนหัก ณ ที่จ่าย</span>
                  <span className="value">{fmt(totals.beforeWht)}</span>
                </div>
                {form.whtEnabled && (
                  <div className="summary-row">
                    <span className="label">หัก ณ ที่จ่าย {form.whtRate}%</span>
                    <span className="value" style={{ color: 'var(--danger)' }}>− {fmt(totals.wht)}</span>
                  </div>
                )}
                <div className="summary-row total">
                  <span className="label">ยอดสุทธิ</span>
                  <span className="value">{fmt(totals.total)} <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>บาท</span></span>
                </div>
                {Number(form.depositAmount) > 0 && (
                  <div className="summary-row" style={{ borderTop:'1px dashed rgba(59,130,246,0.4)', paddingTop:10, marginTop:4 }}>
                    <span className="label" style={{ color:'#3b82f6', display:'flex', alignItems:'center', gap:5 }}>
                      <Icon name="bell" size={11} /> เงินค่าประกัน (ติดตามแยก)
                    </span>
                    <span className="value" style={{ color:'#3b82f6' }}>฿{fmt(Number(form.depositAmount))}</span>
                  </div>
                )}
              </div>

              <div className="mt-20" style={{ padding: 14, background: 'var(--bg)', borderRadius: 10, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 500, marginBottom: 4, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="sparkle" size={13} /> เคล็ดลับ
                </div>
                ระบบจะคำนวณ Vat และหัก ณ ที่จ่ายให้อัตโนมัติ — เลือก "ราคารวม Vat" ถ้าใบเสนอราคาบอกราคาท้ายที่สุดมาแล้ว
              </div>

              {form.docs.length > 0 && (
                <div className="mt-16">
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>เอกสารที่จะออก</div>
                  <div className="row gap-8 wrap">
                    {form.docs.map((d) => {
                      const doc = DOC_TYPES.find(x => x.id === d);
                      return <span key={d} className="badge amber">{doc?.label}</span>;
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="row gap-8 mt-16">
            <button className="btn btn-accent" style={{ flex: 1 }} onClick={handleSubmit}><Icon name="save" size={14} /> บันทึก</button>
            <button className="btn btn-ghost" onClick={onCancel}>ยกเลิก</button>
          </div>
        </div>
      </div>

      {/* Add category modal */}
      <AddCategoryModal open={catModalOpen} onClose={() => setCatModalOpen(false)} onAdd={(c) => { addCat(c); app.pushToast('เพิ่มหมวดหมู่แล้ว'); setCatModalOpen(false); }} title={type === 'machine' ? 'เพิ่มหมวดหมู่เครื่องจักร' : 'เพิ่มหมวดหมู่วัสดุ'} />
      <AddProjectModal open={projModalOpen} onClose={() => setProjModalOpen(false)} onAdd={(p) => { app.addProject(p); app.pushToast('เพิ่มโครงการแล้ว'); setProjModalOpen(false); }} />

      <style>{`
        @media (max-width: 1100px) {
          .form-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18, alignItems: 'start' }} className="form-layout">
        {/* Left column */}
        <div className="col gap-16">
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
                <VatModeRow value={form.vatMode} onChange={(v) => set({ vatMode: v })} />
                <div className="row gap-8 mt-12">
                  <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>อัตรา Vat</span>
                  <div className="input-affix" style={{ width: 110 }}>
                    <input className="input mono" type="number" step="0.5" value={form.vatRate} onChange={(e) => set({ vatRate: e.target.value })} />
                    <div className="input-affix-suffix">%</div>
                  </div>
                </div>
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

        {/* Right column: summary */}
        <div style={{ position: 'sticky', top: 84 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">สรุปยอด</div>
              <span className="badge amber dot">{form.vatMode === 'inclusive' ? 'รวม Vat แล้ว' : 'ไม่รวม Vat'}</span>
            </div>
            <div className="card-body">
              <div className="summary-rows">
                <div className="summary-row"><span className="label">ยอดก่อนภาษี</span><span className="value">{fmt(totals.subTotal)}</span></div>
                <div className="summary-row"><span className="label">Vat {form.vatRate}%</span><span className="value">{fmt(totals.vat)}</span></div>
                <div className="summary-row" style={{ borderTop: '1px dashed var(--line)', paddingTop: 10 }}>
                  <span className="label">รวมก่อนหัก ณ ที่จ่าย</span><span className="value">{fmt(totals.beforeWht)}</span>
                </div>
                {form.whtEnabled && (
                  <div className="summary-row"><span className="label">หัก ณ ที่จ่าย {form.whtRate}%</span><span className="value" style={{ color: 'var(--danger)' }}>− {fmt(totals.wht)}</span></div>
                )}
                <div className="summary-row total"><span className="label">ยอดสุทธิ</span><span className="value">{fmt(totals.total)} <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>บาท</span></span></div>
              </div>
              <div className="mt-20" style={{ padding: 14, background: 'var(--bg)', borderRadius: 10, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 500, marginBottom: 4, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="sparkle" size={13} /> เคล็ดลับ
                </div>
                ใช้หมวด "ค่าสำรองจ่ายทั่วไป" สำหรับรายจ่ายเบ็ดเตล็ดที่ยังไม่มีหมวดชัดเจน — เพิ่มหมวดใหม่ได้ตลอดเวลา
              </div>
              <div className="row gap-8 mt-16">
                <button className="btn btn-accent" style={{ flex: 1 }} onClick={handleSubmit}><Icon name="save" size={14} /> บันทึก</button>
                <button className="btn btn-ghost" onClick={onCancel}>ยกเลิก</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddCategoryModal open={catModalOpen} onClose={() => setCatModalOpen(false)} onAdd={(c) => { addCat(c); app.pushToast('เพิ่มหมวดหมู่แล้ว'); setCatModalOpen(false); }} title="เพิ่มหมวดหมู่ค่าใช้จ่าย" />
      <AddProjectModal open={projModalOpen} onClose={() => setProjModalOpen(false)} onAdd={(p) => { app.addProject(p); app.pushToast('เพิ่มโครงการแล้ว'); setProjModalOpen(false); }} />

      <style>{`
        @media (max-width: 1100px) { .form-layout { grid-template-columns: 1fr !important; } }
      `}</style>
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
  useEffect(() => {
    if (open) {
      setName(''); setClient(''); setColor('#d97706');
      setCode('PJ-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 900 + 100)));
    }
  }, [open]);
  const colors = ['#d97706', '#dc2626', '#a855f7', '#0ea5e9', '#16a34a', '#eab308'];
  return (
    <Modal open={open} onClose={onClose} title="เพิ่มโครงการใหม่"
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-accent" onClick={() => name.trim() && onAdd({ name: name.trim(), code, client, color, status: 'active' })}>
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
        </div>
      </div>
    </Modal>
  );
}
window.AddProjectModal = AddProjectModal;
