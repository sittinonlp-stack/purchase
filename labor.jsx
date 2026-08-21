/* global React */
// ============================
// LaborForm — wage / contractor labor records
// includes deductions (advance, retention) and post-creation work logs
// ============================

// ---- Worker team picker (with search) ----
function WorkerTeamPicker({ value, onChange, teams, onAdd }) {
  const [open,    setOpen]    = useState(false);
  const [q,       setQ]       = useState('');
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 300 });
  const btnRef   = useRef(null);
  const inputRef = useRef(null);
  const cur = teams.find((t) => t.id === value);

  const close = () => { setOpen(false); setQ(''); };

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const dropH = Math.min(teams.length * 58 + 108, 420);
      const top = spaceBelow < dropH && r.top > dropH ? r.top - dropH - 2 : r.bottom + 4;
      setDropPos({ top, left: r.left, width: Math.max(r.width, 320) });
    }
    setOpen(v => !v);
    setQ('');
  };

  // auto-focus search input เมื่อ dropdown เปิด
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current && inputRef.current.focus(), 60);
  }, [open]);

  // filter ตามคำค้น (ชื่อ, หัวหน้า, เบอร์, specialty)
  const visible = q.trim()
    ? teams.filter(t =>
        [t.name, t.leader, t.phone, t.specialty].join(' ')
          .toLowerCase().includes(q.toLowerCase()))
    : teams;

  // avatar ทีม
  const Avatar = ({ name }) => (
    <span style={{
      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
      background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
      display: 'grid', placeItems: 'center', color: '#1f1d18', fontWeight: 600, fontSize: 12,
    }}>{name.charAt(0)}</span>
  );

  return (
    <div style={{ position: 'relative' }}>
      {/* ── Trigger button ── */}
      <button ref={btnRef} type="button" className="input"
        style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
        onClick={handleToggle}>
        {cur ? (
          <>
            <Avatar name={cur.name} />
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

      {/* ── Dropdown ── */}
      {open && (
        <>
          {/* overlay ปิด */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 9990 }} onClick={close} />

          <div style={{
            position: 'fixed', zIndex: 9999,
            top: dropPos.top, left: dropPos.left, width: dropPos.width,
            background: 'var(--surface)', border: '1px solid var(--line-strong)',
            borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.22)', overflow: 'hidden',
          }}>
            {/* ── Search box ── */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
                  pointerEvents: 'none', display: 'flex',
                }}>
                  <Icon name="search" size={14} />
                </span>
                <input
                  ref={inputRef}
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="พิมพ์ชื่อทีม, หัวหน้า, เบอร์..."
                  onKeyDown={e => {
                    if (e.key === 'Escape') close();
                    if (e.key === 'Enter' && visible.length === 1) { onChange(visible[0].id); close(); }
                  }}
                  style={{
                    width: '100%', padding: '7px 30px 7px 32px',
                    border: '1px solid var(--line-strong)', borderRadius: 7,
                    background: 'var(--surface)', fontSize: 13, fontFamily: 'inherit',
                    outline: 'none', color: 'var(--ink-1)', boxSizing: 'border-box',
                  }}
                />
                {q && (
                  <button type="button" onClick={() => setQ('')} style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--ink-3)', padding: 2, lineHeight: 1, fontSize: 13,
                  }}>✕</button>
                )}
              </div>
            </div>

            {/* ── Team list ── */}
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {visible.length === 0 ? (
                <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                  ไม่พบทีมที่ค้นหา
                </div>
              ) : visible.map((t) => (
                <button key={t.id} type="button"
                  onClick={() => { onChange(t.id); close(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '10px 14px', border: 'none', fontFamily: 'inherit',
                    background: t.id === value ? 'rgba(217,119,6,0.08)' : 'transparent',
                    cursor: 'pointer', fontSize: 13, textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (t.id !== value) e.currentTarget.style.background = 'var(--bg-2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = t.id === value ? 'rgba(217,119,6,0.08)' : 'transparent'; }}
                >
                  <Avatar name={t.name} />
                  <span style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{t.leader} · {t.phone} · {t.specialty}</div>
                  </span>
                  <span className="badge gray mono">{t.size} คน</span>
                </button>
              ))}
            </div>

            {/* ── Add team button ── */}
            <button type="button" onClick={() => { close(); onAdd && onAdd(); }} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '12px 14px', border: 'none', cursor: 'pointer',
              background: 'var(--bg-2)', borderTop: '1px solid var(--line)',
              fontFamily: 'inherit', fontSize: 13, color: 'var(--accent-ink)', fontWeight: 500,
            }}>
              <Icon name="plus" size={14} /> เพิ่มทีมช่างใหม่
            </button>
          </div>
        </>
      )}
    </div>
  );
}
window.WorkerTeamPicker = WorkerTeamPicker;

// ---- Shared: section divider ใน form ----
function FormSectionLabel({ children }) {
  return (
    <div className="field full" style={{ marginBottom: -4 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
        color: 'var(--ink-3)', borderBottom: '1px solid var(--line)', paddingBottom: 6,
      }}>{children}</div>
    </div>
  );
}

// ---- Shared: fields สำหรับออกเอกสาร ----
function DocFields({ needsDoc, setNeedsDoc, fullName, setFullName, idCard, setIdCard, address, setAddress, docImages, setDocImages }) {
  return (
    <>
      <FormSectionLabel>ข้อมูลสำหรับออกเอกสาร</FormSectionLabel>

      {/* Toggle */}
      <div className="field full">
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', userSelect: 'none' }}>
          {/* custom toggle */}
          <span onClick={() => setNeedsDoc(v => !v)} style={{
            width: 44, height: 24, borderRadius: 12, flexShrink: 0,
            background: needsDoc ? 'var(--accent)' : 'var(--line-strong)',
            position: 'relative', transition: 'background 150ms', cursor: 'pointer',
            display: 'inline-block',
          }}>
            <span style={{
              position: 'absolute', top: 3, left: needsDoc ? 23 : 3,
              width: 18, height: 18, borderRadius: '50%', background: '#fff',
              transition: 'left 150ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </span>
          <span style={{ fontSize: 13, fontWeight: 500, color: needsDoc ? 'var(--ink-1)' : 'var(--ink-3)' }}>
            {needsDoc ? 'ต้องออกเอกสารสำคัญ (หนังสือจ้างเหมา / ภ.ง.ด.3)' : 'ไม่ต้องออกเอกสารสำคัญ'}
          </span>
        </label>
      </div>

      {/* ฟิลด์เอกสาร — แสดงเฉพาะเมื่อ needsDoc=true */}
      {needsDoc && (
        <>
          <div className="field">
            <label className="field-label">ชื่อจริง-นามสกุลจริง <span className="req">*</span></label>
            <input className="input" placeholder="นายสมชาย ใจดี"
              value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">เลขบัตรประชาชน</label>
            <input className="input mono" placeholder="0-0000-00000-00-0" maxLength={17}
              value={idCard} onChange={e => setIdCard(e.target.value)} />
            <div className="field-hint">เลข 13 หลัก</div>
          </div>
          <div className="field full">
            <label className="field-label">ที่อยู่ตามบัตรประชาชน</label>
            <textarea className="textarea" rows={2}
              placeholder="เลขที่ หมู่ ถนน ตำบล/แขวง อำเภอ/เขต จังหวัด รหัสไปรษณีย์"
              value={address} onChange={e => setAddress(e.target.value)} />
          </div>
          {setDocImages && (
            <div className="field full">
              <label className="field-label">
                <Icon name="image" size={13} /> รูปภาพเอกสาร
                <span style={{ fontWeight: 400, color: 'var(--ink-3)', fontSize: 11, marginLeft: 6 }}>(สำเนาบัตรประชาชน / หนังสือสัญญา — สูงสุด 5 รูป)</span>
              </label>
              <window.ImageUploader images={docImages} onChange={setDocImages} max={5} />
            </div>
          )}
        </>
      )}
    </>
  );
}

// ---- Add worker team modal ----
// หักประกันสังคม — ช่องติ๊ก + แจกแจงรายคน (หัวหน้า + ลูกทีม) กรอกยอดต่อคน
function SocialSecuritySection({ form, set, team }) {
  const enabled = !!form.socialSecurityEnabled;
  const items = form.socialSecurityItems || [];
  const total = items.reduce((s, m) => s + Number(m.amount || 0), 0);

  const sumOf = (arr) => arr.reduce((s, m) => s + Number(m.amount || 0), 0);
  const commit = (nextItems) => set({ socialSecurityItems: nextItems, socialSecurity: sumOf(nextItems) });

  // เดือนที่หักโดยปริยาย = เดือนก่อนหน้าวันที่บิล (หักสิ้นเดือนก่อน มาเบิกเดือนถัดไป)
  const defaultPeriod = () => {
    const base = form.date ? new Date(form.date) : new Date();
    base.setDate(1); base.setMonth(base.getMonth() - 1);
    return base.toISOString().slice(0, 7);
  };
  const buildFromTeam = () => {
    const rows = [];
    if (team?.leader) rows.push({ id: newId(), name: team.leader, role: 'leader', amount: '' });
    (team?.members || []).filter(m => m.active && (m.name || '').trim())
      .forEach(m => rows.push({ id: newId(), name: m.name.trim(), role: 'member', amount: '' }));
    if (rows.length === 0) rows.push({ id: newId(), name: '', role: '', amount: '' });
    return rows;
  };

  const toggle = () => {
    if (!enabled) {
      const init = items.length ? items : buildFromTeam();
      set({ socialSecurityEnabled: true, socialSecurityItems: init, socialSecurity: sumOf(init),
        socialSecurityPeriod: form.socialSecurityPeriod || defaultPeriod() });
    } else {
      set({ socialSecurityEnabled: false, socialSecurity: 0 });
    }
  };
  const updItem = (id, patch) => commit(items.map(m => m.id === id ? { ...m, ...patch } : m));
  const addItem = () => commit([...items, { id: newId(), name: '', role: '', amount: '' }]);
  const delItem = (id) => commit(items.filter(m => m.id !== id));
  const reload  = () => commit(buildFromTeam());

  return (
    <div className="field full">
      <button type="button" className="status-chip" onClick={toggle}
        style={enabled ? { borderColor: '#7c3aed', background: 'rgba(124,58,237,0.10)', color: '#6d28d9' } : undefined}>
        <span className="tick">{enabled ? '✓' : ''}</span> หักประกันสังคม
      </button>

      {enabled && (
        <div style={{ marginTop: 12, border: '1px solid var(--line)', borderRadius: 10, padding: 12, background: 'var(--surface-2)' }}>
          <div className="row between" style={{ marginBottom: 10, flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
            <div className="field" style={{ margin: 0, maxWidth: 200 }}>
              <label className="field-label" style={{ fontSize: 12 }}><Icon name="calendar" size={12} /> หักประกันสังคมของเดือน</label>
              <input className="input" type="month" value={form.socialSecurityPeriod || ''} onChange={(e) => set({ socialSecurityPeriod: e.target.value })} />
            </div>
            {team && <button type="button" className="btn btn-ghost btn-sm" onClick={reload} title="ดึงรายชื่อหัวหน้า+ลูกทีมที่ทำงานอยู่ มาใหม่"><Icon name="history" size={12} /> ดึงรายชื่อจากทีม</button>}
          </div>
          <div className="col gap-8">
            {items.map((m) => (
              <div key={m.id} className="row gap-8" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <input className="input" style={{ flex: '2 1 130px', minWidth: 0 }} placeholder="ชื่อ" value={m.name} onChange={(e) => updItem(m.id, { name: e.target.value })} />
                {m.role === 'leader' && <span className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}>หัวหน้า</span>}
                <div className="input-affix" style={{ flex: '1 1 110px', minWidth: 0 }}>
                  <div className="input-affix-prefix">฿</div>
                  <input className="input mono" type="number" min="0" step="any" placeholder="0.00" value={m.amount} onChange={(e) => updItem(m.id, { amount: e.target.value })} />
                </div>
                <button type="button" className="topbar-icon-btn" style={{ width: 30, height: 30 }} onClick={() => delItem(m.id)} title="ลบ"><Icon name="trash" size={13} /></button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={addItem}><Icon name="plus" size={12} /> เพิ่มคน</button>
          <div className="row between" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>รวมหักประกันสังคม</span>
            <span className="mono" style={{ fontWeight: 700, color: '#6d28d9' }}>฿ {fmt(total)}</span>
          </div>
        </div>
      )}
      <div className="field-hint" style={{ marginTop: 8 }}>หักจากช่างโดยตรง — <strong style={{ color: 'var(--ink-2)' }}>ยอดรายจ่ายที่บันทึกยังเป็นยอดเต็มก่อนหักประกันสังคม</strong> ตัวเลขนี้แค่ลดยอดโอนช่างจริง</div>
    </div>
  );
}

// รายชื่อลูกทีมในทีมช่าง — เก็บประวัติคนงาน เผื่อเข้า-ออก
function TeamMembersEditor({ members, onChange }) {
  const list = members || [];
  const add = () => onChange([...list, { id: newId(), name: '', phone: '', active: true, joinedDate: todayStr(), leftDate: '' }]);
  const upd = (id, patch) => onChange(list.map(m => m.id === id ? { ...m, ...patch } : m));
  const del = (id) => onChange(list.filter(m => m.id !== id));
  const toggleActive = (m) => upd(m.id, m.active ? { active: false, leftDate: todayStr() } : { active: true, leftDate: '' });
  const activeCount = list.filter(m => m.active).length;
  return (
    <div className="field full">
      <label className="field-label">
        <Icon name="users" size={13} /> รายชื่อลูกทีม
        <span style={{ fontWeight: 400, color: 'var(--ink-3)', fontSize: 11, marginLeft: 6 }}>
          {list.length > 0 ? `ทำงานอยู่ ${activeCount} · ทั้งหมด ${list.length} คน` : '(ไว้เก็บประวัติคนงานในทีม เผื่อมีคนเข้า-ออก)'}
        </span>
      </label>
      <div className="col gap-8">
        {list.map((m) => (
          <div key={m.id} className="row gap-8" style={{ alignItems: 'center', flexWrap: 'wrap', padding: 8, borderRadius: 8, border: '1px solid var(--line)', background: m.active ? 'var(--surface)' : 'var(--surface-2)' }}>
            <input className="input" style={{ flex: '2 1 140px', minWidth: 0 }} placeholder="ชื่อ-นามสกุล คนงาน" value={m.name} onChange={(e) => upd(m.id, { name: e.target.value })} />
            <input className="input mono" style={{ flex: '1 1 110px', minWidth: 0 }} placeholder="เบอร์ (ถ้ามี)" value={m.phone || ''} onChange={(e) => upd(m.id, { phone: e.target.value })} />
            <button type="button" className={"status-chip" + (m.active ? " on approve" : "")} onClick={() => toggleActive(m)}
              title={m.active ? 'ทำงานอยู่ — กดเพื่อทำเครื่องหมายว่าออกแล้ว' : ('ออกแล้ว' + (m.leftDate ? ' ' + fmtDate(m.leftDate) : ''))}>
              <span className="tick">{m.active ? '✓' : ''}</span> {m.active ? 'ทำงานอยู่' : 'ออกแล้ว'}
            </button>
            <button type="button" className="topbar-icon-btn" style={{ width: 30, height: 30 }} onClick={() => del(m.id)} title="ลบออกจากรายชื่อ"><Icon name="trash" size={13} /></button>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: list.length ? 8 : 4 }} onClick={add}>
        <Icon name="plus" size={13} /> เพิ่มคนงาน
      </button>
    </div>
  );
}

function AddWorkerTeamModal({ open, onClose, onAdd }) {
  const [name,      setName]      = useState('');
  const [leader,    setLeader]    = useState('');
  const [phone,     setPhone]     = useState('');
  const [size,      setSize]      = useState(1);
  const [specialty, setSpecialty] = useState('');
  const [note,      setNote]      = useState('');
  const [images,    setImages]    = useState([]);
  // ── ข้อมูลเอกสาร ──
  const [needsDoc,  setNeedsDoc]  = useState(false);
  const [fullName,  setFullName]  = useState('');
  const [idCard,    setIdCard]    = useState('');
  const [address,   setAddress]   = useState('');
  const [docImages, setDocImages] = useState([]);
  const [members,   setMembers]   = useState([]);

  useEffect(() => {
    if (open) {
      setName(''); setLeader(''); setPhone(''); setSize(1);
      setSpecialty(''); setNote(''); setImages([]);
      setNeedsDoc(false); setFullName(''); setIdCard(''); setAddress(''); setDocImages([]);
      setMembers([]);
    }
  }, [open]);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(), leader: leader.trim(), phone: phone.trim(),
      size: Number(size) || 1, specialty: specialty.trim(), note: note.trim(), images,
      needsDoc, fullName: fullName.trim(), idCard: idCard.trim(), address: address.trim(), docImages,
      members: members.filter(m => (m.name || '').trim()),
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="เพิ่มทีมช่างใหม่" width={600}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-accent" onClick={handleAdd} disabled={!name.trim()}>
          <Icon name="plus" size={14} /> เพิ่มทีม
        </button>
      </>}>
      <div className="form-grid">
        <FormSectionLabel>ข้อมูลทั่วไป</FormSectionLabel>
        <div className="field full">
          <label className="field-label">ชื่อทีม <span className="req">*</span></label>
          <input className="input" autoFocus placeholder="เช่น ทีมช่างประสิทธิ์" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">หัวหน้าทีม</label>
          <input className="input" placeholder="ชื่อ-นามสกุล (ชื่อเล่นก็ได้)" value={leader} onChange={(e) => setLeader(e.target.value)} />
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
        <div className="field full">
          <label className="field-label">หมายเหตุ</label>
          <textarea className="textarea" rows={2}
            placeholder="เช่น ราคาต่อหน่วย, เงื่อนไขการจ้าง" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="field full">
          <label className="field-label"><Icon name="image" size={13} /> รูปภาพทีมช่าง <span style={{ fontWeight:400, color:'var(--ink-3)', fontSize:11 }}>(สูงสุด 5 รูป)</span></label>
          <window.ImageUploader images={images} onChange={setImages} max={5} />
        </div>

        <TeamMembersEditor members={members} onChange={setMembers} />

        <DocFields
          needsDoc={needsDoc} setNeedsDoc={setNeedsDoc}
          fullName={fullName} setFullName={setFullName}
          idCard={idCard}     setIdCard={setIdCard}
          address={address}   setAddress={setAddress}
          docImages={docImages} setDocImages={setDocImages}
        />
      </div>
    </Modal>
  );
}
window.AddWorkerTeamModal = AddWorkerTeamModal;

// ---- Edit worker team modal ----
function EditWorkerTeamModal({ open, onClose, team, onSave }) {
  const [name,      setName]      = useState('');
  const [leader,    setLeader]    = useState('');
  const [phone,     setPhone]     = useState('');
  const [size,      setSize]      = useState(1);
  const [specialty, setSpecialty] = useState('');
  const [note,      setNote]      = useState('');
  const [images,    setImages]    = useState([]);
  // ── ข้อมูลเอกสาร ──
  const [needsDoc,  setNeedsDoc]  = useState(false);
  const [fullName,  setFullName]  = useState('');
  const [idCard,    setIdCard]    = useState('');
  const [address,   setAddress]   = useState('');
  const [docImages, setDocImages] = useState([]);
  const [members,   setMembers]   = useState([]);

  useEffect(() => {
    if (open && team) {
      setName(team.name || '');
      setLeader(team.leader || '');
      setPhone(team.phone || '');
      setSize(team.size || 1);
      setSpecialty(team.specialty || '');
      setNote(team.note || '');
      setImages(team.images || []);
      setNeedsDoc(!!team.needsDoc);
      setFullName(team.fullName || '');
      setIdCard(team.idCard || '');
      setAddress(team.address || '');
      setDocImages(team.docImages || []);
      setMembers(team.members || []);
    }
  }, [open, team]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(), leader: leader.trim(), phone: phone.trim(),
      size: Number(size) || 1, specialty: specialty.trim(), note: note.trim(), images,
      needsDoc, fullName: fullName.trim(), idCard: idCard.trim(), address: address.trim(), docImages,
      members: members.filter(m => (m.name || '').trim()),
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="แก้ไขข้อมูลทีมช่าง" width={600}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-accent" onClick={handleSave} disabled={!name.trim()}>
          <Icon name="save" size={14} /> บันทึกการแก้ไข
        </button>
      </>}>
      <div className="form-grid">
        <FormSectionLabel>ข้อมูลทั่วไป</FormSectionLabel>
        <div className="field full">
          <label className="field-label">ชื่อทีม <span className="req">*</span></label>
          <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
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
        <div className="field full">
          <label className="field-label">หมายเหตุ / รายละเอียดเพิ่มเติม</label>
          <textarea className="textarea" rows={2}
            placeholder="เช่น ราคาต่อหน่วย, เงื่อนไขการจ้าง, ข้อตกลงพิเศษ"
            value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="field full">
          <label className="field-label">
            <Icon name="image" size={13} /> รูปภาพทีมช่าง
            <span style={{ fontWeight: 400, color: 'var(--ink-3)', fontSize: 11, marginLeft: 6 }}>(สูงสุด 5 รูป)</span>
          </label>
          <window.ImageUploader images={images} onChange={setImages} max={5} />
        </div>

        <TeamMembersEditor members={members} onChange={setMembers} />

        <DocFields
          needsDoc={needsDoc} setNeedsDoc={setNeedsDoc}
          fullName={fullName} setFullName={setFullName}
          idCard={idCard}     setIdCard={setIdCard}
          address={address}   setAddress={setAddress}
          docImages={docImages} setDocImages={setDocImages}
        />
      </div>
    </Modal>
  );
}
window.EditWorkerTeamModal = EditWorkerTeamModal;

// ---- Items table for labor (reuses style but different placeholders) ----
function LaborItemsTable({ items, setItems, cats, onAddCat }) {
  const updateItem = (id, patch) => setItems(items.map((i) => i.id === id ? { ...i, ...patch } : i));
  const removeItem = (id) => setItems(items.filter((i) => i.id !== id));
  const addItem = () => setItems([...items, { id: newId(), name: '', categoryId: '', qty: 1, unit: 'ตร.ม.', price: 0 }]);
  const units = ['ตร.ม.', 'ตร.ว.', 'ม.', 'จุด', 'งวด', 'วัน', 'เหมา'];
  return (
    <div className="col gap-8" style={{ overflowX: 'auto' }}>
      <table className="items-table" style={{ tableLayout: 'fixed', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ width: '34%' }}>รายการงาน</th>
            <th style={{ width: '18%' }}>หมวดงาน</th>
            <th style={{ width: '10%' }} className="num">ปริมาณ</th>
            <th style={{ width: '11%' }}>หน่วย</th>
            <th style={{ width: '13%' }} className="num">ค่าแรง/หน่วย</th>
            <th style={{ width: '14%' }} className="num">รวม</th>
            <th style={{ width: 34 }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td data-label="รายการงาน">
                <input className="cell-input" placeholder="เช่น ก่ออิฐมวลเบา ผนังชั้น 2"
                  value={it.name} onChange={(e) => updateItem(it.id, { name: e.target.value })} />
              </td>
              <td data-label="หมวดงาน">
                <window.CategorySelect value={it.categoryId} onChange={(v) => updateItem(it.id, { categoryId: v })} cats={cats} onAdd={onAddCat} placeholder="—" />
              </td>
              <td data-label="ปริมาณ">
                <input className="cell-input num" type="number" min="0" step="any" value={it.qty}
                  onChange={(e) => updateItem(it.id, { qty: e.target.value })} />
              </td>
              <td data-label="หน่วย">
                <input className="cell-input" list="labor-units" value={it.unit} onChange={(e) => updateItem(it.id, { unit: e.target.value })} />
              </td>
              <td data-label="ค่าแรง/หน่วย">
                <input className="cell-input num" type="number" min="0" step="any" value={it.price}
                  onChange={(e) => updateItem(it.id, { price: e.target.value })} />
              </td>
              <td className="num mono" data-label="รวม" style={{ paddingRight: 10, color: 'var(--ink-2)' }}>
                {fmt(Number(it.qty || 0) * Number(it.price || 0))}
              </td>
              <td className="item-del">
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
    (r.type === 'labor' || r.type === 'lump-labor') && r.workerTeamId === teamId && r.projectId === projectId && r.id !== excludeId
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
              <span className={`badge ${r.type === 'lump-labor' ? 'green' : 'gray'}`} style={{ marginRight: 6, fontSize: 10.5 }}>
                {r.period || (r.type === 'lump-labor' ? 'เหมาจ่าย' : '—')}
              </span>
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

// ---- Retention Payout Section (ใช้ร่วมกันทั้ง LaborForm และ LumpLaborForm) ----
// toggle "จ่ายคืนเงินประกันผลงาน" ที่อยู่ข้างงวดงาน + พาเนลแสดงยอดคงค้าง + ช่องกรอกยอดจ่ายคืน
function RetentionPayoutSection({ form, set, app, initial }) {
  const on = !!form.isRetentionPayout;
  const held = React.useMemo(
    () => window.computeHeldRetention(app.records, form.workerTeamId, form.projectId, initial?.id),
    [app.records, form.workerTeamId, form.projectId, initial]
  );
  const team = (app.workerTeams || []).find(t => t.id === form.workerTeamId);
  const proj = (app.projects || []).find(p => p.id === form.projectId);
  const payoutAmount = Number(form.items?.[0]?.price || 0);

  const toggle = (next) => {
    if (next) {
      // เข้าโหมดจ่ายคืน — เติมรายการเดียวเป็นยอดคงค้าง, ปิดการหัก/ภาษี
      set({
        isRetentionPayout: true,
        period: 'คืนเงินประกันผลงาน',
        advanceDeduction: 0,
        retentionDeduction: 0,
        whtEnabled: false,
        vatMode: 'exclusive',
        vatRate: 0,
        docs: [],
        items: [{ id: window.newId(), name: 'จ่ายคืนเงินประกันผลงาน', categoryId: '', qty: 1, unit: 'รายการ', price: held > 0 ? held : 0 }],
      });
    } else {
      set({ isRetentionPayout: false });
    }
  };

  const setAmount = (v) => {
    const it = form.items?.[0] || { id: window.newId(), name: 'จ่ายคืนเงินประกันผลงาน', categoryId: '', qty: 1, unit: 'รายการ' };
    set({ items: [{ ...it, name: it.name || 'จ่ายคืนเงินประกันผลงาน', qty: 1, price: v }] });
  };

  return (
    <div className="field full">
      <button type="button"
        onClick={() => toggle(!on)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
          padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
          border: `1.5px solid ${on ? 'var(--info)' : 'var(--line)'}`,
          background: on ? 'rgba(37,99,235,0.06)' : 'var(--surface, #fff)',
        }}>
        <span style={{
          width: 18, height: 18, borderRadius: 5, flexShrink: 0,
          border: `2px solid ${on ? 'var(--info)' : '#cbd5e1'}`,
          background: on ? 'var(--info)' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 12, fontWeight: 700,
        }}>{on ? '✓' : ''}</span>
        <span>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: on ? 'var(--info)' : 'var(--ink-1)' }}>
            จ่ายคืนเงินประกันผลงาน
          </span>
          <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 1 }}>
            ติ๊กเมื่อบิลนี้เป็นการ "คืนเงินประกัน" ที่เคยหักไว้ (ไม่ใช่ค่าแรงงวดใหม่)
          </span>
        </span>
      </button>

      {on && (
        <div style={{ marginTop: 10, padding: 14, borderRadius: 10, background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.2)' }}>
          {(!form.workerTeamId || !form.projectId) ? (
            <div style={{ fontSize: 12.5, color: 'var(--warn)' }}>
              โปรดเลือกโครงการและทีมช่างก่อน เพื่อแสดงยอดเงินประกันคงค้าง
            </div>
          ) : (
            <>
              <div className="row between" style={{ alignItems: 'baseline' }}>
                <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
                  เงินประกันคงค้างของ <strong>{team?.name || 'ทีมนี้'}</strong> · {proj?.name || 'โครงการนี้'}
                </span>
                <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--info)' }}>฿{fmt(held)}</span>
              </div>
              <div className="field" style={{ marginTop: 12 }}>
                <label className="field-label">ยอดที่จ่ายคืนงวดนี้</label>
                <div className="input-affix">
                  <div className="input-affix-prefix">฿</div>
                  <input className="input mono" type="number" min="0" step="any"
                    value={payoutAmount || ''} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                </div>
                {held > 0 && (
                  <button type="button" className="badge" style={{ cursor: 'pointer', padding: '4px 10px', marginTop: 8 }}
                    onClick={() => setAmount(held)}>
                    ใช้ยอดคงค้างทั้งหมด ฿{fmt(held)}
                  </button>
                )}
                {payoutAmount > held && (
                  <div className="field-hint" style={{ color: 'var(--warn)' }}>
                    ⚠ ยอดจ่ายคืนมากกว่ายอดคงค้าง (฿{fmt(held)})
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.5 }}>
                เมื่อบันทึกและ <strong>อนุมัติ</strong> แล้ว ระบบจะหักยอดนี้ออกจากเงินประกันคงค้างโดยอัตโนมัติ และนับเป็นรายจ่ายในแดชบอร์ด
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
window.RetentionPayoutSection = RetentionPayoutSection;

// ---- The Labor Form ----
window.LaborForm = function LaborForm({ initial, onSubmit, onCancel }) {
  const app = window.useApp();

  const blank = () => ({
    type: 'labor',
    isRetentionPayout: false,
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
    socialSecurity: 0,
    socialSecurityEnabled: false,
    socialSecurityItems: [],
    socialSecurityPeriod: '',
    docs: [],
    note: '',
    workNote: '',
    images: [],
    workLogs: [],
    docInfo: { name: '', taxId: '', address: '' },
  });

  const [form, setForm] = useState(() => {
    if (!initial) return blank();
    const docInfo = { name:'', taxId:'', address:'', ...(initial.docInfo||{}) };
    // fallback: ดึงจาก team ถ้า docInfo ว่าง (เช่น record เก่าที่ยังไม่มีข้อมูล)
    if (!docInfo.name && !docInfo.taxId && !docInfo.address && initial.workerTeamId) {
      const t = (app.workerTeams || []).find(x => x.id === initial.workerTeamId);
      if (t?.needsDoc && (t.fullName || t.idCard || t.address)) {
        docInfo.name    = t.fullName || '';
        docInfo.taxId   = t.idCard   || '';
        docInfo.address = t.address  || '';
      }
    }
    return { ...initial, workLogs: initial.workLogs || [], docInfo };
  });
  const [catModalOpen,  setCatModalOpen]  = useState(false);
  const [projModalOpen, setProjModalOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);

  const totals = useMemo(() => computeTotals(form), [form]);
  const selectedTeam = app.workerTeams.find(t => t.id === form.workerTeamId);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggleDoc = (id) => set({ docs: form.docs.includes(id) ? form.docs.filter(d => d !== id) : [...form.docs, id] });

  // Update vendor + auto-fill docInfo จาก team ที่มีข้อมูลเอกสาร
  const setTeam = (teamId) => {
    const t = app.workerTeams.find(x => x.id === teamId);
    const patch = { workerTeamId: teamId, vendor: t ? t.name : form.vendor };
    if (t?.needsDoc && (t.fullName || t.idCard || t.address)) {
      patch.docInfo = {
        name:    t.fullName || form.docInfo?.name    || '',
        taxId:   t.idCard   || form.docInfo?.taxId   || '',
        address: t.address  || form.docInfo?.address || '',
      };
    }
    set(patch);
  };

  const handleSubmit = () => {
    if (!form.projectId)   return app.pushToast('โปรดเลือกโครงการก่อนบันทึก', 'error');
    if (!form.workerTeamId) return app.pushToast('โปรดเลือกทีมช่างก่อนบันทึก', 'error');
    if (form.isRetentionPayout) {
      if (!(Number(form.items?.[0]?.price) > 0)) return app.pushToast('โปรดระบุยอดเงินประกันที่จ่ายคืน', 'error');
    } else
    if (!form.items.some(it => it.name.trim() && Number(it.qty) > 0)) return app.pushToast('โปรดเพิ่มรายการงานอย่างน้อย 1 รายการ', 'error');
    if (form.docs.length > 0) {
      const di = form.docInfo || {};
      if (!di.name?.trim())    return app.pushToast('โปรดระบุชื่อ-นามสกุล สำหรับออกเอกสาร', 'error');
      if (!di.taxId?.trim())   return app.pushToast('โปรดระบุเลขบัตรประชาชน/เลขผู้เสียภาษี', 'error');
      if (!di.address?.trim()) return app.pushToast('โปรดระบุที่อยู่ สำหรับออกเอกสาร', 'error');
    }
    onSubmit(form);
  };

  const isEditing = !!initial;

  // สลับ type labor ↔ lump-labor (admin เท่านั้น)
  const switchType = () => {
    const toType  = form.type === 'labor' ? 'lump-labor' : 'labor';
    const fromPfx = form.type === 'labor' ? 'LB-' : 'LS-';
    const toPfx   = toType   === 'labor' ? 'LB-' : 'LS-';
    const newDocNo = form.docNo.startsWith(fromPfx)
      ? toPfx + form.docNo.slice(fromPfx.length)
      : form.docNo;
    set({ type: toType, docNo: newDocNo });
  };

  const isLump = form.type === 'lump-labor';

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 className="page-title" style={{ margin: 0 }}>
              {isEditing
                ? (isLump ? 'แก้ไขรายการเหมาจ่าย' : 'แก้ไขบันทึกค่าแรง')
                : 'บันทึกรายจ่ายค่าแรง'}
            </h1>
            {/* badge ประเภทปัจจุบัน */}
            <span style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: isLump ? 'rgba(99,102,241,0.12)' : 'oklch(0.93 0.06 290)',
              color: isLump ? '#6366f1' : 'oklch(0.45 0.14 290)',
              border: `1px solid ${isLump ? 'rgba(99,102,241,0.3)' : 'oklch(0.84 0.08 290)'}`,
            }}>
              {isLump ? 'เหมาจ่าย' : 'ค่าแรงรายวัน'}
            </span>
          </div>
          <div className="page-sub">กรอกรายการงาน หักเงินที่เกี่ยวข้อง พร้อมแนบรูปและบันทึกรายละเอียดงาน</div>
        </div>
        <div className="row gap-8">
          {/* ปุ่มสลับประเภท — admin + editing เท่านั้น */}
          {isEditing && app.isAdmin && (
            <button className="btn btn-ghost" onClick={switchType}
              title={isLump ? 'เปลี่ยนเป็นค่าแรงรายวัน' : 'เปลี่ยนเป็นค่าแรงเหมาจ่าย'}
              style={{ color: isLump ? '#6366f1' : 'oklch(0.45 0.14 290)' }}>
              ⇄ {isLump ? 'สลับเป็นค่าแรง' : 'สลับเป็นเหมาจ่าย'}
            </button>
          )}
          <button className="btn btn-ghost" onClick={onCancel}><Icon name="x" size={14} /> ยกเลิก</button>
          <button className="btn btn-accent" onClick={handleSubmit}>
            <Icon name="save" size={14} /> {isEditing ? 'บันทึกการแก้ไข' : 'บันทึกรายการ'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 18, alignItems: 'start' }} className="form-layout">
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
                  <input className="input" list="period-list" placeholder="เช่น งวดที่ 1, งวดสุดท้าย" value={form.period} onChange={(e) => set({ period: e.target.value })} disabled={form.isRetentionPayout} />
                  <datalist id="period-list">
                    {['งวดที่ 1', 'งวดที่ 2', 'งวดที่ 3', 'งวดที่ 4', 'งวดที่ 5', 'งวดสุดท้าย', 'งวดเดียว'].map(v => <option key={v} value={v} />)}
                  </datalist>
                </div>
                <RetentionPayoutSection form={form} set={set} app={app} initial={initial} />
              </div>
            </div>
          </div>

          {/* Team history panel — only shows when both team + project chosen */}
          {form.workerTeamId && form.projectId && (
            <TeamHistoryPanel teamId={form.workerTeamId} projectId={form.projectId} excludeId={initial?.id} compact />
          )}

          {/* Card 2: items — ซ่อนในโหมดจ่ายคืนเงินประกัน (กรอกยอดในพาเนลด้านบนแทน) */}
          {!form.isRetentionPayout && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">รายการงาน</div>
                <div className="card-sub">งานที่ทำในงวดนี้ พร้อมปริมาณและค่าแรง</div>
              </div>
              <span className="badge gray mono">{form.items.length} รายการ</span>
            </div>
            <div className="card-body col gap-16">
              <LaborItemsTable items={form.items} setItems={(items) => set({ items })} cats={app.laborCats} onAddCat={() => setCatModalOpen(true)} />
              <div className="field">
                <label className="field-label">หมายเหตุ / คำอธิบายรายการงาน</label>
                <textarea className="textarea" placeholder="อธิบายรายละเอียดของรายการงาน เช่น เหตุผลการปรับราคา ขอบเขตงาน หรือเงื่อนไขพิเศษ"
                  value={form.workNote || ''} onChange={(e) => set({ workNote: e.target.value })} />
                <div className="field-hint">ใช้บันทึกคำอธิบายเพิ่มเติมของรายการงาน (คนละส่วนกับหมายเหตุรูปภาพด้านล่าง) — ช่วยให้ตอนกลับมาแก้ไขเข้าใจรายละเอียดง่ายขึ้น</div>
              </div>
            </div>
          </div>
          )}

          {/* Card 3: deductions — ซ่อนในโหมดจ่ายคืนเงินประกัน */}
          {!form.isRetentionPayout && (
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
                <SocialSecuritySection form={form} set={set} team={selectedTeam} />
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
          )}

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
                {/* ── ข้อมูลสำหรับออกเอกสาร ── */}
                {form.docs.length > 0 && (
                  <window.DocInfoSection
                    docInfo={form.docInfo}
                    onChange={v => set({ docInfo: v })}
                    autoFilled={!!(form.workerTeamId && app.workerTeams.find(t => t.id === form.workerTeamId)?.needsDoc)}
                  />
                )}
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

        {/* Summary bar — เต็มความกว้าง ด้านล่าง (เหมือนฟอร์มวัสดุ) */}
        <div className="card form-summary-bottom">
          <div className="card-body form-summary-bar">
            <div className="summary-chips">
              <span className="badge amber dot">{form.period || 'งวดเดียว'}</span>
              <div className="summary-chip">
                <span className="chip-label">ค่าแรงรวม</span>
                <span className="chip-value">{fmt(totals.subTotal)}</span>
              </div>
              {Number(form.vatRate) > 0 && (
                <div className="summary-chip">
                  <span className="chip-label">Vat {form.vatRate}%</span>
                  <span className="chip-value">{fmt(totals.vat)}</span>
                </div>
              )}
              {form.whtEnabled && (
                <div className="summary-chip">
                  <span className="chip-label">หัก ณ ที่จ่าย {form.whtRate}%</span>
                  <span className="chip-value" style={{ color: 'var(--danger)' }}>− {fmt(totals.wht)}</span>
                </div>
              )}
              {Number(form.advanceDeduction) > 0 && (
                <div className="summary-chip">
                  <span className="chip-label">หักเบิกล่วงหน้า</span>
                  <span className="chip-value" style={{ color: 'var(--warn)' }}>− {fmt(totals.advance)}</span>
                </div>
              )}
              {Number(form.retentionDeduction) > 0 && (
                <div className="summary-chip">
                  <span className="chip-label">หักเงินประกัน</span>
                  <span className="chip-value" style={{ color: 'var(--info)' }}>− {fmt(totals.retention)}</span>
                </div>
              )}
              <div className="summary-chip total">
                <span className="chip-label">ยอดจ่ายสุทธิ (บันทึกรายจ่าย)</span>
                <span className="chip-value">{fmt(totals.total)} <span className="chip-unit">บาท</span></span>
              </div>
              {Number(form.socialSecurity) > 0 && (
                <>
                  <div className="summary-chip">
                    <span className="chip-label">หักประกันสังคม</span>
                    <span className="chip-value" style={{ color: '#7c3aed' }}>− {fmt(totals.socialSecurity)}</span>
                  </div>
                  <div className="summary-chip">
                    <span className="chip-label">โอนช่างจริง</span>
                    <span className="chip-value" style={{ color: 'var(--accent-strong)' }}>{fmt(totals.netPay)} <span className="chip-unit">บาท</span></span>
                  </div>
                </>
              )}
            </div>
            <div className="row gap-8 summary-bar-actions">
              <button className="btn btn-accent" onClick={handleSubmit}><Icon name="save" size={14} /> {isEditing ? 'บันทึกการแก้ไข' : 'บันทึก'}</button>
              <button className="btn btn-ghost" onClick={onCancel}>ยกเลิก</button>
            </div>
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

// ============================================================
// LumpLaborForm — ค่าแรงเหมาจ่าย (ตกลงราคาเป็นยอดรวม)
// ============================================================

// ---- Items table for lump-labor (with qty/unit like labor) ----
function LumpLaborItemsTable({ items, setItems, cats, onAddCat }) {
  const updateItem = (id, patch) => setItems(items.map((i) => i.id === id ? { ...i, ...patch } : i));
  const removeItem = (id) => setItems(items.filter((i) => i.id !== id));
  const addItem = () => setItems([...items, { id: newId(), name: '', categoryId: '', qty: 1, unit: 'เหมา', price: 0 }]);
  const units = ['เหมา', 'ตร.ม.', 'ตร.ว.', 'ม.', 'จุด', 'งวด', 'วัน', 'ชุด'];
  return (
    <div className="col gap-8" style={{ overflowX: 'auto' }}>
      <table className="items-table" style={{ tableLayout: 'fixed', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ width: '34%' }}>รายการงานเหมา</th>
            <th style={{ width: '18%' }}>หมวดงาน</th>
            <th style={{ width: '10%' }} className="num">ปริมาณ</th>
            <th style={{ width: '11%' }}>หน่วย</th>
            <th style={{ width: '13%' }} className="num">ราคา/หน่วย (฿)</th>
            <th style={{ width: '14%' }} className="num">รวม</th>
            <th style={{ width: 34 }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td data-label="รายการงานเหมา">
                <input className="cell-input" placeholder="เช่น งานก่อ-ฉาบทั้งชั้น, งานปูกระเบื้องห้องน้ำ"
                  value={it.name} onChange={(e) => updateItem(it.id, { name: e.target.value })} />
              </td>
              <td data-label="หมวดงาน">
                <window.CategorySelect value={it.categoryId} onChange={(v) => updateItem(it.id, { categoryId: v })} cats={cats} onAdd={onAddCat} placeholder="—" />
              </td>
              <td data-label="ปริมาณ">
                <input className="cell-input num" type="number" min="0" step="any" value={it.qty}
                  onChange={(e) => updateItem(it.id, { qty: e.target.value })} />
              </td>
              <td data-label="หน่วย">
                <input className="cell-input" list="lump-labor-units" value={it.unit}
                  onChange={(e) => updateItem(it.id, { unit: e.target.value })} />
              </td>
              <td data-label="ราคา/หน่วย">
                <input className="cell-input num" type="number" min="0" step="any" value={it.price}
                  onChange={(e) => updateItem(it.id, { price: e.target.value })} />
              </td>
              <td className="num mono" data-label="รวม" style={{ paddingRight: 10, color: 'var(--ink-2)' }}>
                {fmt(Number(it.qty || 0) * Number(it.price || 0))}
              </td>
              <td className="item-del">
                <button type="button" className="topbar-icon-btn" style={{ width: 28, height: 28 }} onClick={() => removeItem(it.id)} title="ลบ">
                  <Icon name="trash" size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <datalist id="lump-labor-units">{units.map(u => <option key={u} value={u} />)}</datalist>
      <button type="button" className="btn btn-ghost btn-sm" onClick={addItem} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
        <Icon name="plus" size={13} /> เพิ่มรายการเหมา
      </button>
    </div>
  );
}

// ---- LumpLaborForm ----
window.LumpLaborForm = function LumpLaborForm({ initial, onSubmit, onCancel }) {
  const app = window.useApp();

  const blank = () => ({
    type: 'lump-labor',
    isRetentionPayout: false,
    docNo: 'LS-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000 + 1000)),
    date: todayStr(),
    projectId: '',
    workerTeamId: '',
    vendor: '',
    period: '',
    items: [{ id: newId(), name: '', categoryId: '', qty: 1, unit: 'เหมา', price: 0 }],
    vatMode: 'exclusive',
    vatRate: 0,
    whtEnabled: false,
    whtRate: 3,
    advanceDeduction: 0,
    retentionDeduction: 0,
    socialSecurity: 0,
    socialSecurityEnabled: false,
    socialSecurityItems: [],
    socialSecurityPeriod: '',
    docs: [],
    note: '',
    workNote: '',
    images: [],
    workLogs: [],
    docInfo: { name: '', taxId: '', address: '' },
  });

  const [form, setForm] = useState(() => {
    if (!initial) return blank();
    const docInfo = { name:'', taxId:'', address:'', ...(initial.docInfo||{}) };
    if (!docInfo.name && !docInfo.taxId && !docInfo.address && initial.workerTeamId) {
      const t = (app.workerTeams || []).find(x => x.id === initial.workerTeamId);
      if (t?.needsDoc && (t.fullName || t.idCard || t.address)) {
        docInfo.name    = t.fullName || '';
        docInfo.taxId   = t.idCard   || '';
        docInfo.address = t.address  || '';
      }
    }
    return { ...initial, workLogs: initial.workLogs || [], docInfo };
  });
  const [catModalOpen,  setCatModalOpen]  = useState(false);
  const [projModalOpen, setProjModalOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);

  const totals = useMemo(() => computeTotals(form), [form]);
  const selectedTeam = app.workerTeams.find(t => t.id === form.workerTeamId);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggleDoc = (id) => set({ docs: form.docs.includes(id) ? form.docs.filter(d => d !== id) : [...form.docs, id] });

  const setTeam = (teamId) => {
    const t = app.workerTeams.find(x => x.id === teamId);
    const patch = { workerTeamId: teamId, vendor: t ? t.name : form.vendor };
    if (t?.needsDoc && (t.fullName || t.idCard || t.address)) {
      patch.docInfo = {
        name:    t.fullName || form.docInfo?.name    || '',
        taxId:   t.idCard   || form.docInfo?.taxId   || '',
        address: t.address  || form.docInfo?.address || '',
      };
    }
    set(patch);
  };

  const handleSubmit = () => {
    if (!form.projectId)    return app.pushToast('โปรดเลือกโครงการก่อนบันทึก', 'error');
    if (!form.workerTeamId) return app.pushToast('โปรดเลือกทีมช่างก่อนบันทึก', 'error');
    if (form.isRetentionPayout) {
      if (!(Number(form.items?.[0]?.price) > 0)) return app.pushToast('โปรดระบุยอดเงินประกันที่จ่ายคืน', 'error');
    } else
    if (!form.items.some(it => it.name.trim() && Number(it.price) > 0)) return app.pushToast('โปรดเพิ่มรายการงานพร้อมราคาเหมาอย่างน้อย 1 รายการ', 'error');
    if (form.docs.length > 0) {
      const di = form.docInfo || {};
      if (!di.name?.trim())    return app.pushToast('โปรดระบุชื่อ-นามสกุล สำหรับออกเอกสาร', 'error');
      if (!di.taxId?.trim())   return app.pushToast('โปรดระบุเลขบัตรประชาชน/เลขผู้เสียภาษี', 'error');
      if (!di.address?.trim()) return app.pushToast('โปรดระบุที่อยู่ สำหรับออกเอกสาร', 'error');
    }
    onSubmit(form);
  };

  const isEditing = !!initial;

  // สลับ type lump-labor ↔ labor (admin เท่านั้น)
  const switchType = () => {
    const toType  = form.type === 'lump-labor' ? 'labor' : 'lump-labor';
    const fromPfx = form.type === 'lump-labor' ? 'LS-' : 'LB-';
    const toPfx   = toType   === 'lump-labor' ? 'LS-' : 'LB-';
    const newDocNo = form.docNo.startsWith(fromPfx)
      ? toPfx + form.docNo.slice(fromPfx.length)
      : form.docNo;
    set({ type: toType, docNo: newDocNo });
  };

  const isLump = form.type === 'lump-labor';

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 className="page-title" style={{ margin: 0 }}>
              {isEditing
                ? (isLump ? 'แก้ไขรายการเหมาจ่าย' : 'แก้ไขบันทึกค่าแรง')
                : 'บันทึกค่าแรงเหมาจ่าย'}
            </h1>
            <span style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: isLump ? 'rgba(99,102,241,0.12)' : 'oklch(0.93 0.06 290)',
              color: isLump ? '#6366f1' : 'oklch(0.45 0.14 290)',
              border: `1px solid ${isLump ? 'rgba(99,102,241,0.3)' : 'oklch(0.84 0.08 290)'}`,
            }}>
              {isLump ? 'เหมาจ่าย' : 'ค่าแรงรายวัน'}
            </span>
          </div>
          <div className="page-sub">ตกลงราคาเป็นยอดรวมต่องาน — ระบุปริมาณ หน่วย และราคาต่อหน่วยได้</div>
        </div>
        <div className="row gap-8">
          {isEditing && app.isAdmin && (
            <button className="btn btn-ghost" onClick={switchType}
              title={isLump ? 'เปลี่ยนเป็นค่าแรงรายวัน' : 'เปลี่ยนเป็นค่าแรงเหมาจ่าย'}
              style={{ color: isLump ? '#6366f1' : 'oklch(0.45 0.14 290)' }}>
              ⇄ {isLump ? 'สลับเป็นค่าแรง' : 'สลับเป็นเหมาจ่าย'}
            </button>
          )}
          <button className="btn btn-ghost" onClick={onCancel}><Icon name="x" size={14} /> ยกเลิก</button>
          <button className="btn btn-accent" onClick={handleSubmit}>
            <Icon name="save" size={14} /> {isEditing ? 'บันทึกการแก้ไข' : 'บันทึกรายการ'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 18, alignItems: 'start' }} className="form-layout">
        <div className="col gap-16">

          {/* Card 1: header */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">ข้อมูลการเบิก</div>
                <div className="card-sub">เลขที่เอกสาร โครงการ และทีมช่าง</div>
              </div>
              <span className="badge green dot">เหมาจ่าย</span>
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
                  <window.ProjectPicker value={form.projectId} onChange={(v) => set({ projectId: v })} projects={app.projects} onAdd={() => setProjModalOpen(true)} />
                </div>
                <div className="field full">
                  <label className="field-label">ทีมช่าง <span className="req">*</span></label>
                  <WorkerTeamPicker value={form.workerTeamId} onChange={setTeam} teams={app.workerTeams} onAdd={() => setTeamModalOpen(true)} />
                </div>
                <div className="field full">
                  <label className="field-label">หมายเหตุ / รายละเอียดงาน</label>
                  <input className="input" placeholder="เช่น งานก่อ-ฉาบชั้น 2 ทั้งหมด, งานปูกระเบื้องห้องน้ำทุกห้อง"
                    value={form.note} onChange={(e) => set({ note: e.target.value })} />
                </div>
                <RetentionPayoutSection form={form} set={set} app={app} initial={initial} />
              </div>
            </div>
          </div>

          {/* Team history panel */}
          {form.workerTeamId && form.projectId && (
            <TeamHistoryPanel teamId={form.workerTeamId} projectId={form.projectId} excludeId={initial?.id} compact />
          )}

          {/* Card 2: items — ซ่อนในโหมดจ่ายคืนเงินประกัน */}
          {!form.isRetentionPayout && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">รายการงานเหมา</div>
                <div className="card-sub">ระบุชื่องานและยอดตกลงรวมในแต่ละรายการ</div>
              </div>
              <span className="badge gray mono">{form.items.length} รายการ</span>
            </div>
            <div className="card-body col gap-16">
              <LumpLaborItemsTable items={form.items} setItems={(items) => set({ items })} cats={app.lumpLaborCats} onAddCat={() => setCatModalOpen(true)} />
              <div className="field">
                <label className="field-label">หมายเหตุ / คำอธิบายรายการงาน</label>
                <textarea className="textarea" placeholder="อธิบายรายละเอียดของงานเหมา เช่น ขอบเขตงาน เงื่อนไขการจ่าย หรือหมายเหตุพิเศษ"
                  value={form.workNote || ''} onChange={(e) => set({ workNote: e.target.value })} />
                <div className="field-hint">ใช้บันทึกคำอธิบายเพิ่มเติมของรายการงานเหมา (คนละส่วนกับหมายเหตุรูปภาพด้านล่าง) — ช่วยให้ตอนกลับมาแก้ไขเข้าใจรายละเอียดง่ายขึ้น</div>
              </div>
            </div>
          </div>
          )}

          {/* Card 3: deductions — ซ่อนในโหมดจ่ายคืนเงินประกัน */}
          {!form.isRetentionPayout && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">การหักเงิน</div>
                <div className="card-sub">หักเบิกล่วงหน้า และหักเงินประกันผลงาน (ถ้ามี)</div>
              </div>
            </div>
            <div className="card-body">
              <div className="form-grid">
                <div className="field">
                  <label className="field-label" style={{ color: 'var(--warn)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--warn)', display: 'inline-block', marginRight: 6 }}></span>
                    หักเบิกล่วงหน้า
                  </label>
                  <div className="input-affix">
                    <div className="input-affix-prefix">฿</div>
                    <input className="input mono" type="number" min="0" step="any" value={form.advanceDeduction}
                      onChange={(e) => set({ advanceDeduction: e.target.value })} placeholder="0.00" />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label" style={{ color: 'var(--info)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--info)', display: 'inline-block', marginRight: 6 }}></span>
                    หักเงินประกันผลงาน
                  </label>
                  <div className="input-affix">
                    <div className="input-affix-prefix">฿</div>
                    <input className="input mono" type="number" min="0" step="any" value={form.retentionDeduction}
                      onChange={(e) => set({ retentionDeduction: e.target.value })} placeholder="0.00" />
                  </div>
                </div>
                <SocialSecuritySection form={form} set={set} team={selectedTeam} />
                <div className="field full">
                  <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>คำนวณเงินประกันเร็ว:</span>
                    {[3, 5, 10].map((pct) => (
                      <button key={pct} type="button" className="badge"
                        style={{ cursor: 'pointer', padding: '4px 10px' }}
                        onClick={() => {
                          const sub = form.items.reduce((s, i) => s + Number(i.price || 0), 0);
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
          )}

          {/* Card 4: docs + tax */}
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
                {/* ── ข้อมูลสำหรับออกเอกสาร ── */}
                {form.docs.length > 0 && (
                  <window.DocInfoSection
                    docInfo={form.docInfo}
                    onChange={v => set({ docInfo: v })}
                    autoFilled={!!(form.workerTeamId && app.workerTeams.find(t => t.id === form.workerTeamId)?.needsDoc)}
                  />
                )}
              </div>
              <div className="form-grid">
                <div className="field">
                  <label className="field-label"><Icon name="money" size={14} /> เงื่อนไข Vat</label>
                  <div className="option-row">
                    <button type="button" className={"option-pill" + (form.vatMode === 'exclusive' ? ' selected' : '')} onClick={() => set({ vatMode: 'exclusive' })}>
                      <span className="pill-radio"></span><span>ไม่รวม Vat</span>
                    </button>
                    <button type="button" className={"option-pill" + (form.vatMode === 'inclusive' ? ' selected' : '')} onClick={() => set({ vatMode: 'inclusive' })}>
                      <span className="pill-radio"></span><span>รวม Vat แล้ว</span>
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

          {/* Card 5: work logs */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">รายละเอียดงาน <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 400, marginLeft: 6 }}>(เพิ่ม-แก้ไขได้ตลอด)</span></div>
                <div className="card-sub">บันทึกความคืบหน้าและรูปหน้างาน</div>
              </div>
              <span className="badge gray mono">{form.workLogs.length} บันทึก</span>
            </div>
            <div className="card-body">
              <WorkLogsEditor logs={form.workLogs} onChange={(logs) => set({ workLogs: logs })} />
            </div>
          </div>

          {/* Card 6: images */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">รูปภาพและสลิปโอน</div>
                <div className="card-sub">แนบสลิปโอน รูปงาน หรือรูปสัญญา (สูงสุด 10 รูป)</div>
              </div>
            </div>
            <div className="card-body">
              <window.ImageUploader images={form.images} onChange={(imgs) => set({ images: imgs })} max={10} />
            </div>
          </div>
        </div>

        {/* Summary bar — เต็มความกว้าง ด้านล่าง (เหมือนฟอร์มวัสดุ) */}
        <div className="card form-summary-bottom">
          <div className="card-body form-summary-bar">
            <div className="summary-chips">
              <span className="badge green dot">เหมาจ่าย</span>
              <div className="summary-chip">
                <span className="chip-label">ยอดเหมารวม</span>
                <span className="chip-value">{fmt(totals.subTotal)}</span>
              </div>
              {Number(form.vatRate) > 0 && (
                <div className="summary-chip">
                  <span className="chip-label">Vat {form.vatRate}%</span>
                  <span className="chip-value">{fmt(totals.vat)}</span>
                </div>
              )}
              {form.whtEnabled && (
                <div className="summary-chip">
                  <span className="chip-label">หัก ณ ที่จ่าย {form.whtRate}%</span>
                  <span className="chip-value" style={{ color: 'var(--danger)' }}>− {fmt(totals.wht)}</span>
                </div>
              )}
              {Number(form.advanceDeduction) > 0 && (
                <div className="summary-chip">
                  <span className="chip-label">หักเบิกล่วงหน้า</span>
                  <span className="chip-value" style={{ color: 'var(--warn)' }}>− {fmt(totals.advance)}</span>
                </div>
              )}
              {Number(form.retentionDeduction) > 0 && (
                <div className="summary-chip">
                  <span className="chip-label">หักเงินประกัน</span>
                  <span className="chip-value" style={{ color: 'var(--info)' }}>− {fmt(totals.retention)}</span>
                </div>
              )}
              <div className="summary-chip total">
                <span className="chip-label">ยอดจ่ายสุทธิ (บันทึกรายจ่าย)</span>
                <span className="chip-value">{fmt(totals.total)} <span className="chip-unit">บาท</span></span>
              </div>
              {Number(form.socialSecurity) > 0 && (
                <>
                  <div className="summary-chip">
                    <span className="chip-label">หักประกันสังคม</span>
                    <span className="chip-value" style={{ color: '#7c3aed' }}>− {fmt(totals.socialSecurity)}</span>
                  </div>
                  <div className="summary-chip">
                    <span className="chip-label">โอนช่างจริง</span>
                    <span className="chip-value" style={{ color: 'var(--accent-strong)' }}>{fmt(totals.netPay)} <span className="chip-unit">บาท</span></span>
                  </div>
                </>
              )}
            </div>
            <div className="row gap-8 summary-bar-actions">
              <button className="btn btn-accent" onClick={handleSubmit}><Icon name="save" size={14} /> {isEditing ? 'บันทึกการแก้ไข' : 'บันทึก'}</button>
              <button className="btn btn-ghost" onClick={onCancel}>ยกเลิก</button>
            </div>
          </div>
        </div>
      </div>

      <window.AddCategoryModal open={catModalOpen} onClose={() => setCatModalOpen(false)} onAdd={(c) => { app.addLumpLaborCat(c); app.pushToast('เพิ่มหมวดเหมาจ่ายแล้ว'); setCatModalOpen(false); }} title="เพิ่มหมวดเหมาจ่าย" />
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
