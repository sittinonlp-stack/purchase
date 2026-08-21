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

const SEED_LUMP_LABOR_CATEGORIES = [
  { id: 'llc1', name: 'งานสถาปัตยกรรม', color: '#8b5cf6' },
  { id: 'llc2', name: 'งานฐานราก', color: '#92400e' },
  { id: 'llc3', name: 'งานโครงสร้าง', color: '#64748b' },
  { id: 'llc4', name: 'งานระบบ MEP', color: '#0ea5e9' },
  { id: 'llc5', name: 'งานตกแต่งภายใน', color: '#ec4899' },
  { id: 'llc6', name: 'งานภายนอกอาคาร', color: '#16a34a' },
  { id: 'llc7', name: 'งานเหมารวม', color: '#d97706' },
];

const SEED_OTHER_CATEGORIES = [
  { id: 'oc1', name: 'ค่าออกแบบ-วิศวกรรม', color: '#6366f1' },
  { id: 'oc2', name: 'ค่าเดินทาง-ขนส่ง', color: '#f59e0b' },
  { id: 'oc3', name: 'ค่าสาธารณูปโภค', color: '#06b6d4' },
  { id: 'oc4', name: 'ค่าประกันภัย', color: '#10b981' },
  { id: 'oc5', name: 'ค่าธรรมเนียม-ใบอนุญาต', color: '#f43f5e' },
  { id: 'oc6', name: 'ค่าสำรองจ่ายทั่วไป', color: '#9ca3af' },
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
// cache ผลลัพธ์ต่อ object (record/form) — record ถือเป็น immutable (แก้ทีสร้าง object ใหม่)
// จึงปลอดภัย และช่วยลดการคำนวณซ้ำหลายร้อยครั้งต่อ render (ตารางหลายร้อยแถว + การ์ดสรุป)
const _totalsCache = new WeakMap();
const computeTotals = (rec) => {
  const cacheable = rec && typeof rec === 'object';
  if (cacheable) { const hit = _totalsCache.get(rec); if (hit) return hit; }
  const result = _computeTotals(rec);
  if (cacheable) _totalsCache.set(rec, result);
  return result;
};
const _computeTotals = (rec) => {
  const subTotalRaw = (rec.items || []).reduce((s, it) => s + (Number(it.qty || 0) * Number(it.price || 0)), 0);

  // ส่วนลด — คำนวณก่อน VAT (มาตรฐานใบกำกับภาษีไทย)
  const discountValue = rec.discountEnabled ? Number(rec.discountValue || 0) : 0;
  const discountAmt = rec.discountType === 'percent'
    ? subTotalRaw * (discountValue / 100)
    : discountValue;
  const discountedRaw = Math.max(0, subTotalRaw - discountAmt);

  const vatRate = Number(rec.vatRate || 0) / 100;
  const whtRate = rec.whtEnabled ? Number(rec.whtRate || 0) / 100 : 0;

  let subTotal, vat, beforeWht, wht, total;
  if (rec.vatMode === 'cash') {
    // บิลเงินสด — ไม่มี VAT
    subTotal = discountedRaw;
    vat = 0;
    beforeWht = subTotal;
  } else if (rec.vatMode === 'inclusive') {
    // entered prices already include VAT
    const gross = discountedRaw;
    subTotal = gross / (1 + vatRate);
    vat = gross - subTotal;
    beforeWht = gross;
  } else {
    subTotal = discountedRaw;
    vat = subTotal * vatRate;
    beforeWht = subTotal + vat;
  }
  wht = subTotal * whtRate;

  // Labor-specific deductions
  const advance = Number(rec.advanceDeduction || 0);
  const retention = Number(rec.retentionDeduction || 0);

  // total = ยอดรายจ่ายที่บันทึก (ยอดเต็มก่อนหักประกันสังคมเสมอ)
  total = beforeWht - wht - advance - retention;

  // ประกันสังคม — หักจากช่างโดยตรง ไม่กระทบยอดรายจ่ายที่บันทึก
  // ถ้าเปิดใช้ (socialSecurityEnabled) → รวมยอดรายคนจาก socialSecurityItems
  // ไม่งั้น fallback เป็นตัวเลขเดิม (records เก่า)
  const socialSecurity = rec.socialSecurityEnabled
    ? (rec.socialSecurityItems || []).reduce((s, m) => s + Number(m.amount || 0), 0)
    : Number(rec.socialSecurity || 0);
  // netPay = ยอดโอนช่างจริง (หลังหักประกันสังคม)
  const netPay = total - socialSecurity;
  return { subTotal, vat, beforeWht, wht, advance, retention, socialSecurity, discountAmt, total, netPay };
};

// เงินประกันผลงานคงค้าง (held retention) ของทีมช่าง + โครงการ
// = ผลรวม retentionDeduction ของบิลปกติ − ผลรวมยอดจ่ายคืนที่ "อนุมัติแล้ว" (isRetentionPayout)
// excludeId = ข้ามบิลที่กำลังแก้ไขอยู่ (ไม่ให้นับตัวเอง)
const computeHeldRetention = (records, teamId, projectId, excludeId) => {
  if (!teamId || !projectId) return 0;
  let held = 0;
  (records || []).forEach((r) => {
    if (r.id === excludeId) return;
    if (r.type !== 'labor' && r.type !== 'lump-labor') return;
    if (r.workerTeamId !== teamId || r.projectId !== projectId) return;
    if (r.isRetentionPayout) {
      if (r.approved) held -= computeTotals(r).total;   // จ่ายคืนแล้ว (อนุมัติ) → ลดยอดคงค้าง
    } else if (!r.retentionReturned) {
      held += Number(r.retentionDeduction || 0);         // บิลปกติ → เพิ่มยอดคงค้าง
    }
  });
  return Math.max(0, held);
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
  const [dbReady,      setDbReady]      = useState(false);
  const [dbOnline,     setDbOnline]     = useState(false);
  const [view,         setView]         = useState('dashboard');
  const [sidebarOpen,  setSidebarOpen]  = useState(false);

  const [projects,    setProjects]    = useState(SEED_PROJECTS);
  const [matCats,     setMatCats]     = useState(SEED_MAT_CATEGORIES);
  const [machCats,    setMachCats]    = useState(SEED_MACH_CATEGORIES);
  const [laborCats,     setLaborCats]     = useState(SEED_LABOR_CATEGORIES);
  const [lumpLaborCats, setLumpLaborCats] = useState(SEED_LUMP_LABOR_CATEGORIES);
  const [otherCats,     setOtherCats]     = useState(SEED_OTHER_CATEGORIES);
  const [workerTeams, setWorkerTeams] = useState(SEED_WORKER_TEAMS);
  const [records,     setRecords]     = useState(seedRecords());
  // record ของโครงการที่เก็บถาวร — โหลดเมื่อเปิดแท็บ "เก็บถาวร" เท่านั้น (ไม่ปนกับ records หลัก)
  const [archivedRecords, setArchivedRecords] = useState([]);
  const [archivedLoaded,  setArchivedLoaded]  = useState(false);
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
      // ดึงข้อความ error จริงออกมาแสดง — ช่วย user diagnose ได้เอง
      let detail = err?.message || err?.hint || err?.details || err?.code || '';
      // แปล error ที่พบบ่อยให้เป็นภาษาไทย
      if (err?.code === '42703') {
        detail = 'คอลัมน์ไม่มีใน DB — โปรดรัน migration SQL ที่ค้างอยู่';
      } else if (err?.code === '23505') {
        detail = 'ข้อมูลซ้ำ — มีรายการที่มี ID นี้อยู่แล้ว';
      } else if (err?.code === '23503') {
        detail = 'อ้างอิงข้อมูลไม่ถูกต้อง (เช่น โครงการ/ทีมถูกลบไปแล้ว)';
      } else if (err?.code === '42P01') {
        detail = 'ตารางไม่มีใน DB — โปรดรัน schema.sql';
      } else if (err?.code === '23514') {
        // check_violation — ประเภทเอกสารยังไม่อยู่ใน CHECK constraint
        detail = 'ประเภทเอกสารยังไม่รองรับใน DB — โปรดรัน migration-invoice.sql ใน Supabase → SQL Editor';
      } else if (err?.message?.toLowerCase().includes('row-level security')) {
        detail = 'ไม่มีสิทธิ์ — RLS policy ไม่อนุญาต';
      }
      const shortLabel = { insertRecord: 'บันทึก', updateRecord: 'แก้ไข', deleteRecord: 'ลบ' }[label] || label;
      pushToast(`${shortLabel}ไม่สำเร็จ: ${detail || 'ไม่ทราบสาเหตุ'}`, 'error');
    });
  }, [pushToast]);

  // ── Load profile + app data after login ─────────────
  const loadProfileAndData = useCallback(async (userId) => {
    try {
      loadedUserIdRef.current = null; // mark as loading (clear previous)
      // Load profile separately — non-fatal if profiles table not set up yet
      try {
        const profile = await window.db.getProfile(userId);
        setUserProfile(profile);
      } catch (profileErr) {
        console.warn('[DB] ไม่สามารถโหลด profile (ตาราง profiles อาจยังไม่ได้สร้าง):', profileErr);
        // userProfile stays null → isAdmin = true (safe fallback)
      }

      const { projects: ps, matCats: mc, machCats: kc, laborCats: lc,
              lumpLaborCats: llc, otherCats: oc, workerTeams: teams, records: recs } = await window.db.loadAll();

      setProjects(ps);
      setMatCats(mc.length   ? mc  : SEED_MAT_CATEGORIES);
      setMachCats(kc.length  ? kc  : SEED_MACH_CATEGORIES);
      setLaborCats(lc.length ? lc  : SEED_LABOR_CATEGORIES);
      setOtherCats(oc && oc.length ? oc : SEED_OTHER_CATEGORIES);

      // lump-labor: ถ้า DB ว่างให้ใช้ seed และ persist ลง DB ทันที
      // (ป้องกัน seed กลับมาทุก refresh หลังลบ)
      if (llc && llc.length) {
        setLumpLaborCats(llc);
      } else {
        setLumpLaborCats(SEED_LUMP_LABOR_CATEGORIES);
        Promise.all(SEED_LUMP_LABOR_CATEGORIES.map(c => window.db.insertLumpLaborCat(c)))
          .catch(e => console.warn('[DB] auto-seed lump_labor_categories failed (non-fatal):', e));
      }

      setWorkerTeams(teams);
      setRecords(recs);
      setDbOnline(true);
      loadedUserIdRef.current = userId; // ✓ data loaded — mark for skip on next SIGNED_IN

      // Phase 2: โหลดรูปภาพ + บันทึกงาน เบื้องหลัง แล้ว merge เข้ากับ record (ไม่บล็อกการแสดงผลหลัก)
      if (typeof window.db.loadRecordMedia === 'function') {
        window.db.loadRecordMedia()
          .then((media) => setRecords((rs) => rs.map((r) => (media[r.id] ? { ...r, ...media[r.id] } : r))))
          .catch((e) => console.warn('[DB] โหลดรูปภาพเบื้องหลังไม่สำเร็จ (non-fatal):', e));
      }
    } catch (err) {
      console.error('[DB] โหลดข้อมูลไม่สำเร็จ:', err);
      // ── ถ้าเป็น auth error (token หมดอายุ/ถูกล้าง) → ออกจากระบบเพื่อให้ล็อกอินใหม่ ──
      // แทนที่จะค้างอยู่ที่ "ข้อมูลตัวอย่าง" ซึ่งชวนสับสน
      const msg = (err?.message || '').toLowerCase();
      const isAuthErr = err?.status === 401 || err?.code === 'PGRST301'
        || msg.includes('jwt') || msg.includes('refresh token')
        || msg.includes('not authenticated') || msg.includes('invalid token');
      if (isAuthErr) {
        pushToast('เซสชันหมดอายุ — กรุณาเข้าสู่ระบบใหม่', 'error');
        loadedUserIdRef.current = null;
        try { await window.supabaseClient.auth.signOut(); } catch (_) { /* ignore */ }
        setSession(null);
      } else {
        pushToast('โหลดข้อมูลไม่สำเร็จ — แสดงข้อมูลตัวอย่าง', 'error');
      }
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

    // Check existing session (with proper error handling)
    window.supabaseClient.auth.getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
        if (s) {
          loadProfileAndData(s.user.id);
        } else {
          setAuthChecked(true);
          setDbReady(true);
        }
      })
      .catch((err) => {
        console.error('[Auth] getSession failed:', err);
        // Don't crash — fall back to offline mode
        setAuthChecked(true);
        setDbReady(true);
      });

    // Listen for auth changes
    const { data: { subscription } } = window.supabaseClient.auth.onAuthStateChange(
      async (event, s) => {
        try {
          setSession(s);
          if (event === 'SIGNED_IN' && s) {
            if (loadedUserIdRef.current === s.user.id) {
              // Same user already loaded (token-refresh fires SIGNED_IN again) — skip
              console.log('[Auth] SIGNED_IN skipped — same user already loaded');
              return;
            }
            setDbReady(false);
            await loadProfileAndData(s.user.id);
          } else if (event === 'SIGNED_OUT') {
            loadedUserIdRef.current = null; // clear so next login loads fresh
            setUserProfile(null);
            setDbOnline(false);
            setView('dashboard');
            // Reset to seed data
            setProjects(SEED_PROJECTS);
            setMatCats(SEED_MAT_CATEGORIES);
            setMachCats(SEED_MACH_CATEGORIES);
            setLaborCats(SEED_LABOR_CATEGORIES);
            setLumpLaborCats(SEED_LUMP_LABOR_CATEGORIES);
            setOtherCats(SEED_OTHER_CATEGORIES);
            setWorkerTeams(SEED_WORKER_TEAMS);
            setRecords(seedRecords());
          } else if (event === 'TOKEN_REFRESHED' && s) {
            // Token was refreshed silently — keep current data, just update session
          }
        } catch (err) {
          console.error('[Auth] onAuthStateChange handler failed:', err);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tab visibility recovery ─────────────────────────
  // loadedUserIdRef — tracks which userId we've already fetched data for.
  // Set to the userId after a successful loadProfileAndData; cleared on sign-out.
  // Used by onAuthStateChange to skip re-loading when Supabase fires SIGNED_IN
  // for a token-refresh (same user, data already in memory).
  const loadedUserIdRef = useRef(null);

  // Keep a ref to the latest session so the handler below can read it
  // without being listed as a dependency (avoids re-registering on every login).
  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  // Ref ของ projects ล่าสุด — ใช้ใน realtime handler เพื่อเช็คสถานะโครงการ
  // โดยไม่ต้อง re-register subscription ทุกครั้งที่ projects เปลี่ยน
  const projectsRef = useRef(projects);
  useEffect(() => { projectsRef.current = projects; }, [projects]);

  // When the tab is backgrounded for a long time, Supabase's auto-refresh timer
  // gets throttled by the browser. On returning we silently verify the token.
  // We do NOT call loadProfileAndData here — that sets setDbReady(false) which
  // triggers a loading spinner mid-session and can cause render errors caught by
  // the ErrorBoundary. Supabase's onAuthStateChange already fires TOKEN_REFRESHED
  // and SIGNED_OUT events, so we don't need to do anything extra.
  useEffect(() => {
    if (!window.supabaseClient) return;

    let lastHiddenAt = 0;

    const onVisibility = async () => {
      if (document.visibilityState === 'hidden') {
        lastHiddenAt = Date.now();
        return;
      }
      // Visible again — only act if we were hidden for more than 60 s
      if (!lastHiddenAt || (Date.now() - lastHiddenAt) < 60000) return;
      lastHiddenAt = 0;

      try {
        const { data: { session: s } } = await window.supabaseClient.auth.getSession();
        if (!s && sessionRef.current) {
          // Session expired — onAuthStateChange handles the SIGNED_OUT event
          console.warn('[Auth] session expired while tab was hidden');
        }
        // If s is valid, Supabase already refreshed the token silently — nothing to do.
      } catch (err) {
        // Network error etc. — don't crash the app, let the user continue
        console.warn('[Auth] visibility re-check failed (non-fatal):', err);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
    };
  }, []); // ← empty deps: register once, read session via ref

  // ── Realtime subscriptions ──────────────────────────
  // เมื่อ dbOnline=true → subscribe Postgres changes ของทุก table
  // ทำให้ user เห็นข้อมูลที่ user คนอื่นบันทึกภายใน <1 วินาที โดยไม่ต้อง refresh
  useEffect(() => {
    if (!dbOnline || !window.db?.subscribe) return;

    const upsertById = (setter) => (item) => {
      setter((arr) => {
        const idx = arr.findIndex((x) => x.id === item.id);
        if (idx >= 0) {
          const next = [...arr];
          next[idx] = item;
          return next;
        }
        return [...arr, item];
      });
    };
    const removeById = (setter) => (id) => {
      setter((arr) => arr.filter((x) => x.id !== id));
    };

    const channel = window.db.subscribe({
      // records — prepend ถ้าใหม่, อัปเดตที่เดิมถ้ามีอยู่แล้ว
      onRecordChange: (rec) => {
        setRecords((rs) => {
          const idx = rs.findIndex((r) => r.id === rec.id);
          if (idx >= 0) {
            const next = [...rs];
            next[idx] = rec;
            return next;
          }
          return [rec, ...rs]; // ใหม่ → เอาขึ้นบนสุด (รวมโครงการเก็บถาวรด้วย)
        });
      },
      onRecordDelete: removeById(setRecords),

      // projects
      onProjectInsert: upsertById(setProjects),
      onProjectUpdate: upsertById(setProjects),
      onProjectDelete: (id) => {
        setRecords((rs) => rs.filter((r) => r.projectId !== id)); // cascade
        setProjects((ps) => ps.filter((p) => p.id !== id));
      },

      // categories
      onMatCatInsert:       upsertById(setMatCats),
      onMatCatUpdate:       upsertById(setMatCats),
      onMatCatDelete:       removeById(setMatCats),
      onMachCatInsert:      upsertById(setMachCats),
      onMachCatUpdate:      upsertById(setMachCats),
      onMachCatDelete:      removeById(setMachCats),
      onLaborCatInsert:     upsertById(setLaborCats),
      onLaborCatUpdate:     upsertById(setLaborCats),
      onLaborCatDelete:     removeById(setLaborCats),
      onLumpLaborCatInsert: upsertById(setLumpLaborCats),
      onLumpLaborCatUpdate: upsertById(setLumpLaborCats),
      onLumpLaborCatDelete: removeById(setLumpLaborCats),
      onOtherCatInsert:     upsertById(setOtherCats),
      onOtherCatUpdate:     upsertById(setOtherCats),
      onOtherCatDelete:     removeById(setOtherCats),

      // worker teams
      onTeamInsert: upsertById(setWorkerTeams),
      onTeamUpdate: upsertById(setWorkerTeams),
      onTeamDelete: removeById(setWorkerTeams),

      onStatusChange: (status) => {
        if (status === 'SUBSCRIBED') console.log('[RT] ✓ Realtime พร้อมใช้งาน');
        if (status === 'CHANNEL_ERROR') console.warn('[RT] ⚠ Realtime error — fallback to manual refresh');
      },
    });

    return () => window.db.unsubscribe?.(channel);
  }, [dbOnline]);

  // ── Fallback safety net: silent refresh เมื่อ tab กลับมา visible ─
  // ป้องกันกรณี Realtime พลาด event ระหว่างที่ tab อยู่ background
  useEffect(() => {
    if (!dbOnline) return;
    let lastRefresh = Date.now();
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return;
      // refresh เฉพาะถ้าผ่านมานานกว่า 30 วินาที (กัน burst)
      if (Date.now() - lastRefresh < 30000) return;
      lastRefresh = Date.now();
      try {
        const { records: recs } = await window.db.loadAll();
        setRecords(recs);
      } catch (e) {
        console.warn('[Refresh] silent reload failed (non-fatal):', e);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [dbOnline]);

  // ── Sign out ────────────────────────────────────────
  const signOut = useCallback(async () => {
    if (window.supabaseClient) await window.supabaseClient.auth.signOut();
  }, []);

  // ── Records ─────────────────────────────────────────
  const addRecord = useCallback((rec) => {
    // บันทึกผู้สร้างเอกสาร (snapshot ชื่อ ณ ตอนสร้าง) — ถ้ามีโปรไฟล์ผู้ใช้
    const creator = userProfile
      ? { id: userProfile.id, name: userProfile.full_name || userProfile.email || '', at: new Date().toISOString() }
      : (rec.createdBy || null);
    const newRec = { ...rec, id: newId(), createdBy: creator };
    setRecords((r) => [newRec, ...r]);
    if (dbOnline) dbSync(window.db.insertRecord(newRec), 'insertRecord');
    return newRec;
  }, [dbOnline, dbSync, userProfile]);

  const updateRecord = useCallback((id, patch) => {
    setRecords((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    if (dbOnline) dbSync(window.db.updateRecord(id, patch), 'updateRecord');
  }, [dbOnline, dbSync]);

  const deleteRecord = useCallback((id) => {
    setRecords((r) => r.filter((x) => x.id !== id));
    if (dbOnline) dbSync(window.db.deleteRecord(id), 'deleteRecord');
  }, [dbOnline, dbSync]);

  // ดึงข้อมูลเต็ม (รวมรูปภาพ + บันทึกงาน) ของ record เดียว แล้ว merge เข้า state
  // ใช้ตอนเปิดดูรายละเอียด/ก่อนแก้ไข — กันข้อมูลรูป/บันทึกงานหายเพราะโหลดแบบเบา (phase 1)
  const hydrateRecord = useCallback(async (id) => {
    if (!dbOnline || !id) return;
    try {
      const full = await window.db.fetchRecord(id);
      setRecords((rs) => rs.map((x) => (x.id === id ? { ...x, ...full } : x)));
    } catch (e) {
      console.warn('[DB] hydrateRecord ไม่สำเร็จ:', e?.message || e);
    }
  }, [dbOnline]);

  // ── Background cleanup: บีบอัดรูป base64 เก่าที่ทำให้ DB บวม/โหลดช้า ──
  // ทำงานครั้งเดียวหลังโหลดข้อมูล — ค่อย ๆ ย่อรูปทีละรายการเบื้องหลัง
  const optimizedRef = useRef(false);
  useEffect(() => {
    if (!dbOnline || optimizedRef.current || !records.length) return;
    if (typeof window.compressDataUrl !== 'function') return;
    optimizedRef.current = true;

    const BIG = 400000; // ~400KB ขึ้นไป (base64) ถือว่าใหญ่ ควรบีบอัด
    const b64of = (im) => (typeof im === 'string' ? im : (im && im.dataUrl)) || '';
    const isBig = (im) => { const s = b64of(im); return s.startsWith('data:') && s.length > BIG; };
    const shrink = async (arr) => {
      if (!Array.isArray(arr) || !arr.length) return null;
      let changed = false;
      const out = [];
      for (const im of arr) {
        if (isBig(im)) {
          const small = await window.compressDataUrl(b64of(im));
          if (small && small.length < b64of(im).length) { out.push(small); changed = true; continue; }
        }
        out.push(im);
      }
      return changed ? out : null;
    };

    (async () => {
      const snapshot = records.slice();
      for (const rec of snapshot) {
        try {
          const hasBig = (rec.images || []).some(isBig)
            || (rec.workLogs || []).some(l => (l.images || []).some(isBig));
          if (!hasBig) continue;

          const patch = {};
          const ni = await shrink(rec.images);
          if (ni) patch.images = ni;

          if (Array.isArray(rec.workLogs) && rec.workLogs.length) {
            let logsChanged = false;
            const newLogs = [];
            for (const l of rec.workLogs) {
              const li = await shrink(l.images);
              if (li) { logsChanged = true; newLogs.push({ ...l, images: li }); }
              else newLogs.push(l);
            }
            if (logsChanged) patch.workLogs = newLogs;
          }

          if (Object.keys(patch).length) {
            updateRecord(rec.id, patch);
            await new Promise(r => setTimeout(r, 1800)); // throttle กัน DB หนัก
          }
        } catch (e) { /* non-fatal */ }
      }
    })();
  }, [dbOnline, records, updateRecord]);

  // ── Projects ─────────────────────────────────────────
  const addProject = useCallback((p) => {
    const np = { ...p, id: newId() };
    setProjects((ps) => [...ps, np]);
    if (dbOnline) dbSync(window.db.insertProject(np), 'insertProject');
  }, [dbOnline, dbSync]);

  const deleteProject = useCallback((id) => {
    // ลบรายการทั้งหมดในโครงการออกจาก state ก่อน (ทั้ง active และที่เก็บถาวร)
    setRecords((rs) => rs.filter((r) => r.projectId !== id));
    setArchivedRecords((rs) => rs.filter((r) => r.projectId !== id));
    setProjects((ps) => ps.filter((p) => p.id !== id));
    // cascade ใน DB: ลบ records → record_items + work_logs → project
    if (dbOnline) dbSync(window.db.deleteProjectCascade(id), 'deleteProjectCascade');
  }, [dbOnline, dbSync]);

  const updateProject = useCallback((id, patch) => {
    setProjects((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    if (dbOnline) dbSync(window.db.updateProject(id, patch), 'updateProject');
  }, [dbOnline, dbSync]);

  // เก็บโครงการเข้าคลัง — เปลี่ยนสถานะอย่างเดียว (ซ่อนจากตัวเลือกโครงการ)
  // record ยังอยู่ใน memory → แดชบอร์ด/ประวัติยังนับรวมเหมือนเดิม
  const archiveProject = useCallback((id) => {
    updateProject(id, { status: 'archived' });
  }, [updateProject]);

  // นำกลับมา — เปลี่ยนสถานะ active (record อยู่ใน memory อยู่แล้ว)
  const unarchiveProject = useCallback((id) => {
    updateProject(id, { status: 'active' });
  }, [updateProject]);

  // คงไว้เพื่อความเข้ากันได้ — ตอนนี้โหลด record ทั้งหมดตั้งแต่ต้นแล้ว จึงเป็น no-op
  const loadArchivedRecords = useCallback(async () => {
    setArchivedLoaded(true);
  }, []);

  // ── Material categories ───────────────────────────────
  const addMatCat = useCallback((c) => {
    const nc = { ...c, id: newId() };
    setMatCats((cs) => [...cs, nc]);
    if (dbOnline) dbSync(window.db.insertMatCat(nc), 'insertMatCat');
  }, [dbOnline, dbSync]);

  const updateMatCat = useCallback((id, patch) => {
    setMatCats((cs) => cs.map((c) => c.id === id ? { ...c, ...patch } : c));
    if (dbOnline) dbSync(window.db.updateMatCat(id, patch), 'updateMatCat');
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

  const updateMachCat = useCallback((id, patch) => {
    setMachCats((cs) => cs.map((c) => c.id === id ? { ...c, ...patch } : c));
    if (dbOnline) dbSync(window.db.updateMachCat(id, patch), 'updateMachCat');
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

  const updateLaborCat = useCallback((id, patch) => {
    setLaborCats((cs) => cs.map((c) => c.id === id ? { ...c, ...patch } : c));
    if (dbOnline) dbSync(window.db.updateLaborCat(id, patch), 'updateLaborCat');
  }, [dbOnline, dbSync]);

  const deleteLaborCat = useCallback((id) => {
    setLaborCats((cs) => cs.filter((c) => c.id !== id));
    if (dbOnline) dbSync(window.db.deleteLaborCat(id), 'deleteLaborCat');
  }, [dbOnline, dbSync]);

  // ── Lump-labor categories ─────────────────────────────
  const addLumpLaborCat = useCallback((c) => {
    const nc = { ...c, id: newId() };
    setLumpLaborCats((cs) => [...cs, nc]);
    if (dbOnline) dbSync(window.db.insertLumpLaborCat(nc), 'insertLumpLaborCat');
  }, [dbOnline, dbSync]);

  const updateLumpLaborCat = useCallback((id, patch) => {
    setLumpLaborCats((cs) => cs.map((c) => c.id === id ? { ...c, ...patch } : c));
    if (dbOnline) dbSync(window.db.updateLumpLaborCat(id, patch), 'updateLumpLaborCat');
  }, [dbOnline, dbSync]);

  const deleteLumpLaborCat = useCallback((id) => {
    setLumpLaborCats((cs) => cs.filter((c) => c.id !== id));
    if (dbOnline) dbSync(window.db.deleteLumpLaborCat(id), 'deleteLumpLaborCat');
  }, [dbOnline, dbSync]);

  // ── Other-expense categories ──────────────────────────
  const addOtherCat = useCallback((c) => {
    const nc = { ...c, id: newId() };
    setOtherCats((cs) => [...cs, nc]);
    if (dbOnline) dbSync(window.db.insertOtherCat(nc), 'insertOtherCat');
  }, [dbOnline, dbSync]);

  const updateOtherCat = useCallback((id, patch) => {
    setOtherCats((cs) => cs.map((c) => c.id === id ? { ...c, ...patch } : c));
    if (dbOnline) dbSync(window.db.updateOtherCat(id, patch), 'updateOtherCat');
  }, [dbOnline, dbSync]);

  const deleteOtherCat = useCallback((id) => {
    setOtherCats((cs) => cs.filter((c) => c.id !== id));
    if (dbOnline) dbSync(window.db.deleteOtherCat(id), 'deleteOtherCat');
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

  // ── Update own profile (name / avatar_url) ───────────
  const updateMyProfile = useCallback(async (patch) => {
    if (!userProfile?.id) return;
    await window.db.updateProfile(userProfile.id, patch);
    setUserProfile(p => ({ ...p, ...patch }));
  }, [userProfile]);

  // ── Context value ────────────────────────────────────
  const value = useMemo(() => ({
    view, setView,
    sidebarOpen, setSidebarOpen,
    session, userProfile, isAdmin, signOut, dbOnline, updateMyProfile,
    projects, addProject, deleteProject, updateProject, archiveProject, unarchiveProject,
    archivedRecords, archivedLoaded, loadArchivedRecords,
    matCats, addMatCat, updateMatCat, deleteMatCat,
    machCats, addMachCat, updateMachCat, deleteMachCat,
    laborCats, addLaborCat, updateLaborCat, deleteLaborCat,
    lumpLaborCats, addLumpLaborCat, updateLumpLaborCat, deleteLumpLaborCat,
    otherCats, addOtherCat, updateOtherCat, deleteOtherCat,
    workerTeams, addWorkerTeam, updateWorkerTeam, deleteWorkerTeam,
    records, addRecord, updateRecord, deleteRecord, hydrateRecord,
    toasts, pushToast,
    detailId, setDetailId,
    editingId, setEditingId,
  }), [view, sidebarOpen, session, userProfile, isAdmin, signOut, dbOnline,
       projects, matCats, machCats, laborCats, lumpLaborCats, otherCats, workerTeams, records, toasts, detailId, editingId,
       archivedRecords, archivedLoaded, loadArchivedRecords,
       addRecord, updateRecord, deleteRecord, hydrateRecord, addProject, deleteProject, updateProject, archiveProject, unarchiveProject,
       addMatCat, updateMatCat, deleteMatCat, addMachCat, updateMachCat, deleteMachCat,
       addLaborCat, updateLaborCat, deleteLaborCat, addLumpLaborCat, updateLumpLaborCat, deleteLumpLaborCat,
       addOtherCat, updateOtherCat, deleteOtherCat,
       addWorkerTeam, updateWorkerTeam, deleteWorkerTeam, pushToast, updateMyProfile]);

  // ── Render guards ─────────────────────────────────────
  if (!authChecked) return <DbLoadingScreen msg="กำลังตรวจสอบสิทธิ์…" />;

  // Not logged in + Supabase is available → show login screen
  if (!session && window.supabaseClient) return <window.AuthScreen />;

  if (!dbReady) return <DbLoadingScreen msg="กำลังโหลดข้อมูล…" />;

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
};

// รายรับ (income) เก็บเป็น type 'other' + meta.kind='income' เพื่อไม่ต้องแก้ schema
// (รองรับ type 'income' โดยตรงด้วย เผื่อมีการรัน migration-income.sql)
const isIncome = (r) => !!(r && (r.type === 'income' || (r.meta && r.meta.kind === 'income')));

// expose helpers
Object.assign(window, { fmt, fmtInt, todayStr, fmtDate, newId, DOC_TYPES, computeTotals, computeHeldRetention, isIncome });
