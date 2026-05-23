/* global React */
// ============================
// LaborForm — wage / contractor labor records
// includes deductions (advance, retention) and post-creation work logs
// ============================

// ---- Worker team picker ----
function WorkerTeamPicker({ value, onChange, teams, onAdd }) {
  const [open, setOpen] = useState(false);
  const cur = teams.find((t) => t.id === value);
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" className="input" style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }} onClick={() => setOpen(!open)}>
        {cur ? (
          <>
            <span style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
              display: 'grid', placeItems: 'center', color: '#1f1d18', fontWeight: 600, fontSize: 12,
              flexShrink: 0,
            }}>{cur.name.charAt(0)}</span>
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 500 }}>{cur.name}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>หัวหน้า: {cur.leader} · {cur.size} คน</span>
            </span>
          </>
        ) : (
          <span style={{ flex: 1, color: 'var(--ink-4)' }}>เลือกทีมช่าง...</span>
        )}
        <Icon name="chevron" size={14} stroke={2} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 30,
          background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 10,
          boxShadow: 'var(--shadow-lg)', overflow: 'hidden', maxHeight: 340, overflowY: 'auto'
        }}>
          {teams.map((t) => (
            <button key={t.id} type="button"
              onClick={() => { onChange(t.id); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: 13, textAlign: 'left', fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))', display: 'grid', placeItems: 'center', color: '#1f1d18', fontWeight: 600, fontSize: 12 }}>{t.name.charAt(0)}</span>
              <span style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{t.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{t.leader} · {t.phone} · {t.specialty}</div>
              </span>
              <span className="badge gray mono">{t.size} คน</span>
            </button>
          ))}
          <button type="button" onClick={() => { setOpen(false); onAdd && onAdd(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '12px 14px', border: 'none', cursor: 'pointer',
              background: 'var(--bg-2)', borderTop: '1px solid var(--line)', fontFamily: 'inherit',
              fontSize: 13, color: 'var(--accent-ink)', fontWeight: 500
            }}>
            <Icon name="plus" size={14} /> เพิ่มทีมช่างใหม่
          </button>
        </div>
      )}
    </div>
  );
}
window.WorkerTeamPicker = WorkerTeamPicker;

// ---- Add worker team modal ----
function AddWorkerTeamModal({ open, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [leader, setLeader] = useState('');
  const [phone, setPhone] = useState('');
  const [size, setSize] = useState(1);
  const [specialty, setSpecialty] = useState('');
  useEffect(() => {
    if (open) { setName(''); setLeader(''); setPhone(''); setSize(1); setSpecialty(''); }
  }, [open]);
  return (
    <Modal open={open} onClose={onClose} title="เพิ่มทีมช่างใหม่"
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-accent" onClick={() => name.trim() && onAdd({
          name: name.trim(), leader: leader.trim(), phone: phone.trim(),
          size: Number(size) || 1, specialty: specialty.trim()
        })}>
          <Icon name="plus" size={14} /> เพิ่มทีม
        </button>
      </>}>
      <div className="form-grid">
        <div className="field full">
          <label className="field-label">ชื่อทีม</label>
          <input className="input" autoFocus placeholder="เช่น ทีมช่างประสิทธิ์" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">หัวหน้าทีม</label>
          <input className="input" placeholder="ชื่อ-นามสกุล" value={leader} onChange={(e) => setLeader(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">เบอร์ติดต่อ</label>
          <input className="input mono" placeholder="08x-xxx-xxxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">จำนวนคน</label>
          <input className="input mono" type="number" min="1" value={size} onChange={(e) => setSize(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">ความชำนาญ</label>
          <input className="input" placeholder="เช่น ก่อ-ฉาบ, ปูกระเบื้อง" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
window.AddWorkerTeamModal = AddWorkerTeamModal;

// ---- Items table for labor (reuses style but different placeholders) ----
function LaborItemsTable({ items, setItems, cats, onAddCat }) {
  const updateItem = (id, patch) => setItems(items.map((i) => i.id === id ? { ...i, ...patch } : i));
  const removeItem = (id) => setItems(items.filter((i) => i.id !== id));
  const addItem = () => setItems([...items, { id: newId(), name: '', categoryId: '', qty: 1, unit: 'ตร.ม.', price: 0 }]);
  const units = ['ตร.ม.', 'ตร.ว.', 'ม.', 'จุด', 'งวด', 'วัน', 'เหมา'];
  return (
    <div className="col gap-8" style={{ overflowX: 'auto' }}>
      <table className="items-table" style={{ minWidth: 780 }}>
        <thead>
          <tr>
            <th style={{ width: '40%' }}>รายการงาน</th>
            <th style={{ width: '18%' }}>หมวดงาน</th>
            <th style={{ width: '8%' }} className="num">ปริมาณ</th>
            <th style={{ width: '9%' }}>หน่วย</th>
            <th style={{ width: '12%' }} className="num">ค่าแรง/หน่วย</th>
            <th style={{ width: '13%' }} className="num">รวม</th>
            <th style={{ width: 36 }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td>
                <input className="cell-input" placeholder="เช่น ก่ออิฐมวลเบา ผนังชั้น 2"
                  value={it.name} onChange={(e) => updateItem(it.id, { name: e.target.value })} />
              </td>
              <td>
                <window.CategorySelect value={it.categoryId} onChange={(v) => updateItem(it.id, { categoryId: v })} cats={cats} onAdd={onAddCat} placeholder="—" />
              </td>
              <td>
                <input className="cell-input num" type="number" min="0" step="any" value={it.qty}
                  onChange={(e) => updateItem(it.id, { qty: e.target.value })} />
              </td>
              <td>
                <input className="cell-input" list="labor-units" value={it.unit} onChange={(e) => updateItem(it.id, { unit: e.target.value })} />
              </td>
              <td>
                <input className="cell-input num" type="number" min="0" step="any" value={it.price}
                  onChange={(e) => updateItem(it.id, { price: e.target.value })} />
              </td>
              <td className="num mono" style={{ paddingRight: 10, color: 'var(--ink-2)' }}>
                {fmt(Number(it.qty || 0) * Number(it.price || 0))}
              </td>
              <td>
                <button type="button" className="topbar-icon-btn" style={{ width: 28, height: 28 }} onClick={() => removeItem(it.id)} title="ลบ">
                  <Icon name="trash" size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <datalist id="labor-units">{units.map(u => <option key={u} value={u} />)}</datalist>
      <button type="button" className="btn btn-ghost btn-sm" onClick={addItem} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
        <Icon name="plus" size={13} /> เพิ่มรายการงาน
      </button>
    </div>
  );
}

// ---- WorkLogsEditor: editable list of work-detail entries ----
function WorkLogsEditor({ logs, onChange }) {
  const addLog = () => onChange([...logs, { id: newId(), date: todayStr(), note: '', images: [] }]);
  const updateLog = (id, patch) => onChange(logs.map(l => l.id === id ? { ...l, ...patch } : l));
  const removeLog = (id) => onChange(logs.filter(l => l.id !== id));

  return (
    <div className="col gap-12">
      {logs.length === 0 && (
        <div style={{
          padding: '20px 16px', textAlign: 'center',
          border: '1px dashed var(--line-strong)', borderRadius: 10, color: 'var(--ink-3)', fontSize: 13
        }}>
          ยังไม่มีรายละเอียดงาน — กดปุ่มด้านล่างเพื่อเพิ่มบันทึก
        </div>
      )}
      {logs.map((log, idx) => (
        <div key={log.id} style={{
          background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 12,
          padding: 14, display: 'flex', flexDirection: 'column', gap: 10
        }}>
          <div className="row between">
            <div className="row gap-8">
              <div style={{
                width: 24, height: 24, borderRadius: 999,
                background: 'var(--accent)', color: '#1f1d18', display: 'grid', placeItems: 'center',
                fontSize: 11, fontWeight: 600, fontFamily: 'JetBrains Mono'
              }}>{idx + 1}</div>
              <input type="date" className="cell-input mono" style={{ width: 150 }}
                value={log.date} onChange={(e) => updateLog(log.id, { date: e.target.value })} />
            </div>
            <button type="button" className="topbar-icon-btn" style={{ width: 28, height: 28 }} onClick={() => removeLog(log.id)} title="ลบ">
              <Icon name="trash" size={13} />
            </button>
          </div>
          <textarea className="textarea" style={{ minHeight: 64, background: 'var(--surface)' }}
            placeholder="รายละเอียดงานที่ทำ เช่น ทำผนังเสร็จโซน A ฉาบเสร็จ 80%"
            value={log.note} onChange={(e) => updateLog(log.id, { note: e.target.value })} />
          <window.ImageUploader images={log.images || []} onChange={(imgs) => updateLog(log.id, { images: imgs })} max={5} />
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={addLog} style={{ alignSelf: 'flex-start' }}>
        <Icon name="plus" size={13} /> เพิ่มบันทึกรายละเอียดงาน
      </button>
    </div>
  );
}
window.WorkLogsEditor = WorkLogsEditor;

// ---- Team history panel (shown in form + drawer) ----
function TeamHistoryPanel({ teamId, projectId, excludeId, compact }) {
  const app = window.useApp();
  if (!teamId || !projectId) return null;
  const records = app.records.filter(r =>
    r.type === 'labor' && r.workerTeamId === teamId && r.projectId === projectId && r.id !== excludeId
  );
  const total = records.reduce((s, r) => s + computeTotals(r).total, 0);
  const advTotal = records.reduce((s, r) => s + Number(r.advanceDeduction || 0), 0);
  const retTotal = records.reduce((s, r) => s + Number(r.retentionDeduction || 0), 0);

  if (records.length === 0) {
    return (
      <div style={{
        padding: '14px 16px', background: 'var(--bg)', borderRadius: 10,
        fontSize: 12.5, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 8
      }}>
        <Icon name="history" size={14} />
        ยังไม่มีประวัติของทีมนี้ในโครงการนี้ — รายการนี้จะเป็นบิลแรก
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-2)'
      }}>
        <Icon name="history" size={14} />
        <span style={{ fontWeight: 500, fontSize: 13 }}>ประวัติทีมนี้ในโครงการเดียวกัน</span>
        <span className="badge gray mono">{records.length} บิล</span>
        <div className="spacer"></div>
        <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>
          ยอดสะสม <strong>฿{fmt(total)}</strong>
        </span>
      </div>
      <div>
        {records.map((r) => (
          <div key={r.id}
            onClick={() => app.setDetailId(r.id)}
            style={{
              display: 'grid',
              gridTemplateColumns: compact ? '100px 100px 1fr auto' : '110px 90px 1fr auto',
              alignItems: 'center', gap: 12,
              padding: '10px 16px', borderBottom: '1px solid var(--line)',
              fontSize: 12.5, cursor: 'pointer', transition: 'background 120ms'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <span className="mono" style={{ color: 'var(--ink-3)' }}>{r.docNo}</span>
            <span style={{ color: 'var(--ink-2)' }}>{fmtDate(r.date)}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span className="badge gray" style={{ marginRight: 6, fontSize: 10.5 }}>{r.period || '—'}</span>
              {r.items.map(i => i.name).filter(Boolean).join(', ') || '—'}
            </span>
            <span className="mono" style={{ fontWeight: 500 }}>฿{fmt(computeTotals(r).total)}</span>
          </div>
        ))}
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1,
        background: 'var(--line)', borderTop: '1px solid var(--line)'
      }}>
        <div style={{ background: 'var(--surface-2)', padding: '10px 14px' }}>
          <div style={{ fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ยอดจ่ายสะสม</div>
          <div className="mono" style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>฿{fmt(total)}</div>
        </div>
        <div style={{ background: 'var(--surface-2)', padding: '10px 14px' }}>
          <div style={{ fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>หักเบิกล่วงหน้าสะสม</div>
          <div className="mono" style={{ fontSize: 14, fontWeight: 600, marginTop: 2, color: 'var(--warn)' }}>฿{fmt(advTotal)}</div>
        </div>
        <div style={{ background: 'var(--surface-2)', padding: '10px 14px' }}>
          <div style={{ fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>เงินประกันสะสม</div>
          <div className="mono" style={{ fontSize: 14, fontWeight: 600, marginTop: 2, color: 'var(--info)' }}>฿{fmt(retTotal)}</div>
        </div>
      </div>
    </div>
  );
}
window.TeamHistoryPanel = TeamHistoryPanel;

// ---- The Labor Form ----
window.LaborForm = function LaborForm({ initial, onSubmit, onCancel }) {
  const app = window.useApp();

  const blank = () => ({
    type: 'labor',
    docNo: 'LB-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000 + 1000)),
    date: todayStr(),
    projectId: '',
    workerTeamId: '',
    vendor: '',
    period: 'งวดที่ 1',
    items: [{ id: newId(), name: '', categoryId: '', qty: 1, unit: 'ตร.ม.', price: 0 }],
    vatMode: 'exclusive',
    vatRate: 0,
    whtEnabled: false,
    whtRate: 3,
    advanceDeduction: 0,
    retentionDeduction: 0,
    docs: ['voucher-pay'],
    note: '',
    images: [],
    workLogs: [],
  });

  const [form, setForm] = useState(() => initial ? { ...initial, workLogs: initial.workLogs || [] } : blank());
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [projModalOpen, setProjModalOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);

  const totals = useMemo(() => computeTotals(form), [form]);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggleDoc = (id) => set({ docs: form.docs.includes(id) ? form.docs.filter(d => d !== id) : [...form.docs, id] });

  // Update vendor field to mirror team name when team is picked
  const setTeam = (teamId) => {
    const t = app.workerTeams.find(x => x.id === teamId);
    set({ workerTeamId: teamId, vendor: t ? t.name : form.vendor });
  };

  const handleSubmit = () => {
    if (!form.projectId) return app.pushToast('โปรดเลือกโครงการก่อนบันทึก', 'error');
    if (!form.workerTeamId) return app.pushToast('โปรดเลือกทีมช่างก่อนบันทึก', 'error');
    if (!form.items.some(it => it.name.trim() && Number(it.qty) > 0)) return app.pushToast('โปรดเพิ่มรายการงานอย่างน้อย 1 รายการ', 'error');
    onSubmit(form);
  };

  const isEditing = !!initial;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEditing ? 'แก้ไขบันทึกค่าแรง' : 'บันทึกรายจ่ายค่าแรง'}</h1>
          <div className="page-sub">กรอกรายการงาน หักเงินที่เกี่ยวข้อง พร้อมแนบรูปและบันทึกรายละเอียดงาน</div>
        </div>
        <div className="row gap-8">
          <button className="btn btn-ghost" onClick={onCancel}><Icon name="x" size={14} /> ยกเลิก</button>
          <button className="btn btn-accent" onClick={handleSubmit}>
            <Icon name="save" size={14} /> {isEditing ? 'บันทึกการแก้ไข' : 'บันทึกรายการ'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18, alignItems: 'start' }} className="form-layout">
        <div className="col gap-16">
          {/* Card 1: header */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">ข้อมูลการเบิก</div>
                <div className="card-sub">เลขที่เอกสาร โครงการ ทีมช่าง และงวด</div>
              </div>
              <span className="badge amber dot">บันทึกค่าแรง</span>
            </div>
            <div className="card-body">
              <div className="form-grid">
                <div className="field">
                  <label className="field-label">เลขที่เอกสาร <span className="req">*</span></label>
                  <input className="input mono" value={form.docNo} onChange={(e) => set({ docNo: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field-label">วันที่เบิก <span className="req">*</span></label>
                  <input className="input" type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
                </div>
                <div className="field full">
                  <label className="field-label">โครงการ <span className="req">*</span></label>
                  <window.ProjectPicker value={form.projectId} onChange={(v) => set({ projectId: v })} projects={app.projects} onAdd={() => setProjModalOpen(true)} />
                </div>
                <div className="field full">
                  <label className="field-label">ทีมช่าง <span className="req">*</span></label>
                  <WorkerTeamPicker value={form.workerTeamId} onChange={setTeam} teams={app.workerTeams} onAdd={() => setTeamModalOpen(true)} />
                </div>
                <div className="field">
                  <label className="field-label">งวดงาน</label>
                  <input className="input" list="period-list" placeholder="เช่น งวดที่ 1, งวดสุดท้าย" value={form.period} onChange={(e) => set({ period: e.target.value })} />
                  <datalist id="period-list">
                    {['งวดที่ 1', 'งวดที่ 2', 'งวดที่ 3', 'งวดที่ 4', 'งวดที่ 5', 'งวดสุดท้าย', 'งวดเดียว'].map(v => <option key={v} value={v} />)}
                  </datalist>
                </div>
              </div>
            </div>
          </div>

          {/* Team history panel — only shows when both team + project chosen */}
          {form.workerTeamId && form.projectId && (
            <TeamHistoryPanel teamId={form.workerTeamId} projectId={form.projectId} excludeId={initial?.id} compact />
          )}

          {/* Card 2: items */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">รายการงาน</div>
                <div className="card-sub">งานที่ทำในงวดนี้ พร้อมปริมาณและค่าแรง</div>
              </div>
              <span className="badge gray mono">{form.items.length} รายการ</span>
            </div>
            <div className="card-body">
              <LaborItemsTable items={form.items} setItems={(items) => set({ items })} cats={app.laborCats} onAddCat={() => setCatModalOpen(true)} />
            </div>
          </div>

          {/* Card 3: deductions */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">การหักเงิน</div>
                <div className="card-sub">หักเบิกล่วงหน้า และหักเงินประกันผลงาน</div>
              </div>
            </div>
            <div className="card-body">
              <div className="form-grid">
                <div className="field">
                  <label className="field-label" style={{ color: 'var(--warn)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--warn)' }}></span>
                    หักเบิกล่วงหน้า
                  </label>
                  <div className="input-affix">
                    <div className="input-affix-prefix">฿</div>
                    <input className="input mono" type="number" min="0" step="any" value={form.advanceDeduction}
                      onChange={(e) => set({ advanceDeduction: e.target.value })} placeholder="0.00" />
                  </div>
                  <div className="field-hint">เงินที่ช่างเคยเบิกไปก่อนแล้ว นำมาหักออกจากงวดนี้</div>
                </div>
                <div className="field">
                  <label className="field-label" style={{ color: 'var(--info)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--info)' }}></span>
                    หักเงินประกันผลงาน
                  </label>
                  <div className="input-affix">
                    <div className="input-affix-prefix">฿</div>
                    <input className="input mono" type="number" min="0" step="any" value={form.retentionDeduction}
                      onChange={(e) => set({ retentionDeduction: e.target.value })} placeholder="0.00" />
                  </div>
                  <div className="field-hint">เก็บไว้ค้ำประกันคุณภาพ — คืนเมื่องานเสร็จและตรวจรับ</div>
                </div>
                <div className="field full">
                  <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>กดเพื่อคำนวณเร็ว:</span>
                    {[3, 5, 10].map((pct) => (
                      <button key={pct} type="button" className="badge"
                        style={{ cursor: 'pointer', padding: '4px 10px' }}
                        onClick={() => {
                          const sub = form.items.reduce((s, i) => s + (Number(i.qty) * Number(i.price)), 0);
                          set({ retentionDeduction: Math.round(sub * pct / 100) });
                        }}>
                        เงินประกัน {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: docs + tax (compact) */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">เอกสาร และภาษี</div>
                <div className="card-sub">เลือกเอกสารที่ต้องออก พร้อมเงื่อนไข Vat และหัก ณ ที่จ่าย</div>
              </div>
            </div>
            <div className="card-body col gap-20">
              <div className="field">
                <label className="field-label"><Icon name="receipt" size={14} /> เอกสารที่ต้องออก</label>
                <div className="option-row">
                  {DOC_TYPES.map((d) => (
                    <button key={d.id} type="button"
                      className={"option-pill" + (form.docs.includes(d.id) ? " selected" : "")}
                      onClick={() => toggleDoc(d.id)}
                      style={{ padding: '10px 14px' }}
                    >
                      <span className="pill-check">
                        {form.docs.includes(d.id) && <Icon name="check" size={12} stroke={2.5} />}
                      </span>
                      <span>{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-grid">
                <div className="field">
                  <label className="field-label"><Icon name="money" size={14} /> เงื่อนไข Vat</label>
                  <div className="option-row">
                    <button type="button" className={"option-pill" + (form.vatMode === 'exclusive' ? ' selected' : '')} onClick={() => set({ vatMode: 'exclusive' })}>
                      <span className="pill-radio"></span>
                      <span>ไม่รวม Vat</span>
                    </button>
                    <button type="button" className={"option-pill" + (form.vatMode === 'inclusive' ? ' selected' : '')} onClick={() => set({ vatMode: 'inclusive' })}>
                      <span className="pill-radio"></span>
                      <span>รวม Vat แล้ว</span>
                    </button>
                  </div>
                  <div className="row gap-8 mt-12">
                    <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>อัตรา Vat</span>
                    <div className="input-affix" style={{ width: 110 }}>
                      <input className="input mono" type="number" step="0.5" value={form.vatRate} onChange={(e) => set({ vatRate: e.target.value })} />
                      <div className="input-affix-suffix">%</div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>(ส่วนมากค่าแรงตรง = 0%)</span>
                  </div>
                </div>
                <div className="field">
                  <label className="field-label"><Icon name="percent" size={14} /> หัก ณ ที่จ่าย</label>
                  <window.Switch on={form.whtEnabled} onChange={(v) => set({ whtEnabled: v })}
                    label={form.whtEnabled ? 'เปิดหัก ณ ที่จ่าย' : 'ไม่หัก ณ ที่จ่าย'}
                    sub={form.whtEnabled ? `คำนวณ ${form.whtRate}% จากยอดก่อน Vat` : 'แตะเพื่อเปิดใช้งาน'} />
                  {form.whtEnabled && (
                    <div className="option-row mt-12">
                      {[1, 2, 3, 5].map((r) => (
                        <window.OptionPill key={r} mode="radio" selected={Number(form.whtRate) === r} onClick={() => set({ whtRate: r })}>
                          <span className="mono">{r}%</span>
                        </window.OptionPill>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: work logs (post-creation editable) */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">รายละเอียดงาน <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 400, marginLeft: 6 }}>(เพิ่ม-แก้ไขได้ตลอด)</span></div>
                <div className="card-sub">บันทึกความคืบหน้า ปัญหา หรือรูปหน้างานในแต่ละวัน</div>
              </div>
              <span className="badge gray mono">{form.workLogs.length} บันทึก</span>
            </div>
            <div className="card-body">
              <WorkLogsEditor logs={form.workLogs} onChange={(logs) => set({ workLogs: logs })} />
            </div>
          </div>

          {/* Card 6: images + note */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">รูปภาพและหมายเหตุ</div>
                <div className="card-sub">แนบสลิปโอน รูปงานหรือรูปอื่น ๆ (สูงสุด 10 รูป)</div>
              </div>
            </div>
            <div className="card-body col gap-16">
              <window.ImageUploader images={form.images} onChange={(imgs) => set({ images: imgs })} max={10} />
              <div className="field">
                <label className="field-label">หมายเหตุ</label>
                <textarea className="textarea" placeholder="เช่น จ่ายงวด 2 — เหลือเงินประกัน 5% เก็บไว้"
                  value={form.note} onChange={(e) => set({ note: e.target.value })} />
              </div>
            </div>
          </div>
        </div>

        {/* Right summary */}
        <div style={{ position: 'sticky', top: 84 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">สรุปยอดจ่าย</div>
              <span className="badge amber dot">{form.period || 'งวดเดียว'}</span>
            </div>
            <div className="card-body">
              <div className="summary-rows">
                <div className="summary-row">
                  <span className="label">ค่าแรงรวม</span>
                  <span className="value">{fmt(totals.subTotal)}</span>
                </div>
                {Number(form.vatRate) > 0 && (
                  <div className="summary-row">
                    <span className="label">Vat {form.vatRate}%</span>
                    <span className="value">{fmt(totals.vat)}</span>
                  </div>
                )}
                <div className="summary-row" style={{ borderTop: '1px dashed var(--line)', paddingTop: 10 }}>
                  <span className="label">รวมก่อนหัก</span>
                  <span className="value">{fmt(totals.beforeWht)}</span>
                </div>
                {form.whtEnabled && (
                  <div className="summary-row">
                    <span className="label">หัก ณ ที่จ่าย {form.whtRate}%</span>
                    <span className="value" style={{ color: 'var(--danger)' }}>− {fmt(totals.wht)}</span>
                  </div>
                )}
                {Number(form.advanceDeduction) > 0 && (
                  <div className="summary-row">
                    <span className="label" style={{ color: 'var(--warn)' }}>หักเบิกล่วงหน้า</span>
                    <span className="value" style={{ color: 'var(--warn)' }}>− {fmt(totals.advance)}</span>
                  </div>
                )}
                {Number(form.retentionDeduction) > 0 && (
                  <div className="summary-row">
                    <span className="label" style={{ color: 'var(--info)' }}>หักเงินประกัน</span>
                    <span className="value" style={{ color: 'var(--info)' }}>− {fmt(totals.retention)}</span>
                  </div>
                )}
                <div className="summary-row total">
                  <span className="label">ยอดจ่ายสุทธิ</span>
                  <span className="value">{fmt(totals.total)} <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>บาท</span></span>
                </div>
              </div>

              <div className="mt-20" style={{ padding: 14, background: 'var(--bg)', borderRadius: 10, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 500, marginBottom: 4, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="sparkle" size={13} /> เคล็ดลับ
                </div>
                เงินประกันผลงานจะถูก "ตั้งพัก" ไว้ก่อน — เมื่องวดสุดท้ายตรวจรับงานเรียบร้อย สามารถสร้างบิลค่าแรงใหม่เพื่อ "คืนเงินประกัน" ได้
              </div>
            </div>
          </div>

          <div className="row gap-8 mt-16">
            <button className="btn btn-accent" style={{ flex: 1 }} onClick={handleSubmit}>
              <Icon name="save" size={14} /> {isEditing ? 'บันทึกการแก้ไข' : 'บันทึก'}
            </button>
            <button className="btn btn-ghost" onClick={onCancel}>ยกเลิก</button>
          </div>
        </div>
      </div>

      <window.AddCategoryModal open={catModalOpen} onClose={() => setCatModalOpen(false)} onAdd={(c) => { app.addLaborCat(c); app.pushToast('เพิ่มหมวดงานแล้ว'); setCatModalOpen(false); }} title="เพิ่มหมวดงาน" />
      <window.AddProjectModal open={projModalOpen} onClose={() => setProjModalOpen(false)} onAdd={(p) => { app.addProject(p); app.pushToast('เพิ่มโครงการแล้ว'); setProjModalOpen(false); }} />
      <AddWorkerTeamModal open={teamModalOpen} onClose={() => setTeamModalOpen(false)} onAdd={(t) => {
        const team = app.addWorkerTeam(t);
        setForm((f) => ({ ...f, workerTeamId: team.id, vendor: team.name }));
        app.pushToast('เพิ่มทีมช่างแล้ว');
        setTeamModalOpen(false);
      }} />

      <style>{`
        @media (max-width: 1100px) {
          .form-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
};
