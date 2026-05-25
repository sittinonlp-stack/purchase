/* global React */
// ============================
// UI primitives: icons, buttons, switches, modal, toast, etc.
// ============================



// ---- Icon set (inline SVG) ----
const Icon = ({ name, size = 16, stroke = 1.75 }) => {
  const paths = {
    home: <><path d="M3 11.5L12 4l9 7.5"/><path d="M5 10v10h14V10"/></>,
    cart: <><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M3 3h2l2.4 11.6a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 7H6"/></>,
    truck: <><rect x="2" y="7" width="11" height="10" rx="1"/><path d="M13 10h4l4 4v3h-8"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/></>,
    folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>,
    tag: <><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z"/><circle cx="8" cy="8" r="1.5"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    minus: <path d="M5 12h14"/>,
    x: <><path d="M6 6l12 12M18 6 6 18"/></>,
    check: <path d="M5 12.5 10 17 19 7.5"/>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
    bell: <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 19a2 2 0 0 0 4 0"/></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 6"/></>,
    upload: <><path d="M12 4v11"/><path d="m7 9 5-5 5 5"/><path d="M4 17v3h16v-3"/></>,
    trash: <><path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7"/></>,
    edit: <><path d="M14 4l6 6L10 20l-7 1 1-7Z"/></>,
    save: <><path d="M5 4h11l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M8 4v6h8V4"/><path d="M8 14h8v7H8z"/></>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></>,
    receipt: <><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3Z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    money: <><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v4M18 10v4"/></>,
    percent: <><path d="M5 19 19 5"/><circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/></>,
    chevron: <path d="m9 6 6 6-6 6"/>,
    arrowDown: <><path d="M12 5v14"/><path d="m6 13 6 6 6-6"/></>,
    arrowUp: <><path d="M12 19V5"/><path d="m6 11 6-6 6 6"/></>,
    filter: <path d="M3 5h18l-7 9v6l-4-2v-4L3 5Z"/>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></>,
    download: <><path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M4 18v2h16v-2"/></>,
    copy: <><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></>,
    dots: <><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></>,
    sparkle: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></>,
    hammer: <><path d="M14 4l6 6-2 2-3-3-7 7 3 3-2 2-6-6 2-2 3 3 7-7-3-3z"/></>,
    users: <><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="17" cy="6" r="2.5"/><path d="M16 13c3 0 6 2 6 5"/></>,
    shield: <><path d="M12 3l8 4v5c0 5-8 9-8 9S4 17 4 12V7z"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    safe: <><rect x="3" y="2" width="15" height="19" rx="2"/><circle cx="10.5" cy="12" r="3.5"/><path d="M10.5 8.5V10M10.5 14v1.5M7 12h1.5M12.5 12H14"/><rect x="18" y="9" width="2.5" height="6" rx="1.2"/></>,
    clipboard: <><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 10h6M9 14h6M9 18h4"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" className="icon">
      {paths[name] || null}
    </svg>
  );
};
window.Icon = Icon;

// ---- Switch ----
function Switch({ on, onChange, label, sub }) {
  return (
    <div className={"switch-row" + (on ? " active" : "")} onClick={() => onChange(!on)} role="switch" aria-checked={on}>
      <div>
        <div className="switch-row-label">{label}</div>
        {sub && <div className="switch-row-sub">{sub}</div>}
      </div>
      <div className="spacer"></div>
      <div className={"switch" + (on ? " on" : "")}></div>
    </div>
  );
}
window.Switch = Switch;

// ---- OptionPill (multi or single) ----
function OptionPill({ selected, onClick, children, mode = 'check', icon }) {
  return (
    <button type="button" className={"option-pill" + (selected ? " selected" : "")} onClick={onClick}>
      {mode === 'check' && (
        <span className="pill-check">
          {selected && <Icon name="check" size={12} stroke={2.5} />}
        </span>
      )}
      {mode === 'radio' && <span className="pill-radio"></span>}
      {icon}
      <span>{children}</span>
    </button>
  );
}
window.OptionPill = OptionPill;

// ---- Modal ----
function Modal({ open, onClose, title, children, footer, width }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={width ? { width } : undefined} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="card-title">{title}</h3>
          <button className="topbar-icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
window.Modal = Modal;

// ---- Toast stack ----
function ToastStack() {
  const { toasts } = window.useApp();
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={"toast" + (t.kind === 'error' ? ' error' : t.kind === 'warn' ? ' warn' : '')}>
          <span className="toast-icon">
            <Icon name={t.kind === 'error' ? 'x' : t.kind === 'warn' ? 'percent' : 'check'} size={12} stroke={3} />
          </span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
window.ToastStack = ToastStack;

// ---- Image uploader ----
// Stores base64 data-URIs (synthetic) in record.images.
// Generates a placeholder colored swatch on "pick file" to avoid touching disk.
function ImageUploader({ images, onChange, max = 10 }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const pick = () => inputRef.current?.click();
  const remove = (idx) => onChange(images.filter((_, i) => i !== idx));

  const fromFiles = (fileList) => {
    const files = Array.from(fileList).slice(0, max - images.length);
    Promise.all(files.map((f) => new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res({ id: newId(), name: f.name, dataUrl: r.result });
      r.readAsDataURL(f);
    }))).then((arr) => onChange([...images, ...arr]));
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer?.files?.length) fromFiles(e.dataTransfer.files);
  };

  return (
    <div className="col gap-8">
      <div className="image-grid">
        {images.map((img, idx) => (
          <div key={img.id || idx} className="image-tile">
            {img.dataUrl
              ? <img src={img.dataUrl} alt={img.name} />
              : <div style={{ width: '100%', height: '100%', background: img.color || '#d6d1c1' }}></div>}
            <button type="button" className="remove" onClick={() => remove(idx)} aria-label="ลบ">
              <Icon name="x" size={11} stroke={2.5} />
            </button>
          </div>
        ))}
        {images.length < max && (
          <div
            className={"image-tile upload" + (dragging ? " dragging" : "")}
            onClick={pick}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <Icon name="upload" size={20} stroke={1.5} />
            <span>วาง / เลือกรูป</span>
          </div>
        )}
      </div>
      <div className="row gap-8" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
        <Icon name="image" size={12} />
        <span>แนบรูปได้สูงสุด <strong>{max}</strong> รูป — ตอนนี้ <strong className="mono">{images.length}/{max}</strong></span>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files) fromFiles(e.target.files); e.target.value = ''; }} />
    </div>
  );
}
window.ImageUploader = ImageUploader;

// ---- Sidebar ----
function Sidebar() {
  const app = window.useApp();
  const { view, setView, records, projects } = app;
  const pendingDeposits = records.filter(r =>
    Number(r.depositAmount) > 0 && (!r.depositStatus || r.depositStatus === 'pending')
  ).length;
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">จ</div>
        <div>
          <div className="sidebar-brand-name">จัดซื้อ</div>
          <div className="sidebar-brand-sub">งานรับเหมาก่อสร้าง</div>
        </div>
      </div>

      <div className="sidebar-scroll">
        <div className="nav-section-label">ภาพรวม</div>
        <button className={"nav-item" + (view === 'dashboard' ? " active" : "")} onClick={() => setView('dashboard')}>
          <Icon name="home" /> แดชบอร์ด
        </button>

        <div className="nav-section-label">บันทึกรายการ</div>
        <button className={"nav-item" + (view === 'new-material' ? " active" : "")} onClick={() => setView('new-material')}>
          <Icon name="cart" /> จัดซื้อวัสดุ
        </button>
        <button className={"nav-item" + (view === 'new-machine' ? " active" : "")} onClick={() => setView('new-machine')}>
          <Icon name="truck" /> เช่าเครื่องจักร
        </button>
        <button className={"nav-item" + (view === 'new-labor' ? " active" : "")} onClick={() => setView('new-labor')}>
          <Icon name="hammer" /> บันทึกค่าแรง
        </button>
        <button className={"nav-item" + (view === 'new-lump-labor' ? " active" : "")} onClick={() => setView('new-lump-labor')}>
          <Icon name="clipboard" /> ค่าแรงเหมาจ่าย
        </button>

        <div className="nav-section-label">เรียกดู</div>
        <button className={"nav-item" + (view === 'history' ? " active" : "")} onClick={() => setView('history')}>
          <Icon name="history" /> ประวัติทั้งหมด
          <span className="badge">{records.length}</span>
        </button>
        <button className={"nav-item" + (view === 'deposits' ? " active" : "")} onClick={() => setView('deposits')}
          style={pendingDeposits > 0 ? { color:'#3b82f6' } : {}}>
          <Icon name="safe" /> เงินประกันสินค้า
          {pendingDeposits > 0 && (
            <span className="badge" style={{ background:'rgba(59,130,246,0.18)', color:'#3b82f6',
              border:'1px solid rgba(59,130,246,0.35)' }}>{pendingDeposits}</span>
          )}
        </button>

        <div className="nav-section-label">ตั้งค่า</div>
        <button className={"nav-item" + (view === 'projects' ? " active" : "")} onClick={() => setView('projects')}>
          <Icon name="folder" /> โครงการ
          <span className="badge">{projects.length}</span>
        </button>
        <button className={"nav-item" + (view === 'categories' ? " active" : "")} onClick={() => setView('categories')}>
          <Icon name="tag" /> หมวดหมู่
        </button>
        <button className={"nav-item" + (view === 'teams' ? " active" : "")} onClick={() => setView('teams')}>
          <Icon name="users" /> ทีมช่าง
        </button>
        {/* Admin only: manage users */}
        {app.isAdmin && app.dbOnline && (
          <button className={"nav-item" + (view === 'users' ? " active" : "")} onClick={() => setView('users')}
            style={{ color: 'var(--accent-light, #fbbf24)' }}>
            <Icon name="shield" /> จัดการผู้ใช้
          </button>
        )}
      </div>

      <div className="sidebar-footer">
        {/* Avatar — photo if set, else initial letter */}
        <div className="avatar" style={{ flexShrink: 0, overflow: 'hidden', padding: 0 }}>
          {app.userProfile?.avatar_url
            ? <img src={app.userProfile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
            : (app.userProfile?.full_name || app.userProfile?.email || 'U').slice(0,1).toUpperCase()
          }
        </div>
        <div className="avatar-meta" style={{ flex: 1, minWidth: 0 }}>
          <div className="avatar-name" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {app.userProfile?.full_name || app.userProfile?.email || 'ผู้ใช้งาน'}
          </div>
          <div className="avatar-role" style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{
              display:'inline-block', padding:'1px 6px', borderRadius:4, fontSize:10, fontWeight:600,
              background: app.isAdmin ? 'rgba(217,119,6,0.25)' : 'rgba(100,116,139,0.25)',
              color: app.isAdmin ? '#fbbf24' : '#94a3b8',
            }}>
              {app.isAdmin ? 'Admin' : 'User'}
            </span>
          </div>
        </div>
        {/* Logout button — show whenever there is an active session */}
        {app.session && (
          <button onClick={app.signOut} title="ออกจากระบบ"
            style={{
              background:'none', border:'none', cursor:'pointer', padding:6, borderRadius:6,
              color:'#6b7280', display:'flex', alignItems:'center', flexShrink:0,
              transition:'color .15s',
            }}
            onMouseEnter={e=>e.currentTarget.style.color='#ef4444'}
            onMouseLeave={e=>e.currentTarget.style.color='#6b7280'}>
            <Icon name="logout" size={15} />
          </button>
        )}
      </div>
    </aside>
  );
}
window.Sidebar = Sidebar;

// ---- Profile Settings Modal ----
function ProfileSettingsModal({ open, onClose }) {
  const app = window.useApp();
  const [tab,        setTab]        = useState('profile'); // 'profile' | 'password'
  const [name,       setName]       = useState('');
  const [avatarFile, setAvatarFile] = useState(null);   // File obj
  const [previewUrl, setPreviewUrl] = useState('');     // local preview
  const [newPass,    setNewPass]    = useState('');
  const [confPass,   setConfPass]   = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [busy,       setBusy]       = useState(false);
  const fileRef = useRef(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setTab('profile');
      setName(app.userProfile?.full_name || '');
      setAvatarFile(null);
      setPreviewUrl(app.userProfile?.avatar_url || '');
      setNewPass('');
      setConfPass('');
      setShowPass(false);
      setBusy(false);
    }
  }, [open]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target.result);
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    setBusy(true);
    try {
      let avatarUrl = app.userProfile?.avatar_url || '';
      if (avatarFile && app.userProfile?.id) {
        try {
          avatarUrl = await window.db.uploadAvatar(app.userProfile.id, avatarFile);
        } catch (e) {
          app.pushToast('อัปโหลดรูปไม่สำเร็จ: ' + e.message, 'error');
          setBusy(false); return;
        }
      }
      await app.updateMyProfile({ full_name: name.trim(), avatar_url: avatarUrl });
      app.pushToast('บันทึกข้อมูลโปรไฟล์แล้ว');
      onClose();
    } catch(e) {
      app.pushToast('บันทึกไม่สำเร็จ: ' + e.message, 'error');
    } finally { setBusy(false); }
  };

  const savePassword = async () => {
    if (newPass.length < 6) return app.pushToast('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'error');
    if (newPass !== confPass) return app.pushToast('รหัสผ่านไม่ตรงกัน', 'error');
    setBusy(true);
    try {
      const { error } = await window.supabaseClient.auth.updateUser({ password: newPass });
      if (error) throw error;
      app.pushToast('เปลี่ยนรหัสผ่านสำเร็จ');
      onClose();
    } catch(e) {
      app.pushToast('เปลี่ยนรหัสผ่านไม่สำเร็จ: ' + e.message, 'error');
    } finally { setBusy(false); }
  };

  const initial = (app.userProfile?.full_name || app.userProfile?.email || 'U').slice(0,1).toUpperCase();
  const tabBtn = (t, label) => (
    <button onClick={() => setTab(t)} style={{
      padding: '8px 18px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
      fontSize: 13, fontWeight: 500, borderRadius: 8, transition: 'all .15s',
      background: tab === t ? 'var(--accent)' : 'transparent',
      color: tab === t ? '#1f1d18' : 'var(--ink-3)',
    }}>{label}</button>
  );

  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">ตั้งค่าโปรไฟล์</h2>
          <button className="btn-icon" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4, padding: '0 20px 0', borderBottom: '1px solid var(--line)', paddingBottom: 12, marginBottom: 20 }}>
          {tabBtn('profile', 'ข้อมูลส่วนตัว')}
          {tabBtn('password', 'เปลี่ยนรหัสผ่าน')}
        </div>

        <div className="modal-body" style={{ paddingTop: 0 }}>
          {tab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Avatar */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div onClick={() => fileRef.current?.click()} style={{
                  width: 88, height: 88, borderRadius: '50%', cursor: 'pointer',
                  overflow: 'hidden', border: '3px solid var(--line-strong)',
                  background: 'var(--accent)', display: 'grid', placeItems: 'center',
                  fontSize: 32, fontWeight: 700, color: '#1f1d18',
                  transition: 'opacity .15s', position: 'relative',
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  {previewUrl
                    ? <img src={previewUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : initial}
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0, transition: 'opacity .15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
                    <Icon name="image" size={22} style={{ color: '#fff' }} />
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
                  <Icon name="image" size={13} /> เปลี่ยนรูปโปรไฟล์
                </button>
              </div>

              {/* Name */}
              <div className="field">
                <label className="field-label">ชื่อ-นามสกุล</label>
                <input className="input" placeholder="กรอกชื่อที่ต้องการแสดง" value={name} onChange={e => setName(e.target.value)} />
              </div>

              {/* Email (readonly) */}
              <div className="field">
                <label className="field-label">อีเมล</label>
                <div style={{
                  padding: '10px 14px', background: 'var(--bg-2)', border: '1px solid var(--line)',
                  borderRadius: 8, fontSize: 13, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono, monospace',
                }}>
                  {app.userProfile?.email || '—'}
                </div>
              </div>

              {/* Role badge */}
              <div className="field">
                <label className="field-label">บทบาท</label>
                <div>
                  <span style={{
                    display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: app.isAdmin ? 'rgba(217,119,6,0.15)' : 'rgba(100,116,139,0.15)',
                    color: app.isAdmin ? '#d97706' : '#64748b',
                    border: `1px solid ${app.isAdmin ? 'rgba(217,119,6,0.3)' : 'rgba(100,116,139,0.3)'}`,
                  }}>
                    {app.isAdmin ? 'Admin' : 'User'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {tab === 'password' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)',
                fontSize: 12.5, color: '#3b82f6', lineHeight: 1.6,
              }}>
                <Icon name="shield" size={13} /> รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร
              </div>
              <div className="field">
                <label className="field-label">รหัสผ่านใหม่</label>
                <div style={{ position: 'relative' }}>
                  <input className="input" type={showPass ? 'text' : 'password'}
                    placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)"
                    value={newPass} onChange={e => setNewPass(e.target.value)}
                    style={{ paddingRight: 42 }} />
                  <button type="button" onClick={() => setShowPass(v => !v)} style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4,
                  }}>
                    <Icon name="eye" size={15} />
                  </button>
                </div>
              </div>
              <div className="field">
                <label className="field-label">ยืนยันรหัสผ่านใหม่</label>
                <input className="input" type={showPass ? 'text' : 'password'}
                  placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                  value={confPass} onChange={e => setConfPass(e.target.value)} />
                {confPass && newPass !== confPass && (
                  <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>รหัสผ่านไม่ตรงกัน</div>
                )}
                {confPass && newPass === confPass && newPass.length >= 6 && (
                  <div style={{ fontSize: 12, color: '#16a34a', marginTop: 4 }}>รหัสผ่านตรงกัน ✓</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>ยกเลิก</button>
          {tab === 'profile'
            ? <button className="btn btn-accent" onClick={saveProfile} disabled={busy}>
                <Icon name="save" size={14} /> {busy ? 'กำลังบันทึก…' : 'บันทึกข้อมูล'}
              </button>
            : <button className="btn btn-accent" onClick={savePassword}
                disabled={busy || newPass.length < 6 || newPass !== confPass}>
                <Icon name="shield" size={14} /> {busy ? 'กำลังเปลี่ยน…' : 'เปลี่ยนรหัสผ่าน'}
              </button>
          }
        </div>
      </div>
    </div>
  );
}
window.ProfileSettingsModal = ProfileSettingsModal;

// ---- Global search helpers ----
const TYPE_LABEL = { material: 'วัสดุ', machine: 'เครื่องจักร', labor: 'ค่าแรง', 'lump-labor': 'เหมาจ่าย' };
const TYPE_COLOR = { material: '#d97706', machine: '#64748b', labor: '#7c3aed', 'lump-labor': '#16a34a' };

// ---- Topbar ----
function Topbar({ title, sub }) {
  const app = window.useApp();
  const online = app && app.dbOnline;
  const [profileOpen, setProfileOpen] = useState(false);

  // Search state
  const [q,       setQ]       = useState('');
  const [open,    setOpen]    = useState(false);
  const [focused, setFocused] = useState(-1);
  const inputRef = useRef(null);

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Compute search results
  const results = useMemo(() => {
    const lq = q.trim().toLowerCase();
    if (!lq) return [];

    const recs = (app.records || [])
      .filter(r =>
        r.docNo?.toLowerCase().includes(lq) ||
        r.vendor?.toLowerCase().includes(lq) ||
        r.note?.toLowerCase().includes(lq) ||
        r.period?.toLowerCase().includes(lq) ||
        (r.items || []).some(it => it.name?.toLowerCase().includes(lq))
      )
      .slice(0, 7)
      .map(r => ({ kind: 'record', id: r.id, docNo: r.docNo, vendor: r.vendor, type: r.type, date: r.date, total: computeTotals(r).total }));

    const projs = (app.projects || [])
      .filter(p =>
        p.name?.toLowerCase().includes(lq) ||
        p.code?.toLowerCase().includes(lq) ||
        p.client?.toLowerCase().includes(lq)
      )
      .slice(0, 3)
      .map(p => ({ kind: 'project', id: p.id, code: p.code, name: p.name, client: p.client, color: p.color }));

    const teams = (app.workerTeams || [])
      .filter(t =>
        t.name?.toLowerCase().includes(lq) ||
        t.leader?.toLowerCase().includes(lq) ||
        t.specialty?.toLowerCase().includes(lq)
      )
      .slice(0, 2)
      .map(t => ({ kind: 'team', id: t.id, name: t.name, leader: t.leader, size: t.size }));

    return [...projs, ...recs, ...teams];
  }, [q, app.records, app.projects, app.workerTeams]);

  const handleSelect = (item) => {
    setQ(''); setOpen(false); setFocused(-1);
    inputRef.current?.blur();
    if (item.kind === 'record')  { app.setDetailId(item.id); }
    else if (item.kind === 'project') { app.setView('projects'); }
    else if (item.kind === 'team')    { app.setView('teams'); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { setQ(''); setOpen(false); setFocused(-1); inputRef.current?.blur(); return; }
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocused(f => Math.min(f + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setFocused(f => Math.max(f - 1, 0)); }
    if (e.key === 'Enter' && focused >= 0) { e.preventDefault(); handleSelect(results[focused]); }
  };

  const clear = () => { setQ(''); setOpen(false); setFocused(-1); inputRef.current?.focus(); };

  return (
    <div className="topbar">
      <div>
        <div className="topbar-title">{title}</div>
        {sub && <div className="topbar-crumb">{sub}</div>}
      </div>

      {/* Search box */}
      <div className="topbar-search" style={{ position: 'relative', width: 320 }}>
        <Icon name="search" size={14} />
        <input
          ref={inputRef}
          placeholder="ค้นหารายการ บิล โครงการ ผู้ขาย..."
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); setFocused(-1); }}
          onFocus={() => { if (q) setOpen(true); }}
          onBlur={() => setTimeout(() => { setOpen(false); setFocused(-1); }, 160)}
          onKeyDown={handleKeyDown}
        />
        {q
          ? <button onClick={clear} style={{ background:'none', border:'none', cursor:'pointer', padding:2, color:'var(--ink-3)', display:'flex', lineHeight:1 }}>
              <Icon name="x" size={13} />
            </button>
          : <span className="badge gray mono">⌘K</span>
        }

        {/* Dropdown results */}
        {open && q.trim() && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
            background: 'var(--surface)', border: '1px solid var(--line-strong)',
            borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
            zIndex: 9999, overflow: 'hidden', maxHeight: 460, overflowY: 'auto',
          }}>
            {results.length === 0 ? (
              <div style={{ padding: '16px 16px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>
                ไม่พบผลลัพธ์สำหรับ "<strong style={{ color: 'var(--ink-1)' }}>{q}</strong>"
              </div>
            ) : (() => {
              // Group by kind for section headers
              const groups = [
                { key: 'project', label: 'โครงการ' },
                { key: 'record',  label: 'รายการจัดซื้อ' },
                { key: 'team',    label: 'ทีมช่าง' },
              ];
              let globalIdx = 0;
              return groups.map(({ key, label }) => {
                const items = results.filter(r => r.kind === key);
                if (!items.length) return null;
                return (
                  <div key={key}>
                    {/* Section header */}
                    <div style={{
                      padding: '8px 14px 4px', fontSize: 10.5, fontWeight: 700,
                      color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em',
                      borderTop: globalIdx > 0 ? '1px solid var(--line)' : 'none',
                    }}>{label}</div>
                    {items.map(item => {
                      const idx = globalIdx++;
                      const isFocused = focused === results.indexOf(item);
                      return (
                        <div key={item.id}
                          onMouseDown={() => handleSelect(item)}
                          onMouseEnter={() => setFocused(results.indexOf(item))}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '9px 14px', cursor: 'pointer',
                            background: isFocused ? 'var(--bg-2)' : 'transparent',
                            transition: 'background 80ms',
                          }}>
                          {/* Icon / avatar */}
                          {item.kind === 'project' && (
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                          )}
                          {item.kind === 'record' && (
                            <span style={{
                              padding: '2px 7px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                              background: TYPE_COLOR[item.type] + '22', color: TYPE_COLOR[item.type],
                              flexShrink: 0, whiteSpace: 'nowrap',
                            }}>{TYPE_LABEL[item.type] || item.type}</span>
                          )}
                          {item.kind === 'team' && (
                            <span style={{
                              width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                              background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
                              display: 'grid', placeItems: 'center', color: '#1f1d18', fontWeight: 700, fontSize: 11,
                            }}>{item.name.charAt(0)}</span>
                          )}

                          {/* Main text */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {item.kind === 'project' && (
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                <span style={{ fontWeight: 500, fontSize: 13 }}>{item.name}</span>
                                <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono, monospace' }}>{item.code}</span>
                              </div>
                            )}
                            {item.kind === 'record' && (
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                <span style={{ fontWeight: 500, fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>{item.docNo}</span>
                                <span style={{ fontSize: 12, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.vendor}</span>
                              </div>
                            )}
                            {item.kind === 'team' && (
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                <span style={{ fontWeight: 500, fontSize: 13 }}>{item.name}</span>
                                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{item.leader}</span>
                              </div>
                            )}
                          </div>

                          {/* Right meta */}
                          <div style={{ flexShrink: 0, textAlign: 'right' }}>
                            {item.kind === 'record' && (
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: 'var(--ink-1)' }}>฿{fmt(item.total)}</div>
                                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{fmtDate(item.date)}</div>
                              </div>
                            )}
                            {item.kind === 'project' && item.client && (
                              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{item.client}</span>
                            )}
                            {item.kind === 'team' && (
                              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{item.size} คน</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              });
            })()}

            {/* Footer hint */}
            {results.length > 0 && (
              <div style={{
                padding: '8px 14px', borderTop: '1px solid var(--line)',
                display: 'flex', gap: 14, fontSize: 11, color: 'var(--ink-4)',
              }}>
                <span>↑↓ เลื่อน</span>
                <span>Enter เลือก</span>
                <span>Esc ปิด</span>
              </div>
            )}
          </div>
        )}
      </div>
      <div title={online ? 'เชื่อมต่อ Supabase แล้ว' : 'Offline — ใช้ข้อมูลตัวอย่าง'}
        style={{ display:'flex', alignItems:'center', gap:5, fontSize:11,
          color: online ? '#16a34a' : '#9ca3af', fontFamily:'Prompt, sans-serif',
          padding:'4px 10px', borderRadius:20,
          background: online ? 'rgba(22,163,74,0.08)' : 'rgba(156,163,175,0.10)',
          border:`1px solid ${online ? 'rgba(22,163,74,0.2)' : 'rgba(156,163,175,0.2)'}`,
          whiteSpace:'nowrap', cursor:'default', userSelect:'none' }}>
        <span style={{ width:7, height:7, borderRadius:'50%',
          background: online ? '#22c55e' : '#9ca3af', display:'inline-block',
          boxShadow: online ? '0 0 0 2px rgba(34,197,94,0.25)' : 'none' }} />
        {online ? 'Supabase' : 'Offline'}
      </div>
      <button className="topbar-icon-btn" title="การแจ้งเตือน">
        <Icon name="bell" />
        <span className="dot"></span>
      </button>
      <button className="topbar-icon-btn" title="ตั้งค่าโปรไฟล์" onClick={() => setProfileOpen(true)}>
        <Icon name="settings" />
      </button>
      <ProfileSettingsModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
window.Topbar = Topbar;
