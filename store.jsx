/* global React */
// ============================
// Store — global app state via React Context
// ============================

const { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef } = React;

// ---- Seed data ----
const SEED_PROJECTS = [
  { id: 'p1', code: 'PJ-2026-012', name: 'อาคารพาณิชย์ 4 ชั้น สุขุมวิท 71', client: 'คุณ สมศักดิ์ พงษ์ไพร', color: '#d97706', status: 'active' },
  { id: 'p2', code: 'PJ-2026-008', name: 'บ้านเดี่ยว 2 ชั้น ลาดพร้าว 101', client: 'คุณ วรรณา ศรีจันทร์', color: '#0ea5e9', status: 'active' },
  { id: 'p3', code: 'PJ-2025-044', name: 'โรงงานเฟส 2 — สมุทรปราการ', client: 'บจก. ไทยอินดัสเทรียล', color: '#16a34a', status: 'active' },
  { id: 'p4', code: 'PJ-2025-031', name: 'รีโนเวทออฟฟิศ ชั้น 14 อโศก', client: 'บจก. โกลบอลเทรด', color: '#a855f7', status: 'closed' },
];

const SEED_MAT_CATEGORIES = [
  { id: 'mc1', name: 'งานโครงสร้าง — เหล็ก', color: '#64748b' },
  { id: 'mc2', name: 'งานโครงสร้าง — คอนกรีต', color: '#475569' },
  { id: 'mc3', name: 'งานก่อ-ฉาบ', color: '#d97706' },
  { id: 'mc4', name: 'งานไฟฟ้า', color: '#eab308' },
  { id: 'mc5', name: 'งานประปา-สุขาภิบาล', color: '#0ea5e9' },
  { id: 'mc6', name: 'งานหลังคา', color: '#dc2626' },
  { id: 'mc7', name: 'งานสี', color: '#16a34a' },
  { id: 'mc8', name: 'อุปกรณ์-ของใช้ทั่วไป', color: '#9ca3af' },
];

const SEED_MACH_CATEGORIES = [
  { id: 'kc1', name: 'รถเครน', color: '#d97706' },
  { id: 'kc2', name: 'รถขุด-แบ็คโฮ', color: '#a16207' },
  { id: 'kc3', name: 'รถบดถนน', color: '#475569' },
  { id: 'kc4', name: 'นั่งร้าน', color: '#0ea5e9' },
  { id: 'kc5', name: 'เครื่องปั่นไฟ', color: '#dc2626' },
  { id: 'kc6', name: 'รถผสมปูน', color: '#16a34a' },
];

const SEED_LABOR_CATEGORIES = [
  { id: 'lc1', name: 'งานก่อ-ฉาบ', color: '#d97706' },
  { id: 'lc2', name: 'งานปูกระเบื้อง', color: '#0ea5e9' },
  { id: 'lc3', name: 'งานเหล็ก-โครงสร้าง', color: '#64748b' },
  { id: 'lc4', name: 'งานไฟฟ้า', color: '#eab308' },
  { id: 'lc5', name: 'งานประปา', color: '#16a34a' },
  { id: 'lc6', name: 'งานสี-ตกแต่ง', color: '#a855f7' },
  { id: 'lc7', name: 'งานหลังคา-ฝ้า', color: '#dc2626' },
  { id: 'lc8', name: 'งานเบ็ดเตล็ด', color: '#9ca3af' },
];

const SEED_WORKER_TEAMS = [
  { id: 't1', name: 'ทีมช่างประสิทธิ์', leader: 'นาย ประสิทธิ์ ทองดี', phone: '081-234-5678', size: 6, specialty: 'ก่อ-ฉาบ, ปูกระเบื้อง' },
  { id: 't2', name: 'ทีมช่างวิชัย', leader: 'นาย วิชัย แสงเดือน', phone: '089-555-1212', size: 4, specialty: 'งานเหล็ก, ฐานราก' },
  { id: 't3', name: 'ทีมไฟฟ้า-ประปา ส.พงษ์', leader: 'นาย สมพงษ์ ผลดี', phone: '086-777-4321', size: 3, specialty: 'ไฟฟ้า-ประปา' },
  { id: 't4', name: 'ทีมช่างสี อ.บุญมา', leader: 'นาย บุญมา ขำเขียว', phone: '081-999-8765', size: 3, specialty: 'งานสี-ตกแต่ง' },
];

const SEED_VENDORS = [
  'บจก. ไทยคอน สตีล', 'หจก. ปูนซีเมนต์รวมเจริญ', 'ร้านวัสดุภัทรชัย', 'บจก. อีเล็คทริค พรีเมียร์',
  'บจก. ไฮดรอลิค เซอร์วิส', 'หจก. ก่อสร้างเครื่องจักรไทย', 'ร้านสี เบเยอร์โปร', 'บจก. นั่งร้านมาตรฐาน',
];

// Sample history records
const seedRecords = () => {
  const today = new Date();
  const daysAgo = (n) => new Date(today.getTime() - n * 86400000).toISOString().slice(0, 10);
  return [
    {
      id: 'r1', type: 'material', docNo: 'PO-2026-0048', date: daysAgo(1),
      projectId: 'p1', vendor: 'บจก. ไทยคอน สตีล',
      items: [
        { id: 'i1', name: 'เหล็กข้ออ้อย DB16 ยาว 10 ม.', categoryId: 'mc1', qty: 120, unit: 'เส้น', price: 425 },
        { id: 'i2', name: 'เหล็กข้ออ้อย DB12 ยาว 10 ม.', categoryId: 'mc1', qty: 80, unit: 'เส้น', price: 248 },
      ],
      vatMode: 'exclusive', vatRate: 7, whtEnabled: true, whtRate: 1,
      docs: ['voucher-pay', 'wht-50tawi'], note: 'งวดงานเหล็กฐานราก', images: [],
    },
    {
      id: 'r2', type: 'machine', docNo: 'RT-2026-0019', date: daysAgo(3),
      projectId: 'p1', vendor: 'บจก. ไฮดรอลิค เซอร์วิส',
      items: [
        { id: 'i1', name: 'รถเครน 25 ตัน + คนขับ', categoryId: 'kc1', qty: 2, unit: 'วัน', price: 18000 },
      ],
      vatMode: 'inclusive', vatRate: 7, whtEnabled: true, whtRate: 3,
      docs: ['voucher-pay'], note: 'เคลื่อนย้ายเหล็กรูปพรรณ ชั้น 3', images: [],
    },
    {
      id: 'r3', type: 'material', docNo: 'PO-2026-0047', date: daysAgo(5),
      projectId: 'p2', vendor: 'หจก. ปูนซีเมนต์รวมเจริญ',
      items: [
        { id: 'i1', name: 'ปูนซีเมนต์ปอร์ตแลนด์ ถุง 50 กก.', categoryId: 'mc2', qty: 200, unit: 'ถุง', price: 178 },
        { id: 'i2', name: 'ทรายหยาบ', categoryId: 'mc2', qty: 8, unit: 'คิว', price: 540 },
        { id: 'i3', name: 'หิน 3/4', categoryId: 'mc2', qty: 12, unit: 'คิว', price: 720 },
      ],
      vatMode: 'exclusive', vatRate: 7, whtEnabled: false, whtRate: 0,
      docs: ['voucher-pay', 'voucher-receive'], note: '', images: [],
    },
    {
      id: 'r4', type: 'material', docNo: 'PO-2026-0046', date: daysAgo(7),
      projectId: 'p3', vendor: 'บจก. อีเล็คทริค พรีเมียร์',
      items: [
        { id: 'i1', name: 'สายไฟ THW 2.5 sq.mm', categoryId: 'mc4', qty: 6, unit: 'ม้วน', price: 1850 },
        { id: 'i2', name: 'ท่อ EMT 1/2"', categoryId: 'mc4', qty: 40, unit: 'เส้น', price: 95 },
      ],
      vatMode: 'exclusive', vatRate: 7, whtEnabled: false, whtRate: 0,
      docs: ['voucher-pay'], note: 'งานไฟฟ้าโซน A', images: [],
    },
    {
      id: 'r5', type: 'machine', docNo: 'RT-2026-0018', date: daysAgo(9),
      projectId: 'p3', vendor: 'หจก. ก่อสร้างเครื่องจักรไทย',
      items: [
        { id: 'i1', name: 'รถขุด PC200 + คนขับ', categoryId: 'kc2', qty: 5, unit: 'วัน', price: 8500 },
      ],
      vatMode: 'exclusive', vatRate: 7, whtEnabled: true, whtRate: 3,
      docs: ['voucher-pay', 'wht-50tawi'], note: 'ปรับหน้าดิน', images: [],
    },
    {
      id: 'r6', type: 'material', docNo: 'PO-2026-0045', date: daysAgo(12),
      projectId: 'p2', vendor: 'ร้านสี เบเยอร์โปร',
      items: [
        { id: 'i1', name: 'สีรองพื้นปูนเก่า 18.9 ลิตร', categoryId: 'mc7', qty: 4, unit: 'ถัง', price: 1950 },
        { id: 'i2', name: 'สีน้ำพลาสติก 18.9 ลิตร', categoryId: 'mc7', qty: 6, unit: 'ถัง', price: 2350 },
      ],
      vatMode: 'inclusive', vatRate: 7, whtEnabled: false, whtRate: 0,
      docs: ['voucher-pay', 'voucher-receive'], note: '', images: [],
    },
    // ---- Labor records ----
    {
      id: 'r7', type: 'labor', docNo: 'LB-2026-0024', date: daysAgo(2),
      projectId: 'p1', workerTeamId: 't1', vendor: 'ทีมช่างประสิทธิ์',
      period: 'งวดที่ 3', items: [
        { id: 'i1', name: 'ก่ออิฐมวลเบา ผนังชั้น 2', categoryId: 'lc1', qty: 180, unit: 'ตร.ม.', price: 165 },
        { id: 'i2', name: 'ฉาบปูนผนังชั้น 2', categoryId: 'lc1', qty: 360, unit: 'ตร.ม.', price: 95 },
      ],
      vatMode: 'exclusive', vatRate: 0, whtEnabled: false, whtRate: 0,
      advanceDeduction: 5000, retentionDeduction: 3000,
      docs: ['voucher-pay'], note: 'จ่ายงวด 3 — เหลือเงินประกัน 5% เก็บไว้',
      images: [], workLogs: [
        { id: 'w1', date: daysAgo(2), note: 'เริ่มก่ออิฐผนังโซน A เสร็จ 60%', images: [] },
        { id: 'w2', date: daysAgo(1), note: 'ก่ออิฐผนังโซน A เสร็จ ฉาบรอบแรกเริ่มทำ', images: [] },
      ],
    },
    {
      id: 'r8', type: 'labor', docNo: 'LB-2026-0019', date: daysAgo(15),
      projectId: 'p1', workerTeamId: 't1', vendor: 'ทีมช่างประสิทธิ์',
      period: 'งวดที่ 2', items: [
        { id: 'i1', name: 'ก่ออิฐมวลเบา ผนังชั้น 1', categoryId: 'lc1', qty: 220, unit: 'ตร.ม.', price: 160 },
      ],
      vatMode: 'exclusive', vatRate: 0, whtEnabled: false, whtRate: 0,
      advanceDeduction: 3000, retentionDeduction: 1760,
      docs: ['voucher-pay'], note: 'จ่ายงวด 2',
      images: [], workLogs: [
        { id: 'w1', date: daysAgo(15), note: 'งวด 2 เสร็จ — ก่ออิฐผนังชั้น 1 ครบ', images: [] },
      ],
    },
    {
      id: 'r9', type: 'labor', docNo: 'LB-2026-0015', date: daysAgo(28),
      projectId: 'p1', workerTeamId: 't1', vendor: 'ทีมช่างประสิทธิ์',
      period: 'งวดที่ 1', items: [
        { id: 'i1', name: 'ก่ออิฐมวลเบา ฐานราก-เสา', categoryId: 'lc1', qty: 95, unit: 'ตร.ม.', price: 155 },
      ],
      vatMode: 'exclusive', vatRate: 0, whtEnabled: false, whtRate: 0,
      advanceDeduction: 10000, retentionDeduction: 0,
      docs: ['voucher-pay'], note: 'จ่ายงวด 1 — มีเบิกล่วงหน้า 10,000',
      images: [], workLogs: [],
    },
    {
      id: 'r10', type: 'labor', docNo: 'LB-2026-0021', date: daysAgo(6),
      projectId: 'p2', workerTeamId: 't4', vendor: 'ทีมช่างสี อ.บุญมา',
      period: 'งวดเดียว', items: [
        { id: 'i1', name: 'ทาสีรองพื้น+สีจริง ภายใน', categoryId: 'lc6', qty: 380, unit: 'ตร.ม.', price: 85 },
      ],
      vatMode: 'exclusive', vatRate: 0, whtEnabled: false, whtRate: 0,
      advanceDeduction: 0, retentionDeduction: 1600,
      docs: ['voucher-pay'], note: '',
      images: [], workLogs: [],
    },
  ];
};

// ---- Helpers ----
const fmt = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '0.00';
  return Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const fmtInt = (n) => Number(n || 0).toLocaleString('th-TH');
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (s) => {
  if (!s) return '-';
  const d = new Date(s);
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
};
const newId = () => Math.random().toString(36).slice(2, 10);

// ---- Document type definitions ----
const DOC_TYPES = [
  { id: 'wht-50tawi', label: 'ใบ 50 ทวิ', sub: 'หนังสือรับรองการหักภาษี ณ ที่จ่าย', icon: '50' },
  { id: 'voucher-pay', label: 'ใบสำคัญจ่าย', sub: 'Payment Voucher', icon: 'PV' },
  { id: 'voucher-receive', label: 'ใบสำคัญรับเงิน', sub: 'Receipt Voucher', icon: 'RV' },
];

// ---- Compute totals ----
const computeTotals = (rec) => {
  const subTotalRaw = (rec.items || []).reduce((s, it) => s + (Number(it.qty || 0) * Number(it.price || 0)), 0);
  const vatRate = Number(rec.vatRate || 0) / 100;
  const whtRate = rec.whtEnabled ? Number(rec.whtRate || 0) / 100 : 0;

  let subTotal, vat, beforeWht, wht, total;
  if (rec.vatMode === 'inclusive') {
    // entered prices already include VAT
    const gross = subTotalRaw;
    subTotal = gross / (1 + vatRate);
    vat = gross - subTotal;
    beforeWht = gross;
  } else {
    subTotal = subTotalRaw;
    vat = subTotal * vatRate;
    beforeWht = subTotal + vat;
  }
  wht = subTotal * whtRate;

  // Labor-specific deductions
  const advance = Number(rec.advanceDeduction || 0);
  const retention = Number(rec.retentionDeduction || 0);

  total = beforeWht - wht - advance - retention;
  return { subTotal, vat, beforeWht, wht, advance, retention, total };
};

// ---- Context ----
const AppCtx = createContext(null);
window.useApp = () => useContext(AppCtx);

// ---- Loading screen ----
function DbLoadingScreen({ msg }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg, #f8f7f4)', zIndex: 9999, gap: 16,
    }}>
      <div style={{
        width: 44, height: 44, border: '3px solid var(--line, #e2ddd8)',
        borderTopColor: 'var(--accent, #d97706)', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ fontFamily: 'Prompt, sans-serif', color: 'var(--ink-3, #7a6f64)', fontSize: 14, margin: 0 }}>
        {msg || 'กำลังโหลด…'}
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

window.AppProvider = function AppProvider({ children }) {
  // ── Auth state ──────────────────────────────────────
  const [authChecked,  setAuthChecked]  = useState(false);
  const [session,      setSession]      = useState(null);
  const [userProfile,  setUserProfile]  = useState(null);

  // ── Data state ──────────────────────────────────────
  const [dbReady,    setDbReady]    = useState(false);
  const [dbOnline,   setDbOnline]   = useState(false);
  const [view, setView] = useState('dashboard');

  const [projects,    setProjects]    = useState(SEED_PROJECTS);
  const [matCats,     setMatCats]     = useState(SEED_MAT_CATEGORIES);
  const [machCats,    setMachCats]    = useState(SEED_MACH_CATEGORIES);
  const [laborCats,   setLaborCats]   = useState(SEED_LABOR_CATEGORIES);
  const [workerTeams, setWorkerTeams] = useState(SEED_WORKER_TEAMS);
  const [records,     setRecords]     = useState(seedRecords());
  const [toasts,      setToasts]      = useState([]);
  const [detailId,    setDetailId]    = useState(null);
  const [editingId,   setEditingId]   = useState(null);

  // ── Computed ────────────────────────────────────────
  // Offline or no profile yet → treat as admin (seed-data mode)
  const isAdmin = !dbOnline || !userProfile || userProfile.role === 'admin';

  // ── Helpers ─────────────────────────────────────────
  const pushToast = useCallback((msg, kind = 'success') => {
    const id = newId();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const dbSync = useCallback((promise, label) => {
    promise.catch((err) => {
      console.error(`[DB] ${label} failed:`, err);
      pushToast(`ซิงค์ข้อมูลไม่สำเร็จ (${label})`, 'error');
    });
  }, [pushToast]);

  // ── Load profile + app data after login ─────────────
  const loadProfileAndData = useCallback(async (userId) => {
    try {
      const profile = await window.db.getProfile(userId);
      setUserProfile(profile);

      const { projects: ps, matCats: mc, machCats: kc, laborCats: lc,
              workerTeams: teams, records: recs } = await window.db.loadAll();

      setProjects(ps);
      setMatCats(mc.length   ? mc   : SEED_MAT_CATEGORIES);
      setMachCats(kc.length  ? kc   : SEED_MACH_CATEGORIES);
      setLaborCats(lc.length ? lc   : SEED_LABOR_CATEGORIES);
      setWorkerTeams(teams);
      setRecords(recs);
      setDbOnline(true);
    } catch (err) {
      console.error('[DB] โหลดข้อมูลไม่สำเร็จ:', err);
      pushToast('โหลดข้อมูลไม่สำเร็จ — แสดงข้อมูลตัวอย่าง', 'error');
    } finally {
      setDbReady(true);
      setAuthChecked(true);
    }
  }, [pushToast]);

  // ── Auth lifecycle ───────────────────────────────────
  useEffect(() => {
    if (!window.supabaseClient || !window.db) {
      // Offline mode — skip auth entirely
      setAuthChecked(true);
      setDbReady(true);
      return;
    }

    // Check existing session
    window.supabaseClient.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) {
        loadProfileAndData(s.user.id);
      } else {
        setAuthChecked(true);
        setDbReady(true);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = window.supabaseClient.auth.onAuthStateChange(
      async (event, s) => {
        setSession(s);
        if (event === 'SIGNED_IN' && s) {
          setDbReady(false);
          await loadProfileAndData(s.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUserProfile(null);
          setDbOnline(false);
          setView('dashboard');
          // Reset to seed data
          setProjects(SEED_PROJECTS);
          setMatCats(SEED_MAT_CATEGORIES);
          setMachCats(SEED_MACH_CATEGORIES);
          setLaborCats(SEED_LABOR_CATEGORIES);
          setWorkerTeams(SEED_WORKER_TEAMS);
          setRecords(seedRecords());
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sign out ────────────────────────────────────────
  const signOut = useCallback(async () => {
    if (window.supabaseClient) await window.supabaseClient.auth.signOut();
  }, []);

  // ── Records ─────────────────────────────────────────
  const addRecord = useCallback((rec) => {
    const newRec = { ...rec, id: newId() };
    setRecords((r) => [newRec, ...r]);
    if (dbOnline) dbSync(window.db.insertRecord(newRec), 'insertRecord');
    return newRec;
  }, [dbOnline, dbSync]);

  const updateRecord = useCallback((id, patch) => {
    setRecords((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    if (dbOnline) dbSync(window.db.updateRecord(id, patch), 'updateRecord');
  }, [dbOnline, dbSync]);

  const deleteRecord = useCallback((id) => {
    setRecords((r) => r.filter((x) => x.id !== id));
    if (dbOnline) dbSync(window.db.deleteRecord(id), 'deleteRecord');
  }, [dbOnline, dbSync]);

  // ── Projects ─────────────────────────────────────────
  const addProject = useCallback((p) => {
    const np = { ...p, id: newId() };
    setProjects((ps) => [...ps, np]);
    if (dbOnline) dbSync(window.db.insertProject(np), 'insertProject');
  }, [dbOnline, dbSync]);

  const deleteProject = useCallback((id) => {
    setProjects((ps) => ps.filter((p) => p.id !== id));
    if (dbOnline) dbSync(window.db.deleteProject(id), 'deleteProject');
  }, [dbOnline, dbSync]);

  // ── Material categories ───────────────────────────────
  const addMatCat = useCallback((c) => {
    const nc = { ...c, id: newId() };
    setMatCats((cs) => [...cs, nc]);
    if (dbOnline) dbSync(window.db.insertMatCat(nc), 'insertMatCat');
  }, [dbOnline, dbSync]);

  const deleteMatCat = useCallback((id) => {
    setMatCats((cs) => cs.filter((c) => c.id !== id));
    if (dbOnline) dbSync(window.db.deleteMatCat(id), 'deleteMatCat');
  }, [dbOnline, dbSync]);

  // ── Machinery categories ──────────────────────────────
  const addMachCat = useCallback((c) => {
    const nc = { ...c, id: newId() };
    setMachCats((cs) => [...cs, nc]);
    if (dbOnline) dbSync(window.db.insertMachCat(nc), 'insertMachCat');
  }, [dbOnline, dbSync]);

  const deleteMachCat = useCallback((id) => {
    setMachCats((cs) => cs.filter((c) => c.id !== id));
    if (dbOnline) dbSync(window.db.deleteMachCat(id), 'deleteMachCat');
  }, [dbOnline, dbSync]);

  // ── Labor categories ──────────────────────────────────
  const addLaborCat = useCallback((c) => {
    const nc = { ...c, id: newId() };
    setLaborCats((cs) => [...cs, nc]);
    if (dbOnline) dbSync(window.db.insertLaborCat(nc), 'insertLaborCat');
  }, [dbOnline, dbSync]);

  const deleteLaborCat = useCallback((id) => {
    setLaborCats((cs) => cs.filter((c) => c.id !== id));
    if (dbOnline) dbSync(window.db.deleteLaborCat(id), 'deleteLaborCat');
  }, [dbOnline, dbSync]);

  // ── Worker teams ──────────────────────────────────────
  const addWorkerTeam = useCallback((t) => {
    const team = { ...t, id: newId() };
    setWorkerTeams((ts) => [...ts, team]);
    if (dbOnline) dbSync(window.db.insertWorkerTeam(team), 'insertWorkerTeam');
    return team;
  }, [dbOnline, dbSync]);

  const updateWorkerTeam = useCallback((id, patch) => {
    setWorkerTeams((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    if (dbOnline) dbSync(window.db.updateWorkerTeam(id, patch), 'updateWorkerTeam');
  }, [dbOnline, dbSync]);

  const deleteWorkerTeam = useCallback((id) => {
    setWorkerTeams((ts) => ts.filter((t) => t.id !== id));
    if (dbOnline) dbSync(window.db.deleteWorkerTeam(id), 'deleteWorkerTeam');
  }, [dbOnline, dbSync]);

  // ── Context value ────────────────────────────────────
  const value = useMemo(() => ({
    view, setView,
    session, userProfile, isAdmin, signOut, dbOnline,
    projects, addProject, deleteProject,
    matCats, addMatCat, deleteMatCat,
    machCats, addMachCat, deleteMachCat,
    laborCats, addLaborCat, deleteLaborCat,
    workerTeams, addWorkerTeam, updateWorkerTeam, deleteWorkerTeam,
    records, addRecord, updateRecord, deleteRecord,
    toasts, pushToast,
    detailId, setDetailId,
    editingId, setEditingId,
  }), [view, session, userProfile, isAdmin, signOut, dbOnline,
       projects, matCats, machCats, laborCats, workerTeams, records, toasts, detailId, editingId,
       addRecord, updateRecord, deleteRecord, addProject, deleteProject,
       addMatCat, deleteMatCat, addMachCat, deleteMachCat,
       addLaborCat, deleteLaborCat, addWorkerTeam, updateWorkerTeam, deleteWorkerTeam, pushToast]);

  // ── Render guards ─────────────────────────────────────
  if (!authChecked) return <DbLoadingScreen msg="กำลังตรวจสอบสิทธิ์…" />;

  // Not logged in + Supabase is available → show login screen
  if (!session && window.supabaseClient) return <window.AuthScreen />;

  if (!dbReady) return <DbLoadingScreen msg="กำลังโหลดข้อมูล…" />;

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
};

// expose helpers
Object.assign(window, { fmt, fmtInt, todayStr, fmtDate, newId, DOC_TYPES, computeTotals });
