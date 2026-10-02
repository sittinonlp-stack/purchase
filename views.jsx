/* global React */
// ============================
// Views: Dashboard, History, Projects, Categories
// ============================

// ---- Image helpers ----
// images อาจเป็น string (URL / base64 string จาก DB) หรือ object { dataUrl, name, id }
// ขึ้นอยู่กับว่า record ถูก load จาก DB หรือยังอยู่ใน memory ก่อน save
function imgSrc(img) {
  if (!img) return '';
  if (typeof img === 'string') return img;
  return img.dataUrl || img.url || '';
}
function imgAlt(img, fallback) {
  if (!img || typeof img === 'string') return fallback || '';
  return img.name || fallback || '';
}



// ---- Dashboard ----
// รายจ่ายจริง = type ที่เป็นบิลค่าใช้จ่าย และต้องไม่ใช่รายรับ (income)
// หมายเหตุ: รายรับเก็บเป็น type 'other' + meta.kind='income' จึงต้องเช็ค !isIncome ด้วย
//          มิฉะนั้นรายรับจะถูกนับเป็นรายจ่าย
const EXPENSE_TYPES = new Set(['material', 'machine', 'other', 'labor', 'lump-labor']);
const isExpense = (r) => EXPENSE_TYPES.has(r.type) && !window.isIncome(r);

// ประเภทที่ต้อง "อนุมัติ" ก่อนถึงจะนับเข้าแดชบอร์ด (จัดซื้อวัสดุ/เช่าเครื่องจักร/ค่าแรง)
// 'other' (เบ็ดเตล็ด) ไม่ต้องอนุมัติ — นับทันที
const NEEDS_APPROVAL = new Set(['material', 'machine', 'labor', 'lump-labor']);
const countsInDashboard = (r) => !NEEDS_APPROVAL.has(r.type) || !!r.approved;

// เอกสารที่ต้องออกแต่ยังไม่ได้ออก (docs ที่ยังไม่อยู่ใน docsIssued)
const pendingDocs = (r) => (r.docs || []).filter(d => !((r.docsIssued || []).includes(d)));

// ── ตามบิล: ใบกำกับภาษี/ใบเสร็จตัวจริงที่ร้านต้องส่งมาให้ ──
// เปิดใช้เฉพาะโครงการที่ตั้งค่า "ตามบิล" (proj.trackBills) และเฉพาะวัสดุ/เครื่องจักร
// สถานะ: '' หรือ 'pending' = รอรับบิล | 'received' = รับแล้ว | 'none' = ไม่ต้องตามบิล (เงินสด/ไม่มี VAT)
// ประวัติเก่า (บิลลงวันที่ก่อน BILL_TRACK_FROM = 10 ส.ค. 69) ถือว่าได้รับบิลแล้วโดยปริยาย
// เริ่มตามบิลจริงกับรายการที่ซื้อตั้งแต่ 11 ส.ค. 69 เป็นต้นไป
const BILL_TRACK_FROM = '2026-08-11';
const needsBill = (r, proj) => (r.type === 'material' || r.type === 'machine') && !!(proj && proj.trackBills);
const billDefault = (r) => (r.date && r.date < BILL_TRACK_FROM) ? 'received' : 'pending';
const billState = (r, proj) => needsBill(r, proj) ? (r.billStatus || billDefault(r)) : 'na';
const isBillPending = (r, proj) => billState(r, proj) === 'pending';

// 'YYYY-MM' → ป้ายเดือนภาษาไทย เช่น "มิถุนายน 2569"
function monthLabelTH(ym) {
  if (!ym) return '';
  const [y, mo] = ym.split('-');
  return new Date(Number(y), Number(mo) - 1, 1)
    .toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
}

// ยอดผ่อนเจ้าหนี้/เงินกู้ ที่ชำระแล้ว แมปเข้าแต่ละเดือน (งวดที่ i นับจากวันเริ่มผ่อน)
// คืน { byMonth:{'YYYY-MM':amount}, total } เฉพาะที่อยู่ในช่วง from–to (ว่าง = ไม่จำกัด)
function loanPaymentsByMonth(creditors, fromDate, toDate) {
  const byMonth = {}; let total = 0;
  (creditors || []).forEach(c => {
    const monthly = Number(c.monthlyPayment) || 0;
    const paid = Math.max(0, Math.round(Number(c.paidInstallments) || 0));
    if (monthly <= 0 || paid <= 0 || !c.startDate) return;
    const start = new Date(c.startDate + 'T00:00:00');
    if (isNaN(start)) return;
    for (let i = 0; i < paid; i++) {
      const d = new Date(start); d.setMonth(d.getMonth() + i);
      const ymd = d.toISOString().slice(0, 10);
      if (fromDate && ymd < fromDate) continue;
      if (toDate && ymd > toDate) continue;
      const ym = ymd.slice(0, 7);
      byMonth[ym] = (byMonth[ym] || 0) + monthly;
      total += monthly;
    }
  });
  return { byMonth, total };
}

// รายจ่ายประจำทุกเดือน — กระจายยอดเข้าแต่ละเดือน ตั้งแต่ startDate ถึง endDate (หรือเดือนปัจจุบันถ้าไม่มี)
// คืน { byMonth, byCat, total } เฉพาะเดือนในช่วง from–to
function recurringByMonth(recurrings, fromDate, toDate) {
  const byMonth = {}; const byCat = {}; let total = 0;
  const nowYm = new Date().toISOString().slice(0, 7);
  (recurrings || []).forEach(r => {
    const amt = Number(r.amount) || 0;
    if (amt <= 0 || !r.startDate) return;
    let startYm = r.startDate.slice(0, 7);
    let endYm = r.endDate ? r.endDate.slice(0, 7) : nowYm;
    const fromYm = fromDate ? fromDate.slice(0, 7) : startYm;
    const toYm = toDate ? toDate.slice(0, 7) : endYm;
    if (startYm < fromYm) startYm = fromYm;
    if (endYm > toYm) endYm = toYm;
    if (startYm > endYm) return;
    let [y, m] = startYm.split('-').map(Number);
    const [ey, em] = endYm.split('-').map(Number);
    let guard = 0;
    while ((y < ey || (y === ey && m <= em)) && guard++ < 600) {
      const ym = `${y}-${String(m).padStart(2, '0')}`;
      byMonth[ym] = (byMonth[ym] || 0) + amt;
      const cat = r.category || '—';
      byCat[cat] = (byCat[cat] || 0) + amt;
      total += amt;
      m++; if (m > 12) { m = 1; y++; }
    }
  });
  return { byMonth, byCat, total };
}

// ยอดยกมาจากปีก่อน (นับเป็นรับ ไม่หัก 15%) — แก้ไขได้เฉพาะ admin
function CarryoverEditor() {
  const app = window.useApp();
  const amount = Number(app.carryoverIncome || 0);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(amount));
  useEffect(() => { setVal(String(Number(app.carryoverIncome || 0))); }, [app.carryoverIncome]);
  const save = () => { app.setCarryoverIncome(Number(val) || 0); setEditing(false); app.pushToast('บันทึกยอดยกมาแล้ว'); };

  return (
    <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, display: 'grid', placeItems: 'center',
        background: 'rgba(5,150,105,0.12)', color: '#059669' }}>
        <Icon name="money" size={22} />
      </div>
      <div style={{ flex: '1 1 220px', minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>ยอดยกมาจากปีก่อน</div>
        <div className="text-small text-muted">นับเป็นรับ (ไม่หัก 15%) · รวมในยอดรับมุมมอง “ทุกช่วงเวลา” และรายงาน PDF</div>
      </div>
      <div className="row gap-8" style={{ alignItems: 'center', flexShrink: 0 }}>
        {editing && app.isAdmin ? (
          <>
            <div className="input-affix" style={{ width: 190 }}>
              <div className="input-affix-prefix">฿</div>
              <window.MoneyInput className="input mono" value={val} onChange={setVal} autoFocus placeholder="0" />
            </div>
            <button className="btn btn-accent btn-sm" onClick={save}><Icon name="save" size={13} /> บันทึก</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setVal(String(amount)); setEditing(false); }}>ยกเลิก</button>
          </>
        ) : (
          <>
            <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: '#059669' }}>฿{fmt(amount)}</span>
            {app.isAdmin && <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}><Icon name="edit" size={13} /> แก้ไข</button>}
          </>
        )}
      </div>
    </div>
  );
}

window.DashboardView = function DashboardView() {
  const app = window.useApp();

  // ── ตัวเลือกช่วงเวลา: เดือนล่าสุด (ค่าเริ่มต้น) / เลือกเดือน / ทั้งหมด ──
  const monthsAvailable = useMemo(() => {
    const set = new Set();
    app.records.forEach(r => { const k = (r.date || '').slice(0, 7); if (k) set.add(k); });
    return [...set].sort().reverse(); // เดือนล่าสุดอยู่หน้าสุด
  }, [app.records]);
  const [periodMode, setPeriodMode] = useState('month'); // 'month' | 'all'
  const [selMonth, setSelMonth] = useState('');
  // ตั้งค่าเริ่มต้นเป็นเดือนล่าสุดที่มีข้อมูล
  useEffect(() => {
    if (periodMode === 'month' && !selMonth && monthsAvailable.length) setSelMonth(monthsAvailable[0]);
  }, [monthsAvailable, periodMode, selMonth]);
  const activeMonth = selMonth || (monthsAvailable[0] || '');
  const periodRecords = useMemo(() => {
    if (periodMode === 'all' || !activeMonth) return app.records;
    return app.records.filter(r => (r.date || '').slice(0, 7) === activeMonth);
  }, [app.records, periodMode, activeMonth]);

  const stats = useMemo(() => {
    // รายจ่ายจริงเท่านั้น — ไม่รวม income, quick-receipt, receipt, tax-invoice, invoice
    const exp = periodRecords.filter(isExpense);
    // นับเฉพาะที่ผ่านเงื่อนไขอนุมัติ (วัสดุ/เครื่องจักร/ค่าแรง ต้องอนุมัติก่อน; อื่นๆ นับทันที)
    const matRecs   = exp.filter(r => (r.type === 'material' || r.type === 'machine' || r.type === 'other') && countsInDashboard(r));
    const laborRecs = exp.filter(r => (r.type === 'labor' || r.type === 'lump-labor') && r.approved);
    const allTotals = [...matRecs, ...laborRecs].map(r => computeTotals(r));
    const totalAmount = allTotals.reduce((s, t) => s + t.total, 0);
    const matCount  = matRecs.length;
    const laborCount = laborRecs.length;
    const matTotal   = matRecs.reduce((s, r) => s + computeTotals(r).total, 0);
    const laborTotal = laborRecs.reduce((s, r) => s + computeTotals(r).total, 0);
    const whtTotal = allTotals.reduce((s, t) => s + t.wht, 0);
    // เงินประกันสินค้า (deposit) — เฉพาะวัสดุ/เครื่องจักร ที่ยังวางอยู่ (รอรับคืน)
    const depositRecs = exp.filter(r =>
      (r.type === 'material' || r.type === 'machine') &&
      Number(r.depositAmount) > 0 &&
      (!r.depositStatus || r.depositStatus === 'pending'));
    const depositTotal = depositRecs.reduce((s, r) => s + Number(r.depositAmount), 0);
    const depositCount = depositRecs.length;
    // ── รายรับ (income) — หักค่าดำเนินการ 15% (เหลือ 85%) ──
    const incomeRecs  = periodRecords.filter(r => window.isIncome(r));
    const incomeGross = incomeRecs.reduce((s, r) => s + computeTotals(r).total, 0);
    const incomeFee   = incomeGross * 0.15;          // ค่าดำเนินการ 15%
    // ยอดยกมาจากปีก่อน — นับเป็นรับ (ไม่หัก 15%) · รวมเฉพาะมุมมอง "ทั้งหมด"
    const carry       = periodMode === 'all' ? Number(app.carryoverIncome || 0) : 0;
    const incomeTotal = (incomeGross - incomeFee) + carry; // ยอดรับสุทธิหลังหัก + ยกมา
    const incomeCount = incomeRecs.length;
    const netTotal    = incomeTotal - totalAmount;    // คงเหลือสุทธิ (รับหลังหัก − จ่าย)
    return { totalAmount, matCount, laborCount, matTotal, laborTotal, whtTotal, depositTotal, depositCount, incomeGross, incomeFee, incomeTotal, incomeCount, netTotal, carry };
  }, [periodRecords, periodMode, app.carryoverIncome]);

  // by-project chart (รายจ่ายจริงเท่านั้น)
  const byProject = useMemo(() => {
    const m = {};
    app.records.forEach((r) => {
      if (!isExpense(r)) return;
      if (!countsInDashboard(r)) return;
      const t = computeTotals(r).total;
      m[r.projectId] = (m[r.projectId] || 0) + t;
    });
    return app.projects.map((p) => ({ ...p, total: m[p.id] || 0 })).sort((a, b) => b.total - a.total);
  }, [app.records, app.projects]);
  const maxProj = Math.max(1, ...byProject.map(p => p.total));

  // last 6 months — synthetic mix using existing record dates
  const monthly = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleDateString('th-TH', { month: 'short' }), mat: 0, mach: 0, labor: 0 });
    }
    app.records.forEach((r) => {
      if (!isExpense(r)) return;
      if (!countsInDashboard(r)) return;
      const k = (r.date || '').slice(0, 7);
      const m = months.find(x => x.key === k);
      if (!m) return;
      const total = computeTotals(r).total;
      if (r.type === 'material') m.mat += total;
      else if (r.type === 'machine') m.mach += total;
      else if (r.type === 'labor' || r.type === 'lump-labor') m.labor += total;
      else if (r.type === 'other') m.other = (m.other || 0) + total;
    });
    return months;
  }, [app.records]);
  const maxMonth = Math.max(1, ...monthly.map(m => m.mat + m.mach + m.labor + (m.other || 0)));

  const recent = app.records.slice(0, 5);

  // pending deposits — records with deposit not yet returned
  const pendingDeposits = useMemo(() => app.records.filter(r =>
    Number(r.depositAmount) > 0 &&
    (!r.depositStatus || r.depositStatus === 'pending')
  ), [app.records]);
  const pendingDepositTotal = pendingDeposits.reduce((s, r) => s + Number(r.depositAmount), 0);

  const [exportOpen, setExportOpen] = useState(false);

  // ── Daily / Weekly summary ────────────────────────────
  const [periodTab, setPeriodTab] = useState('weekly');

  const daily = useMemo(() => {
    const DAY = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
    const todayKey = todayStr();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ key, label: key === todayKey ? 'วันนี้' : DAY[d.getDay()],
        isToday: key === todayKey, mat: 0, mach: 0, labor: 0, count: 0 });
    }
    app.records.forEach(r => {
      if (!isExpense(r)) return;
      if (!countsInDashboard(r)) return;
      const d = days.find(x => x.key === r.date); if (!d) return;
      const total = computeTotals(r).total;
      if (r.type === 'material') d.mat += total;
      else if (r.type === 'machine') d.mach += total;
      else if (r.type === 'labor' || r.type === 'lump-labor') d.labor += total;
      d.count++;
    });
    return days;
  }, [app.records]);

  const weekly = useMemo(() => {
    const today = new Date();
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const ref = new Date(today); ref.setDate(today.getDate() - i * 7);
      const dow = ref.getDay();
      const mon = new Date(ref); mon.setDate(ref.getDate() - (dow === 0 ? 6 : dow - 1));
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      const start = mon.toISOString().slice(0, 10);
      const end   = sun.toISOString().slice(0, 10);
      weeks.push({ start, end, isCurrentWeek: i === 0, mat: 0, mach: 0, labor: 0, count: 0,
        label: i === 0 ? 'สัปดาห์นี้'
          : `${mon.getDate()} ${mon.toLocaleDateString('th-TH', { month: 'short' })}` });
    }
    app.records.forEach(r => {
      if (!r.date || !isExpense(r)) return;
      if (!countsInDashboard(r)) return;
      const w = weeks.find(x => r.date >= x.start && r.date <= x.end); if (!w) return;
      const total = computeTotals(r).total;
      if (r.type === 'material') w.mat += total;
      else if (r.type === 'machine') w.mach += total;
      else if (r.type === 'labor' || r.type === 'lump-labor') w.labor += total;
      w.count++;
    });
    return weeks;
  }, [app.records]);

  const periodData = periodTab === 'daily' ? daily : weekly;
  const periodMax  = Math.max(1, ...periodData.map(d => d.mat + d.mach + d.labor));
  const periodSum  = periodData.reduce(
    (a, d) => ({ total: a.total + d.mat + d.mach + d.labor,
      mat: a.mat + d.mat, mach: a.mach + d.mach,
      labor: a.labor + d.labor, count: a.count + d.count }),
    { total: 0, mat: 0, mach: 0, labor: 0, count: 0 }
  );

  // Records inside the highlighted period (today / this week)
  const focusRecords = useMemo(() => {
    if (periodTab === 'daily') {
      const today = todayStr();
      return app.records.filter(r => r.date === today);
    }
    const cur = weekly[weekly.length - 1];
    return app.records.filter(r => r.date >= cur.start && r.date <= cur.end);
  }, [periodTab, app.records, weekly]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">แดชบอร์ด</h1>
          <div className="page-sub">ภาพรวมการจัดซื้อและการเช่าเครื่องจักรของทุกโครงการ</div>
        </div>
        <div className="row gap-8 dash-actions">
          <select className="select" value={periodMode === 'all' ? 'all' : activeMonth}
            onChange={(e) => {
              if (e.target.value === 'all') setPeriodMode('all');
              else { setPeriodMode('month'); setSelMonth(e.target.value); }
            }}
            title="เลือกช่วงเวลาที่ต้องการแสดงยอดรับ-จ่าย">
            {monthsAvailable.map((m, i) => (
              <option key={m} value={m}>{monthLabelTH(m)}{i === 0 ? ' (ล่าสุด)' : ''}</option>
            ))}
            <option value="all">ทั้งหมด</option>
          </select>
          <button className="btn btn-accent dash-export" onClick={() => setExportOpen(true)}
            title="ส่งออกรายงาน Excel สำหรับผู้บริหาร">
            <Icon name="download" size={14} /> ส่งออกรายงาน
          </button>
        </div>
      </div>

      {/* ป้ายบอกช่วงเวลาที่กำลังแสดง */}
      <div className="text-small text-muted" style={{ marginTop: -8, marginBottom: 16 }}>
        แสดงยอดของ: <strong style={{ color: 'var(--ink-1)' }}>
          {periodMode === 'all' ? 'ทุกช่วงเวลา' : (activeMonth ? monthLabelTH(activeMonth) : 'เดือนล่าสุด')}
        </strong>
      </div>

      {/* Pending deposit alert banner */}
      {pendingDeposits.length > 0 && (
        <div style={{
          display:'flex', alignItems:'flex-start', gap:16, padding:'14px 20px',
          background:'rgba(59,130,246,0.07)', border:'1px solid rgba(59,130,246,0.28)',
          borderRadius:14, marginBottom:20,
        }}>
          <div style={{
            width:38, height:38, borderRadius:10, flexShrink:0,
            background:'rgba(59,130,246,0.15)', display:'grid', placeItems:'center', color:'#3b82f6',
          }}><Icon name="bell" size={18} /></div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:600, fontSize:14, color:'#1e40af', marginBottom:6 }}>
              มีเงินค่าประกันสินค้า {pendingDeposits.length} รายการ รอรับคืน — ยอดรวม ฿{fmt(pendingDepositTotal)}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {pendingDeposits.map(r => {
                const proj = app.projects.find(p => p.id === r.projectId);
                return (
                  <button key={r.id}
                    onClick={() => app.setDetailId(r.id)}
                    style={{
                      display:'flex', alignItems:'center', gap:7, padding:'5px 12px',
                      borderRadius:20, border:'1px solid rgba(59,130,246,0.35)',
                      background:'rgba(59,130,246,0.1)', cursor:'pointer', fontFamily:'inherit',
                      fontSize:12, color:'#1e40af',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(59,130,246,0.18)'}
                    onMouseLeave={e => e.currentTarget.style.background='rgba(59,130,246,0.1)'}
                  >
                    <span className="proj-chip-dot" style={{ background: proj?.color || '#3b82f6' }}></span>
                    <span style={{ fontWeight:500 }}>{r.vendor}</span>
                    <span className="mono" style={{ fontWeight:700 }}>฿{fmt(Number(r.depositAmount))}</span>
                    <Icon name="chevron" size={11} stroke={2} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <CarryoverEditor />

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-label">ยอดรับทั้งหมด (หักค่าดำเนินการ 15%)</div>
          <div className="stat-value mono" style={{ color:'#059669' }}>฿{fmt(stats.incomeTotal)}</div>
          <div className="stat-delta"><Icon name="money" size={11} stroke={2.5} /> รับจริง ฿{fmt(stats.incomeGross)} − ค่าดำเนินการ ฿{fmt(stats.incomeFee)}{stats.carry > 0 ? ` + ยกมา ฿${fmt(stats.carry)}` : ''}</div>
          <div className="stat-icon green"><Icon name="money" size={18} /></div>
        </div>
        <div className="stat">
          <div className="stat-label">ยอดจ่ายทั้งหมด</div>
          <div className="stat-value mono">฿{fmt(stats.totalAmount)}</div>
          <div className="stat-delta"><Icon name="cart" size={11} stroke={2.5} /> รวมทุกประเภทรายจ่าย</div>
          <div className="stat-icon"><Icon name="money" size={18} /></div>
        </div>
        <div className="stat">
          <div className="stat-label">คงเหลือสุทธิ (รับ − จ่าย)</div>
          <div className="stat-value mono" style={{ color: stats.netTotal >= 0 ? '#059669' : '#dc2626' }}>
            {stats.netTotal < 0 ? '−' : ''}฿{fmt(Math.abs(stats.netTotal))}
          </div>
          <div className="stat-delta">
            <Icon name={stats.netTotal >= 0 ? 'arrowUp' : 'arrowDown'} size={11} stroke={2.5} />
            {stats.netTotal >= 0 ? ' เกินดุล (รับมากกว่าจ่าย)' : ' ขาดดุล (จ่ายมากกว่ารับ)'}
          </div>
          <div className="stat-icon" style={{ background: stats.netTotal >= 0 ? 'rgba(5,150,105,0.12)' : 'rgba(220,38,38,0.12)', color: stats.netTotal >= 0 ? '#059669' : '#dc2626' }}>
            <Icon name="percent" size={18} />
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">บิลวัสดุ / เครื่องจักร / อื่นๆ</div>
          <div className="stat-value mono">฿{fmt(stats.matTotal)}</div>
          <div className="stat-delta"><Icon name="cart" size={11} stroke={2.5} /> {fmtInt(stats.matCount)} บิล</div>
          <div className="stat-icon blue"><Icon name="cart" size={18} /></div>
        </div>
        <div className="stat">
          <div className="stat-label">บิลค่าแรง</div>
          <div className="stat-value mono">฿{fmt(stats.laborTotal)}</div>
          <div className="stat-delta"><Icon name="hammer" size={11} stroke={2.5} /> {fmtInt(stats.laborCount)} บิล · {app.workerTeams.length} ทีมช่าง</div>
          <div className="stat-icon" style={{ background: 'oklch(0.94 0.04 290)', color: 'oklch(0.50 0.14 290)' }}><Icon name="hammer" size={18} /></div>
        </div>
        <div className="stat">
          <div className="stat-label">เงินประกันสินค้า (วัสดุ/เครื่องจักร)</div>
          <div className="stat-value mono">฿{fmt(stats.depositTotal)}</div>
          <div className="stat-delta"><Icon name="clipboard" size={11} stroke={2.5} /> {fmtInt(stats.depositCount)} รายการ รอรับคืน · หัก ณ ที่จ่ายสะสม ฿{fmt(stats.whtTotal)}</div>
          <div className="stat-icon green"><Icon name="percent" size={18} /></div>
        </div>
      </div>

      {/* ── Daily / Weekly Summary Card ── */}
      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-header">
          <div>
            <div className="card-title">สรุปยอดจัดซื้อ</div>
            <div className="card-sub">{periodTab === 'daily' ? '7 วันล่าสุด' : '4 สัปดาห์ล่าสุด'}</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:20 }}>
            {/* Legend */}
            <div className="row gap-14" style={{ fontSize:11.5, color:'var(--ink-3)' }}>
              <span className="row gap-5"><span style={{ width:10,height:10,borderRadius:2,background:'var(--accent)',display:'inline-block' }}></span>วัสดุ</span>
              <span className="row gap-5"><span style={{ width:10,height:10,borderRadius:2,background:'oklch(0.55 0.16 235)',display:'inline-block' }}></span>เครื่องจักร</span>
              <span className="row gap-5"><span style={{ width:10,height:10,borderRadius:2,background:'oklch(0.55 0.14 290)',display:'inline-block' }}></span>ค่าแรง</span>
            </div>
            {/* Period toggle */}
            <div style={{ display:'flex', background:'var(--bg-2)', borderRadius:8, padding:3, gap:2 }}>
              {[['daily','รายวัน'],['weekly','รายสัปดาห์']].map(([tab,lbl]) => (
                <button key={tab} onClick={() => setPeriodTab(tab)} style={{
                  padding:'5px 14px', border:'none', cursor:'pointer', borderRadius:6,
                  fontSize:12, fontWeight:600, fontFamily:'inherit',
                  background: periodTab===tab ? 'var(--surface)' : 'transparent',
                  color:       periodTab===tab ? 'var(--ink-1)'   : 'var(--ink-3)',
                  boxShadow:   periodTab===tab ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
                  transition:'all .15s',
                }}>{lbl}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="card-body">
          {/* Mini stat pills */}
          <div className="period-stats" style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:22 }}>
            {[
              { label:'ยอดรวม',      value:`฿${fmt(periodSum.total)}`,         color:'var(--accent)' },
              { label:'จำนวนรายการ', value:`${fmtInt(periodSum.count)} บิล`,   color:'#64748b' },
              { label:'วัสดุ',       value:`฿${fmt(periodSum.mat)}`,            color:'var(--accent)' },
              { label:'เครื่องจักร', value:`฿${fmt(periodSum.mach)}`,           color:'oklch(0.55 0.16 235)' },
              { label:'ค่าแรง',      value:`฿${fmt(periodSum.labor)}`,          color:'oklch(0.55 0.14 290)' },
            ].map(s => (
              <div key={s.label} style={{ padding:'12px 14px', background:'var(--bg-2)',
                borderRadius:10, border:'1px solid var(--line)' }}>
                <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:14, fontWeight:700, color:s.color,
                  fontFamily:'var(--mono)', letterSpacing:'-0.3px', whiteSpace:'nowrap',
                  overflow:'hidden', textOverflow:'ellipsis' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Stacked bar chart */}
          <div className="bar-chart" style={{ height:148 }}>
            {periodData.map(d => {
              const total  = d.mat + d.mach + d.labor;
              const totalH = (total / periodMax) * 100;
              const matH   = total ? (d.mat   / total) * totalH : 0;
              const machH  = total ? (d.mach  / total) * totalH : 0;
              const laborH = total ? (d.labor / total) * totalH : 0;
              const isCur  = periodTab === 'daily' ? d.isToday : d.isCurrentWeek;
              const barKey = d.key || d.start;
              return (
                <div key={barKey} className="bar-wrap" style={{ opacity: isCur ? 1 : 0.6 }}>
                  <div style={{ width:'100%', maxWidth:42, display:'flex', flexDirection:'column',
                    height:'100%', justifyContent:'flex-end', position:'relative' }}>
                    {total > 0 && (
                      <span className="bar-value" style={{ fontSize:9.5 }}>
                        {total >= 1000000 ? (total/1000000).toFixed(1)+'M' : Math.round(total/1000)+'k'}
                      </span>
                    )}
                    {total === 0
                      ? <div style={{ height:3, borderRadius:3, background:'var(--line)', marginBottom:1 }}></div>
                      : <>
                          <div className="bar labor" style={{ height:laborH+'%',
                            background:'linear-gradient(180deg,oklch(0.72 0.14 290),oklch(0.55 0.14 290))',
                            borderRadius:(matH+machH)>0?'0':'6px 6px 0 0' }} />
                          <div className="bar alt" style={{ height:machH+'%',
                            borderRadius:matH>0?'0':(laborH>0?'0':'6px 6px 0 0') }} />
                          <div className="bar" style={{ height:matH+'%', borderRadius:'6px 6px 0 0',
                            filter:isCur?'brightness(1.12)':'' }} />
                        </>
                    }
                  </div>
                  <span className="bar-label" style={{
                    fontWeight: isCur ? 700 : 400,
                    color:      isCur ? 'var(--ink-1)' : 'var(--ink-3)',
                    fontSize:   isCur ? 11.5 : 11,
                  }}>{d.label}</span>
                </div>
              );
            })}
          </div>

          {/* Records for the focused period (today / this week) */}
          <div style={{ marginTop:20, paddingTop:16, borderTop:'1px solid var(--line)' }}>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--ink-2)', marginBottom:10 }}>
              {periodTab === 'daily' ? 'บิลวันนี้' : 'บิลสัปดาห์นี้'}
              {focusRecords.length > 0 && (
                <span style={{ marginLeft:8, fontWeight:400, color:'var(--ink-3)' }}>
                  ({focusRecords.length} รายการ — ฿{fmt(focusRecords.reduce((s,r)=>s+computeTotals(r).total,0))})
                </span>
              )}
            </div>

            {focusRecords.length === 0 ? (
              <div style={{ textAlign:'center', padding:'18px 0', color:'var(--ink-4)', fontSize:13 }}>
                ไม่มีรายการ{periodTab === 'daily' ? 'วันนี้' : 'สัปดาห์นี้'}
              </div>
            ) : (
              <>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {focusRecords.slice(0,6).map(r => {
                    const proj  = app.projects.find(p => p.id === r.projectId);
                    const total = computeTotals(r).total;
                    const isInc = window.isIncome(r);
                    const typeColor =
                      r.type === 'material'              ? 'var(--accent)' :
                      r.type === 'machine'               ? 'oklch(0.55 0.16 235)' :
                      r.type === 'labor'                 ? 'oklch(0.55 0.14 290)' :
                      r.type === 'lump-labor'            ? '#16a34a' :
                      r.type === 'receipt' || r.type === 'tax-invoice' ? '#059669' :
                      r.type === 'invoice'               ? '#1d4ed8' :
                      r.type === 'quick-receipt'         ? '#0ea5e9' :
                      isInc                              ? '#059669' :
                      '#6366f1';
                    const typeLabel =
                      r.type === 'material'              ? 'วัสดุ' :
                      r.type === 'machine'               ? 'เครื่องจักร' :
                      r.type === 'labor'                 ? 'ค่าแรง' :
                      r.type === 'lump-labor'            ? 'เหมาจ่าย' :
                      r.type === 'receipt'               ? 'ใบเสร็จ' :
                      r.type === 'tax-invoice'           ? 'ใบกำกับภาษี' :
                      r.type === 'invoice'               ? 'ใบแจ้งหนี้' :
                      r.type === 'quick-receipt'         ? 'บิลด่วน' :
                      isInc                              ? 'รายรับ' :
                      'อื่นๆ';
                    const typeBg =
                      r.type === 'material'              ? 'rgba(217,119,6,0.12)' :
                      r.type === 'machine'               ? 'rgba(14,165,233,0.12)' :
                      r.type === 'labor'                 ? 'rgba(124,58,237,0.12)' :
                      r.type === 'lump-labor'            ? 'rgba(22,163,74,0.12)' :
                      r.type === 'receipt' || r.type === 'tax-invoice' ? 'rgba(5,150,105,0.12)' :
                      r.type === 'invoice'               ? 'rgba(29,78,216,0.12)' :
                      r.type === 'quick-receipt'         ? 'rgba(14,165,233,0.12)' :
                      isInc                              ? 'rgba(5,150,105,0.12)' :
                      'rgba(99,102,241,0.12)';
                    return (
                      <div key={r.id}
                        onClick={() => app.setDetailId(r.id)}
                        style={{ display:'flex', alignItems:'center', gap:12,
                          padding:'10px 14px', borderRadius:9, border:'1px solid var(--line)',
                          cursor:'pointer', transition:'background .12s' }}
                        onMouseEnter={e => e.currentTarget.style.background='var(--bg-2)'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        {/* Type dot */}
                        <span style={{ width:8, height:8, borderRadius:'50%',
                          background:typeColor, flexShrink:0 }}></span>
                        {/* Doc no */}
                        <span className="mono" style={{ fontSize:11.5, color:'var(--ink-3)',
                          flexShrink:0, minWidth:100 }}>{r.docNo}</span>
                        {/* Project + vendor */}
                        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:1 }}>
                          <span style={{ fontSize:13, fontWeight:500, overflow:'hidden',
                            textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {r.vendor || '—'}
                          </span>
                          {proj && (
                            <span style={{ fontSize:11, color:'var(--ink-3)', display:'flex',
                              alignItems:'center', gap:4 }}>
                              <span style={{ width:6, height:6, borderRadius:'50%',
                                background:proj.color, display:'inline-block' }}></span>
                              {proj.name}
                            </span>
                          )}
                        </div>
                        {/* Type badge */}
                        <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px',
                          borderRadius:20, flexShrink:0,
                          background: typeBg,
                          color: typeColor }}>
                          {typeLabel}
                        </span>
                        {/* Amount */}
                        <span className="mono" style={{ fontSize:13.5, fontWeight:700,
                          color:'var(--ink-1)', flexShrink:0 }}>
                          ฿{fmt(total)}
                        </span>
                        <Icon name="chevron" size={12} stroke={2} />
                      </div>
                    );
                  })}
                </div>
                {focusRecords.length > 6 && (
                  <button className="btn btn-ghost btn-sm"
                    style={{ alignSelf:'center', margin:'10px auto 0', display:'flex' }}
                    onClick={() => app.setView('history')}>
                    ดูทั้งหมด {focusRecords.length} รายการ <Icon name="chevron" size={11} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, marginTop: 18 }} className="dash-row">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">ยอดจัดซื้อรายเดือน</div>
              <div className="card-sub">เปรียบเทียบวัสดุและเครื่องจักร 6 เดือนล่าสุด</div>
            </div>
            <div className="row gap-16" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
              <span className="row gap-6"><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent)' }}></span> วัสดุ</span>
              <span className="row gap-6"><span style={{ width: 10, height: 10, borderRadius: 2, background: 'oklch(0.55 0.16 235)' }}></span> เครื่องจักร</span>
              <span className="row gap-6"><span style={{ width: 10, height: 10, borderRadius: 2, background: 'oklch(0.55 0.14 290)' }}></span> ค่าแรง</span>
            </div>
          </div>
          <div className="card-body">
            <div className="bar-chart">
              {monthly.map((m) => {
                const total = m.mat + m.mach + m.labor;
                const totalH = (total / maxMonth) * 100;
                const matH = total ? (m.mat / total) * totalH : 0;
                const machH = total ? (m.mach / total) * totalH : 0;
                const laborH = total ? (m.labor / total) * totalH : 0;
                return (
                  <div key={m.key} className="bar-wrap">
                    <div style={{ width: '100%', maxWidth: 36, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
                      {total > 0 && <span className="bar-value">฿{Math.round(total/1000)}k</span>}
                      <div className="bar labor" style={{ height: laborH + '%', borderRadius: (matH + machH) > 0 ? '0' : '6px 6px 0 0', background: 'linear-gradient(180deg, oklch(0.72 0.14 290) 0%, oklch(0.55 0.14 290) 100%)' }}></div>
                      <div className="bar alt" style={{ height: machH + '%', borderRadius: matH > 0 ? '0' : (laborH > 0 ? '0' : '6px 6px 0 0') }}></div>
                      <div className="bar" style={{ height: matH + '%', borderRadius: '6px 6px 0 0' }}></div>
                    </div>
                    <span className="bar-label">{m.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">ยอดต่อโครงการ</div>
              <div className="card-sub">เรียงจากสูงไปต่ำ</div>
            </div>
          </div>
          <div className="card-body col gap-16">
            {byProject.map((p) => (
              <div key={p.id} className="col gap-6">
                <div className="row between">
                  <div className="row gap-8" style={{ minWidth: 0, flex: 1 }}>
                    <span className="proj-chip-dot" style={{ background: p.color }}></span>
                    <span style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  </div>
                  <span className="mono" style={{ fontSize: 12.5, fontWeight: 500 }}>฿{fmt(p.total)}</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-2)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: ((p.total / maxProj) * 100) + '%', background: p.color, borderRadius: 99, transition: 'width 400ms ease' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card mt-20">
        <div className="card-header">
          <div>
            <div className="card-title">รายการล่าสุด</div>
            <div className="card-sub">บิลที่บันทึก 5 รายการล่าสุด</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => app.setView('history')}>
            ดูทั้งหมด <Icon name="chevron" size={12} />
          </button>
        </div>
        <RecordsTable records={recent} onOpen={(id) => app.setDetailId(id)} />
      </div>

      {exportOpen && (
        <ExportReportModal
          open={exportOpen}
          onClose={() => setExportOpen(false)}
        />
      )}

      <style>{`
        @media (max-width: 1100px) {
          .dash-row { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 860px) {
          .period-stats { grid-template-columns: repeat(3,1fr) !important; }
        }
        @media (max-width: 600px) {
          .period-stats { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </>
  );
};

// ---- Shared records table ----
// ---- Accounting checkbox — ปุ่มติ๊กลงบัญชี ----
function AccCheckbox({ record }) {
  const app = window.useApp();
  const posted = !!record.accountingPosted;
  const toggle = (e) => {
    e.stopPropagation();
    app.updateRecord(record.id, { accountingPosted: !posted });
  };
  return (
    <button
      onClick={toggle}
      className={'status-chip' + (posted ? ' on acct' : '')}
      title={posted ? 'ลงบัญชีแล้ว — คลิกเพื่อยกเลิก' : 'คลิกเพื่อทำเครื่องหมายว่าลงบัญชีแล้ว'}
    >
      <span className="tick">{posted ? '✓' : ''}</span> บัญชี
    </button>
  );
}

// ---- Approve checkbox — อนุมัติโดย Admin เท่านั้น ----
function ApproveCheckbox({ record }) {
  const app = window.useApp();
  const approved = !!record.approved;

  const toggle = (e) => {
    e.stopPropagation();
    if (!app.isAdmin) return; // กันไม่ให้ non-admin แก้ไข
    const next = !approved;
    // บันทึกวันที่อนุมัติตอนติ๊กครั้งแรก (ใช้บนตราปั๊มใบอนุมัติ)
    app.updateRecord(record.id, next
      ? { approved: true, approvedDate: record.approvedDate || todayStr() }
      : { approved: false });
  };

  // non-admin: แสดงเฉพาะสถานะ ไม่ให้กด
  if (!app.isAdmin) {
    return (
      <div className={'status-chip' + (approved ? ' on approve' : '')} title={approved ? 'อนุมัติแล้ว' : 'รออนุมัติ'} style={{ cursor: 'default' }}>
        <span className="tick">{approved ? '✓' : ''}</span> {approved ? 'อนุมัติแล้ว' : 'รออนุมัติ'}
      </div>
    );
  }

  return (
    <button
      onClick={toggle}
      className={'status-chip' + (approved ? ' on approve' : '')}
      title={approved ? 'อนุมัติแล้ว — คลิกเพื่อยกเลิก' : 'คลิกเพื่ออนุมัติ (Admin)'}
    >
      <span className="tick">{approved ? '✓' : ''}</span> {approved ? 'อนุมัติแล้ว' : 'อนุมัติ'}
    </button>
  );
}

// ---- Paid button + modal — บันทึกการจ่ายเงินจริง (สลิป + วันที่โอน) ----
// แสดงเฉพาะบิลที่ "อนุมัติแล้ว + ลงบัญชีแล้ว" — เก็บวันที่โอนจริงแยกจากวันที่สร้างเอกสาร
function PaidButton({ record }) {
  const app = window.useApp();
  const [open, setOpen]   = useState(false);
  const [date, setDate]   = useState(record.paidDate || todayStr());
  const [slips, setSlips] = useState(record.paidSlips || []);
  const paid     = !!record.paid;
  const eligible = record.approved;   // ขึ้นปุ่มเมื่ออนุมัติแล้ว (ไม่เกี่ยวกับสถานะบัญชี)

  // ยังไม่อนุมัติ และยังไม่จ่าย → ยังจ่ายไม่ได้
  if (!eligible && !paid) {
    return <span style={{ fontSize: 11, color: 'var(--ink-4)' }} title="ต้องกดอนุมัติก่อนจึงบันทึกการจ่ายได้">—</span>;
  }

  const openModal = (e) => {
    e.stopPropagation();
    setDate(record.paidDate || todayStr());
    setSlips(record.paidSlips || []);
    setOpen(true);
  };
  const save = () => {
    if (!date) return app.pushToast('โปรดระบุวันที่โอน', 'error');
    app.updateRecord(record.id, { paid: true, paidDate: date, paidSlips: slips });
    app.pushToast('บันทึกการจ่ายเงินแล้ว ✓');
    setOpen(false);
  };
  const unpay = () => {
    app.updateRecord(record.id, { paid: false });
    app.pushToast('ยกเลิกสถานะจ่ายแล้ว');
    setOpen(false);
  };

  return (
    <>
      {paid ? (
        <button onClick={openModal} className="status-chip on paid" title={`จ่ายแล้ว ${fmtDate(record.paidDate)} — คลิกดู/แก้ไข`}
          style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="tick">✓</span> จ่ายแล้ว</span>
          {record.paidDate && <span className="mono" style={{ fontSize: 10, fontWeight: 500, opacity: 0.85, paddingLeft: 21 }}>{fmtDate(record.paidDate)}</span>}
        </button>
      ) : (
        <button onClick={openModal} className="status-chip paid" title="บันทึกการจ่ายเงิน (แนบสลิป + วันที่โอน)">
          <span className="tick"></span> จ่าย
        </button>
      )}

      {open && ReactDOM.createPortal(
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">บันทึกการจ่ายเงิน</h2>
              <button className="btn-icon" onClick={() => setOpen(false)}><Icon name="x" size={16} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, fontSize: 12.5, color: 'var(--ink-2)' }}>
                <span className="mono">{record.docNo}</span> · {record.vendor}
                <div style={{ marginTop: 2 }}>ยอดสุทธิ <strong className="mono" style={{ color: 'var(--ink-1)' }}>฿{fmt(computeTotals(record).total)}</strong></div>
              </div>
              <div className="field">
                <label className="field-label">วันที่โอน <span className="req">*</span></label>
                <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
                <div className="field-hint">วันที่โอนเงินจริง — บัญชีใช้วันนี้ในการออกเอกสาร (ไม่ใช่วันที่สร้างบิล)</div>
              </div>
              <div className="field">
                <label className="field-label">สลิปการโอน</label>
                <window.ImageUploader images={slips} onChange={setSlips} max={3} />
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {paid && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', marginRight: 'auto' }} onClick={unpay}>ยกเลิกจ่ายแล้ว</button>}
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>ยกเลิก</button>
              <button className="btn btn-accent" onClick={save}><Icon name="check" size={14} /> บันทึก</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ---- แบ่งจ่ายเป็นงวด: ตารางงวด + จ่ายทีละงวด (ในหน้ารายละเอียดบิล) ----
function InstallmentPayPanel({ rec }) {
  const app = window.useApp();
  const inst = rec.installments || [];
  const t = computeTotals(rec);
  const whtRate = rec.whtEnabled ? Number(rec.whtRate || 0) / 100 : 0;
  const [payId, setPayId] = useState(null);
  const [date, setDate] = useState(todayStr());
  const [slips, setSlips] = useState([]);
  const [note, setNote] = useState('');

  const openPay = (it) => { setPayId(it.id); setDate(it.date || todayStr()); setSlips(it.slips || []); setNote(it.note || ''); };
  const commit = (nextInst) => {
    const allPaid = nextInst.length > 0 && nextInst.every(i => i.paid);
    const paidDates = nextInst.filter(i => i.paid && i.date).map(i => i.date).sort();
    app.updateRecord(rec.id, { installments: nextInst, paid: allPaid, paidDate: allPaid ? (paidDates.slice(-1)[0] || rec.paidDate || '') : '' });
  };
  const savePay = () => {
    if (!date) return app.pushToast('โปรดระบุวันที่จ่าย', 'error');
    commit(inst.map(i => i.id === payId ? { ...i, paid: true, date, slips, note } : i));
    app.pushToast('บันทึกจ่ายงวดแล้ว ✓'); setPayId(null);
  };
  const unpay = (it) => { commit(inst.map(i => i.id === it.id ? { ...i, paid: false, date: '', slips: [], note: '' } : i)); app.pushToast('ยกเลิกการจ่ายงวดนี้'); };

  const paidGross = t.instPaidGross, outstanding = t.outstanding;
  const canPay = rec.approved;

  return (
    <div className="detail-section">
      <h3 style={{ fontSize: 13, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>แบ่งจ่ายเป็นงวด</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ background: 'var(--surface-2)', padding: '10px 12px' }}><div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>ยอดสัญญา</div><div className="mono" style={{ fontWeight: 600, marginTop: 2 }}>฿{fmt(t.beforeWht)}</div></div>
        <div style={{ background: 'var(--surface-2)', padding: '10px 12px' }}><div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>จ่ายแล้ว</div><div className="mono" style={{ fontWeight: 600, marginTop: 2, color: 'var(--accent-strong)' }}>฿{fmt(paidGross)}</div></div>
        <div style={{ background: 'var(--surface-2)', padding: '10px 12px' }}><div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>คงค้าง</div><div className="mono" style={{ fontWeight: 700, marginTop: 2, color: outstanding > 0 ? 'var(--warn)' : 'var(--success, #16a34a)' }}>{outstanding > 0 ? '฿' + fmt(outstanding) : '✓ ครบ'}</div></div>
      </div>
      {!canPay && <div className="field-hint" style={{ marginBottom: 10, color: 'var(--warn)' }}>ต้องกดอนุมัติบิลก่อน จึงจะจ่ายงวดได้</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {inst.map((it, idx) => {
          const wht = Number(it.amount || 0) * whtRate;
          const net = Number(it.amount || 0) - wht;
          return (
            <div key={it.id} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', background: it.paid ? 'rgba(5,150,105,0.05)' : 'var(--surface-2)' }}>
              <div className="row between" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <span className="badge gray" style={{ marginRight: 8 }}>งวด {idx + 1}</span>
                  <span className="mono" style={{ fontWeight: 600 }}>฿{fmt(it.amount)}</span>
                  {whtRate > 0 && <span style={{ fontSize: 11.5, color: 'var(--ink-3)', marginLeft: 8 }}>หัก ณ ที่จ่าย ฿{fmt(wht)} · จ่ายจริง ฿{fmt(net)}</span>}
                  {it.detail && <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 2 }}>{it.detail}</div>}
                  {it.paid && it.date && <div style={{ fontSize: 11.5, color: 'var(--accent-ink)', marginTop: 3 }}>✓ จ่ายแล้ว {fmtDate(it.date)}{(it.slips || []).length > 0 ? ` · แนบสลิป ${it.slips.length}` : ''}</div>}
                </div>
                {it.paid
                  ? <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => unpay(it)}>ยกเลิกจ่าย</button>
                  : <button className="btn btn-accent btn-sm" onClick={() => canPay ? openPay(it) : app.pushToast('กรุณากดอนุมัติบิลก่อน จึงจะจ่ายงวดได้', 'error')}><Icon name="check" size={13} /> จ่ายงวดนี้</button>}
              </div>
            </div>
          );
        })}
      </div>

      {payId && ReactDOM.createPortal(
        <div className="modal-overlay" onClick={() => setPayId(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">บันทึกจ่ายงวด</h2><button className="btn-icon" onClick={() => setPayId(null)}><Icon name="x" size={16} /></button></div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field"><label className="field-label">วันที่จ่าย <span className="req">*</span></label><input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
              <div className="field"><label className="field-label">สลิปการโอน</label><window.ImageUploader images={slips} onChange={setSlips} max={3} /></div>
              <div className="field"><label className="field-label">หมายเหตุ (ถ้ามี)</label><input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="เช่น จ่ายเงินสด / โอนบางส่วน" /></div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setPayId(null)}>ยกเลิก</button>
              <button className="btn btn-accent" onClick={savePay}><Icon name="check" size={14} /> บันทึกจ่ายงวด</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ---- ปุ่มพิมพ์ใบอนุมัติสั่งจ่าย (แสดงเมื่ออนุมัติแล้ว) — พิมพ์ได้จากแถวเลย ----
// สร้าง record สำหรับพิมพ์ใบอนุมัติ — ถ้าแบ่งจ่ายเป็นงวด ให้ดึง "งวดปัจจุบัน" (งวดถัดไปที่ยังไม่จ่าย)
function installmentPrintRec(record) {
  if (!record.installmentEnabled || !(record.installments || []).length) return record;
  const inst = record.installments;
  let idx = inst.findIndex(i => !i.paid);
  if (idx < 0) idx = inst.length - 1;   // จ่ายครบแล้ว → งวดสุดท้าย
  return { ...record, _printInstallment: inst[idx], _printInstallmentIndex: idx, _printInstallmentCount: inst.length };
}

function ApprovalPrintButton({ record }) {
  const app = window.useApp();
  if (!record.approved) return null;
  const print = (e) => {
    e.stopPropagation();
    const c = window.getCompanySettings();
    window.openPrintPopup(window.PrintablePaymentApproval, 'ใบอนุมัติสั่งจ่าย ' + record.docNo, installmentPrintRec(record), c, app);
  };
  return (
    <button onClick={print} title="พิมพ์ใบอนุมัติสั่งจ่าย สำหรับส่งฝ่ายบัญชี"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
        border: '1.5px solid var(--info)', background: 'rgba(37,99,235,0.08)', color: 'var(--info)', fontSize: 12, fontWeight: 600, lineHeight: 1 }}>
      <Icon name="receipt" size={13} /> ใบอนุมัติ
    </button>
  );
}

// ---- ตามบิล: บันทึกการรับใบกำกับภาษี/ใบเสร็จจากร้าน (ในหน้ารายละเอียด) ----
function BillReceiveSection({ rec }) {
  const app = window.useApp();
  const status = rec.billStatus || billDefault(rec);   // pending | received | none (เก่ากว่า 11 ส.ค. 69 = received)
  const [date, setDate] = useState(rec.billDate || todayStr());
  const [no, setNo]     = useState(rec.billNo || '');
  const [imgs, setImgs] = useState(rec.billImages || []);

  const saveReceived = () => {
    if (!date) return app.pushToast('โปรดระบุวันที่รับบิล', 'error');
    app.updateRecord(rec.id, { billStatus: 'received', billDate: date, billNo: no.trim(), billImages: imgs });
    app.pushToast(status === 'received' ? 'บันทึกข้อมูลบิลแล้ว ✓' : 'บันทึกรับใบกำกับภาษีแล้ว ✓');
  };
  const markNone = () => {
    app.updateRecord(rec.id, { billStatus: 'none' });
    app.pushToast('ทำเครื่องหมาย: ไม่ต้องตามบิล');
  };
  const reopen = () => {
    app.updateRecord(rec.id, { billStatus: 'pending' });
    app.pushToast('กลับเป็นสถานะรอรับบิล');
  };

  const banner = status === 'received'
    ? { bg: 'var(--accent-soft)', bd: 'rgba(5,150,105,0.35)', fg: 'var(--accent-ink)', text: '✓ รับใบกำกับภาษี/ใบเสร็จจากร้านแล้ว' + (rec.billDate ? ' · ' + fmtDate(rec.billDate) : '') }
    : status === 'none'
    ? { bg: 'var(--surface-2)', bd: 'var(--line)', fg: 'var(--ink-3)', text: 'ไม่ต้องตามบิล (เงินสด / ไม่มีใบกำกับภาษี)' }
    : { bg: 'var(--warn-soft)', bd: 'rgba(217,119,6,0.35)', fg: '#96590a', text: '📥 รอรับใบกำกับภาษี/ใบเสร็จตัวจริงจากร้าน' };

  return (
    <div className="detail-section">
      <h3 style={{ fontSize: 13, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>ใบกำกับภาษี/ใบเสร็จจากร้าน</h3>
      <div style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid ' + banner.bd, background: banner.bg, color: banner.fg, fontSize: 12.5, fontWeight: 600, marginBottom: 12 }}>{banner.text}</div>

      {status !== 'none' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="row gap-12" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: '1 1 150px', margin: 0 }}>
              <label className="field-label">วันที่รับบิล <span className="req">*</span></label>
              <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="field" style={{ flex: '1 1 180px', margin: 0 }}>
              <label className="field-label">เลขที่ใบกำกับภาษี</label>
              <input className="input" value={no} onChange={e => setNo(e.target.value)} placeholder="ถ้ามี" />
            </div>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label className="field-label">รูปถ่ายใบกำกับภาษี/ใบเสร็จ</label>
            <window.ImageUploader images={imgs} onChange={setImgs} max={5} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        {status !== 'none' && (
          <button className="btn btn-accent btn-sm" onClick={saveReceived}>
            <Icon name="check" size={13} /> {status === 'received' ? 'บันทึกการแก้ไข' : 'รับบิลแล้ว'}
          </button>
        )}
        {status === 'pending' && (
          <button className="btn btn-ghost btn-sm" onClick={markNone}>ไม่ต้องตามบิล</button>
        )}
        {status === 'received' && (
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={reopen}>ยกเลิกรับบิล (กลับไปรอ)</button>
        )}
        {status === 'none' && (
          <button className="btn btn-ghost btn-sm" onClick={reopen}>กลับเป็นรอรับบิล</button>
        )}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 8, lineHeight: 1.5 }}>
        ใช้ตามบิลกับร้านให้ครบก่อนยื่นภาษีซื้อ — กด "รับบิลแล้ว" เมื่อได้ใบกำกับภาษีตัวจริง แล้วรายการจะหลุดจากตัวกรอง "ตามบิล"
      </div>
    </div>
  );
}

// แถวเดียวของตาราง — memoize เพื่อไม่ให้ทุกแถว re-render เวลากดปุ่มในแถวใดแถวหนึ่ง (ตารางมีหลายร้อยแถว)
const RecordRow = React.memo(function RecordRow({ r, projects, showApprove, showPaid, onOpen }) {
  const proj = projects.find(p => p.id === r.projectId);
  const total = computeTotals(r).total;
  // อนุมัติแล้วแต่ยังไม่จ่าย → กระพริบเตือน; จ่ายแล้ว = เขียวจาง; ลงบัญชี = เขียวอ่อน
  const pulse = r.approved && !r.paid;
  const rowBg = pulse ? undefined
    : (r.approved && r.paid) ? 'rgba(5,150,105,0.05)'
    : r.accountingPosted ? 'rgba(5,150,105,0.04)' : undefined;
  return (
    <tr onClick={() => onOpen(r.id)} className={pulse ? 'pulse-approved' : undefined} style={{ background: rowBg }}>
      {/* ── Accounting checkbox ── */}
      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        <AccCheckbox record={r} />
      </td>
      {/* ── สถานะ: อนุมัติ + ใบอนุมัติสั่งจ่าย (showApprove=true) ── */}
      {showApprove && (
        <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            <ApproveCheckbox record={r} />
            <ApprovalPrintButton record={r} />
          </div>
        </td>
      )}
      <td className="mono hide-mobile" style={{ fontSize: 12.5, fontWeight: 500 }}>{r.docNo}</td>
      <td className="hide-mobile" style={{ color: 'var(--ink-2)' }}>{fmtDate(r.date)}</td>
      <td className="hide-mobile">
        <div className="row gap-8">
          <span className="proj-chip-dot" style={{ background: proj?.color || '#999' }}></span>
          <span style={{ fontSize: 13 }}>{proj?.name || '—'}</span>
        </div>
      </td>
      <td style={{ color: 'var(--ink-2)' }}>
        <div>{r.vendor}</div>
        <div className="tbl-sub show-mobile">
          <span className="mono">{r.docNo}</span>
          {proj && <><span className="proj-chip-dot" style={{ background: proj.color, width: 6, height: 6, display: 'inline-block', borderRadius: '50%', margin: '0 3px 0 6px' }}></span>{proj.name}</>}
          {' · '}{fmtDate(r.date)}
        </div>
        {((r.docs && r.docs.length > 0) || r.whtEnabled) && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
            {(r.docs || []).map((d) => {
              const doc = DOC_TYPES.find(x => x.id === d);
              const issued = (r.docsIssued || []).includes(d);
              const label = (doc?.label || d).replace('ใบ', '').trim();
              return (
                <span key={d} title={issued ? 'ออกเอกสารแล้ว' : 'รอออกเอกสาร'} style={{
                  fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 6, whiteSpace: 'nowrap',
                  border: '1px solid',
                  ...(issued
                    ? { background: 'var(--accent-soft)', color: 'var(--accent-ink)', borderColor: 'rgba(5,150,105,0.35)' }
                    : { background: 'var(--warn-soft)', color: '#96590a', borderColor: 'rgba(217,119,6,0.35)' }),
                }}>{issued ? '✓ ' : '🧾 '}{label}</span>
              );
            })}
            {r.whtEnabled && <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 6, background: 'var(--info-soft)', color: '#1a4fb0', border: '1px solid rgba(37,99,235,0.3)', whiteSpace: 'nowrap' }}>หัก {r.whtRate}%</span>}
          </div>
        )}
        {/* ตามบิล — ใบกำกับภาษี/ใบเสร็จจากร้าน (เฉพาะโครงการที่เปิดตามบิล) */}
        {(billState(r, proj) === 'pending' || billState(r, proj) === 'received') && (
          <div style={{ marginTop: 5 }}>
            {billState(r, proj) === 'received' ? (
              <span title={'รับใบกำกับภาษี/ใบเสร็จจากร้านแล้ว' + (r.billDate ? ' · ' + fmtDate(r.billDate) : '')} style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 6, background: 'var(--accent-soft)', color: 'var(--accent-ink)', border: '1px solid rgba(5,150,105,0.35)', whiteSpace: 'nowrap' }}>✓ รับบิลแล้ว</span>
            ) : (
              <span title="ยังไม่ได้รับใบกำกับภาษี/ใบเสร็จตัวจริงจากร้าน — รอตามบิลก่อนยื่นภาษี" style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 6, background: 'var(--warn-soft)', color: '#96590a', border: '1px solid rgba(217,119,6,0.35)', whiteSpace: 'nowrap' }}>📥 รอรับบิล</span>
            )}
          </div>
        )}
      </td>
      <td className="hide-mobile">
        {r.type === 'material'
          ? <span className="badge amber dot">วัสดุ</span>
          : r.type === 'machine'
          ? <span className="badge blue dot">เครื่องจักร</span>
          : r.type === 'lump-labor'
          ? <span className="badge green dot">เหมาจ่าย</span>
          : window.isIncome(r)
          ? <span className="badge dot" style={{ background:'rgba(5,150,105,0.12)', color:'#059669', borderColor:'rgba(5,150,105,0.3)' }}>💰 รายรับ</span>
          : r.type === 'other'
          ? <span className="badge dot" style={{ background:'rgba(99,102,241,0.12)', color:'#6366f1', borderColor:'rgba(99,102,241,0.3)' }}>อื่นๆ</span>
          : r.type === 'quick-receipt'
          ? <span className="badge dot" style={{ background:'rgba(14,165,233,0.12)', color:'#0ea5e9', borderColor:'rgba(14,165,233,0.3)' }}>📸 บิลด่วน</span>
          : r.type === 'receipt'
          ? <span className="badge dot" style={{ background:'rgba(5,150,105,0.12)', color:'#059669', borderColor:'rgba(5,150,105,0.3)' }}>📄 ใบเสร็จ</span>
          : r.type === 'tax-invoice'
          ? <span className="badge dot" style={{ background:'rgba(146,64,14,0.12)', color:'#92400e', borderColor:'rgba(146,64,14,0.3)' }}>🧾 ใบกำกับภาษี</span>
          : r.type === 'invoice'
          ? <span className="badge dot" style={{ background:'rgba(37,99,235,0.12)', color:'#1d4ed8', borderColor:'rgba(37,99,235,0.3)' }}>📋 ใบแจ้งหนี้</span>
          : r.isRetentionPayout
          ? <span className="badge dot" style={{ background:'rgba(5,150,105,0.12)', color:'#059669', borderColor:'rgba(5,150,105,0.3)' }}>คืนประกัน</span>
          : <span className="badge dot" style={{ background: 'oklch(0.94 0.04 290)', color: 'oklch(0.50 0.14 290)', borderColor: 'oklch(0.86 0.06 290)' }}>ค่าแรง</span>}
      </td>
      <td className="num mono" style={{ fontWeight: 500 }}>{fmt(total)}</td>
      {showPaid && (
        <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
          {r.installmentEnabled ? (() => {
            const ct = computeTotals(r);
            const paidCount = (r.installments || []).filter(i => i.paid).length;
            const totalCount = (r.installments || []).length;
            const done = totalCount > 0 && ct.outstanding <= 0;
            return (
              <button onClick={() => onOpen(r.id)} className={"status-chip" + (done ? " on paid" : "")}
                style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }} title="แบ่งจ่ายเป็นงวด — คลิกเพื่อดู/จ่ายงวด">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="tick">{done ? '✓' : ''}</span> งวด {paidCount}/{totalCount}</span>
                {!done && <span className="mono" style={{ fontSize: 10, fontWeight: 500, color: 'var(--warn)' }}>ค้าง ฿{fmt(ct.outstanding)}</span>}
              </button>
            );
          })() : <PaidButton record={r} />}
        </td>
      )}
    </tr>
  );
});

function RecordsTable({ records, onOpen, showApprove = false, showPaid = false }) {
  const app = window.useApp();
  const onOpenRef = useRef(onOpen); onOpenRef.current = onOpen;
  const stableOpen = useCallback((id) => onOpenRef.current(id), []);
  if (!records.length) {
    return (
      <div className="empty">
        <div className="empty-illust"><Icon name="history" size={28} /></div>
        <div className="empty-title">ยังไม่มีรายการ</div>
        <div className="empty-sub">เริ่มบันทึกการจัดซื้อหรือการเช่าเครื่องจักรรายการแรกได้เลย</div>
      </div>
    );
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="history-table">
        <thead>
          <tr>
            <th style={{ width: 108, textAlign: 'center' }} title="ลงบัญชีโครงการแล้ว">
              <span style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.03em' }}>ลงบัญชีโครงการ</span>
            </th>
            {showApprove && (
              <th style={{ width: 126, textAlign: 'center' }} title="สถานะการอนุมัติ + ใบอนุมัติสั่งจ่าย">
                <span style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.03em' }}>สถานะ</span>
              </th>
            )}
            <th className="hide-mobile" style={{ width: 106 }}>เลขที่</th>
            <th className="hide-mobile" style={{ width: 86 }}>วันที่</th>
            <th className="hide-mobile">โครงการ</th>
            <th>ผู้ขาย / รายการ</th>
            <th className="hide-mobile" style={{ width: 92 }}>ประเภท</th>
            <th style={{ width: 116 }} className="num">ยอดสุทธิ</th>
            {showPaid && <th style={{ width: 104, textAlign: 'center' }} title="หลักฐานการชำระเงิน">หลักฐานชำระ</th>}
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <RecordRow key={r.id} r={r} projects={app.projects}
              showApprove={showApprove} showPaid={showPaid} onOpen={stableOpen} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
window.RecordsTable = RecordsTable;

// ---- History view ----
window.HistoryView = function HistoryView() {
  const app = window.useApp();
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [projFilter, setProjFilter] = useState('all');
  const [sortKey, setSortKey] = useState('date-desc');
  const [accFilter, setAccFilter] = useState('all'); // all | unposted | posted
  const [approveFilter, setApproveFilter] = useState('all'); // all | pending | approved | unpaid
  const [docFilter, setDocFilter] = useState(false); // true = เฉพาะที่มีเอกสารต้องออก
  const [billFilter, setBillFilter] = useState(false); // true = เฉพาะที่ยังรอรับใบกำกับภาษีจากร้าน
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [reportOpen, setReportOpen] = useState(false);

  // ── lookup โครงการ (ใช้เช็ค trackBills สำหรับฟีเจอร์ตามบิล) ──
  const projById = useMemo(() => {
    const m = {};
    app.projects.forEach(p => { m[p.id] = p; });
    return m;
  }, [app.projects]);

  // ── รายการวัสดุ/เครื่องจักร/อื่นๆ ทั้งหมด (ก่อนกรอง) ──
  const allExp = useMemo(() => app.records.filter(r =>
    r.type !== 'receipt' &&
    r.type !== 'tax-invoice'   && r.type !== 'invoice' &&
    r.type !== 'labor'         && r.type !== 'lump-labor' &&
    !window.isIncome(r)
  ), [app.records]);

  // ── ปิดรายการเดิม (ครั้งเดียว): อนุมัติ + จ่ายแล้ว ทั้งวัสดุ/เครื่องจักร/อื่นๆ ──
  const [bulkOpen, setBulkOpen] = useState(false);
  const [retroDone, setRetroDone] = useState(() => {
    try { return localStorage.getItem('expenseRetroDone2') === '1'; } catch { return false; }
  });
  const bulkTargets = useMemo(() =>
    allExp.filter(r => !r.approved || !r.paid), [allExp]);
  const doBulkClose = () => {
    bulkTargets.forEach(r => app.updateRecord(r.id, {
      approved: true, approvedDate: r.approvedDate || r.date,
      paid: true, paidDate: r.paidDate || r.date,
    }));
    try { localStorage.setItem('expenseRetroDone2', '1'); } catch {}
    setRetroDone(true);
    setBulkOpen(false);
    app.pushToast(`ปิดรายการเดิม ${bulkTargets.length} รายการแล้ว ✓`);
  };

  const filtered = useMemo(() => {
    let arr = allExp.slice();  // สำเนา — กัน .sort() ไปแก้ allExp ที่ memo ไว้
    if (typeFilter !== 'all') arr = arr.filter(r => r.type === typeFilter);
    if (projFilter !== 'all') arr = arr.filter(r => r.projectId === projFilter);
    if (dateFrom || dateTo) arr = arr.filter(r => window.inDateRange(r.date, dateFrom, dateTo));
    if (accFilter === 'unposted') arr = arr.filter(r => !r.accountingPosted);
    if (accFilter === 'posted')   arr = arr.filter(r =>  r.accountingPosted);
    if (approveFilter === 'pending')  arr = arr.filter(r => !r.approved);
    if (approveFilter === 'approved') arr = arr.filter(r =>  r.approved);
    if (approveFilter === 'unpaid')   arr = arr.filter(r =>  r.approved && !r.paid);
    if (docFilter) arr = arr.filter(r => pendingDocs(r).length > 0);
    if (billFilter) arr = arr.filter(r => isBillPending(r, projById[r.projectId]));
    if (q.trim()) {
      const s = q.toLowerCase();
      arr = arr.filter(r =>
        r.docNo.toLowerCase().includes(s) ||
        r.vendor.toLowerCase().includes(s) ||
        r.items.some(i => (i.name || '').toLowerCase().includes(s))
      );
    }
    arr.sort((a, b) => {
      if (sortKey === 'date-desc') return (b.date || '').localeCompare(a.date || '');
      if (sortKey === 'date-asc') return (a.date || '').localeCompare(b.date || '');
      if (sortKey === 'amount-desc') return computeTotals(b).total - computeTotals(a).total;
      if (sortKey === 'amount-asc') return computeTotals(a).total - computeTotals(b).total;
      return 0;
    });
    return arr;
  }, [allExp, q, typeFilter, projFilter, sortKey, accFilter, approveFilter, docFilter, billFilter, dateFrom, dateTo, projById]);

  const sum = filtered.reduce((s, r) => s + computeTotals(r).total, 0);
  const pendingDocsCount = useMemo(() => allExp.filter(r => pendingDocs(r).length > 0).length, [allExp]);
  // ตามบิล — รายการที่ยังไม่ได้รับใบกำกับภาษี/ใบเสร็จจากร้าน
  const billPendingRecs = useMemo(() => allExp.filter(r => isBillPending(r, projById[r.projectId])), [allExp, projById]);
  const billPendingCount = billPendingRecs.length;
  const billPendingSum = useMemo(() => billPendingRecs.reduce((s, r) => s + computeTotals(r).total, 0), [billPendingRecs]);
  // สรุปสถานะ (จากรายการทั้งหมด ไม่ขึ้นกับตัวกรอง)
  const pendingRecs = useMemo(() => allExp.filter(r => (r.type === 'material' || r.type === 'machine') && !r.approved), [allExp]);
  const unpaidRecs  = useMemo(() => allExp.filter(r => r.approved && !r.paid), [allExp]);
  const pendingCount = pendingRecs.length;
  const unpaidCount  = unpaidRecs.length;
  const pendingSum   = useMemo(() => pendingRecs.reduce((s, r) => s + computeTotals(r).cashDue, 0), [pendingRecs]);
  const unpaidSum    = useMemo(() => unpaidRecs.reduce((s, r) => s + computeTotals(r).cashDue, 0), [unpaidRecs]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">ประวัติทั้งหมด</h1>
          <div className="page-sub">เรียกดู ค้นหา และเปิดดูรายละเอียดบิลย้อนหลังได้ตลอดเวลา</div>
        </div>
        <div className="row gap-8 dash-actions">
          <button className="btn btn-accent" onClick={() => { app.setEditingId(null); app.setView('new-material'); }}>
            <Icon name="cart" size={14} /> จัดซื้อวัสดุ
          </button>
          <button className="btn btn-accent" onClick={() => { app.setEditingId(null); app.setView('new-machine'); }}>
            <Icon name="truck" size={14} /> เช่าเครื่องจักร
          </button>
          <button className="btn btn-ghost" onClick={() => { app.setEditingId(null); app.setView('new-other'); }}>
            <Icon name="sparkle" size={14} /> ค่าใช้จ่ายอื่นๆ
          </button>
        </div>
      </div>

      {/* การ์ดสรุปสถานะ — กันบิลตกหล่น (คลิกเพื่อกรอง) */}
      {(pendingCount > 0 || unpaidCount > 0 || billPendingCount > 0) && (
        <div className="stat-grid" style={{ marginBottom: 18 }}>
          {pendingCount > 0 && (
            <div className="stat" style={{ cursor: 'pointer' }} onClick={() => setApproveFilter('pending')}
              title="วัสดุ/เครื่องจักรที่ยังไม่อนุมัติ — คลิกเพื่อกรอง">
              <div className="stat-label">รออนุมัติ</div>
              <div className="stat-value mono" style={{ color: 'oklch(0.55 0.18 50)' }}>{"฿" + fmt(pendingSum)}</div>
              <div className="stat-delta" style={{ color: 'oklch(0.55 0.18 50)' }}>{pendingCount} รายการ — คลิกเพื่อกรอง</div>
              <div className="stat-icon" style={{ background: 'oklch(0.95 0.08 60)', color: 'oklch(0.55 0.18 50)' }}>
                <Icon name="clock" size={18} />
              </div>
            </div>
          )}
          {unpaidCount > 0 && (
            <div className="stat" style={{ cursor: 'pointer' }} onClick={() => setApproveFilter('unpaid')}
              title="อนุมัติแล้วแต่ยังไม่จ่าย — คลิกเพื่อกรอง">
              <div className="stat-label">อนุมัติแล้ว-รอชำระจ่าย</div>
              <div className="stat-value mono" style={{ color: 'var(--info)' }}>{"฿" + fmt(unpaidSum)}</div>
              <div className="stat-delta" style={{ color: 'var(--info)' }}>{unpaidCount} รายการ — คลิกเพื่อกรอง</div>
              <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--info)' }}>
                <Icon name="receipt" size={18} />
              </div>
            </div>
          )}
          {billPendingCount > 0 && (
            <div className="stat" style={{ cursor: 'pointer' }} onClick={() => setBillFilter(true)}
              title="วัสดุ/เครื่องจักรที่ยังไม่ได้รับใบกำกับภาษี/ใบเสร็จจากร้าน — คลิกเพื่อกรอง">
              <div className="stat-label">รอรับใบกำกับภาษีจากร้าน</div>
              <div className="stat-value mono" style={{ color: 'oklch(0.55 0.18 50)' }}>{"฿" + fmt(billPendingSum)}</div>
              <div className="stat-delta" style={{ color: 'oklch(0.55 0.18 50)' }}>{billPendingCount} รายการ — ตามบิลก่อนยื่นภาษี</div>
              <div className="stat-icon" style={{ background: 'oklch(0.95 0.08 60)', color: 'oklch(0.55 0.18 50)' }}>
                <Icon name="receipt" size={18} />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="filter-bar">
          <div className="tabs">
            <button className={"tab" + (typeFilter === 'all'      ? ' active' : '')} onClick={() => setTypeFilter('all')}>ทั้งหมด <span className="badge gray mono">{app.records.filter(r => (r.type==='material'||r.type==='machine'||r.type==='other') && !window.isIncome(r)).length}</span></button>
            <button className={"tab" + (typeFilter === 'material' ? ' active' : '')} onClick={() => setTypeFilter('material')}><Icon name="cart"    size={13} /> วัสดุ</button>
            <button className={"tab" + (typeFilter === 'machine'  ? ' active' : '')} onClick={() => setTypeFilter('machine')} ><Icon name="truck"   size={13} /> เครื่องจักร</button>
            <button className={"tab" + (typeFilter === 'other'    ? ' active' : '')} onClick={() => setTypeFilter('other')}   ><Icon name="sparkle" size={13} /> อื่นๆ</button>
          </div>
          <div className="topbar-search" style={{ width: 280, margin: 0 }}>
            <Icon name="search" size={14} />
            <input placeholder="ค้นหา: เลขที่, ผู้ขาย, รายการ" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="select" value={projFilter} onChange={(e) => setProjFilter(e.target.value)}>
            <option value="all">ทุกโครงการ</option>
            {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <window.DateRangeFilter from={dateFrom} to={dateTo} setFrom={setDateFrom} setTo={setDateTo} />
          <select className="select" value={approveFilter} onChange={(e) => setApproveFilter(e.target.value)}
            style={{ borderColor: approveFilter !== 'all' ? '#2563eb' : undefined, color: approveFilter !== 'all' ? '#2563eb' : undefined }}>
            <option value="all">การอนุมัติ: ทั้งหมด</option>
            <option value="pending">รออนุมัติ{pendingCount > 0 ? ` (${pendingCount})` : ''}</option>
            <option value="approved">อนุมัติแล้ว</option>
            <option value="unpaid">อนุมัติแล้ว-รอชำระจ่าย{unpaidCount > 0 ? ` (${unpaidCount})` : ''}</option>
          </select>
          <select className="select" value={accFilter} onChange={(e) => setAccFilter(e.target.value)}
            style={{ borderColor: accFilter !== 'all' ? '#059669' : undefined, color: accFilter !== 'all' ? '#059669' : undefined }}>
            <option value="all">สถานะบัญชี: ทั้งหมด</option>
            <option value="unposted">ยังไม่ลงบัญชี</option>
            <option value="posted">ลงบัญชีแล้ว</option>
          </select>
          <button className={"btn btn-sm" + (docFilter ? " btn-accent" : " btn-ghost")}
            onClick={() => setDocFilter(v => !v)}
            title="กรองเฉพาะบิลที่ยังมีเอกสารต้องออก (ใบสำคัญจ่าย/50 ทวิ)"
            style={!docFilter && pendingDocsCount > 0 ? { color: '#96590a', borderColor: 'rgba(217,119,6,0.4)' } : undefined}>
            <Icon name="receipt" size={13} /> รอออกเอกสาร{pendingDocsCount > 0 ? ` (${pendingDocsCount})` : ''}
          </button>
          <button className={"btn btn-sm" + (billFilter ? " btn-accent" : " btn-ghost")}
            onClick={() => setBillFilter(v => !v)}
            title="กรองเฉพาะรายการที่ยังไม่ได้รับใบกำกับภาษี/ใบเสร็จตัวจริงจากร้าน (ตามบิลก่อนยื่นภาษี)"
            style={!billFilter && billPendingCount > 0 ? { color: '#96590a', borderColor: 'rgba(217,119,6,0.4)' } : undefined}>
            📥 ตามบิล{billPendingCount > 0 ? ` (${billPendingCount})` : ''}
          </button>
          {app.isAdmin && !retroDone && bulkTargets.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => setBulkOpen(true)}
              title="ปิดรายการเดิมทั้งหมด (อนุมัติ+จ่ายแล้ว) ทำครั้งเดียว">
              <Icon name="check" size={13} /> ปิดรายการเดิม
            </button>
          )}
          <button className="btn btn-accent btn-sm" onClick={() => setReportOpen(true)}
            title="ส่งออกรายงานสรุปการจัดซื้อ (วัสดุ/เครื่องจักร/อื่นๆ) เป็น PDF">
            <Icon name="download" size={13} /> ส่งออกรายงานจัดซื้อ
          </button>
          <div className="spacer"></div>
          <div className="text-small text-muted">
            พบ <strong style={{ color: 'var(--ink-1)' }} className="mono">{filtered.length}</strong> รายการ ·
            ยอดรวม <strong className="mono" style={{ color: 'var(--ink-1)' }}>฿{fmt(sum)}</strong>
          </div>
        </div>
        <RecordsTable records={filtered} onOpen={(id) => app.setDetailId(id)} showApprove={true} showPaid={true} />
      </div>

      {/* Modal: ปิดรายการเดิมทั้งหมด (อนุมัติ + จ่ายแล้ว) ครั้งเดียว */}
      {bulkOpen && (
        <div className="modal-overlay" onClick={() => setBulkOpen(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">ปิดรายการจัดซื้อเดิม</h2>
              <button className="btn-icon" onClick={() => setBulkOpen(false)}><Icon name="x" size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.7 }}>
                จะตั้งเป็น <strong>อนุมัติ + จ่ายแล้ว</strong> ให้รายการจัดซื้อ/เช่า/อื่นๆ
                <strong className="mono"> {bulkTargets.length}</strong> รายการที่ยังไม่ปิด (ใช้วันที่ในเอกสารเป็นวันที่อนุมัติ/จ่าย)
                <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: 12.5, color: 'var(--ink-3)' }}>
                  ใช้ปิดรายการเก่าครั้งเดียว เพื่อไม่ให้ยอดเดิมหายจากแดชบอร์ด — หลังจากนี้บิลใหม่จะเข้าขั้นตอน อนุมัติ → จ่าย ตามปกติ
                </div>
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setBulkOpen(false)}>ยกเลิก</button>
              <button className="btn btn-accent" onClick={doBulkClose}><Icon name="check" size={14} /> ยืนยัน ({bulkTargets.length})</button>
            </div>
          </div>
        </div>
      )}
      <window.ExpenseReportModal open={reportOpen} onClose={() => setReportOpen(false)} scope="purchase" />
    </>
  );
};

// ---- Projects view ----
window.ProjectsView = function ProjectsView() {
  const app = window.useApp();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // project obj | null
  const [editProject, setEditProject] = useState(null); // project obj | null
  const [tab, setTab] = useState('active'); // active | archived

  // เปิดแท็บเก็บถาวรครั้งแรก → โหลด record ของโครงการเก็บถาวรมาแสดงยอด
  useEffect(() => {
    if (tab === 'archived' && !app.archivedLoaded) app.loadArchivedRecords();
  }, [tab, app.archivedLoaded]);

  // compute spend per project — รวม record หลัก (active) + record เก็บถาวรที่โหลดมา
  const stats = useMemo(() => {
    const m = {};
    [...app.records, ...app.archivedRecords].forEach(r => {
      m[r.projectId] = m[r.projectId] || { count: 0, total: 0 };
      m[r.projectId].count++;
      m[r.projectId].total += computeTotals(r).total;
    });
    return m;
  }, [app.records, app.archivedRecords]);

  const shownProjects = app.projects.filter(p =>
    tab === 'archived' ? p.status === 'archived' : p.status !== 'archived');
  const archivedCount = app.projects.filter(p => p.status === 'archived').length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">โครงการ</h1>
          <div className="page-sub">จัดการโครงการก่อสร้างทั้งหมด เพิ่มได้เรื่อย ๆ ตามที่รับงาน</div>
        </div>
        <button className="btn btn-accent" onClick={() => setOpen(true)}>
          <Icon name="plus" size={14} stroke={2.5} /> เพิ่มโครงการ
        </button>
      </div>

      {/* แท็บ ดำเนินการ / เก็บถาวร */}
      <div className="tabs" style={{ marginBottom: 18 }}>
        <button className={"tab" + (tab === 'active' ? ' active' : '')} onClick={() => setTab('active')}>
          ดำเนินการ
        </button>
        <button className={"tab" + (tab === 'archived' ? ' active' : '')} onClick={() => setTab('archived')}>
          เก็บถาวร {archivedCount > 0 && <span className="badge gray mono">{archivedCount}</span>}
        </button>
      </div>

      {tab === 'archived' && !app.archivedLoaded && (
        <div className="text-small text-muted" style={{ marginBottom: 14 }}>กำลังโหลดข้อมูลโครงการที่เก็บถาวร…</div>
      )}
      {shownProjects.length === 0 && (
        <div className="text-muted" style={{ padding: '40px 0', textAlign: 'center' }}>
          {tab === 'archived' ? 'ยังไม่มีโครงการที่เก็บถาวร' : 'ยังไม่มีโครงการ — กดปุ่มเพิ่มโครงการเพื่อเริ่มต้น'}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {shownProjects.map((p) => {
          const s = stats[p.id] || { count: 0, total: 0 };
          return (
            <div key={p.id} className="card" style={{ transition: 'transform 200ms, box-shadow 200ms' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            >
              <div style={{ height: 8, background: p.color }}></div>
              <div className="card-body">
                <div className="row between mb-8">
                  <span className="mono text-small text-muted">{p.code}</span>
                  <div className="row gap-6">
                    {p.trackBills && <span className="badge dot" style={{ background: 'var(--warn-soft)', color: '#96590a', borderColor: 'rgba(217,119,6,0.35)' }} title="เปิดตามบิล — เก็บใบกำกับภาษี/ใบเสร็จจากร้าน">📥 ตามบิล</span>}
                    {p.status === 'active'
                      ? <span className="badge green dot">ดำเนินการ</span>
                      : p.status === 'archived'
                      ? <span className="badge gray dot">เก็บถาวร</span>
                      : <span className="badge gray dot">ปิดแล้ว</span>}
                  </div>
                </div>
                <h3 style={{ fontSize: 16, marginBottom: 4 }}>{p.name}</h3>
                <div className="text-small text-muted mb-16">{p.client}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '14px 16px', background: 'var(--bg)', borderRadius: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>ยอดจัดซื้อ</div>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>฿{fmt(s.total)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>บิล</div>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>{s.count}</div>
                  </div>
                </div>
                <div className="row gap-8 mt-16">
                  {p.status === 'archived' ? (
                    app.isAdmin && (
                      <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} title="นำกลับมาดำเนินการ — จะโหลดรายการกลับและแสดงในภาพรวมอีกครั้ง"
                        onClick={() => { app.unarchiveProject(p.id); app.pushToast('นำโครงการกลับมาแล้ว'); }}>
                        <Icon name="history" size={12} /> นำกลับมาดำเนินการ
                      </button>
                    )
                  ) : (
                    <>
                      <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => app.setView('history')}>
                        <Icon name="eye" size={12} /> ดูรายการ
                      </button>
                      {app.isAdmin && (
                        <button className="btn btn-ghost btn-sm" title="เก็บโครงการเข้าคลัง (ข้อมูลยังอยู่ครบ)"
                          onClick={() => {
                            if (confirm(`เก็บโครงการ "${p.name}" เข้าคลัง?\n\nข้อมูลทั้งหมดยังอยู่ครบ แต่จะไม่แสดงในแดชบอร์ด/ภาพรวม และช่วยให้ระบบเร็วขึ้น (นำกลับมาได้ภายหลัง)`)) {
                              app.archiveProject(p.id); app.pushToast('เก็บโครงการเข้าคลังแล้ว');
                            }
                          }}>
                          <Icon name="folder" size={12} /> เก็บ
                        </button>
                      )}
                    </>
                  )}
                  {app.isAdmin && (
                    <button className="btn btn-ghost btn-sm" title="แก้ไขรายละเอียดโครงการ" onClick={() => setEditProject(p)}>
                      <Icon name="edit" size={12} />
                    </button>
                  )}
                  {app.isAdmin && (
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(p)}>
                      <Icon name="trash" size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AddProjectModal open={open} onClose={() => setOpen(false)} onAdd={(p) => { app.addProject(p); app.pushToast('เพิ่มโครงการแล้ว'); setOpen(false); }} />

      <window.EditProjectModal project={editProject} onClose={() => setEditProject(null)}
        onSave={(patch) => { app.updateProject(editProject.id, patch); app.pushToast('บันทึกการแก้ไขโครงการแล้ว'); setEditProject(null); }} />

      {/* ── Confirm delete project modal ── */}
      {confirmDelete && (() => {
        const s = stats[confirmDelete.id] || { count: 0, total: 0 };
        return (
          <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
            <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">ยืนยันการลบโครงการ</h2>
                <button className="btn-icon" onClick={() => setConfirmDelete(null)}>
                  <Icon name="x" size={16} />
                </button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Warning banner */}
                <div style={{ background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.28)', borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <div>
                      <div style={{ fontWeight: 600, color: '#ef4444', marginBottom: 4, fontSize: 13 }}>การดำเนินการนี้ไม่สามารถยกเลิกได้</div>
                      <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
                        ระบบจะลบโครงการ <strong>และประวัติ / ข้อมูลรายการจัดซื้อทั้งหมด</strong> ที่อยู่ในโครงการนี้ออกจากฐานข้อมูลอย่างถาวร
                      </div>
                    </div>
                  </div>
                </div>

                {/* Project card */}
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: confirmDelete.color, flexShrink: 0 }}></div>
                    <span className="mono text-small text-muted">{confirmDelete.code}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{confirmDelete.name}</div>
                  {confirmDelete.client && <div className="text-small text-muted">{confirmDelete.client}</div>}
                </div>

                {/* Stats to be deleted */}
                {s.count > 0 ? (
                  <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, letterSpacing: 0.6, marginBottom: 10, textTransform: 'uppercase' }}>ข้อมูลที่จะถูกลบถาวร</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>รายการจัดซื้อ</span>
                      <span className="mono" style={{ fontWeight: 700, color: '#ef4444' }}>{s.count} รายการ</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>ยอดรวมทั้งหมด</span>
                      <span className="mono" style={{ fontWeight: 700, color: '#ef4444' }}>฿{fmt(s.total)}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', padding: '8px 0' }}>
                    โครงการนี้ยังไม่มีรายการจัดซื้อ
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>ยกเลิก</button>
                <button className="btn btn-danger" onClick={() => {
                  app.deleteProject(confirmDelete.id);
                  app.pushToast(`ลบโครงการ "${confirmDelete.name}" และข้อมูลทั้งหมดแล้ว`);
                  setConfirmDelete(null);
                }}>
                  <Icon name="trash" size={14} /> ยืนยันลบโครงการ
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
};

// ---- Edit category modal ----
function EditCategoryModal({ open, onClose, cat, onSave }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#d97706');
  useEffect(() => {
    if (open && cat) { setName(cat.name || ''); setColor(cat.color || '#d97706'); }
  }, [open, cat]);
  const colors = ['#d97706', '#dc2626', '#a855f7', '#0ea5e9', '#16a34a', '#eab308', '#64748b', '#a16207', '#ec4899', '#14b8a6'];
  return (
    <Modal open={open} onClose={onClose} title="แก้ไขหมวดหมู่"
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-accent" onClick={() => name.trim() && onSave({ name: name.trim(), color })}>
          <Icon name="save" size={14} /> บันทึก
        </button>
      </>}>
      <div className="col gap-16">
        <div className="field">
          <label className="field-label">ชื่อหมวดหมู่</label>
          <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && onSave({ name: name.trim(), color })} />
        </div>
        <div className="field">
          <label className="field-label">สีประจำหมวด</label>
          <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
            {colors.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} style={{
                width: 32, height: 32, borderRadius: 8, background: c,
                border: color === c ? '3px solid var(--ink-1)' : '2px solid transparent',
                cursor: 'pointer', position: 'relative', display: 'grid', placeItems: 'center',
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

// ---- รายการหมวดหมู่ที่ลากจัดลำดับได้ (รองรับเมาส์ + ทัชมือถือ) ----
function SortableCatList({ cats, which, countByCat, onEdit }) {
  const app = window.useApp();
  const [items, setItems] = useState(cats);
  const itemsRef = useRef(cats);
  const containerRef = useRef(null);
  const dragId = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  useEffect(() => { setItems(cats); itemsRef.current = cats; }, [cats]);

  const delFn = { mat: app.deleteMatCat, mach: app.deleteMachCat, labor: app.deleteLaborCat, 'lump-labor': app.deleteLumpLaborCat, other: app.deleteOtherCat }[which];

  const onMove = (e) => {
    if (!dragId.current || !containerRef.current) return;
    const rows = [...containerRef.current.querySelectorAll('[data-crow]')];
    const y = e.clientY;
    let target = rows.length - 1;
    for (let i = 0; i < rows.length; i++) { const r = rows[i].getBoundingClientRect(); if (y < r.top + r.height / 2) { target = i; break; } }
    setItems(prev => {
      const from = prev.findIndex(c => c.id === dragId.current);
      if (from < 0 || from === target) return prev;
      const next = [...prev]; const [m] = next.splice(from, 1); next.splice(target, 0, m); itemsRef.current = next; return next;
    });
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    document.body.style.userSelect = '';
    const id = dragId.current; dragId.current = null; setDraggingId(null);
    if (!id) return;
    const newIds = itemsRef.current.map(c => c.id);
    if (newIds.join('|') !== cats.map(c => c.id).join('|')) { app.reorderCats(which, newIds); app.pushToast('จัดลำดับหมวดหมู่แล้ว'); }
  };
  const startDrag = (e, id) => {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    dragId.current = id; setDraggingId(id);
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div className="col gap-8" ref={containerRef}>
      {items.map((c) => (
        <div key={c.id} data-crow className="row gap-12" style={{
          padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10,
          opacity: draggingId === c.id ? 0.55 : 1, transition: 'opacity 120ms',
        }}>
          <span onPointerDown={(e) => startDrag(e, c.id)} title="ลากเพื่อจัดลำดับ"
            style={{ cursor: 'grab', color: 'var(--ink-3)', touchAction: 'none', display: 'flex', alignItems: 'center', padding: '2px', flexShrink: 0 }}>
            <Icon name="menu" size={15} />
          </span>
          <span style={{ width: 14, height: 14, borderRadius: 4, background: c.color, flexShrink: 0 }}></span>
          <span style={{ flex: 1, fontWeight: 500, fontSize: 13.5, minWidth: 0 }}>{c.name}</span>
          <span className="badge gray mono">ใช้ {countByCat[c.id] || 0} ครั้ง</span>
          <button className="topbar-icon-btn" style={{ width: 30, height: 30 }} title="แก้ไข" onClick={() => onEdit(c)}>
            <Icon name="edit" size={13} />
          </button>
          {app.isAdmin && (
            <button className="topbar-icon-btn" style={{ width: 30, height: 30 }} title="ลบ" onClick={() => {
              if (countByCat[c.id]) { app.pushToast('ลบไม่ได้ — มีรายการใช้หมวดนี้อยู่', 'error'); return; }
              delFn(c.id); app.pushToast('ลบหมวดหมู่แล้ว');
            }}>
              <Icon name="trash" size={13} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ---- Categories view ----
window.CategoriesView = function CategoriesView() {
  const app = window.useApp();
  const [matOpen, setMatOpen] = useState(false);
  const [machOpen, setMachOpen] = useState(false);
  const [laborOpen, setLaborOpen] = useState(false);
  const [lumpOpen, setLumpOpen] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);
  // editCat: { cat, which } | null
  const [editCat, setEditCat] = useState(null);

  const countByCat = useMemo(() => {
    const m = {};
    app.records.forEach(r => r.items.forEach(it => { if (it.categoryId) m[it.categoryId] = (m[it.categoryId] || 0) + 1; }));
    return m;
  }, [app.records]);

  const handleSaveEdit = (patch) => {
    if (!editCat) return;
    const { cat, which } = editCat;
    const fn = which === 'mach' ? app.updateMachCat
      : which === 'labor' ? app.updateLaborCat
      : which === 'lump-labor' ? app.updateLumpLaborCat
      : which === 'other' ? app.updateOtherCat
      : app.updateMatCat;
    fn(cat.id, patch);
    app.pushToast('แก้ไขหมวดหมู่แล้ว');
    setEditCat(null);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">หมวดหมู่</h1>
          <div className="page-sub">จัดการหมวดหมู่ — เพิ่ม/แก้ไขได้ · ลากไอคอน ☰ เพื่อจัดลำดับขึ้น-ลง</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }} className="cat-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title"><Icon name="cart" size={14} /> หมวดหมู่วัสดุ</div>
              <div className="card-sub">{app.matCats.length} หมวด</div>
            </div>
            <button className="btn btn-accent btn-sm" onClick={() => setMatOpen(true)}>
              <Icon name="plus" size={12} stroke={2.5} /> เพิ่ม
            </button>
          </div>
          <div className="card-body"><SortableCatList cats={app.matCats} which="mat" countByCat={countByCat} onEdit={(c)=>setEditCat({cat:c,which:'mat'})} /></div>
        </div>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title"><Icon name="truck" size={14} /> หมวดหมู่เครื่องจักร</div>
              <div className="card-sub">{app.machCats.length} หมวด</div>
            </div>
            <button className="btn btn-accent btn-sm" onClick={() => setMachOpen(true)}>
              <Icon name="plus" size={12} stroke={2.5} /> เพิ่ม
            </button>
          </div>
          <div className="card-body"><SortableCatList cats={app.machCats} which="mach" countByCat={countByCat} onEdit={(c)=>setEditCat({cat:c,which:'mach'})} /></div>
        </div>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title"><Icon name="hammer" size={14} /> หมวดงาน (ค่าแรง)</div>
              <div className="card-sub">{app.laborCats.length} หมวด</div>
            </div>
            <button className="btn btn-accent btn-sm" onClick={() => setLaborOpen(true)}>
              <Icon name="plus" size={12} stroke={2.5} /> เพิ่ม
            </button>
          </div>
          <div className="card-body"><SortableCatList cats={app.laborCats} which="labor" countByCat={countByCat} onEdit={(c)=>setEditCat({cat:c,which:'labor'})} /></div>
        </div>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title"><Icon name="clipboard" size={14} /> หมวดงานเหมาจ่าย</div>
              <div className="card-sub">{(app.lumpLaborCats || []).length} หมวด</div>
            </div>
            <button className="btn btn-accent btn-sm" onClick={() => setLumpOpen(true)}>
              <Icon name="plus" size={12} stroke={2.5} /> เพิ่ม
            </button>
          </div>
          <div className="card-body"><SortableCatList cats={app.lumpLaborCats || []} which="lump-labor" countByCat={countByCat} onEdit={(c)=>setEditCat({cat:c,which:'lump-labor'})} /></div>
        </div>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title"><Icon name="sparkle" size={14} /> หมวดค่าใช้จ่ายอื่นๆ</div>
              <div className="card-sub">{(app.otherCats || []).length} หมวด</div>
            </div>
            <button className="btn btn-accent btn-sm" onClick={() => setOtherOpen(true)}>
              <Icon name="plus" size={12} stroke={2.5} /> เพิ่ม
            </button>
          </div>
          <div className="card-body"><SortableCatList cats={app.otherCats || []} which="other" countByCat={countByCat} onEdit={(c)=>setEditCat({cat:c,which:'other'})} /></div>
        </div>
      </div>

      <AddCategoryModal open={matOpen} onClose={() => setMatOpen(false)} onAdd={(c) => { app.addMatCat(c); app.pushToast('เพิ่มหมวดหมู่วัสดุแล้ว'); setMatOpen(false); }} title="เพิ่มหมวดหมู่วัสดุ" />
      <AddCategoryModal open={machOpen} onClose={() => setMachOpen(false)} onAdd={(c) => { app.addMachCat(c); app.pushToast('เพิ่มหมวดหมู่เครื่องจักรแล้ว'); setMachOpen(false); }} title="เพิ่มหมวดหมู่เครื่องจักร" />
      <AddCategoryModal open={laborOpen} onClose={() => setLaborOpen(false)} onAdd={(c) => { app.addLaborCat(c); app.pushToast('เพิ่มหมวดงานแล้ว'); setLaborOpen(false); }} title="เพิ่มหมวดงาน" />
      <AddCategoryModal open={lumpOpen} onClose={() => setLumpOpen(false)} onAdd={(c) => { app.addLumpLaborCat(c); app.pushToast('เพิ่มหมวดงานเหมาจ่ายแล้ว'); setLumpOpen(false); }} title="เพิ่มหมวดงานเหมาจ่าย" />
      <AddCategoryModal open={otherOpen} onClose={() => setOtherOpen(false)} onAdd={(c) => { app.addOtherCat(c); app.pushToast('เพิ่มหมวดค่าใช้จ่ายแล้ว'); setOtherOpen(false); }} title="เพิ่มหมวดค่าใช้จ่ายอื่นๆ" />

      {/* Edit category modal — shared across all category types */}
      <EditCategoryModal
        open={!!editCat}
        onClose={() => setEditCat(null)}
        cat={editCat?.cat}
        onSave={handleSaveEdit}
      />

      <style>{`
        @media (max-width: 1100px) {
          .cat-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
};

// ---- Deposit return inline form (used in DetailDrawer) ----
function DepositReturnForm({ rec }) {
  const app = window.useApp();
  const [expanded, setExpanded] = useState(false);
  const [returnDate, setReturnDate] = useState(todayStr());
  const [returnImages, setReturnImages] = useState([]);
  const [returnNote, setReturnNote] = useState('');

  const handleConfirm = () => {
    if (!returnImages.length) {
      app.pushToast('กรุณาแนบสลิปโอนเงินคืนก่อนยืนยัน', 'error');
      return;
    }
    app.updateRecord(rec.id, {
      depositStatus: 'returned',
      depositReturnDate: returnDate,
      depositReturnImages: returnImages,
      depositReturnNote: returnNote,
    });
    app.pushToast('บันทึกรับเงินประกันคืนแล้ว ✓');
  };

  return (
    <div>
      {/* Status row */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
        background:'rgba(234,179,8,0.08)', border:'1px solid rgba(234,179,8,0.3)', borderRadius:10 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <span style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:600,
              background:'rgba(234,179,8,0.18)', color:'#ca8a04', border:'1px solid rgba(234,179,8,0.35)' }}>
              ⏳ รอรับเงินคืน
            </span>
          </div>
          <div className="mono" style={{ fontSize:17, fontWeight:700, color:'#3b82f6' }}>
            ฿{fmt(Number(rec.depositAmount))}
          </div>
          <div style={{ fontSize:11.5, color:'var(--ink-3)', marginTop:2 }}>
            วางประกันวันที่ {fmtDate(rec.date)} — {rec.vendor}
          </div>
        </div>
        <button className="btn btn-accent btn-sm" onClick={() => setExpanded(v => !v)}>
          <Icon name={expanded ? 'x' : 'check'} size={12} />
          {expanded ? 'ยกเลิก' : 'บันทึกรับเงินคืน'}
        </button>
      </div>

      {/* Expand: receipt form */}
      {expanded && (
        <div style={{ marginTop:10, padding:16, background:'var(--surface)',
          border:'1px solid var(--line)', borderRadius:10, display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--ink-2)', display:'block', marginBottom:5 }}>
                วันที่รับเงินคืน
              </label>
              <input className="input" type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--ink-2)', display:'block', marginBottom:5 }}>
                หมายเหตุ
              </label>
              <input className="input" placeholder="เช่น รับเงินสดจากร้าน" value={returnNote} onChange={e => setReturnNote(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:6,
              color: returnImages.length ? 'var(--ink-2)' : 'var(--danger)' }}>
              <Icon name="image" size={13} />
              {' '}แนบสลิปโอนเงินคืน{' '}
              <span style={{ fontWeight:400, color:'var(--danger)' }}>* (บังคับ)</span>
            </label>
            <window.ImageUploader images={returnImages} onChange={setReturnImages} max={5} />
          </div>
          <button
            onClick={handleConfirm}
            style={{
              padding:'11px 0', border:'none', borderRadius:10, cursor:'pointer',
              background: returnImages.length ? 'var(--accent)' : '#d1d5db',
              color: returnImages.length ? '#1f1d18' : '#9ca3af',
              fontFamily:'inherit', fontWeight:600, fontSize:14,
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            }}>
            <Icon name="check" size={14} stroke={2.5} />
            ยืนยันรับเงินประกันคืน ฿{fmt(Number(rec.depositAmount))}
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Team history sub-view (แสดงเฉพาะทีมนั้น ๆ) ----
function TeamHistoryView({ team, onBack }) {
  const app = window.useApp();
  const [projFilter, setProjFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortKey, setSortKey] = useState('date-desc');

  // รายการทั้งหมดของทีมนี้
  const allTeamRecs = useMemo(() =>
    app.records.filter(r =>
      (r.type === 'labor' || r.type === 'lump-labor') && r.workerTeamId === team.id
    ), [app.records, team.id]);

  // โครงการที่ทีมนี้เคยทำ (สำหรับ dropdown filter)
  const teamProjects = useMemo(() => {
    const ids = new Set(allTeamRecs.map(r => r.projectId));
    return app.projects.filter(p => ids.has(p.id));
  }, [allTeamRecs, app.projects]);

  // filtered + sorted
  const filtered = useMemo(() => {
    let arr = allTeamRecs;
    if (projFilter !== 'all') arr = arr.filter(r => r.projectId === projFilter);
    if (typeFilter !== 'all') arr = arr.filter(r => r.type === typeFilter);
    return [...arr].sort((a, b) => {
      if (sortKey === 'date-desc') return (b.date || '').localeCompare(a.date || '');
      if (sortKey === 'date-asc')  return (a.date || '').localeCompare(b.date || '');
      if (sortKey === 'amount-desc') return computeTotals(b).total - computeTotals(a).total;
      if (sortKey === 'amount-asc')  return computeTotals(a).total - computeTotals(b).total;
      return 0;
    });
  }, [allTeamRecs, projFilter, typeFilter, sortKey]);

  const totalAmt   = filtered.reduce((s, r) => s + computeTotals(r).total, 0);
  const allAmt     = allTeamRecs.reduce((s, r) => s + computeTotals(r).total, 0);

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="btn btn-ghost btn-sm" onClick={onBack}
            style={{ transform: 'rotate(90deg)', padding: '6px 8px' }}>
            <Icon name="chevron" size={16} stroke={2.5} />
          </button>
          <div>
            <h1 className="page-title" style={{ marginBottom: 2 }}>
              ประวัติ: {team.name}
            </h1>
            <div className="page-sub">บันทึกค่าแรงทั้งหมดของทีมนี้ ·{' '}
              <span className="mono">{allTeamRecs.length} บิล</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat">
          <div className="stat-icon" style={{ background: 'rgba(217,119,6,0.12)', color: 'var(--accent)' }}>
            <Icon name="history" size={16} />
          </div>
          <div className="stat-label">บิลทั้งหมด</div>
          <div className="stat-value mono">{allTeamRecs.length}</div>
          <div className="stat-change positive">{teamProjects.length} โครงการ</div>
        </div>
        <div className="stat">
          <div className="stat-icon" style={{ background: 'rgba(22,163,74,0.12)', color: '#16a34a' }}>
            <Icon name="money" size={16} />
          </div>
          <div className="stat-label">ยอดรวมทั้งหมด</div>
          <div className="stat-value mono">฿{fmt(allAmt)}</div>
          <div className="stat-change neutral">ทุกโครงการ</div>
        </div>
        <div className="stat">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
            <Icon name="clipboard" size={16} />
          </div>
          <div className="stat-label">ค่าแรง / เหมาจ่าย</div>
          <div className="stat-value mono">
            {allTeamRecs.filter(r => r.type === 'labor').length} /&nbsp;
            {allTeamRecs.filter(r => r.type === 'lump-labor').length}
          </div>
          <div className="stat-change neutral">รายการ</div>
        </div>
      </div>

      {/* Filter bar + table */}
      <div className="card">
        <div className="filter-bar">
          {/* ประเภท */}
          <div className="tabs">
            <button className={'tab' + (typeFilter === 'all'        ? ' active' : '')} onClick={() => setTypeFilter('all')}>
              ทั้งหมด <span className="badge gray mono">{allTeamRecs.length}</span>
            </button>
            <button className={'tab' + (typeFilter === 'labor'      ? ' active' : '')} onClick={() => setTypeFilter('labor')}>
              <Icon name="hammer" size={13} /> ค่าแรง
            </button>
            <button className={'tab' + (typeFilter === 'lump-labor' ? ' active' : '')} onClick={() => setTypeFilter('lump-labor')}>
              <Icon name="clipboard" size={13} /> เหมาจ่าย
            </button>
          </div>

          {/* กรองโครงการ — แสดงเฉพาะโครงการที่ทีมนี้เคยทำ */}
          <select className="select" value={projFilter} onChange={e => setProjFilter(e.target.value)}>
            <option value="all">ทุกโครงการ ({teamProjects.length})</option>
            {teamProjects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* เรียง */}

          <div className="spacer" />
          <div className="text-small text-muted">
            พบ <strong className="mono" style={{ color: 'var(--ink-1)' }}>{filtered.length}</strong> รายการ ·
            ยอดรวม <strong className="mono" style={{ color: 'var(--ink-1)' }}>฿{fmt(totalAmt)}</strong>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-illust"><Icon name="history" size={28} /></div>
            <div className="empty-title">ไม่พบประวัติ</div>
            <div className="empty-sub">
              {allTeamRecs.length === 0
                ? 'ยังไม่มีบันทึกค่าแรงสำหรับทีมนี้'
                : 'ไม่มีรายการที่ตรงกับตัวกรองที่เลือก'}
            </div>
          </div>
        ) : (
          <RecordsTable records={filtered} onOpen={id => app.setDetailId(id)} />
        )}
      </div>
    </>
  );
}

// ---- Teams view (worker teams management) ----
window.TeamsView = function TeamsView() {
  const app = window.useApp();
  const [open, setOpen] = useState(false);
  const [editTeam, setEditTeam] = useState(null); // team obj | null
  const [selectedTeamId, setSelectedTeamId] = useState(null); // team history sub-view

  // compute stats per team — only count and projects (no money shown here)
  const stats = useMemo(() => {
    const m = {};
    app.records.filter(r => r.type === 'labor' || r.type === 'lump-labor').forEach(r => {
      const k = r.workerTeamId;
      if (!k) return;
      m[k] = m[k] || { count: 0, projects: new Set() };
      m[k].count++;
      m[k].projects.add(r.projectId);
    });
    return m;
  }, [app.records]);

  // ── แสดงหน้าประวัติทีมเมื่อเลือกทีม ─────────────
  if (selectedTeamId) {
    const team = app.workerTeams.find(t => t.id === selectedTeamId);
    if (team) return <TeamHistoryView team={team} onBack={() => setSelectedTeamId(null)} />;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">ทีมช่าง</h1>
          <div className="page-sub">จัดการทีมช่าง — ดูประวัติการเบิกค่าแรงของแต่ละทีม</div>
        </div>
        <button className="btn btn-accent" onClick={() => setOpen(true)}>
          <Icon name="plus" size={14} stroke={2.5} /> เพิ่มทีมช่าง
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {app.workerTeams.map((t) => {
          const s = stats[t.id] || { count: 0, projects: new Set() };
          const coverImg = t.images && t.images.length > 0 ? t.images[0] : null;
          const extraImgs = t.images && t.images.length > 1 ? t.images.slice(1) : [];
          return (
            <div key={t.id} className="card" style={{ transition: 'transform 200ms, box-shadow 200ms' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            >
              <div className="card-body">
                {/* Header row: avatar + name */}
                <div className="row gap-12 mb-12">
                  {/* Avatar — photo if available, else letter */}
                  {coverImg ? (
                    <img src={imgSrc(coverImg)} alt={t.name} style={{
                      width: 52, height: 52, borderRadius: 12, objectFit: 'cover', flexShrink: 0,
                      border: '2px solid var(--line)',
                    }} />
                  ) : (
                    <div style={{
                      width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
                      display: 'grid', placeItems: 'center', color: '#1f1d18', fontWeight: 700, fontSize: 22,
                    }}>{t.name.charAt(0)}</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 16, marginBottom: 3 }}>{t.name}</h3>
                    <div className="text-small text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.leader}{t.phone ? <> · <span className="mono">{t.phone}</span></> : null}
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="row gap-6 wrap mb-14">
                  {t.specialty && <span className="badge amber">{t.specialty}</span>}
                  <span className="badge gray">{t.size} คน</span>
                  <span className="badge gray">{s.projects.size} โครงการ</span>
                  <span className="badge gray mono">{s.count} บิล</span>
                  {t.needsDoc
                    ? <span className="badge dot" style={{ background:'rgba(37,99,235,0.12)', color:'#1d4ed8', borderColor:'rgba(37,99,235,0.3)' }}>📄 ต้องออกเอกสาร</span>
                    : <span className="badge dot" style={{ background:'rgba(107,114,128,0.1)', color:'#6b7280', borderColor:'rgba(107,114,128,0.25)' }}>ไม่ออกเอกสาร</span>}
                </div>

                {/* รายชื่อลูกทีม — ออกแล้วขีดฆ่า (เก็บเป็นประวัติ) */}
                {(t.members && t.members.length > 0) && (
                  <div style={{ marginBottom: 14, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.7 }}>
                    <Icon name="users" size={12} /> <span style={{ color: 'var(--ink-3)' }}>ลูกทีม ({t.members.filter(m => m.active).length}/{t.members.length}): </span>
                    {t.members.map((m, i) => (
                      <span key={m.id || i} title={m.active ? (m.phone || '') : ('ออกแล้ว' + (m.leftDate ? ' ' + fmtDate(m.leftDate) : ''))}
                        style={{ color: m.active ? 'var(--ink-1)' : 'var(--ink-4)', textDecoration: m.active ? 'none' : 'line-through' }}>
                        {m.name}{i < t.members.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                )}

                {/* ข้อมูลเอกสาร — แสดงเมื่อ needsDoc */}
                {t.needsDoc && (t.fullName || t.idCard || t.address || (t.docImages && t.docImages.length > 0)) && (
                  <div style={{
                    padding: '10px 12px', borderRadius: 8, marginBottom: 12,
                    background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.18)',
                    fontSize: 12, lineHeight: 1.7,
                  }}>
                    {t.fullName && <div><span style={{ color:'#6b7280' }}>ชื่อจริง:</span> <strong>{t.fullName}</strong></div>}
                    {t.idCard   && <div><span style={{ color:'#6b7280' }}>บัตรประชาชน:</span> <span className="mono">{t.idCard}</span></div>}
                    {t.address  && <div><span style={{ color:'#6b7280' }}>ที่อยู่:</span> {t.address}</div>}
                    {t.docImages && t.docImages.length > 0 && (
                      <>
                        <div style={{ color:'#6b7280', marginTop: 6, marginBottom: 4 }}>เอกสารแนบ ({t.docImages.length}):</div>
                        <div className="row gap-6" style={{ flexWrap: 'wrap' }}>
                          {t.docImages.map((img, i) => (
                            <a key={i} href={imgSrc(img)} target="_blank" rel="noreferrer">
                              <img src={imgSrc(img)} alt="เอกสาร" style={{
                                width: 46, height: 46, borderRadius: 6, objectFit: 'cover',
                                border: '1px solid rgba(37,99,235,0.3)', cursor: 'pointer', display: 'block',
                              }} />
                            </a>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Note */}
                {t.note && (
                  <div style={{
                    padding: '9px 12px', marginBottom: 14,
                    background: 'var(--bg)', borderRadius: 8,
                    fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.6,
                    borderLeft: '3px solid var(--line-strong)',
                  }}>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>หมายเหตุ</div>
                    {t.note}
                  </div>
                )}

                {/* Extra images strip (images 2-5) */}
                {extraImgs.length > 0 && (
                  <div className="row gap-6 mb-14" style={{ flexWrap: 'wrap' }}>
                    {extraImgs.map((img, i) => (
                      <img key={i} src={imgSrc(img)} alt="" style={{
                        width: 52, height: 52, borderRadius: 8, objectFit: 'cover',
                        border: '1px solid var(--line)',
                      }} />
                    ))}
                  </div>
                )}

                {/* Action row */}
                <div className="row gap-8" style={{ marginTop: extraImgs.length > 0 ? 0 : 4 }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}
                    onClick={() => setSelectedTeamId(t.id)}
                    disabled={!s.count}
                    title={s.count ? `ดูประวัติ ${s.count} บิล` : 'ยังไม่มีประวัติ'}>
                    <Icon name="history" size={12} /> ดูประวัติ {s.count > 0 && <span className="badge gray mono" style={{ marginLeft: 2 }}>{s.count}</span>}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditTeam(t)} title="แก้ไขข้อมูลทีม">
                    <Icon name="edit" size={12} />
                  </button>
                  {app.isAdmin && (
                    <button className="btn btn-danger btn-sm" onClick={() => {
                      if (s.count) { app.pushToast('ลบไม่ได้ — มีรายการเบิกของทีมนี้อยู่', 'error'); return; }
                      app.deleteWorkerTeam(t.id); app.pushToast('ลบทีมช่างแล้ว');
                    }}>
                      <Icon name="trash" size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <window.AddWorkerTeamModal open={open} onClose={() => setOpen(false)} onAdd={(t) => {
        app.addWorkerTeam(t); app.pushToast('เพิ่มทีมช่างแล้ว'); setOpen(false);
      }} />

      <window.EditWorkerTeamModal
        open={!!editTeam}
        onClose={() => setEditTeam(null)}
        team={editTeam}
        onSave={(patch) => {
          app.updateWorkerTeam(editTeam.id, patch);
          app.pushToast('บันทึกข้อมูลทีมช่างแล้ว');
          setEditTeam(null);
        }}
      />
    </>
  );
};

// ---- Detail drawer ----
// เปลี่ยนประเภทเอกสาร — แก้กรณีลงผิดประเภท (ย้ายวัสดุ↔เครื่องจักร↔ค่าแรง↔อื่นๆ)
const CONVERTIBLE_TYPES = [
  { id: 'material', label: 'จัดซื้อวัสดุ' },
  { id: 'machine', label: 'เช่าเครื่องจักร' },
  { id: 'labor', label: 'ค่าแรง' },
  { id: 'lump-labor', label: 'ค่าแรงเหมาจ่าย' },
  { id: 'other', label: 'ค่าใช้จ่ายอื่นๆ' },
  { id: 'quick-receipt', label: 'บิลด่วน (รูปถ่ายใบเสร็จ)' },
];
function TypeChanger({ rec }) {
  const app = window.useApp();
  if (window.isIncome(rec) || !CONVERTIBLE_TYPES.some(t => t.id === rec.type)) return null;
  const change = (e) => {
    const nt = e.target.value;
    if (!nt || nt === rec.type) return;
    const label = CONVERTIBLE_TYPES.find(t => t.id === nt)?.label || nt;
    const warnLink = (rec.contractId || rec.installmentEnabled)
      ? '\n\n⚠️ เอกสารนี้ผูกกับสัญญา/แบ่งงวด — ควรเช็คความถูกต้องหลังย้าย' : '';
    if (window.confirm('ย้ายเอกสาร ' + rec.docNo + ' ไปเป็นประเภท "' + label + '"?\n\nยอดเงินและรายการยังอยู่ครบ · เลขที่เอกสารไม่เปลี่ยน · หมวดหมู่รายการอาจต้องเลือกใหม่ให้ตรงประเภท' + warnLink)) {
      app.updateRecord(rec.id, { type: nt });
      app.pushToast('ย้ายประเภทเอกสารแล้ว → ' + label);
    }
  };
  return (
    <div className="detail-section">
      <h3 style={{ fontSize: 13, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>เปลี่ยนประเภทเอกสาร</h3>
      <select className="select" value={rec.type} onChange={change} style={{ maxWidth: 280 }}>
        {CONVERTIBLE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
      <div className="field-hint" style={{ marginTop: 8 }}>ใช้แก้กรณีลงผิดประเภท (เช่น ลงวัสดุ แต่จริงเป็นค่าแรง) — ยอดเงิน/รายการยังอยู่ครบ ไม่ต้องลบทำใหม่</div>
    </div>
  );
}

window.DetailDrawer = function DetailDrawer() {
  const app = window.useApp();
  const rec = app.records.find(r => r.id === app.detailId);

  // Lightbox state — รูปไหน + ชุดรูปไหน
  const [lbImgs, setLbImgs] = useState([]);
  const [lbIdx,  setLbIdx]  = useState(-1);
  const openLb  = (images, idx) => { setLbImgs(images); setLbIdx(idx); };
  const closeLb = () => setLbIdx(-1);

  // เปิดรายละเอียด → ดึงข้อมูลเต็ม (รูปภาพ + บันทึกงาน) เพื่อให้แสดงครบ และปลอดภัยตอนกดแก้ไข
  useEffect(() => { if (app.detailId) app.hydrateRecord(app.detailId); }, [app.detailId]);

  if (!rec) return null;
  const proj = app.projects.find(p => p.id === rec.projectId);
  const isLaborType = rec.type === 'labor' || rec.type === 'lump-labor';
  const cats = rec.type === 'machine' ? app.machCats
    : rec.type === 'lump-labor' ? (app.lumpLaborCats || [])
    : rec.type === 'labor' ? app.laborCats
    : rec.type === 'other' ? (app.otherCats || [])
    : app.matCats;
  const team = isLaborType ? app.workerTeams.find(t => t.id === rec.workerTeamId) : null;
  const totals = computeTotals(rec);
  const close = () => app.setDetailId(null);

  const isQuickReceipt = rec.type === 'quick-receipt';
  const typeBadge = rec.type === 'material'
    ? <span className="badge amber dot">จัดซื้อวัสดุ</span>
    : rec.type === 'machine'
    ? <span className="badge blue dot">เช่าเครื่องจักร</span>
    : rec.type === 'lump-labor'
    ? <span className="badge green dot">เหมาจ่าย</span>
    : window.isIncome(rec)
    ? <span className="badge dot" style={{ background:'rgba(5,150,105,0.12)', color:'#059669', borderColor:'rgba(5,150,105,0.3)' }}>💰 รายรับ</span>
    : rec.type === 'other'
    ? <span className="badge dot" style={{ background:'rgba(99,102,241,0.12)', color:'#6366f1', borderColor:'rgba(99,102,241,0.3)' }}>ค่าใช้จ่ายอื่นๆ</span>
    : rec.type === 'quick-receipt'
    ? <span className="badge dot" style={{ background:'rgba(14,165,233,0.12)', color:'#0ea5e9', borderColor:'rgba(14,165,233,0.3)' }}>📸 บิลด่วน</span>
    : rec.type === 'receipt'
    ? <span className="badge dot" style={{ background:'rgba(5,150,105,0.12)', color:'#059669', borderColor:'rgba(5,150,105,0.3)' }}>📄 ใบเสร็จรับเงิน</span>
    : rec.type === 'tax-invoice'
    ? <span className="badge dot" style={{ background:'rgba(146,64,14,0.12)', color:'#92400e', borderColor:'rgba(146,64,14,0.3)' }}>🧾 ใบเสร็จ/ใบกำกับภาษี</span>
    : rec.type === 'invoice'
    ? <span className="badge dot" style={{ background:'rgba(37,99,235,0.12)', color:'#1d4ed8', borderColor:'rgba(37,99,235,0.3)' }}>📋 ใบแจ้งหนี้</span>
    : <span className="badge dot" style={{ background: 'oklch(0.94 0.04 290)', color: 'oklch(0.50 0.14 290)', borderColor: 'oklch(0.86 0.06 290)' }}>บันทึกค่าแรง</span>;

  // Editable work logs inline (saves immediately via updateRecord)
  const updateLogs = (logs) => app.updateRecord(rec.id, { workLogs: logs });

  return (
    <>
      <div className="drawer-backdrop" onClick={close}></div>
      <aside className="drawer">
        <div style={{ position: 'sticky', top: 0, background: 'var(--surface)', borderBottom: '1px solid var(--line)', zIndex: 2 }}>
          <div className="drawer-header-row">
            <div className="drawer-header-info">
              <div className="row gap-8" style={{ marginBottom: 4 }}>
                {typeBadge}
                <span className="mono text-small text-muted">{rec.docNo}</span>
                {(isLaborType || window.isIncome(rec)) && rec.period && <span className="badge gray">{rec.period}</span>}
              </div>
              <h2 style={{ fontSize: 20 }}>{rec.vendor}</h2>
              {rec.createdBy?.name && (
                <div className="text-small text-muted" style={{ marginTop: 3, fontSize: 11.5 }}>
                  บันทึกโดย {rec.createdBy.name}
                  {rec.createdBy.at && ` · ${fmtDate(rec.createdBy.at)}`}
                </div>
              )}
            </div>
            {app.isAdmin && (
              <button className="btn btn-ghost btn-sm" onClick={() => {
                if (!confirm('ยืนยันลบรายการนี้?')) return;
                app.deleteRecord(rec.id); app.pushToast('ลบรายการแล้ว'); close();
              }}><Icon name="trash" size={13} /> ลบ</button>
            )}
            {rec.approved && ['material', 'machine', 'other', 'labor', 'lump-labor'].includes(rec.type) && (
              <button className="btn btn-ghost btn-sm" onClick={() => {
                const c = window.getCompanySettings();
                window.openPrintPopup(window.PrintablePaymentApproval, 'ใบอนุมัติสั่งจ่าย ' + rec.docNo, installmentPrintRec(rec), c, app);
              }} title="พิมพ์ใบอนุมัติสั่งจ่าย สำหรับส่งฝ่ายบัญชี">
                <Icon name="receipt" size={13} /> ใบอนุมัติ
              </button>
            )}
            <button className="btn btn-accent btn-sm" onClick={() => {
              app.setEditingId(rec.id);
              const v = window.isIncome(rec) ? 'new-income'
                : rec.type === 'machine' ? 'new-machine'
                : rec.type === 'labor' ? 'new-labor'
                : rec.type === 'lump-labor' ? 'new-lump-labor'
                : rec.type === 'other' ? 'new-other'
                : rec.type === 'quick-receipt' ? 'quick-receipt'
                : 'new-material';
              app.setView(v);
              close();
            }}><Icon name="edit" size={13} /> แก้ไข</button>
            <button className="btn btn-ghost btn-sm" onClick={close}>
              <span style={{ display:'inline-block', transform:'rotate(180deg)', lineHeight:0 }}><Icon name="chevron" size={13} /></span>
              ย้อนกลับ
            </button>
          </div>
        </div>

        <div className="detail-section">
          <h3 style={{ fontSize: 13, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>ข้อมูลทั่วไป</h3>
          <div className="detail-row">
            <div className="label">โครงการ</div>
            <div className="value">
              <span className="proj-chip-dot" style={{ background: proj?.color, display: 'inline-block', marginRight: 8 }}></span>
              <span className="mono text-small text-muted" style={{ marginRight: 8 }}>{proj?.code}</span>
              {proj?.name}
            </div>
          </div>
          <div className="detail-row">
            <div className="label">วันที่</div>
            <div className="value">{fmtDate(rec.date)}</div>
          </div>
          <div className="detail-row">
            <div className="label">{isLaborType ? 'ทีมช่าง' : 'ผู้ขาย'}</div>
            <div className="value">
              {team ? (
                <div>
                  <div style={{ fontWeight: 500 }}>{team.name}</div>
                  <div className="text-small text-muted">หัวหน้า: {team.leader} · <span className="mono">{team.phone}</span></div>
                </div>
              ) : rec.vendor}
            </div>
          </div>
          {rec.workNote && (
            <div className="detail-row">
              <div className="label">หมายเหตุรายการงาน</div>
              <div className="value" style={{ whiteSpace: 'pre-wrap' }}>{rec.workNote}</div>
            </div>
          )}
          {rec.note && (
            <div className="detail-row">
              <div className="label">หมายเหตุ</div>
              <div className="value" style={{ whiteSpace: 'pre-wrap' }}>{rec.note}</div>
            </div>
          )}
        </div>

        {/* เปลี่ยนประเภทเอกสาร — แก้กรณีลงผิดประเภท */}
        <TypeChanger rec={rec} />

        {/* แบ่งจ่ายเป็นงวด — ตารางงวด + จ่ายทีละงวด */}
        {rec.installmentEnabled && <InstallmentPayPanel key={rec.id} rec={rec} />}

        {/* ตามบิล — รับใบกำกับภาษี/ใบเสร็จจากร้าน (เฉพาะโครงการที่เปิดตามบิล) */}
        {needsBill(rec, proj) && <BillReceiveSection key={rec.id} rec={rec} />}

        {/* เอกสารที่ต้องออก — ทำเครื่องหมาย "ออกแล้ว" กันออกซ้ำ */}
        {(rec.docs && rec.docs.length > 0) && (
          <div className="detail-section">
            <h3 style={{ fontSize: 13, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>เอกสารที่ต้องออก</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rec.docs.map((d) => {
                const doc = DOC_TYPES.find(x => x.id === d);
                const issued = (rec.docsIssued || []).includes(d);
                const toggle = () => {
                  const cur = rec.docsIssued || [];
                  const next = issued ? cur.filter(x => x !== d) : [...cur, d];
                  app.updateRecord(rec.id, { docsIssued: next });
                  app.pushToast(issued ? 'ยกเลิกสถานะออกแล้ว' : 'ทำเครื่องหมายออกเอกสารแล้ว ✓');
                };
                return (
                  <div key={d} className="row between" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: issued ? 'var(--accent-soft)' : 'var(--surface-2)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{doc?.label || d}</div>
                      {doc?.sub && <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{doc.sub}</div>}
                    </div>
                    <button className={"status-chip" + (issued ? " on approve" : "")} onClick={toggle}>
                      <span className="tick">{issued ? '✓' : ''}</span> {issued ? 'ออกแล้ว' : 'ทำเครื่องหมายออกแล้ว'}
                    </button>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 8, lineHeight: 1.5 }}>
              กด "ทำเครื่องหมายออกแล้ว" เมื่อออกเอกสารเรียบร้อย — บิลจะหลุดจากตัวกรอง "รอออกเอกสาร" กันการออกซ้ำ
            </div>
          </div>
        )}

        {/* Team history in same project — labor types only */}
        {isLaborType && team && (
          <div className="detail-section">
            <h3 style={{ fontSize: 13, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>ประวัติทีมในโครงการเดียวกัน</h3>
            <window.TeamHistoryPanel teamId={rec.workerTeamId} projectId={rec.projectId} excludeId={rec.id} compact />
          </div>
        )}

        {/* Quick-receipt: แสดงรูปใบเสร็จแทน items table */}
        {isQuickReceipt && (rec.images || []).length > 0 && (
          <div className="detail-section">
            <h3 style={{ fontSize: 13, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              รูปใบเสร็จ <span style={{ textTransform:'none', letterSpacing:0, fontWeight:400, fontSize:11, color:'var(--ink-4)', marginLeft:6 }}>({rec.images.length} รูป)</span>
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(100px, 1fr))', gap:8 }}>
              {rec.images.map((img, idx) => {
                const src = imgSrc(img);
                return (
                  <button key={idx} type="button" onClick={() => openLb(rec.images, idx)}
                    style={{ display:'block', aspectRatio:'3/4', borderRadius:8, overflow:'hidden',
                      border:'1px solid var(--line)', background:'var(--bg-2)', padding:0, cursor:'zoom-in' }}>
                    <img className="zoomable" src={src} alt={imgAlt(img, `รูป ${idx + 1}`)}
                      style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Items table — quick-receipt แสดงเมื่อมีรายการ (ดูยอด/รายละเอียดได้) */}
        {(!isQuickReceipt || (rec.items || []).length > 0) && <div className="detail-section">
          <h3 style={{ fontSize: 13, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>{isLaborType ? `รายการงาน (${rec.items.length})` : `รายการ (${rec.items.length})`}</h3>
          <div style={{ overflowX: 'auto' }}>
          <table className="items-table" style={{ minWidth: 360 }}>
            <thead>
              <tr>
                <th>{isLaborType ? 'งาน' : 'รายการ'}</th>
                <th className="hide-mobile" style={{ width: 100 }}>{isLaborType ? 'หมวดงาน' : 'หมวดหมู่'}</th>
                <th style={{ width: 90 }} className="num">จำนวน</th>
                <th style={{ width: 90 }} className="num">ราคา</th>
                <th style={{ width: 110 }} className="num">รวม</th>
              </tr>
            </thead>
            <tbody>
              {rec.items.map((it) => {
                const c = cats.find(x => x.id === it.categoryId);
                return (
                  <tr key={it.id}>
                    <td style={{ padding: '10px 8px' }}>
                      {it.name}
                      {c && <div className="show-mobile tbl-sub"><span className="cat-dot" style={{ background: c.color, width: 6, height: 6, borderRadius: '50%', display: 'inline-block', marginRight: 4 }}></span>{c.name}</div>}
                    </td>
                    <td className="hide-mobile" style={{ padding: '10px 8px' }}>
                      {c ? <span className="cat-pill"><span className="cat-dot" style={{ background: c.color }}></span>{c.name}</span> : <span className="text-muted">—</span>}
                    </td>
                    <td style={{ padding: '10px 8px' }} className="num mono">{it.qty} {it.unit}</td>
                    <td style={{ padding: '10px 8px' }} className="num mono">{fmt(it.price)}</td>
                    <td style={{ padding: '10px 8px' }} className="num mono">{fmt(Number(it.qty) * Number(it.price))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>}

        {/* Docs & Tax — ซ่อนสำหรับ quick-receipt */}
        {!isQuickReceipt && <div className="detail-section">
          <h3 style={{ fontSize: 13, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>เอกสารและภาษี</h3>
          <div className="row gap-8 wrap mb-16">
            {rec.docs.length === 0 && <span className="text-small text-muted">ไม่มีเอกสารกำกับ</span>}
            {rec.docs.map((d) => {
              const doc = DOC_TYPES.find(x => x.id === d);
              return <span key={d} className="badge amber">{doc?.label}</span>;
            })}
            {rec.vatMode === 'cash'
              ? <span className="badge gray">บิลเงินสด</span>
              : Number(rec.vatRate) > 0 && <span className="badge gray">{rec.vatMode === 'inclusive' ? 'รวม Vat แล้ว' : 'ไม่รวม Vat'}</span>}
            {rec.whtEnabled && <span className="badge">หัก ณ ที่จ่าย {rec.whtRate}%</span>}
          </div>

          {/* ข้อมูลผู้รับเงิน (สำหรับออกเอกสาร) — แสดงเมื่อมีข้อมูลที่กรอกไว้ */}
          {rec.docInfo && (rec.docInfo.name || rec.docInfo.taxId || rec.docInfo.address) && (
            <div style={{
              marginBottom: 16, padding: '12px 14px', borderRadius: 10,
              background: 'var(--surface-2)', border: '1px solid var(--line)',
            }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                ข้อมูลผู้รับเงิน (สำหรับออกเอกสาร)
              </div>
              {rec.docInfo.name && (
                <div className="detail-row"><div className="label">ชื่อ-นามสกุล</div><div className="value">{rec.docInfo.name}</div></div>
              )}
              {rec.docInfo.taxId && (
                <div className="detail-row"><div className="label">เลขบัตร ปชช./ผู้เสียภาษี</div><div className="value mono">{rec.docInfo.taxId}</div></div>
              )}
              {rec.docInfo.address && (
                <div className="detail-row"><div className="label">ที่อยู่</div><div className="value" style={{ whiteSpace: 'pre-wrap' }}>{rec.docInfo.address}</div></div>
              )}
            </div>
          )}
          <div className="summary-rows" style={{ maxWidth: 380, marginLeft: 'auto' }}>
            <div className="summary-row"><span className="label">{rec.type === 'lump-labor' ? 'ยอดเหมารวม' : isLaborType ? 'ค่าแรงรวม' : 'ยอดก่อนภาษี'}</span><span className="value">{fmt(totals.subTotal)}</span></div>
            {Number(rec.vatRate) > 0 && <div className="summary-row"><span className="label">Vat {rec.vatRate}%</span><span className="value">{fmt(totals.vat)}</span></div>}
            {rec.whtEnabled && <div className="summary-row"><span className="label">หัก ณ ที่จ่าย {rec.whtRate}%{Number(rec.advanceDeduction) > 0 ? ` (ฐาน ฿${fmt(totals.whtBase)})` : ''}</span><span className="value" style={{ color: 'var(--danger)' }}>− {fmt(totals.wht)}</span></div>}
            {Number(rec.advanceDeduction) > 0 && <div className="summary-row"><span className="label" style={{ color: 'var(--warn)' }}>หักเบิกล่วงหน้า</span><span className="value" style={{ color: 'var(--warn)' }}>− {fmt(totals.advance)}</span></div>}
            {Number(rec.retentionDeduction) > 0 && <div className="summary-row"><span className="label" style={{ color: 'var(--info)' }}>หักเงินประกัน</span><span className="value" style={{ color: 'var(--info)' }}>− {fmt(totals.retention)}</span></div>}
            <div className="summary-row total"><span className="label">{Number(rec.socialSecurity) > 0 ? 'ยอดสุทธิ (บันทึกรายจ่าย)' : 'ยอดสุทธิ'}</span><span className="value">{fmt(totals.total)} บาท</span></div>
            {totals.socialSecurity > 0 && <div className="summary-row"><span className="label" style={{ color: '#7c3aed' }}>หักประกันสังคม{rec.socialSecurityPeriod ? ` · ${monthLabelTH(rec.socialSecurityPeriod)}` : ''}</span><span className="value" style={{ color: '#7c3aed' }}>− {fmt(totals.socialSecurity)}</span></div>}
            {totals.socialSecurity > 0 && <div className="summary-row total"><span className="label">โอนช่างจริง</span><span className="value" style={{ color: 'var(--accent-strong)' }}>{fmt(totals.netPay)} บาท</span></div>}
            {(rec.socialSecurityItems && rec.socialSecurityItems.filter(m => Number(m.amount) > 0).length > 0)
              ? <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 6, textAlign: 'right' }}>{rec.socialSecurityItems.filter(m => Number(m.amount) > 0).map(m => `${m.name || '—'} ฿${fmt(m.amount)}`).join('  ·  ')}</div>
              : (rec.socialSecurityNote ? <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 6, textAlign: 'right', whiteSpace: 'pre-wrap' }}>ปกส.: {rec.socialSecurityNote}</div> : null)}
          </div>
        </div>}

        {/* Editable work logs — labor types only */}
        {isLaborType && (
          <div className="detail-section" style={{ background: 'var(--surface-2)' }}>
            <div className="row between mb-16">
              <h3 style={{ fontSize: 13, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                รายละเอียดงาน <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, fontSize: 11, color: 'var(--ink-4)', marginLeft: 6 }}>(เพิ่ม-แก้ไขได้ที่นี่)</span>
              </h3>
              <span className="badge gray mono">{(rec.workLogs || []).length} บันทึก</span>
            </div>
            <window.WorkLogsEditor logs={rec.workLogs || []} onChange={updateLogs} />
          </div>
        )}

        {/* Deposit section — shown when depositAmount > 0 */}
        {Number(rec.depositAmount) > 0 && (
          <div className="detail-section" style={{ background:'rgba(59,130,246,0.03)', borderTop:'2px solid rgba(59,130,246,0.2)' }}>
            <h3 style={{ fontSize:13, color:'#3b82f6', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:12,
              display:'flex', alignItems:'center', gap:6 }}>
              <Icon name="money" size={13} /> เงินค่าประกันสินค้า
            </h3>

            {rec.depositStatus === 'returned' ? (
              /* ---- Returned state ---- */
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ padding:'3px 12px', borderRadius:20, fontSize:12, fontWeight:600,
                    background:'rgba(22,163,74,0.15)', color:'#16a34a', border:'1px solid rgba(22,163,74,0.3)' }}>
                    ✓ รับเงินคืนแล้ว
                  </span>
                  <span style={{ fontSize:12, color:'var(--ink-3)' }}>{fmtDate(rec.depositReturnDate)}</span>
                </div>
                <div className="detail-row">
                  <div className="label">ยอดที่รับคืน</div>
                  <div className="value mono" style={{ fontWeight:700, color:'#16a34a', fontSize:16 }}>
                    ฿{fmt(Number(rec.depositAmount))}
                  </div>
                </div>
                {rec.depositReturnNote && (
                  <div className="detail-row">
                    <div className="label">หมายเหตุ</div>
                    <div className="value">{rec.depositReturnNote}</div>
                  </div>
                )}
                {rec.depositReturnImages && rec.depositReturnImages.length > 0 && (
                  <div>
                    <div style={{ fontSize:11, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>
                      สลิปโอนเงินคืน
                    </div>
                    <div className="detail-images">
                      {rec.depositReturnImages.map((img, i) => (
                        <img key={i} className="zoomable" src={imgSrc(img)} alt="สลิป"
                          onClick={() => openLb(rec.depositReturnImages, i)}
                          style={{ borderRadius:8 }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ---- Pending state — show return form ---- */
              <DepositReturnForm rec={rec} />
            )}
          </div>
        )}

        {/* รูปภาพแนบทั่วไป — ซ่อนสำหรับ quick-receipt (มี section "รูปใบเสร็จ" แยกแล้ว) */}
        {!isQuickReceipt && rec.images && rec.images.length > 0 && (
          <div className="detail-section">
            <h3 style={{ fontSize: 13, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>รูปภาพแนบ ({rec.images.length})</h3>
            <div className="detail-images">
              {rec.images.map((img, i) => (
                <img key={i} className="zoomable" src={imgSrc(img)} alt={imgAlt(img)}
                  onClick={() => openLb(rec.images, i)} />
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Lightbox — เปิดเมื่อกดรูป */}
      <window.ImageLightbox
        images={lbImgs}
        index={lbIdx}
        onClose={closeLb}
        onChange={setLbIdx}
      />
    </>
  );
};

// ---- Deposits history view ----
window.DepositsView = function DepositsView() {
  const app = window.useApp();
  const [statusFilter, setStatusFilter] = useState('all');
  const [projFilter, setProjFilter]     = useState('all');

  const allDeposits = useMemo(() =>
    app.records.filter(r => Number(r.depositAmount) > 0),
    [app.records]
  );

  const isPending = (r) => !r.depositStatus || r.depositStatus === 'pending';

  const filtered = useMemo(() => {
    let arr = allDeposits.slice();
    if (statusFilter === 'pending')  arr = arr.filter(isPending);
    if (statusFilter === 'returned') arr = arr.filter(r => r.depositStatus === 'returned');
    if (projFilter !== 'all')        arr = arr.filter(r => r.projectId === projFilter);
    return arr.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [allDeposits, statusFilter, projFilter]);

  const pendingList  = allDeposits.filter(isPending);
  const returnedList = allDeposits.filter(r => r.depositStatus === 'returned');
  const pendingTotal  = pendingList.reduce((s, r)  => s + Number(r.depositAmount), 0);
  const returnedTotal = returnedList.reduce((s, r) => s + Number(r.depositAmount), 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">เงินประกันสินค้า</h1>
          <div className="page-sub">ติดตามเงินมัดจำ / ค่าประกันที่วางกับผู้ขาย พร้อมสถานะการรับคืน</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
        <div className="stat">
          <div className="stat-label">รอรับคืน</div>
          <div className="stat-value mono" style={{ color:'#ca8a04' }}>฿{fmt(pendingTotal)}</div>
          <div className="stat-delta">
            <Icon name="bell" size={11} stroke={2.5} /> {pendingList.length} รายการที่ยังค้างอยู่
          </div>
          <div className="stat-icon" style={{ background:'rgba(234,179,8,0.12)', color:'#ca8a04' }}>
            <Icon name="bell" size={18} />
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">รับคืนแล้ว</div>
          <div className="stat-value mono" style={{ color:'#16a34a' }}>฿{fmt(returnedTotal)}</div>
          <div className="stat-delta">
            <Icon name="check" size={11} stroke={2.5} /> {returnedList.length} รายการเสร็จสมบูรณ์
          </div>
          <div className="stat-icon" style={{ background:'rgba(22,163,74,0.12)', color:'#16a34a' }}>
            <Icon name="check" size={18} />
          </div>
        </div>
      </div>

      {/* Filter + table card */}
      <div className="card">
        <div className="filter-bar">
          <div className="tabs">
            <button className={"tab"+(statusFilter==='all'?' active':'')} onClick={()=>setStatusFilter('all')}>
              ทั้งหมด <span className="badge gray mono">{allDeposits.length}</span>
            </button>
            <button className={"tab"+(statusFilter==='pending'?' active':'')} onClick={()=>setStatusFilter('pending')}>
              ⏳ รอรับคืน <span className="badge gray mono">{pendingList.length}</span>
            </button>
            <button className={"tab"+(statusFilter==='returned'?' active':'')} onClick={()=>setStatusFilter('returned')}>
              ✓ รับคืนแล้ว <span className="badge gray mono">{returnedList.length}</span>
            </button>
          </div>
          <select className="select" value={projFilter} onChange={e=>setProjFilter(e.target.value)}>
            <option value="all">ทุกโครงการ</option>
            {app.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-illust"><Icon name="safe" size={28} /></div>
            <div className="empty-title">ไม่มีรายการเงินประกัน</div>
            <div className="empty-sub">เมื่อบันทึกจัดซื้อ / เช่าเครื่องจักร พร้อมระบุยอดเงินประกัน รายการจะปรากฏที่นี่</div>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="history-table">
              <thead>
                <tr>
                  <th style={{ width:130 }}>เลขที่</th>
                  <th style={{ width:90  }}>วันที่ซื้อ</th>
                  <th>โครงการ</th>
                  <th>ผู้ขาย / ผู้ให้เช่า</th>
                  <th style={{ width:95  }}>ประเภท</th>
                  <th style={{ width:120 }} className="num">ยอดประกัน</th>
                  <th style={{ width:135 }}>สถานะ</th>
                  <th style={{ width:95  }}>วันรับคืน</th>
                  <th style={{ width:62  }}>สลิป</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const proj    = app.projects.find(p => p.id === r.projectId);
                  const pending = isPending(r);
                  return (
                    <tr key={r.id} onClick={() => app.setDetailId(r.id)}>
                      <td className="mono" style={{ fontSize:12.5, fontWeight:500 }}>{r.docNo}</td>
                      <td style={{ color:'var(--ink-2)' }}>{fmtDate(r.date)}</td>
                      <td>
                        <div className="row gap-8">
                          <span className="proj-chip-dot" style={{ background:proj?.color||'#999' }}></span>
                          <span style={{ fontSize:13 }}>{proj?.name||'—'}</span>
                        </div>
                      </td>
                      <td style={{ color:'var(--ink-2)' }}>{r.vendor}</td>
                      <td>
                        {r.type === 'material'
                          ? <span className="badge amber dot">วัสดุ</span>
                          : <span className="badge blue dot">เครื่องจักร</span>}
                      </td>
                      <td className="num mono" style={{ fontWeight:700, fontSize:13.5, color:'#3b82f6' }}>
                        {fmt(Number(r.depositAmount))}
                      </td>
                      <td>
                        {pending ? (
                          <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, whiteSpace:'nowrap',
                            background:'rgba(234,179,8,0.15)', color:'#ca8a04', border:'1px solid rgba(234,179,8,0.35)' }}>
                            ⏳ รอรับคืน
                          </span>
                        ) : (
                          <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, whiteSpace:'nowrap',
                            background:'rgba(22,163,74,0.13)', color:'#16a34a', border:'1px solid rgba(22,163,74,0.3)' }}>
                            ✓ รับคืนแล้ว
                          </span>
                        )}
                      </td>
                      <td style={{ color:'var(--ink-2)', fontSize:12.5 }}>
                        {r.depositReturnDate ? fmtDate(r.depositReturnDate) : (
                          <span style={{ color:'var(--ink-4)' }}>—</span>
                        )}
                      </td>
                      <td>
                        {r.depositReturnImages && r.depositReturnImages.length > 0 ? (
                          <img src={imgSrc(r.depositReturnImages[0])} alt="สลิป"
                            style={{ width:42, height:42, borderRadius:7, objectFit:'cover',
                              border:'1px solid var(--line)', display:'block' }} />
                        ) : (
                          <span style={{ color:'var(--ink-4)', fontSize:12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

// ---- Users Management view (admin only) ----
window.UsersView = function UsersView() {
  const app = window.useApp();
  const [profiles, setProfiles]         = React.useState([]);
  const [loading, setLoading]           = React.useState(true);
  const [confirmDelete, setConfirmDelete] = React.useState(null); // profile object | null
  const [deleting, setDeleting]         = React.useState(false);

  const load = React.useCallback(() => {
    if (!window.db) return;
    setLoading(true);
    window.db.getAllProfiles()
      .then(data => { setProfiles(data); setLoading(false); })
      .catch(() => { app.pushToast('โหลดรายชื่อผู้ใช้ไม่สำเร็จ', 'error'); setLoading(false); });
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const toggleRole = async (profile) => {
    const newRole = profile.role === 'admin' ? 'user' : 'admin';
    if (profile.id === app.session?.user?.id) {
      app.pushToast('ไม่สามารถเปลี่ยนสิทธิ์ของตัวเองได้', 'error'); return;
    }
    try {
      await window.db.updateUserRole(profile.id, newRole);
      app.pushToast(`เปลี่ยนสิทธิ์ ${profile.full_name || profile.email} เป็น ${newRole === 'admin' ? 'Admin' : 'User'} แล้ว`);
      load();
    } catch (e) {
      app.pushToast('เปลี่ยนสิทธิ์ไม่สำเร็จ', 'error');
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await window.db.deleteUserProfile(confirmDelete.id);
      app.pushToast(`ลบผู้ใช้ ${confirmDelete.full_name || confirmDelete.email} แล้ว`);
      setConfirmDelete(null);
      load();
    } catch (e) {
      app.pushToast('ลบผู้ใช้ไม่สำเร็จ: ' + (e.message || 'unknown error'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const isSelf = (p) => p.id === app.session?.user?.id;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">จัดการผู้ใช้งาน</h1>
          <p className="page-sub">กำหนดสิทธิ์ผู้ใช้ที่ลงทะเบียนเข้ามา</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 760 }}>
        {/* Legend */}
        <div style={{ display:'flex', gap:16, marginBottom:20, padding:'12px 16px',
          background:'var(--bg-2)', borderRadius:10, border:'1px solid var(--line)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700,
              background:'rgba(217,119,6,0.18)', color:'#d97706' }}>Admin</span>
            <span style={{ fontSize:12, color:'var(--ink-3)' }}>ดำเนินการได้ทุกอย่าง รวมถึงลบข้อมูล</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700,
              background:'rgba(100,116,139,0.15)', color:'#64748b' }}>User</span>
            <span style={{ fontSize:12, color:'var(--ink-3)' }}>เพิ่ม/แก้ไขได้ ไม่สามารถลบข้อมูลได้</span>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:'var(--ink-3)' }}>กำลังโหลด…</div>
        ) : profiles.length === 0 ? (
          <div style={{ textAlign:'center', padding:40, color:'var(--ink-4)' }}>ยังไม่มีผู้ใช้งาน</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {profiles.map(p => (
              <div key={p.id} style={{
                display:'flex', alignItems:'center', gap:14, padding:'14px 16px',
                borderRadius:10, border:'1px solid var(--line)',
                background: isSelf(p) ? 'var(--bg-2)' : 'transparent',
                transition:'background .15s',
              }}>
                {/* Avatar */}
                <div style={{
                  width:38, height:38, borderRadius:'50%', flexShrink:0,
                  background: p.role === 'owner' ? '#7c3aed' : p.role === 'admin' ? '#d97706' : '#64748b',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'#fff', fontWeight:700, fontSize:15,
                }}>
                  {(p.full_name || p.email || 'U').slice(0,1).toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontWeight:600, fontSize:14 }}>
                      {p.full_name || '(ไม่ระบุชื่อ)'}
                    </span>
                    {isSelf(p) && (
                      <span style={{ fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:4,
                        background:'rgba(16,185,129,0.15)', color:'#059669' }}>คุณ</span>
                    )}
                  </div>
                  <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:2 }}>{p.email}</div>
                  <div style={{ fontSize:11, color:'var(--ink-4)', marginTop:1 }}>
                    สมัครเมื่อ {fmtDate(p.created_at)}
                  </div>
                </div>

                {/* Role badge */}
                <span style={{
                  padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600,
                  background: p.role === 'owner' ? 'rgba(124,58,237,0.15)' : p.role === 'admin' ? 'rgba(217,119,6,0.15)' : 'rgba(100,116,139,0.12)',
                  color: p.role === 'owner' ? '#7c3aed' : p.role === 'admin' ? '#d97706' : '#64748b',
                }}>
                  {p.role === 'owner' ? 'เจ้าของ' : p.role === 'admin' ? 'Admin' : 'User'}
                </span>

                {/* Actions — ห้ามแตะบัญชีตัวเอง และห้ามแตะ owner (สิทธิ์สูงสุด) */}
                {!isSelf(p) && p.role !== 'owner' && (
                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => toggleRole(p)}
                      title={`เปลี่ยนเป็น ${p.role === 'admin' ? 'User' : 'Admin'}`}
                      style={{ whiteSpace:'nowrap', fontSize:12 }}>
                      <Icon name="shield" size={12} />
                      {p.role === 'admin' ? 'ลด → User' : 'เลื่อน → Admin'}
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => setConfirmDelete(p)}
                      title="ลบผู้ใช้งาน"
                      style={{
                        background:'rgba(239,68,68,0.10)', color:'#ef4444',
                        border:'1px solid rgba(239,68,68,0.25)', whiteSpace:'nowrap', fontSize:12,
                      }}>
                      <Icon name="trash" size={12} />
                      ลบ
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Delete-user confirm modal ── */}
      <window.Modal
        open={!!confirmDelete}
        onClose={() => !deleting && setConfirmDelete(null)}
        title="ยืนยันการลบผู้ใช้งาน"
        width={420}
        footer={
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)} disabled={deleting}>
              ยกเลิก
            </button>
            <button
              className="btn"
              onClick={handleDeleteConfirmed}
              disabled={deleting}
              style={{ background:'#ef4444', color:'#fff', border:'none' }}>
              {deleting ? 'กำลังลบ…' : 'ลบผู้ใช้งาน'}
            </button>
          </div>
        }>
        {confirmDelete && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Warning banner */}
            <div style={{
              display:'flex', gap:12, padding:'12px 14px', borderRadius:10,
              background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.22)',
            }}>
              <span style={{ fontSize:20, lineHeight:1 }}>⚠️</span>
              <div style={{ fontSize:13, color:'#ef4444', lineHeight:1.55 }}>
                การลบจะ<strong>ยกเลิกสิทธิ์การเข้าถึง</strong>ระบบของผู้ใช้นี้ทันที<br/>
                ข้อมูลที่บันทึกไว้จะ<strong>ยังคงอยู่</strong>ในระบบ
              </div>
            </div>
            {/* User card */}
            <div style={{
              display:'flex', alignItems:'center', gap:14, padding:'14px 16px',
              borderRadius:10, background:'var(--bg-2)', border:'1px solid var(--line)',
            }}>
              <div style={{
                width:42, height:42, borderRadius:'50%', flexShrink:0,
                background: confirmDelete.role === 'admin' ? '#d97706' : '#64748b',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'#fff', fontWeight:700, fontSize:16,
              }}>
                {(confirmDelete.full_name || confirmDelete.email || 'U').slice(0,1).toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{confirmDelete.full_name || '(ไม่ระบุชื่อ)'}</div>
                <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:2 }}>{confirmDelete.email}</div>
                <div style={{ fontSize:11, color:'var(--ink-4)', marginTop:2 }}>
                  สมัครเมื่อ {fmtDate(confirmDelete.created_at)}
                </div>
              </div>
              <span style={{
                padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600,
                background: confirmDelete.role === 'admin' ? 'rgba(217,119,6,0.15)' : 'rgba(100,116,139,0.12)',
                color: confirmDelete.role === 'admin' ? '#d97706' : '#64748b',
              }}>
                {confirmDelete.role === 'admin' ? 'Admin' : 'User'}
              </span>
            </div>
          </div>
        )}
      </window.Modal>
    </>
  );
};

// ============================================================
// Export Report — Excel (SheetJS)
// ============================================================

function doExportExcel(records, projects, fromDate, toDate, projId) {
  const XLSX = window.XLSX;
  if (!XLSX) { alert('ไม่พบ SheetJS library — รีโหลดหน้าแล้วลองใหม่'); return; }

  // Filter by date range + optional project
  const filtered = records
    .filter(r => {
      if (!r.date || r.date < fromDate || r.date > toDate) return false;
      if (projId && projId !== 'all' && r.projectId !== projId) return false;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const getProj  = id => projects.find(p => p.id === id);
  const isInc = r => window.isIncome(r);
  const expenseRecs = filtered.filter(r => !isInc(r));
  const incomeRecs  = filtered.filter(isInc);
  const typeLabelByKey = t => t === 'material' ? 'วัสดุ/อุปกรณ์'
    : t === 'machine' ? 'เช่าเครื่องจักร'
    : t === 'lump-labor' ? 'ค่าแรงเหมาจ่าย'
    : t === 'other' ? 'ค่าใช้จ่ายอื่นๆ' : 'ค่าแรงรายวัน';
  const rowLabel = r => isInc(r) ? 'รายรับ' : typeLabelByKey(r.type);
  const n = v => Number(v || 0);
  const now = new Date().toLocaleString('th-TH', { dateStyle:'short', timeStyle:'short' });
  const projName = projId && projId !== 'all'
    ? (getProj(projId)?.name || 'ไม่ระบุ') : 'ทุกโครงการ';

  const wb = XLSX.utils.book_new();

  // ──────────────────────────────────────────
  // Sheet 1: สรุปภาพรวม
  // ──────────────────────────────────────────
  const typeKeys = ['material', 'machine', 'labor', 'lump-labor', 'other'];
  let grandNet = 0, grandSub = 0, grandVat = 0, grandWht = 0, grandCount = 0;

  const typeRows = [];
  typeKeys.forEach(t => {
    const recs = expenseRecs.filter(r => r.type === t);
    if (!recs.length) return;
    const tots = recs.map(r => computeTotals(r));
    const sub = tots.reduce((s, x) => s + x.subTotal, 0);
    const vat = tots.reduce((s, x) => s + x.vat, 0);
    const wht = tots.reduce((s, x) => s + x.wht, 0);
    const net = tots.reduce((s, x) => s + x.total, 0);
    grandSub += sub; grandVat += vat; grandWht += wht;
    grandNet += net; grandCount += recs.length;
    typeRows.push([typeLabelByKey(t), recs.length, sub, vat, wht, net]);
  });

  // รายรับ — หักค่าดำเนินการ 15%
  const incomeGross = incomeRecs.reduce((s, r) => s + computeTotals(r).total, 0);
  const incomeFee   = incomeGross * 0.15;
  const incomeNet   = incomeGross - incomeFee;

  // By-project block (รายจ่ายเท่านั้น)
  const byP = {};
  expenseRecs.forEach(r => {
    if (!byP[r.projectId]) byP[r.projectId] = { mat:0, mach:0, labor:0, count:0 };
    const tot = computeTotals(r).total;
    if (r.type === 'material') byP[r.projectId].mat += tot;
    else if (r.type === 'machine') byP[r.projectId].mach += tot;
    else byP[r.projectId].labor += tot;
    byP[r.projectId].count++;
  });
  const projRows = Object.entries(byP)
    .map(([pid, v]) => {
      const p = getProj(pid);
      return [p?.name || 'ไม่ระบุโครงการ', p?.code || '', v.mat, v.mach, v.labor,
        v.mat + v.mach + v.labor, v.count];
    })
    .sort((a, b) => b[5] - a[5]);

  const rows1 = [
    ['รายงานสรุปการจัดซื้อและต้นทุนโครงการก่อสร้าง'],
    [`ช่วงเวลา: ${fromDate}  ถึง  ${toDate}     โครงการ: ${projName}`],
    [`จำนวนรายการในรายงาน: ${filtered.length} รายการ     สร้างรายงานเมื่อ: ${now}`],
    [],
    ['สรุปยอดรายจ่ายแยกตามประเภท'],
    ['ประเภทรายการ', 'จำนวน (บิล)', 'ยอดก่อน VAT (฿)', 'VAT (฿)', 'หัก ณ ที่จ่าย (฿)', 'ยอดสุทธิ (฿)'],
    ...typeRows,
    ['รวมรายจ่ายทั้งหมด', grandCount, grandSub, grandVat, grandWht, grandNet],
    [],
    ['สรุปรายรับ (หักค่าดำเนินการ 15%)'],
    ['รายการ', 'จำนวน / ยอด (฿)'],
    ['จำนวนรายการรายรับ', incomeRecs.length],
    ['ยอดรับจริง (฿)', incomeGross],
    ['หักค่าดำเนินการ 15% (฿)', incomeFee],
    ['ยอดรับสุทธิหลังหัก (฿)', incomeNet],
    [],
    ['สรุปสุทธิ (รับหลังหัก − จ่าย)'],
    ['รายรับสุทธิ (฿)', incomeNet],
    ['รายจ่ายรวม (฿)', grandNet],
    ['คงเหลือสุทธิ (฿)', incomeNet - grandNet],
    [],
    ['สรุปยอดแยกตามโครงการ (รายจ่าย)'],
    ['ชื่อโครงการ', 'รหัส', 'วัสดุ (฿)', 'เครื่องจักร (฿)', 'ค่าแรง (฿)', 'รวม (฿)', 'จำนวน (บิล)'],
    ...projRows,
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(rows1);
  ws1['!cols'] = [{ wch:36 },{ wch:12 },{ wch:18 },{ wch:14 },{ wch:18 },{ wch:18 },{ wch:12 }];
  // Merge title cell
  ws1['!merges'] = [{ s:{ r:0, c:0 }, e:{ r:0, c:5 } }];
  XLSX.utils.book_append_sheet(wb, ws1, 'สรุปภาพรวม');

  // ──────────────────────────────────────────
  // Sheet 2: รายการทั้งหมด
  // ──────────────────────────────────────────
  const rows2 = [
    ['เลขที่บิล','วันที่','ประเภท','โครงการ','รหัสโครงการ',
     'ผู้ขาย / ทีมช่าง','ยอดก่อน VAT (฿)','VAT (฿)',
     'หัก ณ ที่จ่าย (฿)','หักมัดจำ (฿)','หักงวดงาน (฿)','ยอดสุทธิ (฿)','หมายเหตุ'],
    ...filtered.map(r => {
      const t = computeTotals(r);
      const p = getProj(r.projectId);
      return [
        r.docNo, r.date, rowLabel(r),
        p?.name || '—', p?.code || '—',
        r.vendor || '—',
        t.subTotal, t.vat, t.wht,
        n(r.advanceDeduction), n(r.retentionDeduction),
        t.total, r.note || '',
      ];
    }),
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(rows2);
  ws2['!cols'] = [
    { wch:16 },{ wch:12 },{ wch:18 },{ wch:30 },{ wch:14 },
    { wch:24 },{ wch:16 },{ wch:12 },{ wch:16 },{ wch:14 },{ wch:14 },{ wch:16 },{ wch:30 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'รายการทั้งหมด');

  // ──────────────────────────────────────────
  // Sheet 3: สรุปรายสัปดาห์
  // ──────────────────────────────────────────
  const byWeek = {};
  expenseRecs.forEach(r => {
    const d = new Date(r.date);
    const dow = d.getDay();
    const mon = new Date(d); mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    const wk = mon.toISOString().slice(0, 10);
    if (!byWeek[wk]) byWeek[wk] = { mat:0, mach:0, labor:0, count:0 };
    const tot = computeTotals(r).total;
    if (r.type === 'material') byWeek[wk].mat += tot;
    else if (r.type === 'machine') byWeek[wk].mach += tot;
    else byWeek[wk].labor += tot;
    byWeek[wk].count++;
  });

  const rows3 = [
    ['สัปดาห์ (วันจันทร์)', 'วัสดุ (฿)', 'เครื่องจักร (฿)', 'ค่าแรง (฿)', 'รวม (฿)', 'จำนวน (บิล)'],
    ...Object.entries(byWeek)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([wk, v]) => [wk, v.mat, v.mach, v.labor, v.mat + v.mach + v.labor, v.count]),
  ];

  const ws3 = XLSX.utils.aoa_to_sheet(rows3);
  ws3['!cols'] = [{ wch:20 },{ wch:16 },{ wch:16 },{ wch:16 },{ wch:16 },{ wch:12 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'สรุปรายสัปดาห์');

  // Write file
  XLSX.writeFile(wb, `รายงานจัดซื้อ_${fromDate}_${toDate}.xlsx`);
}

// ---- PDF export (print window) ----
function doExportPDF(records, projects, fromDate, toDate, projId, includeDetails, carryover) {
  const filtered = records
    .filter(r => {
      if (!r.date || r.date < fromDate || r.date > toDate) return false;
      if (projId && projId !== 'all' && r.projectId !== projId) return false;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const getProj   = id => projects.find(p => p.id === id);
  const isInc       = r => window.isIncome(r);
  const expenseRecs = filtered.filter(r => !isInc(r));
  const incomeRecs  = filtered.filter(isInc);
  const typeLbl   = t => t==='material'?'วัสดุ/อุปกรณ์':t==='machine'?'เช่าเครื่องจักร':t==='lump-labor'?'ค่าแรงเหมาจ่าย':t==='other'?'ค่าใช้จ่ายอื่นๆ':'ค่าแรงรายวัน';
  const rowLbl    = r => isInc(r) ? 'รายรับ' : typeLbl(r.type);
  const typeClr   = t => t==='material'?'#d97706':t==='machine'?'#0ea5e9':t==='other'?'#6366f1':'#8b5cf6';
  const typeBg    = t => t==='material'?'#fef3c7':t==='machine'?'#e0f2fe':t==='other'?'#e0e7ff':'#ede9fe';
  const rowClr    = r => isInc(r) ? '#059669' : typeClr(r.type);
  const rowBg     = r => isInc(r) ? '#d1fae5' : typeBg(r.type);
  const fmtN      = v => Number(v||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
  const fmtI      = v => Number(v||0).toLocaleString('th-TH');
  const fmtD      = s => s ? new Date(s+'T00:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'}) : '—';
  const n         = v => Number(v||0);
  const now       = new Date().toLocaleString('th-TH',{dateStyle:'long',timeStyle:'short'});
  const projName  = projId&&projId!=='all'?(getProj(projId)?.name||'ไม่ระบุ'):'ทุกโครงการ';

  // ── Compute summaries ──
  const typeKeys = ['material','machine','labor','lump-labor','other'];
  let gSub=0, gVat=0, gWht=0, gNet=0;

  const typeSummary = typeKeys.map(t => {
    const recs = expenseRecs.filter(r=>r.type===t);
    if(!recs.length) return null;
    const tots = recs.map(r=>computeTotals(r));
    const sub=tots.reduce((s,x)=>s+x.subTotal,0);
    const vat=tots.reduce((s,x)=>s+x.vat,0);
    const wht=tots.reduce((s,x)=>s+x.wht,0);
    const net=tots.reduce((s,x)=>s+x.total,0);
    gSub+=sub; gVat+=vat; gWht+=wht; gNet+=net;
    return {t,label:typeLbl(t),count:recs.length,sub,vat,wht,net};
  }).filter(Boolean);

  // รายรับ — หักค่าดำเนินการ 15% + ยอดยกมาจากปีก่อน (ไม่หัก 15%) + คงเหลือสุทธิ
  const incomeGross = incomeRecs.reduce((s,r)=>s+computeTotals(r).total,0);
  const incomeFee   = incomeGross * 0.15;
  const incomeNet   = incomeGross - incomeFee;
  const carry       = Number(carryover || 0);
  const incomeNetC  = incomeNet + carry;        // ยอดรับสุทธิรวมยอดยกมา
  const netBalance  = incomeNetC - gNet;

  const byP = {};
  expenseRecs.forEach(r=>{
    if(!byP[r.projectId]) byP[r.projectId]={mat:0,mach:0,labor:0,count:0};
    const tot=computeTotals(r).total;
    if(r.type==='material') byP[r.projectId].mat+=tot;
    else if(r.type==='machine') byP[r.projectId].mach+=tot;
    else byP[r.projectId].labor+=tot;
    byP[r.projectId].count++;
  });

  const byWeek = {};
  expenseRecs.forEach(r=>{
    const d=new Date(r.date+'T00:00:00');
    const dow=d.getDay();
    const mon=new Date(d); mon.setDate(d.getDate()-(dow===0?6:dow-1));
    const wk=mon.toISOString().slice(0,10);
    if(!byWeek[wk]) byWeek[wk]={mat:0,mach:0,labor:0,count:0,label:fmtD(wk)};
    const tot=computeTotals(r).total;
    if(r.type==='material') byWeek[wk].mat+=tot;
    else if(r.type==='machine') byWeek[wk].mach+=tot;
    else byWeek[wk].labor+=tot;
    byWeek[wk].count++;
  });

  // ── HTML ──
  const typeRows = typeSummary.map(s=>`
    <tr>
      <td><span class="badge" style="background:${typeBg(s.t)};color:${typeClr(s.t)}">${s.label}</span></td>
      <td class="r">${fmtI(s.count)}</td>
      <td class="r bold">฿${fmtN(s.net)}</td>
    </tr>`).join('');

  const projRows = Object.entries(byP)
    .sort((a,b)=>(b[1].mat+b[1].mach+b[1].labor)-(a[1].mat+a[1].mach+a[1].labor))
    .map(([pid,v])=>{
      const p=getProj(pid);
      const tot=v.mat+v.mach+v.labor;
      const barW = gNet>0?Math.round((tot/gNet)*100):0;
      return `<tr>
        <td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p?.color||'#999'};margin-right:7px"></span>${p?.name||'ไม่ระบุ'}</td>
        <td class="mono">${p?.code||'—'}</td>
        <td class="r">฿${fmtN(v.mat)}</td>
        <td class="r">฿${fmtN(v.mach)}</td>
        <td class="r">฿${fmtN(v.labor)}</td>
        <td class="r bold">฿${fmtN(tot)}</td>
        <td class="r">${fmtI(v.count)}</td>
        <td style="padding:10px 14px;width:120px">
          <div style="background:#f0ede8;border-radius:99px;height:6px">
            <div style="height:6px;border-radius:99px;background:${p?.color||'#d97706'};width:${barW}%"></div>
          </div>
        </td>
      </tr>`;
    }).join('');

  const weekRows = Object.entries(byWeek)
    .sort((a,b)=>a[0].localeCompare(b[0]))
    .map(([,v],i)=>`
      <tr class="${i%2===0?'alt':''}">
        <td>${v.label}</td>
        <td class="r">฿${fmtN(v.mat)}</td>
        <td class="r">฿${fmtN(v.mach)}</td>
        <td class="r">฿${fmtN(v.labor)}</td>
        <td class="r bold">฿${fmtN(v.mat+v.mach+v.labor)}</td>
        <td class="r">${fmtI(v.count)}</td>
      </tr>`).join('');

  const detailRows = !includeDetails ? '' : expenseRecs.map((r,i)=>{
    const p=getProj(r.projectId);
    const tot=computeTotals(r).total;
    return `<tr class="${i%2===0?'alt':''}">
      <td class="mono" style="font-size:10px">${r.docNo}</td>
      <td style="white-space:nowrap">${fmtD(r.date)}</td>
      <td><span class="badge" style="background:${rowBg(r)};color:${rowClr(r)};font-size:9px">${rowLbl(r)}</span></td>
      <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p?.name||'—'}</td>
      <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.vendor||'—'}</td>
      <td class="r bold">฿${fmtN(tot)}</td>
    </tr>`;
  }).join('');

  // รายละเอียดรายรับของโครงการ (แยกเป็นเซกชันของตัวเอง)
  const incomeRows = incomeRecs.map((r,i)=>{
    const p=getProj(r.projectId);
    const gross=computeTotals(r).total;
    const detail=(r.items||[]).map(it=>it.name).filter(Boolean).join(', ') || r.period || '—';
    return `<tr class="${i%2===0?'alt':''}">
      <td class="mono" style="font-size:10px">${r.docNo}</td>
      <td style="white-space:nowrap">${fmtD(r.date)}</td>
      <td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p?.name||'—'}</td>
      <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.vendor||'—'}</td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${detail}</td>
      <td class="r bold" style="color:#059669">฿${fmtN(gross)}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="th"><head>
<meta charset="UTF-8">
<title>รายงานจัดซื้อ ${fromDate} – ${toDate}</title>
<link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Prompt',sans-serif;font-size:12px;color:#1c1917;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@page{size:A4;margin:16mm 14mm}
@media print{.no-print{display:none!important}.page-break{page-break-before:always}}

/* Header */
.report-header{background:#1c1917;color:#fff;padding:22px 28px;display:flex;justify-content:space-between;align-items:flex-start;border-radius:0}
.logo{width:46px;height:46px;background:#d97706;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff;flex-shrink:0}
.header-left{display:flex;gap:16px;align-items:center}
.header-title{font-size:18px;font-weight:700;letter-spacing:-0.3px;line-height:1.3}
.header-sub{font-size:11px;color:#a8a29e;margin-top:3px}
.header-right{text-align:right;font-size:11px;color:#a8a29e;line-height:2}
.header-right strong{color:#fff;font-weight:600}

/* KPI cards */
.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0}
.kpi{background:#fafaf9;border:1px solid #e7e5e4;border-radius:10px;padding:14px 16px}
.kpi.accent{background:#d97706;border-color:#d97706;color:#fff}
.kpi-label{font-size:10px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;opacity:.65;margin-bottom:6px}
.kpi-value{font-size:17px;font-weight:700;letter-spacing:-0.5px;font-variant-numeric:tabular-nums}
.kpi-sub{font-size:10px;margin-top:4px;opacity:.7}

/* Sections */
.section{margin:20px 0}
.section-header{display:flex;align-items:center;gap:10px;margin-bottom:12px;border-left:4px solid #d97706;padding-left:10px}
.section-title{font-size:13px;font-weight:700;letter-spacing:-.2px}
.section-num{width:22px;height:22px;border-radius:6px;background:#d97706;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}

/* Tables */
table{width:100%;border-collapse:collapse;font-size:11.5px}
thead tr{background:#292524;color:#fff}
thead th{padding:9px 14px;text-align:left;font-weight:600;font-size:10.5px;letter-spacing:.3px;white-space:nowrap}
tbody td{padding:8.5px 14px;border-bottom:1px solid #f5f5f4;vertical-align:middle}
tbody tr:last-child td{border-bottom:none}
tbody tr.alt td{background:#fafaf9}
tfoot td{padding:10px 14px;background:#1c1917;color:#fff;font-weight:600;font-size:11.5px;border:none}
.r{text-align:right;font-variant-numeric:tabular-nums}
.bold{font-weight:700}
.mono{font-family:'JetBrains Mono','Courier New',monospace;font-size:10.5px}
.accent-text{color:#d97706}

/* Badge */
.badge{display:inline-block;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:600;white-space:nowrap}

/* Footer */
.report-footer{margin-top:28px;padding-top:14px;border-top:1px solid #e7e5e4;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#78716c}

/* Print button */
.print-btn{background:#d97706;color:#fff;border:none;padding:12px 28px;border-radius:8px;font-size:14px;font-family:'Prompt',sans-serif;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px}
.print-wrap{text-align:center;padding:24px;border-bottom:2px dashed #e7e5e4;margin-bottom:20px}
@media screen{ body[contenteditable="true"] td:focus, body[contenteditable="true"] th:focus, body[contenteditable="true"] .header-title:focus, body[contenteditable="true"] .section-title:focus{ outline:2px solid #0ea5e9; background:#e0f2fe } }
</style></head><body>

<div class="no-print print-wrap">
  <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
    <button class="print-btn" onclick="window.print()">🖨️ พิมพ์ / บันทึกเป็น PDF</button>
    <button class="print-btn" style="background:#0ea5e9" onclick="toggleEdit(this)">✏️ แก้ไขรายงานก่อนบันทึก</button>
  </div>
  <p style="margin-top:10px;font-size:11px;color:#78716c">กด "แก้ไขรายงาน" เพื่อพิมพ์เพิ่ม/แก้ตัวเลขในหน้านี้ได้ (รูปแบบสวยเหมือนเดิม) แล้วค่อยบันทึกเป็น PDF — การแก้ในหน้านี้ใช้กับไฟล์นี้เท่านั้น ไม่กระทบข้อมูลในระบบ</p>
</div>

<!-- HEADER -->
<div class="report-header">
  <div class="header-left">
    <div class="logo">จ</div>
    <div>
      <div class="header-title">รายงานสรุปการจัดซื้อโครงการก่อสร้าง</div>
      <div class="header-sub">ระบบบันทึกการจัดซื้องานรับเหมา</div>
    </div>
  </div>
  <div class="header-right">
    <div>📅 ช่วงเวลา: <strong>${fmtD(fromDate)} – ${fmtD(toDate)}</strong></div>
    <div>🏗 โครงการ: <strong>${projName}</strong></div>
    <div>จำนวนรายการ: <strong>${filtered.length} บิล</strong></div>
    <div>สร้างเมื่อ: <strong>${now}</strong></div>
  </div>
</div>

<!-- KPI -->
<div class="kpi-grid">
  <div class="kpi" style="background:#ecfdf5;border-color:#a7f3d0">
    <div class="kpi-label" style="color:#059669">ยอดรับสุทธิ (หักค่าดำเนินการ 15%${carry>0?' + ยกมา':''})</div>
    <div class="kpi-value" style="color:#059669">฿${fmtN(incomeNetC)}</div>
    <div class="kpi-sub">รับจริง ฿${fmtN(incomeGross)} − ค่าดำเนินการ ฿${fmtN(incomeFee)}${carry>0?` + ยกมา ฿${fmtN(carry)}`:''}</div>
  </div>
  <div class="kpi accent">
    <div class="kpi-label">ยอดจ่ายสุทธิรวม</div>
    <div class="kpi-value">฿${fmtN(gNet)}</div>
    <div class="kpi-sub">${expenseRecs.length} รายการรายจ่าย</div>
  </div>
  <div class="kpi" style="background:${netBalance>=0?'#ecfdf5':'#fef2f2'};border-color:${netBalance>=0?'#a7f3d0':'#fecaca'}">
    <div class="kpi-label" style="color:${netBalance>=0?'#059669':'#dc2626'}">คงเหลือสุทธิ (รับ−จ่าย)</div>
    <div class="kpi-value" style="color:${netBalance>=0?'#059669':'#dc2626'}">${netBalance<0?'−':''}฿${fmtN(Math.abs(netBalance))}</div>
    <div class="kpi-sub">${netBalance>=0?'เกินดุล':'ขาดดุล'}</div>
  </div>
</div>

<!-- SECTION 1: By type -->
<div class="section">
  <div class="section-header">
    <div class="section-num">1</div>
    <div class="section-title">สรุปยอดแยกตามประเภทรายการ</div>
  </div>
  <table>
    <thead><tr>
      <th>ประเภทรายการ</th>
      <th class="r" style="width:120px">จำนวน (บิล)</th>
      <th class="r" style="width:200px">ยอดรวม (รวม VAT / หัก ณ ที่จ่ายแล้ว)</th>
    </tr></thead>
    <tbody>${typeRows}</tbody>
    <tfoot><tr>
      <td>รวมรายจ่ายทั้งหมด</td>
      <td class="r">${fmtI(expenseRecs.length)}</td>
      <td class="r">฿${fmtN(gNet)}</td>
    </tr></tfoot>
  </table>
</div>

<!-- SECTION 2: By project -->
<div class="section">
  <div class="section-header">
    <div class="section-num">2</div>
    <div class="section-title">สรุปยอดแยกตามโครงการ (เรียงจากสูงไปต่ำ)</div>
  </div>
  <table>
    <thead><tr>
      <th>ชื่อโครงการ</th><th style="width:100px">รหัส</th>
      <th class="r">วัสดุ</th><th class="r">เครื่องจักร</th>
      <th class="r">ค่าแรง</th><th class="r">รวม</th>
      <th class="r" style="width:50px">บิล</th>
      <th style="width:130px">สัดส่วน</th>
    </tr></thead>
    <tbody>${projRows||'<tr><td colspan="8" style="text-align:center;color:#a8a29e;padding:16px">ไม่มีข้อมูลโครงการ</td></tr>'}</tbody>
  </table>
</div>

<!-- SECTION 3: By week -->
<div class="section">
  <div class="section-header">
    <div class="section-num">3</div>
    <div class="section-title">แนวโน้มการจัดซื้อรายสัปดาห์</div>
  </div>
  <table>
    <thead><tr>
      <th>สัปดาห์ (วันจันทร์)</th>
      <th class="r">วัสดุ</th><th class="r">เครื่องจักร</th>
      <th class="r">ค่าแรง</th><th class="r">รวม</th><th class="r">บิล</th>
    </tr></thead>
    <tbody>${weekRows||'<tr><td colspan="6" style="text-align:center;color:#a8a29e;padding:16px">ไม่มีข้อมูล</td></tr>'}</tbody>
  </table>
</div>

${incomeRecs.length > 0 ? `
<!-- SECTION 4: Income details -->
<div class="section">
  <div class="section-header" style="border-left-color:#059669">
    <div class="section-num" style="background:#059669">4</div>
    <div class="section-title">รายละเอียดรายรับของโครงการ (${incomeRecs.length} รายการ)</div>
  </div>
  <table>
    <thead><tr style="background:#065f46">
      <th style="width:104px">เลขที่</th>
      <th style="width:78px">วันที่</th>
      <th>โครงการ</th><th>ผู้จ่าย / ลูกค้า</th><th>รายละเอียด / งวดงาน</th>
      <th class="r" style="width:118px">ยอดรับ</th>
    </tr></thead>
    <tbody>${incomeRows}</tbody>
    <tfoot>
      <tr><td colspan="5" style="background:#064e3b">รวมรับจริง (Gross)</td><td class="r" style="background:#064e3b">฿${fmtN(incomeGross)}</td></tr>
      <tr><td colspan="5" style="background:#065f46">หักค่าดำเนินการ 15%</td><td class="r" style="background:#065f46">−฿${fmtN(incomeFee)}</td></tr>
      ${carry>0?`<tr><td colspan="5" style="background:#065f46">บวก ยอดยกมาจากปีก่อน (ไม่หัก 15%)</td><td class="r" style="background:#065f46">+฿${fmtN(carry)}</td></tr>`:''}
      <tr><td colspan="5" style="background:#047857">ยอดรับสุทธิ${carry>0?' (รวมยกมา)':''}</td><td class="r" style="background:#047857">฿${fmtN(incomeNetC)}</td></tr>
    </tfoot>
  </table>
</div>` : ''}

${includeDetails && expenseRecs.length > 0 ? `
<div class="page-break"></div>

<!-- SECTION 5: All expense records -->
<div class="section">
  <div class="section-header">
    <div class="section-num">5</div>
    <div class="section-title">รายการรายจ่ายทั้งหมด (${expenseRecs.length} รายการ)</div>
  </div>
  <table>
    <thead><tr>
      <th style="width:110px">เลขที่บิล</th>
      <th style="width:80px">วันที่</th>
      <th style="width:120px">ประเภท</th>
      <th>โครงการ</th><th>ผู้ขาย / ทีมช่าง</th>
      <th class="r" style="width:120px">ยอดสุทธิ</th>
    </tr></thead>
    <tbody>${detailRows}</tbody>
  </table>
</div>` : ''}

<!-- FOOTER -->
<div class="report-footer">
  <span>ForHouse Cost — คุมต้นทุนงานรับเหมาก่อสร้าง &nbsp;❖&nbsp; รายงานนี้สร้างโดยระบบอัตโนมัติ &nbsp;❖&nbsp; ${now}</span>
  <span>ช่วงเวลา ${fmtD(fromDate)} – ${fmtD(toDate)}</span>
</div>

<script>
  function toggleEdit(btn){
    var on = document.body.getAttribute('contenteditable') !== 'true';
    document.body.setAttribute('contenteditable', on ? 'true' : 'false');
    btn.textContent = on ? '✓ กำลังแก้ไข — กดเพื่อจบ' : '✏️ แก้ไขรายงานก่อนบันทึก';
    btn.style.background = on ? '#059669' : '#0ea5e9';
  }
</script>
</body></html>`;

  const win = window.open('', '_blank', 'width=960,height=750');
  if (!win) { alert('กรุณาอนุญาต Popup ในเบราว์เซอร์เพื่อดูรายงาน PDF'); return; }
  win.document.write(html);
  win.document.close();
}

// ---- Export Report Modal ----
function ExportReportModal({ open, onClose }) {
  const app = window.useApp();

  const firstOfMonth   = () => { const d=new Date(); d.setDate(1); return d.toISOString().slice(0,10); };
  const firstOfYear    = () => { const d=new Date(); d.setMonth(0); d.setDate(1); return d.toISOString().slice(0,10); };
  const firstOfLastMon = () => { const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,10); };
  const lastOfLastMon  = () => { const d=new Date(); d.setDate(0); return d.toISOString().slice(0,10); };
  const minus3Mon      = () => { const d=new Date(); d.setMonth(d.getMonth()-3); return d.toISOString().slice(0,10); };
  // วันจันทร์ต้นสัปดาห์ (ISO week starts Monday)
  const firstOfWeek    = () => { const d=new Date(); const day=d.getDay(); const diff=day===0?-6:1-day; d.setDate(d.getDate()+diff); return d.toISOString().slice(0,10); };

  const [fromDate,        setFromDate]        = useState(firstOfMonth);
  const [toDate,          setToDate]          = useState(todayStr);
  const [projId,          setProjId]          = useState('all');
  const [includeDetails,  setIncludeDetails]  = useState(true);
  const [busy,            setBusy]            = useState(false);

  const PRESETS = [
    { label:'วันนี้',          from:()=>todayStr(), to:()=>todayStr() },
    { label:'สัปดาห์นี้',     from:firstOfWeek,    to:()=>todayStr() },
    { label:'เดือนนี้',       from:firstOfMonth,   to:()=>todayStr() },
    { label:'เดือนที่แล้ว',  from:firstOfLastMon, to:lastOfLastMon  },
    { label:'3 เดือนล่าสุด', from:minus3Mon,      to:()=>todayStr() },
    { label:'ปีนี้',          from:firstOfYear,    to:()=>todayStr() },
  ];

  const preview = useMemo(() => {
    const recs = app.records.filter(r => {
      if (!r.date || r.date < fromDate || r.date > toDate) return false;
      if (projId !== 'all' && r.projectId !== projId) return false;
      return true;
    });
    return { count: recs.length, total: recs.reduce((s,r)=>s+computeTotals(r).total,0) };
  }, [app.records, fromDate, toDate, projId]);

  const run = (type) => {
    setBusy(type);
    setTimeout(() => {
      try {
        if (type === 'excel') {
          doExportExcel(app.records, app.projects, fromDate, toDate, projId);
          app.pushToast('ส่งออก Excel สำเร็จ');
          onClose();
        } else {
          doExportPDF(app.records, app.projects, fromDate, toDate, projId, includeDetails, app.carryoverIncome);
          app.pushToast('เปิดหน้าต่าง PDF แล้ว — เลือก "บันทึกเป็น PDF"');
          onClose();
        }
      } catch(e) {
        console.error('[Export]', e);
        app.pushToast('ส่งออกไม่สำเร็จ: ' + e.message, 'error');
      } finally { setBusy(false); }
    }, 80);
  };

  const IS = {
    background:'var(--bg-2)', border:'1px solid var(--line)',
    borderRadius:8, padding:'8px 12px', fontSize:13,
    color:'var(--ink-1)', fontFamily:'inherit', width:'100%', outline:'none', boxSizing:'border-box',
  };
  const LS = { fontSize:12, color:'var(--ink-3)', marginBottom:5, display:'block' };

  return (
    <window.Modal open={open} onClose={onClose} title="ส่งออกรายงาน" width={540}
      footer={
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', flexWrap:'wrap' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={!!busy}>ยกเลิก</button>
          <button className="btn btn-ghost" onClick={()=>run('excel')}
            disabled={!!busy || preview.count===0} style={{ gap:6 }}>
            <Icon name="download" size={13} />
            {busy==='excel' ? 'กำลังสร้าง…' : 'Excel (.xlsx)'}
          </button>
          <button className="btn btn-accent" onClick={()=>run('pdf')}
            disabled={!!busy || preview.count===0} style={{ gap:6 }}>
            <Icon name="receipt" size={13} />
            {busy==='pdf' ? 'กำลังสร้าง…' : 'PDF รายงาน'}
          </button>
        </div>
      }>
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

        {/* Presets */}
        <div>
          <div style={LS}>ช่วงเวลาสำเร็จรูป</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {PRESETS.map(p=>(
              <button key={p.label} className="btn btn-ghost btn-sm"
                onClick={()=>{ setFromDate(p.from()); setToDate(p.to()); }}
                style={{ fontSize:12 }}>{p.label}</button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div>
            <label style={LS}>ตั้งแต่วันที่</label>
            <input type="date" style={IS} value={fromDate} onChange={e=>setFromDate(e.target.value)} />
          </div>
          <div>
            <label style={LS}>ถึงวันที่</label>
            <input type="date" style={IS} value={toDate} onChange={e=>setToDate(e.target.value)} />
          </div>
        </div>

        {/* Project */}
        <div>
          <label style={LS}>โครงการ</label>
          <select style={{ ...IS, cursor:'pointer' }} value={projId} onChange={e=>setProjId(e.target.value)}>
            <option value="all">ทุกโครงการ</option>
            {app.projects.map(p=>(
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* PDF option */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
          background:'var(--bg-2)', borderRadius:9, border:'1px solid var(--line)', cursor:'pointer' }}
          onClick={()=>setIncludeDetails(v=>!v)}>
          <div style={{
            width:18, height:18, borderRadius:5, border:'2px solid',
            borderColor: includeDetails ? '#d97706' : 'var(--ink-4)',
            background: includeDetails ? '#d97706' : 'transparent',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
          }}>
            {includeDetails && <Icon name="check" size={11} stroke={3} style={{ color:'#fff' }} />}
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:500 }}>รวมรายการทั้งหมดใน PDF</div>
            <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:1 }}>
              แสดงตารางบิลทุกรายการ (หน้า 2) — เพิ่มจำนวนหน้าถ้ามีรายการมาก
            </div>
          </div>
        </div>

        {/* Preview */}
        <div style={{
          padding:'14px 16px', borderRadius:10,
          background: preview.count>0 ? 'rgba(22,163,74,0.07)' : 'var(--bg-2)',
          border:`1px solid ${preview.count>0 ? 'rgba(22,163,74,0.25)' : 'var(--line)'}`,
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Icon name="receipt" size={18} />
            <div>
              <div style={{ fontSize:13, fontWeight:600 }}>
                {preview.count>0 ? `${fmtInt(preview.count)} รายการที่จะส่งออก` : 'ไม่มีรายการในช่วงนี้'}
              </div>
              {preview.count>0 && (
                <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2 }}>
                  ยอดรวมสุทธิ ฿{fmt(preview.total)}
                </div>
              )}
            </div>
          </div>
          {preview.count>0 && (
            <div style={{ fontSize:10.5, color:'var(--ink-3)', textAlign:'right', lineHeight:1.8 }}>
              <div><strong>PDF:</strong> หัวรายงาน + KPI + 3 ตาราง{includeDetails?' + รายการ':''}</div>
              <div><strong>Excel:</strong> 3 sheets (ภาพรวม · รายการ · รายสัปดาห์)</div>
            </div>
          )}
        </div>

      </div>
    </window.Modal>
  );
}

// ---- รายงานรายจ่ายเฉพาะกลุ่ม (จัดซื้อ / ค่าแรง) — รายจ่ายล้วน ไม่มีรายรับ/กำไร/15% ----
function doExportExpenseReport(records, projects, fromDate, toDate, projId, opts) {
  const { title = 'รายงานสรุปรายจ่าย', subtitle = '', typeKeys = [], includeDetails = true, accent = '#d97706' } = opts || {};
  const recs = records.filter(r => {
    if (!r.date || r.date < fromDate || r.date > toDate) return false;
    if (projId && projId !== 'all' && r.projectId !== projId) return false;
    return typeKeys.includes(r.type) && !window.isIncome(r);
  }).sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const getProj = id => projects.find(p => p.id === id);
  const typeLbl = t => t==='material'?'วัสดุ/อุปกรณ์':t==='machine'?'เช่าเครื่องจักร':t==='lump-labor'?'ค่าแรงเหมาจ่าย':t==='other'?'ค่าใช้จ่ายอื่นๆ':'ค่าแรงรายวัน';
  const typeClr = t => t==='material'?'#d97706':t==='machine'?'#0ea5e9':t==='other'?'#6366f1':t==='lump-labor'?'#16a34a':'#8b5cf6';
  const typeBg  = t => t==='material'?'#fef3c7':t==='machine'?'#e0f2fe':t==='other'?'#e0e7ff':t==='lump-labor'?'#dcfce7':'#ede9fe';
  const fmtN = v => Number(v||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
  const fmtI = v => Number(v||0).toLocaleString('th-TH');
  const fmtD = s => s ? new Date(s+'T00:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'}) : '—';
  const now = new Date().toLocaleString('th-TH',{dateStyle:'long',timeStyle:'short'});
  const projName = projId&&projId!=='all'?(getProj(projId)?.name||'ไม่ระบุ'):'ทุกโครงการ';

  let gNet = 0;
  const typeSummary = typeKeys.map(t => {
    const rs = recs.filter(r => r.type === t); if (!rs.length) return null;
    const net = rs.reduce((s,r)=>s+computeTotals(r).total,0); gNet += net;
    return { t, label: typeLbl(t), count: rs.length, net };
  }).filter(Boolean);

  const byP = {};
  recs.forEach(r => { const k=r.projectId; if(!byP[k])byP[k]={total:0,count:0}; byP[k].total+=computeTotals(r).total; byP[k].count++; });
  const byWeek = {};
  recs.forEach(r => { const d=new Date(r.date+'T00:00:00'); const dow=d.getDay(); const mon=new Date(d); mon.setDate(d.getDate()-(dow===0?6:dow-1)); const wk=mon.toISOString().slice(0,10); if(!byWeek[wk])byWeek[wk]={total:0,count:0,label:fmtD(wk)}; byWeek[wk].total+=computeTotals(r).total; byWeek[wk].count++; });

  const nProjects = Object.keys(byP).length;
  const typeRows = typeSummary.map(s=>`<tr><td><span class="badge" style="background:${typeBg(s.t)};color:${typeClr(s.t)}">${s.label}</span></td><td class="r">${fmtI(s.count)}</td><td class="r bold">฿${fmtN(s.net)}</td></tr>`).join('');
  const projRows = Object.entries(byP).sort((a,b)=>b[1].total-a[1].total).map(([pid,v])=>{const p=getProj(pid);const w=gNet>0?Math.round(v.total/gNet*100):0;return `<tr><td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p?.color||'#999'};margin-right:7px"></span>${p?.name||'ไม่ระบุ'}</td><td class="mono">${p?.code||'—'}</td><td class="r bold">฿${fmtN(v.total)}</td><td class="r">${fmtI(v.count)}</td><td style="padding:10px 14px;width:120px"><div style="background:#f0ede8;border-radius:99px;height:6px"><div style="height:6px;border-radius:99px;background:${p?.color||accent};width:${w}%"></div></div></td></tr>`;}).join('');
  const weekRows = Object.entries(byWeek).sort((a,b)=>a[0].localeCompare(b[0])).map(([,v],i)=>`<tr class="${i%2===0?'alt':''}"><td>${v.label}</td><td class="r bold">฿${fmtN(v.total)}</td><td class="r">${fmtI(v.count)}</td></tr>`).join('');
  const detailRows = !includeDetails ? '' : recs.map((r,i)=>{const p=getProj(r.projectId);return `<tr class="${i%2===0?'alt':''}"><td class="mono" style="font-size:10px">${r.docNo||'—'}</td><td style="white-space:nowrap">${fmtD(r.date)}</td><td><span class="badge" style="background:${typeBg(r.type)};color:${typeClr(r.type)};font-size:9px">${typeLbl(r.type)}</span></td><td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p?.name||'—'}</td><td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.vendor||'—'}</td><td class="r bold">฿${fmtN(computeTotals(r).total)}</td></tr>`;}).join('');

  const html = `<!DOCTYPE html><html lang="th"><head>
<meta charset="UTF-8"><title>${title} ${fromDate} – ${toDate}</title>
<link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Prompt',sans-serif;font-size:12px;color:#1c1917;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@page{size:A4;margin:16mm 14mm}
@media print{.no-print{display:none!important}.page-break{page-break-before:always}}
.report-header{background:#1c1917;color:#fff;padding:22px 28px;display:flex;justify-content:space-between;align-items:flex-start}
.logo{width:46px;height:46px;background:${accent};border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff;flex-shrink:0}
.header-left{display:flex;gap:16px;align-items:center}
.header-title{font-size:18px;font-weight:700;letter-spacing:-0.3px;line-height:1.3}
.header-sub{font-size:11px;color:#a8a29e;margin-top:3px}
.header-right{text-align:right;font-size:11px;color:#a8a29e;line-height:2}
.header-right strong{color:#fff;font-weight:600}
.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0}
.kpi{background:#fafaf9;border:1px solid #e7e5e4;border-radius:10px;padding:14px 16px}
.kpi.accent{background:${accent};border-color:${accent};color:#fff}
.kpi-label{font-size:10px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;opacity:.65;margin-bottom:6px}
.kpi-value{font-size:18px;font-weight:700;letter-spacing:-0.5px;font-variant-numeric:tabular-nums}
.kpi-sub{font-size:10px;margin-top:4px;opacity:.7}
.section{margin:20px 0}
.section-header{display:flex;align-items:center;gap:10px;margin-bottom:12px;border-left:4px solid ${accent};padding-left:10px}
.section-title{font-size:13px;font-weight:700}
.section-num{width:22px;height:22px;border-radius:6px;background:${accent};color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
table{width:100%;border-collapse:collapse;font-size:11.5px}
thead tr{background:#292524;color:#fff}
thead th{padding:9px 14px;text-align:left;font-weight:600;font-size:10.5px;white-space:nowrap}
tbody td{padding:8.5px 14px;border-bottom:1px solid #f5f5f4;vertical-align:middle}
tbody tr.alt td{background:#fafaf9}
tfoot td{padding:10px 14px;background:#1c1917;color:#fff;font-weight:600;font-size:11.5px}
.r{text-align:right;font-variant-numeric:tabular-nums}.bold{font-weight:700}
.mono{font-family:'JetBrains Mono','Courier New',monospace;font-size:10.5px}
.badge{display:inline-block;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:600;white-space:nowrap}
.report-footer{margin-top:28px;padding-top:14px;border-top:1px solid #e7e5e4;display:flex;justify-content:space-between;font-size:10px;color:#78716c}
.print-btn{background:${accent};color:#fff;border:none;padding:12px 28px;border-radius:8px;font-size:14px;font-family:'Prompt',sans-serif;font-weight:600;cursor:pointer}
.print-wrap{text-align:center;padding:24px;border-bottom:2px dashed #e7e5e4;margin-bottom:20px}
@media screen{body[contenteditable="true"] td:focus,body[contenteditable="true"] th:focus{outline:2px solid #0ea5e9;background:#e0f2fe}}
</style></head><body>
<div class="no-print print-wrap">
  <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
    <button class="print-btn" onclick="window.print()">🖨️ พิมพ์ / บันทึกเป็น PDF</button>
    <button class="print-btn" style="background:#0ea5e9" onclick="toggleEdit(this)">✏️ แก้ไขรายงานก่อนบันทึก</button>
  </div>
  <p style="margin-top:10px;font-size:11px;color:#78716c">กด "แก้ไขรายงาน" เพื่อพิมพ์เพิ่ม/แก้ตัวเลขในหน้านี้ได้ แล้วค่อยบันทึกเป็น PDF — ใช้กับไฟล์นี้เท่านั้น ไม่กระทบข้อมูลในระบบ</p>
</div>
<div class="report-header">
  <div class="header-left"><div class="logo">${title.includes('ค่าแรง')?'จ':'ซ'}</div><div>
    <div class="header-title">${title}</div><div class="header-sub">${subtitle||'ระบบบันทึกต้นทุนงานรับเหมาก่อสร้าง'}</div>
  </div></div>
  <div class="header-right">
    <div>📅 ช่วงเวลา: <strong>${fmtD(fromDate)} – ${fmtD(toDate)}</strong></div>
    <div>🏗 โครงการ: <strong>${projName}</strong></div>
    <div>จำนวนรายการ: <strong>${recs.length} บิล</strong></div>
    <div>สร้างเมื่อ: <strong>${now}</strong></div>
  </div>
</div>
<div class="kpi-grid">
  <div class="kpi accent"><div class="kpi-label">ยอดจ่ายรวม</div><div class="kpi-value">฿${fmtN(gNet)}</div><div class="kpi-sub">${recs.length} รายการ</div></div>
  <div class="kpi"><div class="kpi-label">จำนวนบิล</div><div class="kpi-value">${fmtI(recs.length)}</div><div class="kpi-sub">ในช่วงเวลาที่เลือก</div></div>
  <div class="kpi"><div class="kpi-label">จำนวนโครงการ</div><div class="kpi-value">${fmtI(nProjects)}</div><div class="kpi-sub">ที่มีรายจ่าย</div></div>
</div>
<div class="section">
  <div class="section-header"><div class="section-num">1</div><div class="section-title">สรุปยอดแยกตามประเภท</div></div>
  <table><thead><tr><th>ประเภทรายการ</th><th class="r" style="width:120px">จำนวน (บิล)</th><th class="r" style="width:180px">ยอดรวม</th></tr></thead>
  <tbody>${typeRows||'<tr><td colspan="3" style="text-align:center;color:#a8a29e;padding:16px">ไม่มีข้อมูล</td></tr>'}</tbody>
  <tfoot><tr><td>รวมทั้งหมด</td><td class="r">${fmtI(recs.length)}</td><td class="r">฿${fmtN(gNet)}</td></tr></tfoot></table>
</div>
<div class="section">
  <div class="section-header"><div class="section-num">2</div><div class="section-title">สรุปยอดแยกตามโครงการ (สูง→ต่ำ)</div></div>
  <table><thead><tr><th>ชื่อโครงการ</th><th style="width:100px">รหัส</th><th class="r">รวม</th><th class="r" style="width:60px">บิล</th><th style="width:130px">สัดส่วน</th></tr></thead>
  <tbody>${projRows||'<tr><td colspan="5" style="text-align:center;color:#a8a29e;padding:16px">ไม่มีข้อมูล</td></tr>'}</tbody></table>
</div>
<div class="section">
  <div class="section-header"><div class="section-num">3</div><div class="section-title">แนวโน้มรายสัปดาห์</div></div>
  <table><thead><tr><th>สัปดาห์ (วันจันทร์)</th><th class="r">รวม</th><th class="r">บิล</th></tr></thead>
  <tbody>${weekRows||'<tr><td colspan="3" style="text-align:center;color:#a8a29e;padding:16px">ไม่มีข้อมูล</td></tr>'}</tbody></table>
</div>
${includeDetails && recs.length>0 ? `<div class="page-break"></div>
<div class="section">
  <div class="section-header"><div class="section-num">4</div><div class="section-title">รายการทั้งหมด (${recs.length} รายการ)</div></div>
  <table><thead><tr><th style="width:110px">เลขที่บิล</th><th style="width:80px">วันที่</th><th style="width:120px">ประเภท</th><th>โครงการ</th><th>ผู้ขาย / ทีมช่าง</th><th class="r" style="width:120px">ยอดรวม</th></tr></thead>
  <tbody>${detailRows}</tbody></table>
</div>` : ''}
<div class="report-footer"><span>ForHouse Cost — ${title} &nbsp;❖&nbsp; ${now}</span><span>ช่วงเวลา ${fmtD(fromDate)} – ${fmtD(toDate)}</span></div>
<script>function toggleEdit(btn){var on=document.body.getAttribute('contenteditable')!=='true';document.body.setAttribute('contenteditable',on?'true':'false');btn.textContent=on?'✓ กำลังแก้ไข — กดเพื่อจบ':'✏️ แก้ไขรายงานก่อนบันทึก';btn.style.background=on?'#059669':'#0ea5e9';}</script>
</body></html>`;
  const win = window.open('', '_blank', 'width=960,height=750');
  if (!win) { alert('กรุณาอนุญาต Popup ในเบราว์เซอร์เพื่อดูรายงาน PDF'); return; }
  win.document.write(html); win.document.close();
}

// ---- Modal ส่งออกรายงานรายจ่าย (จัดซื้อ / ค่าแรง) ----
function ExpenseReportModal({ open, onClose, scope }) {
  const app = window.useApp();
  const CFG = scope === 'labor'
    ? { title: 'รายงานสรุปค่าแรง', subtitle: 'ค่าแรงรายวัน และค่าแรงเหมาจ่าย', typeKeys: ['labor', 'lump-labor'], accent: '#7c3aed', label: 'รายงานค่าแรง' }
    : { title: 'รายงานสรุปการจัดซื้อ', subtitle: 'วัสดุ · เช่าเครื่องจักร · ค่าใช้จ่ายอื่นๆ', typeKeys: ['material', 'machine', 'other'], accent: '#d97706', label: 'รายงานจัดซื้อ' };

  const firstOfMonth   = () => { const d=new Date(); d.setDate(1); return d.toISOString().slice(0,10); };
  const firstOfYear    = () => { const d=new Date(); d.setMonth(0); d.setDate(1); return d.toISOString().slice(0,10); };
  const firstOfLastMon = () => { const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,10); };
  const lastOfLastMon  = () => { const d=new Date(); d.setDate(0); return d.toISOString().slice(0,10); };
  const firstOfWeek    = () => { const d=new Date(); const day=d.getDay(); const diff=day===0?-6:1-day; d.setDate(d.getDate()+diff); return d.toISOString().slice(0,10); };

  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate]     = useState(todayStr);
  const [projId, setProjId]     = useState('all');
  const [includeDetails, setIncludeDetails] = useState(true);
  const [busy, setBusy] = useState(false);

  const PRESETS = [
    { label:'สัปดาห์นี้', from:firstOfWeek, to:()=>todayStr() },
    { label:'เดือนนี้', from:firstOfMonth, to:()=>todayStr() },
    { label:'เดือนที่แล้ว', from:firstOfLastMon, to:lastOfLastMon },
    { label:'ปีนี้', from:firstOfYear, to:()=>todayStr() },
  ];

  const preview = useMemo(() => {
    const rs = (app.records||[]).filter(r => {
      if (!r.date || r.date < fromDate || r.date > toDate) return false;
      if (projId !== 'all' && r.projectId !== projId) return false;
      return CFG.typeKeys.includes(r.type) && !window.isIncome(r);
    });
    return { count: rs.length, total: rs.reduce((s,r)=>s+computeTotals(r).total,0) };
  }, [app.records, fromDate, toDate, projId, scope]);

  const run = () => {
    setBusy(true);
    setTimeout(() => {
      try {
        doExportExpenseReport(app.records, app.projects, fromDate, toDate, projId,
          { title: CFG.title, subtitle: CFG.subtitle, typeKeys: CFG.typeKeys, accent: CFG.accent, includeDetails });
        app.pushToast('เปิดหน้าต่าง PDF แล้ว — เลือก "บันทึกเป็น PDF"');
        onClose();
      } catch(e) { console.error('[ExpenseReport]', e); app.pushToast('ส่งออกไม่สำเร็จ: '+e.message, 'error'); }
      finally { setBusy(false); }
    }, 60);
  };

  const IS = { background:'var(--bg-2)', border:'1px solid var(--line)', borderRadius:8, padding:'8px 12px', fontSize:13, color:'var(--ink-1)', fontFamily:'inherit', width:'100%', outline:'none', boxSizing:'border-box' };
  const LS = { fontSize:12, color:'var(--ink-3)', marginBottom:5, display:'block' };

  return (
    <window.Modal open={open} onClose={onClose} title={'ส่งออก' + CFG.label} width={540}
      footer={<div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose} disabled={busy}>ยกเลิก</button>
        <button className="btn btn-accent" onClick={run} disabled={busy || preview.count===0}><Icon name="receipt" size={13}/> {busy?'กำลังสร้าง…':'สร้าง PDF'}</button>
      </div>}>
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        <div>
          <div style={LS}>ช่วงเวลาสำเร็จรูป</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {PRESETS.map(p=>(<button key={p.label} className="btn btn-ghost btn-sm" style={{ fontSize:12 }} onClick={()=>{ setFromDate(p.from()); setToDate(p.to()); }}>{p.label}</button>))}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div><label style={LS}>ตั้งแต่วันที่</label><input type="date" style={IS} value={fromDate} onChange={e=>setFromDate(e.target.value)} /></div>
          <div><label style={LS}>ถึงวันที่</label><input type="date" style={IS} value={toDate} onChange={e=>setToDate(e.target.value)} /></div>
        </div>
        <div>
          <label style={LS}>โครงการ</label>
          <select style={{ ...IS, cursor:'pointer' }} value={projId} onChange={e=>setProjId(e.target.value)}>
            <option value="all">ทุกโครงการ</option>
            {app.projects.map(p=>(<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--bg-2)', borderRadius:9, border:'1px solid var(--line)', cursor:'pointer' }} onClick={()=>setIncludeDetails(v=>!v)}>
          <div style={{ width:18, height:18, borderRadius:5, border:'2px solid', borderColor: includeDetails ? '#d97706' : 'var(--ink-4)', background: includeDetails ? '#d97706' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            {includeDetails && <Icon name="check" size={11} stroke={3} style={{ color:'#fff' }} />}
          </div>
          <div><div style={{ fontSize:13, fontWeight:500 }}>รวมรายการทั้งหมดใน PDF</div><div style={{ fontSize:11, color:'var(--ink-3)', marginTop:1 }}>แสดงตารางบิลทุกรายการ (หน้าถัดไป)</div></div>
        </div>
        <div style={{ padding:'14px 16px', borderRadius:10, background: preview.count>0 ? 'rgba(217,119,6,0.07)' : 'var(--bg-2)', border:`1px solid ${preview.count>0 ? 'rgba(217,119,6,0.25)' : 'var(--line)'}`, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <div style={{ fontSize:13, fontWeight:600 }}>{preview.count>0 ? `${fmtInt(preview.count)} รายการที่จะส่งออก` : 'ไม่มีรายการในช่วงนี้'}</div>
          {preview.count>0 && <div className="mono" style={{ fontSize:13, fontWeight:700 }}>฿{fmt(preview.total)}</div>}
        </div>
      </div>
    </window.Modal>
  );
}
window.ExpenseReportModal = ExpenseReportModal;


// ============================================================
// LaborHistoryView — ประวัติการเบิกค่าแรง (labor + lump-labor)
// ============================================================
window.LaborHistoryView = function LaborHistoryView() {
  const app = window.useApp();
  const [q,          setQ]          = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [projFilter, setProjFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [sortKey,       setSortKey]       = useState('date-desc');
  const [accFilter,     setAccFilter]     = useState('all');
  const [approveFilter, setApproveFilter] = useState('all'); // all | pending | approved
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [reportOpen, setReportOpen] = useState(false);

  const allLabor = useMemo(() =>
    app.records.filter(r => r.type === 'labor' || r.type === 'lump-labor'),
    [app.records]);

  const filtered = useMemo(() => {
    let arr = allLabor;
    if (typeFilter !== 'all') arr = arr.filter(r => r.type === typeFilter);
    if (projFilter !== 'all') arr = arr.filter(r => r.projectId === projFilter);
    if (teamFilter !== 'all') arr = arr.filter(r => r.workerTeamId === teamFilter);
    if (dateFrom || dateTo)   arr = arr.filter(r => window.inDateRange(r.date, dateFrom, dateTo));
    if (accFilter === 'unposted')       arr = arr.filter(r => !r.accountingPosted);
    if (accFilter === 'posted')         arr = arr.filter(r =>  r.accountingPosted);
    if (approveFilter === 'pending')    arr = arr.filter(r => !r.approved);
    if (approveFilter === 'approved')   arr = arr.filter(r =>  r.approved);
    if (approveFilter === 'unpaid')     arr = arr.filter(r =>  r.approved && !r.paid);
    if (q.trim()) {
      const s = q.toLowerCase();
      arr = arr.filter(r =>
        (r.docNo  || '').toLowerCase().includes(s) ||
        (r.vendor || '').toLowerCase().includes(s) ||
        (r.items  || []).some(i => (i.name || '').toLowerCase().includes(s))
      );
    }
    arr.sort((a, b) => {
      if (sortKey === 'date-desc')   return (b.date || '').localeCompare(a.date || '');
      if (sortKey === 'date-asc')    return (a.date || '').localeCompare(b.date || '');
      if (sortKey === 'amount-desc') return computeTotals(b).total - computeTotals(a).total;
      if (sortKey === 'amount-asc')  return computeTotals(a).total - computeTotals(b).total;
      return 0;
    });
    return arr;
  }, [allLabor, typeFilter, projFilter, teamFilter, accFilter, approveFilter, sortKey, q, dateFrom, dateTo]);

  const sum      = filtered.reduce((s, r) => s + computeTotals(r).total, 0);
  const laborSum = filtered.filter(r => r.type === 'labor')     .reduce((s, r) => s + computeTotals(r).total, 0);
  const lumpSum  = filtered.filter(r => r.type === 'lump-labor').reduce((s, r) => s + computeTotals(r).total, 0);

  // ค้างอนุมัติ — คำนวณจากรายการทั้งหมด (ไม่ขึ้นกับตัวกรอง)
  const pendingRecs  = allLabor.filter(r => !r.approved);
  const pendingSum   = pendingRecs.reduce((s, r) => s + computeTotals(r).cashDue, 0);
  const pendingCount = pendingRecs.length;
  // อนุมัติแล้ว-รอจ่าย — หายเมื่อกดจ่าย
  const unpaidRecs   = allLabor.filter(r => r.approved && !r.paid);
  const unpaidSum    = unpaidRecs.reduce((s, r) => s + computeTotals(r).cashDue, 0);
  const unpaidCount  = unpaidRecs.length;

  // เงินประกันผลงานคงค้าง (retention) — แยกตามทีมช่าง (net = หักที่จ่ายคืนแล้ว)
  // held  = retentionDeduction ของบิลปกติ (ยังไม่ settled)
  // paid  = ยอดจ่ายคืนที่อนุมัติแล้ว (isRetentionPayout)
  const retentionByTeam = useMemo(() => {
    const m = {};
    allLabor.forEach(r => {
      const tid = r.workerTeamId || '__none__';
      if (r.isRetentionPayout) {
        if (!r.paid) return;   // นับเฉพาะที่จ่ายคืนแล้วจริง
        if (!m[tid]) m[tid] = { held: 0, paid: 0, heldCount: 0, paidCount: 0, heldRecords: [], paidRecords: [] };
        m[tid].paid += computeTotals(r).total;
        m[tid].paidCount++;
        m[tid].paidRecords.push(r);
      } else {
        const ret = Number(r.retentionDeduction || 0);
        if (ret <= 0 || r.retentionReturned || !r.paid) return;   // นับเฉพาะบิลที่จ่ายแล้ว (หักเงินประกันจริง)
        if (!m[tid]) m[tid] = { held: 0, paid: 0, heldCount: 0, paidCount: 0, heldRecords: [], paidRecords: [] };
        m[tid].held += ret;
        m[tid].heldCount++;
        m[tid].heldRecords.push(r);
      }
    });
    // ยอดคงค้างสุทธิต่อทีม = held − paid (ไม่ติดลบ)
    Object.values(m).forEach(v => { v.balance = Math.max(0, v.held - v.paid); });
    return m;
  }, [allLabor]);
  // retentionTotal = ยอดคงค้างสุทธิรวมทุกทีม
  const retentionTotal = Object.values(retentionByTeam).reduce((s, v) => s + v.balance, 0);
  const [retentionOpen, setRetentionOpen] = useState(false);

  // ── ประกันสังคม แยกตามเดือน — ดูว่าหักของเดือนไหนไปแล้วบ้าง ──
  const ssoByMonth = useMemo(() => {
    const m = {};
    allLabor.forEach(r => {
      if (!r.socialSecurityEnabled || !r.paid) return;   // นับเฉพาะบิลที่จ่ายแล้ว (หัก ปกส. จริง)
      const amt = (r.socialSecurityItems || []).reduce((s, x) => s + Number(x.amount || 0), 0);
      if (amt <= 0) return;
      const key = r.socialSecurityPeriod || '__none__';
      if (!m[key]) m[key] = { total: 0, count: 0, records: [] };
      m[key].total += amt; m[key].count++; m[key].records.push(r);
    });
    return m;
  }, [allLabor]);
  const ssoTotal = Object.values(ssoByMonth).reduce((s, v) => s + v.total, 0);
  const [ssoOpen, setSsoOpen] = useState(false);

  // ── ปิดรายการเดิม (ครั้งเดียว): อนุมัติ + จ่ายแล้ว ให้ค่าแรงเดิมทั้งหมด ──
  const [bulkPaidOpen, setBulkPaidOpen] = useState(false);
  const [retroDone, setRetroDone] = useState(() => {
    try { return localStorage.getItem('laborRetroDone2') === '1'; } catch { return false; }
  });
  const bulkTargets = useMemo(() => allLabor.filter(r => !r.approved || !r.paid), [allLabor]);
  const doBulkPaid = () => {
    bulkTargets.forEach(r => app.updateRecord(r.id, {
      approved: true, approvedDate: r.approvedDate || r.date,
      paid: true, paidDate: r.paidDate || r.date,
    }));
    try { localStorage.setItem('laborRetroDone2', '1'); } catch {}
    setRetroDone(true);
    setBulkPaidOpen(false);
    app.pushToast(`ปิดรายการเดิม ${bulkTargets.length} รายการแล้ว ✓`);
  };

  const usedTeamIds = useMemo(() => new Set(allLabor.map(r => r.workerTeamId).filter(Boolean)), [allLabor]);
  const usedTeams   = useMemo(() => (app.teams || []).filter(t => usedTeamIds.has(t.id)), [app.teams, usedTeamIds]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">ประวัติการเบิกค่าแรง</h1>
          <div className="page-sub">ค่าแรงรายวัน และค่าแรงเหมาจ่าย — รายการย้อนหลังทั้งหมด</div>
        </div>
        <div className="row gap-8 dash-actions">
          <button className="btn btn-ghost" onClick={() => setReportOpen(true)}
            title="ส่งออกรายงานสรุปค่าแรง (รายวัน + เหมาจ่าย) เป็น PDF">
            <Icon name="download" size={14} /> รายงานค่าแรง
          </button>
          <button className="btn btn-ghost" onClick={() => app.setView('new-labor')}>
            <Icon name="hammer" size={14} /> บันทึกค่าแรง
          </button>
          <button className="btn btn-accent" onClick={() => app.setView('new-lump-labor')}>
            <Icon name="clipboard" size={14} /> ค่าแรงเหมาจ่าย
          </button>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat">
          <div className="stat-label">รายการทั้งหมด</div>
          <div className="stat-value mono">{fmtInt(allLabor.length)}</div>
          <div className="stat-icon" style={{ background:'oklch(0.95 0.04 290)', color:'oklch(0.50 0.14 290)' }}>
            <Icon name="hammer" size={18} />
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">ยอดรวมค่าแรง</div>
          <div className="stat-value mono">{"฿"+fmt(sum)}</div>
          <div className="stat-icon" style={{ background:'oklch(0.95 0.04 290)', color:'oklch(0.50 0.14 290)' }}>
            <Icon name="money" size={18} />
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">ค่าแรงรายวัน</div>
          <div className="stat-value mono">{"฿"+fmt(laborSum)}</div>
          <div className="stat-icon" style={{ background:'oklch(0.95 0.04 290)', color:'oklch(0.50 0.14 290)' }}>
            <Icon name="users" size={18} />
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">ค่าแรงเหมาจ่าย</div>
          <div className="stat-value mono">{"฿"+fmt(lumpSum)}</div>
          <div className="stat-icon" style={{ background:'oklch(0.95 0.04 290)', color:'oklch(0.50 0.14 290)' }}>
            <Icon name="clipboard" size={18} />
          </div>
        </div>
        {pendingCount > 0 && (
          <div className="stat" style={{ cursor: 'pointer' }} onClick={() => setApproveFilter('pending')}
            title="คลิกเพื่อกรองดูรายการที่ค้างอนุมัติ">
            <div className="stat-label">ค้างอนุมัติ</div>
            <div className="stat-value mono" style={{ color: 'oklch(0.55 0.18 50)' }}>{"฿"+fmt(pendingSum)}</div>
            <div className="stat-delta" style={{ color: 'oklch(0.55 0.18 50)' }}>{pendingCount} รายการ — คลิกเพื่อกรอง</div>
            <div className="stat-icon" style={{ background:'oklch(0.95 0.08 60)', color:'oklch(0.55 0.18 50)' }}>
              <Icon name="clock" size={18} />
            </div>
          </div>
        )}
        {unpaidCount > 0 && (
          <div className="stat" style={{ cursor: 'pointer' }} onClick={() => setApproveFilter('unpaid')}
            title="อนุมัติแล้วแต่ยังไม่จ่าย — คลิกเพื่อกรอง (หายเมื่อกดจ่าย)">
            <div className="stat-label">อนุมัติแล้ว-รอจ่าย</div>
            <div className="stat-value mono" style={{ color: 'var(--info)' }}>{"฿"+fmt(unpaidSum)}</div>
            <div className="stat-delta" style={{ color: 'var(--info)' }}>{unpaidCount} รายการ — คลิกเพื่อกรอง</div>
            <div className="stat-icon" style={{ background:'rgba(37,99,235,0.1)', color:'var(--info)' }}>
              <Icon name="receipt" size={18} />
            </div>
          </div>
        )}
        {retentionTotal > 0 && (
          <div className="stat" style={{ cursor: 'pointer' }} onClick={() => setRetentionOpen(true)}
            title="คลิกดูรายละเอียดเงินประกันผลงานแยกตามทีมช่าง">
            <div className="stat-label">เงินประกันผลงานค้างคืน</div>
            <div className="stat-value mono" style={{ color: 'var(--info)' }}>{"฿"+fmt(retentionTotal)}</div>
            <div className="stat-delta"><Icon name="chevron" size={11} stroke={2.5} /> คลิกบันทึกจ่ายคืน</div>
            <div className="stat-icon green"><Icon name="percent" size={18} /></div>
          </div>
        )}
        {ssoTotal > 0 && (
          <div className="stat" style={{ cursor: 'pointer' }} onClick={() => setSsoOpen(true)}
            title="คลิกดูประวัติการหักประกันสังคมรายเดือน">
            <div className="stat-label">หักประกันสังคมสะสม</div>
            <div className="stat-value mono" style={{ color: '#6d28d9' }}>{"฿"+fmt(ssoTotal)}</div>
            <div className="stat-delta"><Icon name="chevron" size={11} stroke={2.5} /> ดูรายเดือน — หักเดือนไหนไปแล้วบ้าง</div>
            <div className="stat-icon" style={{ background: 'rgba(124,58,237,0.1)', color: '#6d28d9' }}><Icon name="calendar" size={18} /></div>
          </div>
        )}
      </div>

      {/* Modal: เงินประกันผลงานแยกตามทีมช่าง */}
      {retentionOpen && (
        <div className="modal-overlay" onClick={() => setRetentionOpen(false)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">เงินประกันผลงาน แยกตามทีมช่าง</h2>
              <button className="btn-icon" onClick={() => setRetentionOpen(false)}><Icon name="x" size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="text-small text-muted" style={{ marginBottom: 16 }}>
                ยอดเงินประกันผลงานที่ยังค้างคืน แยกตามทีมช่าง (หักยอดที่จ่ายคืนแล้ว)<br/>
                วิธีจ่ายคืน: เปิดหน้า <strong>บันทึกค่าแรง / เหมาจ่าย</strong> แล้วติ๊ก <strong>"จ่ายคืนเงินประกันผลงาน"</strong> ข้างงวดงาน เมื่ออนุมัติแล้วยอดจะถูกหักอัตโนมัติ<br/>
                หรือถ้าจ่ายคืนไปแล้วแต่ไม่ได้บันทึกผ่านโหมดนั้น กด <strong style={{ color: 'var(--success, #16a34a)' }}>"จ่ายแล้ว"</strong> ข้างบิลเพื่อตัดออกจากยอดค้างได้เลย
              </div>
              {Object.entries(retentionByTeam).filter(([, v]) => v.balance > 0 || v.paid > 0).length === 0 ? (
                <div className="text-small text-muted" style={{ padding: '16px 0', textAlign: 'center' }}>ไม่มีเงินประกันผลงานคงค้าง</div>
              ) : Object.entries(retentionByTeam)
                .filter(([, v]) => v.balance > 0 || v.paid > 0)
                .sort((a, b) => b[1].balance - a[1].balance)
                .map(([tid, info]) => {
                  const team = (app.workerTeams || []).find(t => t.id === tid);
                  const settled = info.balance === 0;
                  return (
                    <div key={tid} style={{ padding: '12px 0', borderBottom: '1px solid var(--line)', opacity: settled ? 0.65 : 1 }}>
                      <div className="row between" style={{ alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{team ? team.name : 'ไม่ระบุทีมช่าง'}</div>
                          {settled
                            ? <div className="text-small" style={{ color: 'var(--success, #16a34a)' }}>จ่ายคืนครบแล้ว ✓ (รวมจ่ายคืน ฿{fmt(info.paid)})</div>
                            : <div className="text-small text-muted">
                                หักไว้ {info.heldCount} รายการ
                                {info.paid > 0 && <span style={{ color: 'var(--success, #16a34a)' }}> · จ่ายคืนแล้ว ฿{fmt(info.paid)}</span>}
                              </div>
                          }
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {settled
                            ? <div className="mono" style={{ fontWeight: 700, color: 'var(--success, #16a34a)' }}>฿0</div>
                            : <div className="mono" style={{ fontWeight: 700, color: 'var(--info)' }}>฿{fmt(info.balance)}</div>
                          }
                        </div>
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {info.heldRecords.map(r => (
                          <div key={r.id}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'var(--surface-2)', fontSize: 12 }}>
                            <span onClick={() => { app.setDetailId(r.id); setRetentionOpen(false); }} title="เปิดดูบิล"
                              style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                              <span className="mono" style={{ color: 'var(--ink-2)' }}>{r.docNo}</span>
                              <span style={{ color: 'var(--ink-3)' }}> · {(app.projects || []).find(p => p.id === r.projectId)?.name || 'ไม่ระบุโครงการ'} · {fmtDate(r.date)}</span>
                            </span>
                            <span className="mono" style={{ color: 'var(--info)', whiteSpace: 'nowrap' }}>฿{fmt(r.retentionDeduction)}</span>
                            {app.isAdmin && (
                              <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0, padding: '3px 8px', color: 'var(--success, #16a34a)', borderColor: 'rgba(22,163,74,0.4)' }}
                                title="จ่ายเงินประกันผลงานคืนช่างแล้ว — ตัดออกจากยอดค้าง (ใช้กรณีจ่ายไปแล้วแต่ไม่ได้บันทึกผ่านโหมดจ่ายคืน)"
                                onClick={() => {
                                  if (confirm(`ยืนยันว่าจ่ายเงินประกันผลงาน ฿${fmt(r.retentionDeduction)} ของบิล ${r.docNo} คืนช่างแล้ว?\n\nบิลนี้จะถูกตัดออกจากยอดค้าง`)) {
                                    app.updateRecord(r.id, { retentionReturned: true });
                                    app.pushToast('บันทึกจ่ายเงินประกันแล้ว ✓');
                                  }
                                }}>
                                <Icon name="check" size={12} /> จ่ายแล้ว
                              </button>
                            )}
                          </div>
                        ))}
                        {info.paidRecords.map(r => (
                          <div key={r.id} onClick={() => { app.setDetailId(r.id); setRetentionOpen(false); }} title="เปิดดูบิลจ่ายคืน"
                            style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'rgba(22,163,74,0.06)', cursor: 'pointer', fontSize: 12 }}>
                            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <span className="badge" style={{ background: 'rgba(22,163,74,0.12)', color: '#16a34a', marginRight: 6, fontSize: 10 }}>จ่ายคืน</span>
                              <span className="mono" style={{ color: 'var(--ink-2)' }}>{r.docNo}</span>
                              <span style={{ color: 'var(--ink-3)' }}> · {(app.projects || []).find(p => p.id === r.projectId)?.name || 'ไม่ระบุโครงการ'}</span>
                            </span>
                            <span className="mono" style={{ color: '#16a34a', whiteSpace: 'nowrap' }}>−฿{fmt(computeTotals(r).total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              <div className="row between" style={{ paddingTop: 14, fontWeight: 700 }}>
                <span>คงค้างทั้งหมด</span>
                <span className="mono" style={{ color: retentionTotal > 0 ? 'var(--info)' : 'var(--success, #16a34a)' }}>
                  {retentionTotal > 0 ? '฿'+fmt(retentionTotal) : '✓ จ่ายคืนครบแล้ว'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: ประวัติหักประกันสังคม รายเดือน */}
      {ssoOpen && (
        <div className="modal-overlay" onClick={() => setSsoOpen(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">ประวัติหักประกันสังคม รายเดือน</h2>
              <button className="btn-icon" onClick={() => setSsoOpen(false)}><Icon name="x" size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="text-small text-muted" style={{ marginBottom: 16 }}>
                สรุปว่าหักประกันสังคม "ของเดือนไหน" ไปแล้วบ้าง (จับจากช่อง <strong>หักประกันสังคมของเดือน</strong> ที่ระบุตอนบันทึกค่าแรง) — ใช้เช็คว่าเดือนนั้นหักครบหรือยัง
              </div>
              {Object.keys(ssoByMonth).length === 0 ? (
                <div className="text-small text-muted" style={{ padding: '16px 0', textAlign: 'center' }}>ยังไม่มีการหักประกันสังคม</div>
              ) : Object.entries(ssoByMonth)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([period, info]) => {
                  const teams = [...new Set(info.records.map(r => {
                    const t = (app.workerTeams || []).find(x => x.id === r.workerTeamId);
                    return t ? t.name : (r.vendor || '—');
                  }))];
                  return (
                    <div key={period} style={{ padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
                      <div className="row between" style={{ alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{period === '__none__' ? 'ไม่ระบุเดือน' : monthLabelTH(period)}</div>
                          <div className="text-small text-muted">{info.count} รายการ · {teams.join(', ')}</div>
                        </div>
                        <div className="mono" style={{ fontWeight: 700, color: '#6d28d9' }}>฿{fmt(info.total)}</div>
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {info.records.map(r => {
                          const amt = (r.socialSecurityItems || []).reduce((s, x) => s + Number(x.amount || 0), 0);
                          const proj = (app.projects || []).find(p => p.id === r.projectId)?.name || 'ไม่ระบุโครงการ';
                          return (
                            <div key={r.id} onClick={() => { app.setDetailId(r.id); setSsoOpen(false); }} title="เปิดดูบิล"
                              style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'var(--surface-2)', cursor: 'pointer', fontSize: 12 }}>
                              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span className="mono" style={{ color: 'var(--ink-2)' }}>{r.docNo}</span>
                                <span style={{ color: 'var(--ink-3)' }}> · {proj} · {r.vendor || '—'}</span>
                              </span>
                              <span className="mono" style={{ color: '#6d28d9', whiteSpace: 'nowrap' }}>฿{fmt(amt)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              <div className="row between" style={{ paddingTop: 14, fontWeight: 700 }}>
                <span>รวมทั้งหมด</span>
                <span className="mono" style={{ color: '#6d28d9' }}>฿{fmt(ssoTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="filter-bar">
          <div className="tabs">
            <button className={"tab"+(typeFilter==='all'?' active':'')} onClick={() => setTypeFilter('all')}>
              ทั้งหมด <span className="badge gray mono">{allLabor.length}</span>
            </button>
            <button className={"tab"+(typeFilter==='labor'?' active':'')} onClick={() => setTypeFilter('labor')}>
              <Icon name="hammer" size={13}/> ค่าแรงรายวัน
            </button>
            <button className={"tab"+(typeFilter==='lump-labor'?' active':'')} onClick={() => setTypeFilter('lump-labor')}>
              <Icon name="clipboard" size={13}/> เหมาจ่าย
            </button>
          </div>
          <div className="topbar-search" style={{ width:240, margin:0 }}>
            <Icon name="search" size={14}/>
            <input placeholder="ค้นหา: เลขที่, ทีมช่าง, รายการ" value={q} onChange={e => setQ(e.target.value)}/>
          </div>
          <window.DateRangeFilter from={dateFrom} to={dateTo} setFrom={setDateFrom} setTo={setDateTo} />
          <select className="select" value={projFilter} onChange={e => setProjFilter(e.target.value)}>
            <option value="all">ทุกโครงการ</option>
            {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {usedTeams.length > 0 && (
            <select className="select" value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
              <option value="all">ทุกทีมช่าง</option>
              {usedTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          <select className="select" value={accFilter} onChange={e => setAccFilter(e.target.value)}
            style={{ borderColor:accFilter!=='all'?'#059669':undefined, color:accFilter!=='all'?'#059669':undefined }}>
            <option value="all">สถานะบัญชี: ทั้งหมด</option>
            <option value="unposted">ยังไม่ลงบัญชี</option>
            <option value="posted">ลงบัญชีแล้ว</option>
          </select>
          <select className="select" value={approveFilter} onChange={e => setApproveFilter(e.target.value)}
            style={{ borderColor:approveFilter!=='all'?'#2563eb':undefined, color:approveFilter!=='all'?'#2563eb':undefined }}>
            <option value="all">การอนุมัติ: ทั้งหมด</option>
            <option value="pending">รออนุมัติ</option>
            <option value="approved">อนุมัติแล้ว</option>
            <option value="unpaid">อนุมัติแล้ว-รอจ่าย</option>
          </select>
          {app.isAdmin && !retroDone && bulkTargets.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => setBulkPaidOpen(true)}
              title="อนุมัติ + จ่ายแล้ว ให้ค่าแรงเดิมทั้งหมด (ทำครั้งเดียว)">
              <Icon name="check" size={13}/> ปิดรายการเดิม (อนุมัติ+จ่าย)
            </button>
          )}
          <div className="spacer"/>
          <div className="text-small text-muted">
            พบ <strong style={{ color:'var(--ink-1)' }} className="mono">{filtered.length}</strong> รายการ
            {" · "}ยอดรวม <strong className="mono" style={{ color:'var(--ink-1)' }}>{"฿"+fmt(sum)}</strong>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-illust"><Icon name="hammer" size={28}/></div>
            <div className="empty-title">ยังไม่มีรายการค่าแรง</div>
            <div className="empty-sub">เริ่มบันทึกค่าแรงรายวันหรือค่าแรงเหมาจ่ายรายการแรกได้เลย</div>
          </div>
        ) : (
          <RecordsTable records={filtered} onOpen={id => app.setDetailId(id)} showApprove={true} showPaid={true}/>
        )}
      </div>

      {/* Modal: ปิดรายการค่าแรงเดิมทั้งหมด (อนุมัติ + จ่ายแล้ว) ทำครั้งเดียว */}
      {bulkPaidOpen && (
        <div className="modal-overlay" onClick={() => setBulkPaidOpen(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">ปิดรายการค่าแรงเดิม</h2>
              <button className="btn-icon" onClick={() => setBulkPaidOpen(false)}><Icon name="x" size={16}/></button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.7 }}>
                ระบบจะตั้งเป็น <strong>อนุมัติ + จ่ายแล้ว</strong> ให้ค่าแรง/เหมาจ่าย
                <strong className="mono"> {bulkTargets.length}</strong> รายการที่ยังไม่ปิด
                โดยใช้ <strong>วันที่ในเอกสาร</strong> เป็นวันที่อนุมัติ/วันที่จ่าย
                <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: 12.5, color: 'var(--ink-3)' }}>
                  ใช้ปิดรายการเก่าครั้งเดียว เพื่อให้ยอดครบในแดชบอร์ด — หลังจากนี้บิลใหม่จะเข้าขั้นตอน อนุมัติ → จ่าย ตามปกติ
                </div>
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setBulkPaidOpen(false)}>ยกเลิก</button>
              <button className="btn btn-accent" onClick={doBulkPaid}>
                <Icon name="check" size={14}/> ยืนยัน ({bulkTargets.length})
              </button>
            </div>
          </div>
        </div>
      )}
      <window.ExpenseReportModal open={reportOpen} onClose={() => setReportOpen(false)} scope="labor" />
    </>
  );
};

// ---- Income History (ประวัติบันทึกรายรับ) ----
window.IncomeHistoryView = function IncomeHistoryView() {
  const app = window.useApp();
  const [q,          setQ]          = useState('');
  const [projFilter, setProjFilter] = useState('all');
  const [accFilter,  setAccFilter]  = useState('all');
  const [sortKey,    setSortKey]    = useState('date-desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');

  const allIncome = useMemo(() => app.records.filter(r => window.isIncome(r)), [app.records]);

  const filtered = useMemo(() => {
    let arr = allIncome.slice();
    if (projFilter !== 'all') arr = arr.filter(r => r.projectId === projFilter);
    if (dateFrom || dateTo)   arr = arr.filter(r => window.inDateRange(r.date, dateFrom, dateTo));
    if (accFilter === 'unposted') arr = arr.filter(r => !r.accountingPosted);
    if (accFilter === 'posted')   arr = arr.filter(r =>  r.accountingPosted);
    if (q.trim()) {
      const s = q.toLowerCase();
      arr = arr.filter(r =>
        (r.docNo  || '').toLowerCase().includes(s) ||
        (r.vendor || '').toLowerCase().includes(s) ||
        (r.items  || []).some(i => (i.name || '').toLowerCase().includes(s))
      );
    }
    arr.sort((a, b) => {
      if (sortKey === 'date-desc')   return (b.date || '').localeCompare(a.date || '');
      if (sortKey === 'date-asc')    return (a.date || '').localeCompare(b.date || '');
      if (sortKey === 'amount-desc') return computeTotals(b).total - computeTotals(a).total;
      if (sortKey === 'amount-asc')  return computeTotals(a).total - computeTotals(b).total;
      return 0;
    });
    return arr;
  }, [allIncome, projFilter, accFilter, sortKey, q, dateFrom, dateTo]);

  const sum         = filtered.reduce((s, r) => s + computeTotals(r).total, 0);
  const postedSum   = filtered.filter(r => r.accountingPosted).reduce((s, r) => s + computeTotals(r).total, 0);
  const unpostedCnt = allIncome.filter(r => !r.accountingPosted).length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">ประวัติบันทึกรายรับ</h1>
          <div className="page-sub">เงินรับเข้าโครงการทั้งหมด — รายการย้อนหลัง</div>
        </div>
        <div className="row gap-8 dash-actions">
          <button className="btn btn-accent" onClick={() => { app.setEditingId(null); app.setView('new-income'); }}>
            <Icon name="money" size={14} /> บันทึกรายรับ
          </button>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat">
          <div className="stat-label">รายการทั้งหมด</div>
          <div className="stat-value mono">{fmtInt(allIncome.length)}</div>
          <div className="stat-icon" style={{ background:'rgba(5,150,105,0.12)', color:'#059669' }}><Icon name="money" size={18} /></div>
        </div>
        <div className="stat">
          <div className="stat-label">ยอดรวมรายรับ</div>
          <div className="stat-value mono">{"฿"+fmt(sum)}</div>
          <div className="stat-icon" style={{ background:'rgba(5,150,105,0.12)', color:'#059669' }}><Icon name="money" size={18} /></div>
        </div>
        <div className="stat">
          <div className="stat-label">ลงบัญชีแล้ว</div>
          <div className="stat-value mono">{"฿"+fmt(postedSum)}</div>
          <div className="stat-icon" style={{ background:'rgba(5,150,105,0.12)', color:'#059669' }}><Icon name="check" size={18} /></div>
        </div>
        <div className="stat">
          <div className="stat-label">ยังไม่ลงบัญชี</div>
          <div className="stat-value mono">{fmtInt(unpostedCnt)}</div>
          <div className="stat-icon" style={{ background:'rgba(234,179,8,0.12)', color:'#b45309' }}><Icon name="bell" size={18} /></div>
        </div>
      </div>

      <div className="card">
        <div className="filter-bar">
          <div className="topbar-search" style={{ width:240, margin:0 }}>
            <Icon name="search" size={14}/>
            <input placeholder="ค้นหา: เลขที่, แหล่งที่มา, รายการ" value={q} onChange={e => setQ(e.target.value)}/>
          </div>
          <window.DateRangeFilter from={dateFrom} to={dateTo} setFrom={setDateFrom} setTo={setDateTo} />
          <select className="select" value={projFilter} onChange={e => setProjFilter(e.target.value)}>
            <option value="all">ทุกโครงการ</option>
            {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="select" value={accFilter} onChange={e => setAccFilter(e.target.value)}
            style={{ borderColor:accFilter!=='all'?'#059669':undefined, color:accFilter!=='all'?'#059669':undefined }}>
            <option value="all">สถานะบัญชี: ทั้งหมด</option>
            <option value="unposted">ยังไม่ลงบัญชี</option>
            <option value="posted">ลงบัญชีแล้ว</option>
          </select>
          <div className="spacer"/>
          <div className="text-small text-muted">
            พบ <strong style={{ color:'var(--ink-1)' }} className="mono">{filtered.length}</strong> รายการ
            {" · "}ยอดรวม <strong className="mono" style={{ color:'#059669' }}>{"฿"+fmt(sum)}</strong>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-illust"><Icon name="money" size={28}/></div>
            <div className="empty-title">ยังไม่มีรายการรายรับ</div>
            <div className="empty-sub">เริ่มบันทึกรายรับรายการแรกได้เลย</div>
          </div>
        ) : (
          <RecordsTable records={filtered} onOpen={id => app.setDetailId(id)} />
        )}
      </div>
    </>
  );
};

// ============================================================
// บัญชีบริษัท (Company Finance) — เฉพาะ admin
//   • รายรับบริษัท = ค่าดำเนินการ + กำไร 15% ของยอดรับจากลูกค้า (auto)
//   • รายจ่ายบริษัท = บันทึกเอง แยกประเภท
//   • สถานะ กำไร/ขาดทุน = รายรับ − รายจ่าย
//   • รายงาน PDF: เลือกประเภทค่าใช้จ่ายที่จะนำมาลบกับรายรับ
// ============================================================
const COMPANY_FEE_RATE = 0.15;

// ---- PDF รายงานบัญชีบริษัท ----
function doExportCompanyPDF({ fromDate, toDate, incomeGross, companyIncome, expenses, catRows, selectedNames }) {
  const fmtN = v => Number(v||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
  const fmtI = v => Number(v||0).toLocaleString('th-TH');
  const fmtD = s => s ? new Date(s+'T00:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'}) : '—';
  const now  = new Date().toLocaleString('th-TH',{dateStyle:'long',timeStyle:'short'});

  const expenseTotal = expenses.reduce((s,e)=>s+Number(e.amount||0),0);
  const profit = companyIncome - expenseTotal;

  const catSummaryRows = catRows.map(c=>`
    <tr>
      <td><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${c.color};margin-right:8px"></span>${c.name}</td>
      <td class="r">${fmtI(c.count)}</td>
      <td class="r bold">฿${fmtN(c.total)}</td>
      <td style="padding:10px 14px;width:130px">
        <div style="background:#f0ede8;border-radius:99px;height:6px">
          <div style="height:6px;border-radius:99px;background:${c.color};width:${expenseTotal>0?Math.round((c.total/expenseTotal)*100):0}%"></div>
        </div>
      </td>
    </tr>`).join('');

  const detailRows = expenses.slice().sort((a,b)=>(a.date||'').localeCompare(b.date||'')).map((e,i)=>`
    <tr class="${i%2===0?'alt':''}">
      <td style="white-space:nowrap">${fmtD(e.date)}</td>
      <td>${e.category||'—'}</td>
      <td style="max-width:260px">${e.note||'—'}</td>
      <td class="r bold">฿${fmtN(e.amount)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html lang="th"><head>
<meta charset="UTF-8">
<title>รายงานบัญชีบริษัท ${fromDate} – ${toDate}</title>
<link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Prompt',sans-serif;font-size:12px;color:#1c1917;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@page{size:A4;margin:16mm 14mm}
@media print{.no-print{display:none!important}.page-break{page-break-before:always}}
.report-header{background:#1c1917;color:#fff;padding:22px 28px;display:flex;justify-content:space-between;align-items:flex-start}
.logo{width:46px;height:46px;background:#d97706;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff;flex-shrink:0}
.header-left{display:flex;gap:16px;align-items:center}
.header-title{font-size:18px;font-weight:700;letter-spacing:-0.3px;line-height:1.3}
.header-sub{font-size:11px;color:#a8a29e;margin-top:3px}
.header-right{text-align:right;font-size:11px;color:#a8a29e;line-height:2}
.header-right strong{color:#fff;font-weight:600}
.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0}
.kpi{border-radius:10px;padding:16px 18px;border:1px solid #e7e5e4;background:#fafaf9}
.kpi-label{font-size:10px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;opacity:.7;margin-bottom:6px}
.kpi-value{font-size:19px;font-weight:700;letter-spacing:-0.5px;font-variant-numeric:tabular-nums}
.kpi-sub{font-size:10px;margin-top:4px;opacity:.75}
.section{margin:20px 0}
.section-header{display:flex;align-items:center;gap:10px;margin-bottom:12px;border-left:4px solid #d97706;padding-left:10px}
.section-title{font-size:13px;font-weight:700}
.section-num{width:22px;height:22px;border-radius:6px;background:#d97706;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
table{width:100%;border-collapse:collapse;font-size:11.5px}
thead tr{background:#292524;color:#fff}
thead th{padding:9px 14px;text-align:left;font-weight:600;font-size:10.5px;white-space:nowrap}
tbody td{padding:8.5px 14px;border-bottom:1px solid #f5f5f4;vertical-align:middle}
tbody tr.alt td{background:#fafaf9}
tfoot td{padding:10px 14px;background:#1c1917;color:#fff;font-weight:600;font-size:11.5px}
.r{text-align:right;font-variant-numeric:tabular-nums}
.bold{font-weight:700}
.report-footer{margin-top:28px;padding-top:14px;border-top:1px solid #e7e5e4;display:flex;justify-content:space-between;font-size:10px;color:#78716c}
.print-btn{background:#d97706;color:#fff;border:none;padding:12px 28px;border-radius:8px;font-size:14px;font-family:'Prompt',sans-serif;font-weight:600;cursor:pointer}
.print-wrap{text-align:center;padding:24px;border-bottom:2px dashed #e7e5e4;margin-bottom:20px}
@media screen{body[contenteditable="true"] td:focus,body[contenteditable="true"] th:focus,body[contenteditable="true"] .header-title:focus,body[contenteditable="true"] .section-title:focus{outline:2px solid #0ea5e9;background:#e0f2fe}}
</style></head><body>

<div class="no-print print-wrap">
  <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
    <button class="print-btn" onclick="window.print()">🖨️ พิมพ์ / บันทึกเป็น PDF</button>
    <button class="print-btn" style="background:#0ea5e9" onclick="toggleEdit(this)">✏️ แก้ไขรายงานก่อนบันทึก</button>
  </div>
  <p style="margin-top:10px;font-size:11px;color:#78716c">กด "แก้ไขรายงาน" เพื่อพิมพ์เพิ่ม/แก้ตัวเลขในหน้านี้ได้ แล้วค่อยบันทึกเป็น PDF — การแก้ในหน้านี้ใช้กับไฟล์นี้เท่านั้น ไม่กระทบข้อมูลในระบบ</p>
</div>

<div class="report-header">
  <div class="header-left">
    <div class="logo">฿</div>
    <div>
      <div class="header-title">รายงานบัญชีบริษัท (ภายใน)</div>
      <div class="header-sub">รายรับค่าดำเนินการ ${(COMPANY_FEE_RATE*100).toFixed(0)}% · รายจ่ายบริษัท · กำไร/ขาดทุน</div>
    </div>
  </div>
  <div class="header-right">
    <div>📅 ช่วงเวลา: <strong>${fmtD(fromDate)} – ${fmtD(toDate)}</strong></div>
    <div>ประเภทค่าใช้จ่ายที่รวม: <strong>${selectedNames.length} ประเภท</strong></div>
    <div>สร้างเมื่อ: <strong>${now}</strong></div>
  </div>
</div>

<div class="kpi-grid">
  <div class="kpi" style="background:#ecfdf5;border-color:#a7f3d0">
    <div class="kpi-label" style="color:#059669">รายรับบริษัท (ค่าดำเนินการ ${(COMPANY_FEE_RATE*100).toFixed(0)}%)</div>
    <div class="kpi-value" style="color:#059669">฿${fmtN(companyIncome)}</div>
    <div class="kpi-sub">คิดจากยอดรับลูกค้า ฿${fmtN(incomeGross)}</div>
  </div>
  <div class="kpi" style="background:#fff7ed;border-color:#fed7aa">
    <div class="kpi-label" style="color:#c2410c">รายจ่ายบริษัท (ที่เลือก)</div>
    <div class="kpi-value" style="color:#c2410c">฿${fmtN(expenseTotal)}</div>
    <div class="kpi-sub">${fmtI(expenses.length)} รายการ · ${selectedNames.length} ประเภท</div>
  </div>
  <div class="kpi" style="background:${profit>=0?'#ecfdf5':'#fef2f2'};border-color:${profit>=0?'#a7f3d0':'#fecaca'}">
    <div class="kpi-label" style="color:${profit>=0?'#059669':'#dc2626'}">${profit>=0?'กำไรสุทธิ':'ขาดทุนสุทธิ'} (รับ−จ่าย)</div>
    <div class="kpi-value" style="color:${profit>=0?'#059669':'#dc2626'}">${profit<0?'−':''}฿${fmtN(Math.abs(profit))}</div>
    <div class="kpi-sub">${profit>=0?'บริษัทมีกำไร':'บริษัทขาดทุน'}</div>
  </div>
</div>

<div class="section">
  <div class="section-header"><div class="section-num">1</div><div class="section-title">สรุปรายจ่ายแยกตามประเภท</div></div>
  <table>
    <thead><tr><th>ประเภทค่าใช้จ่าย</th><th class="r" style="width:90px">จำนวน</th><th class="r" style="width:140px">ยอดรวม</th><th style="width:150px">สัดส่วน</th></tr></thead>
    <tbody>${catSummaryRows||'<tr><td colspan="4" style="text-align:center;color:#a8a29e;padding:16px">ไม่มีรายจ่ายในประเภทที่เลือก</td></tr>'}</tbody>
    <tfoot><tr><td>รวมรายจ่ายทั้งหมด</td><td class="r">${fmtI(expenses.length)}</td><td class="r">฿${fmtN(expenseTotal)}</td><td></td></tr></tfoot>
  </table>
</div>

<div class="section">
  <div class="section-header" style="border-left-color:#059669"><div class="section-num" style="background:#059669">2</div><div class="section-title">สรุปกำไร/ขาดทุน</div></div>
  <table>
    <tbody>
      <tr><td>รายรับบริษัท — ค่าดำเนินการ ${(COMPANY_FEE_RATE*100).toFixed(0)}% (จากยอดรับลูกค้า ฿${fmtN(incomeGross)})</td><td class="r bold" style="color:#059669;width:160px">฿${fmtN(companyIncome)}</td></tr>
      <tr><td>หัก รายจ่ายบริษัท (${selectedNames.length} ประเภทที่เลือก)</td><td class="r bold" style="color:#c2410c">−฿${fmtN(expenseTotal)}</td></tr>
    </tbody>
    <tfoot><tr><td style="background:${profit>=0?'#047857':'#b91c1c'}">${profit>=0?'กำไรสุทธิ':'ขาดทุนสุทธิ'}</td><td class="r" style="background:${profit>=0?'#047857':'#b91c1c'}">${profit<0?'−':''}฿${fmtN(Math.abs(profit))}</td></tr></tfoot>
  </table>
</div>

${expenses.length>0?`
<div class="section">
  <div class="section-header"><div class="section-num">3</div><div class="section-title">รายการรายจ่ายทั้งหมด (${expenses.length} รายการ)</div></div>
  <table>
    <thead><tr><th style="width:90px">วันที่</th><th style="width:180px">ประเภท</th><th>หมายเหตุ</th><th class="r" style="width:130px">จำนวนเงิน</th></tr></thead>
    <tbody>${detailRows}</tbody>
  </table>
</div>`:''}

<div class="report-footer">
  <span>ForHouse Cost — บัญชีบริษัท (เอกสารภายใน) &nbsp;❖&nbsp; ${now}</span>
  <span>ช่วงเวลา ${fmtD(fromDate)} – ${fmtD(toDate)}</span>
</div>

<script>
  function toggleEdit(btn){
    var on = document.body.getAttribute('contenteditable') !== 'true';
    document.body.setAttribute('contenteditable', on ? 'true' : 'false');
    btn.textContent = on ? '✓ กำลังแก้ไข — กดเพื่อจบ' : '✏️ แก้ไขรายงานก่อนบันทึก';
    btn.style.background = on ? '#059669' : '#0ea5e9';
  }
</script>
</body></html>`;

  const win = window.open('', '_blank', 'width=960,height=750');
  if (!win) { alert('กรุณาอนุญาต Popup ในเบราว์เซอร์เพื่อดูรายงาน PDF'); return; }
  win.document.write(html); win.document.close();
}

// ---- PDF รายงานค่าใช้จ่ายบริษัทล้วน (ไม่มีรายรับ/กำไร/ขาดทุน) ----
const LOAN_CAT = 'ผ่อนเจ้าหนี้ / เงินกู้';
function doExportCompanyExpenseReport({ companyExpenses=[], companyExpenseCats=[], companyCreditors=[], companyRecurring=[], fromDate, toDate, categories=null }) {
  const catIn = name => !categories || categories.includes(name);
  const fmtN = v => Number(v||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
  const fmtI = v => Number(v||0).toLocaleString('th-TH');
  const fmtD = s => s ? new Date(s+'T00:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'}) : '—';
  const now  = new Date().toLocaleString('th-TH',{dateStyle:'long',timeStyle:'short'});
  const inR = d => d && d>=fromDate && d<=toDate;
  const colorOf = n => (companyExpenseCats.find(c=>c.name===n)?.color) || '#9ca3af';

  const byCat = {}; const byMonth = {};
  const addCat = (name, amt, cnt, color) => { if(!byCat[name]) byCat[name]={name, total:0, count:0, color: color||colorOf(name)}; byCat[name].total+=amt; byCat[name].count+=(cnt||0); };
  const addMonth = (ym, amt) => { if(ym) byMonth[ym]=(byMonth[ym]||0)+amt; };

  const exps = companyExpenses.filter(e=>inR(e.date) && catIn(e.category||'—'));
  exps.forEach(e=>{ addCat(e.category||'—', Number(e.amount||0), 1); addMonth((e.date||'').slice(0,7), Number(e.amount||0)); });
  const recSrc = companyRecurring.filter(r=>catIn(r.category));
  const recPm = recurringByMonth(recSrc, fromDate, toDate);
  Object.entries(recPm.byCat).forEach(([cat,amt])=>addCat(cat, amt, 0));
  Object.entries(recPm.byMonth).forEach(([ym,amt])=>addMonth(ym, amt));
  if (catIn(LOAN_CAT)) {
    const loanPm = loanPaymentsByMonth(companyCreditors, fromDate, toDate);
    if (loanPm.total>0) addCat(LOAN_CAT, loanPm.total, 0, '#dc2626');
    Object.entries(loanPm.byMonth).forEach(([ym,amt])=>addMonth(ym, amt));
  }

  const catArr = Object.values(byCat).sort((a,b)=>b.total-a.total);
  const total = catArr.reduce((s,c)=>s+c.total,0);
  const maxCat = catArr.length?catArr[0].total:0;
  const monthKeys = Object.keys(byMonth).sort();

  const catRows = catArr.map((c,i)=>`<tr class="${i%2===0?'alt':''}"><td><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${c.color};margin-right:8px"></span>${c.name}${c.count>0?` <span style="color:#a8a29e;font-size:10px">(${fmtI(c.count)} รายการ)</span>`:''}</td><td class="r bold">฿${fmtN(c.total)}</td><td class="r" style="width:60px">${total>0?Math.round(c.total/total*100):0}%</td><td style="width:200px"><div style="background:#f0ede8;border-radius:99px;height:6px"><div style="height:6px;border-radius:99px;background:${c.color};width:${maxCat>0?Math.round(c.total/maxCat*100):0}%"></div></div></td></tr>`).join('');
  const monthRows = monthKeys.map((k,i)=>`<tr class="${i%2===0?'alt':''}"><td>${monthLabelTH(k)}</td><td class="r bold">฿${fmtN(byMonth[k])}</td></tr>`).join('');
  const detailRows = exps.slice().sort((a,b)=>(a.date||'').localeCompare(b.date||'')).map((e,i)=>`<tr class="${i%2===0?'alt':''}"><td style="white-space:nowrap">${fmtD(e.date)}</td><td>${e.category||'—'}</td><td style="max-width:280px">${e.note||'—'}</td><td class="r bold">฿${fmtN(e.amount)}</td></tr>`).join('');

  const html = `<!DOCTYPE html><html lang="th"><head>
<meta charset="UTF-8"><title>รายงานค่าใช้จ่ายบริษัท ${fromDate} – ${toDate}</title>
<link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Prompt',sans-serif;font-size:12px;color:#1c1917;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@page{size:A4;margin:16mm 14mm}
@media print{.no-print{display:none!important}.page-break{page-break-before:always}}
.report-header{background:#1c1917;color:#fff;padding:22px 28px;display:flex;justify-content:space-between;align-items:flex-start}
.logo{width:46px;height:46px;background:#c2410c;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff;flex-shrink:0}
.header-left{display:flex;gap:16px;align-items:center}
.header-title{font-size:18px;font-weight:700;letter-spacing:-0.3px;line-height:1.3}
.header-sub{font-size:11px;color:#a8a29e;margin-top:3px}
.header-right{text-align:right;font-size:11px;color:#a8a29e;line-height:2}
.header-right strong{color:#fff;font-weight:600}
.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0}
.kpi{border-radius:10px;padding:16px 18px;border:1px solid #e7e5e4;background:#fafaf9}
.kpi.accent{background:#c2410c;border-color:#c2410c;color:#fff}
.kpi-label{font-size:10px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;opacity:.7;margin-bottom:6px}
.kpi-value{font-size:19px;font-weight:700;letter-spacing:-0.5px;font-variant-numeric:tabular-nums}
.kpi-sub{font-size:10px;margin-top:4px;opacity:.75}
.section{margin:18px 0}
.section-header{display:flex;align-items:center;gap:10px;margin-bottom:12px;border-left:4px solid #c2410c;padding-left:10px}
.section-title{font-size:13px;font-weight:700}
table{width:100%;border-collapse:collapse;font-size:11.5px}
thead tr{background:#292524;color:#fff}
thead th{padding:9px 14px;text-align:left;font-weight:600;font-size:10.5px;white-space:nowrap}
tbody td{padding:8.5px 14px;border-bottom:1px solid #f5f5f4;vertical-align:middle}
tbody tr.alt td{background:#fafaf9}
tfoot td{padding:10px 14px;background:#1c1917;color:#fff;font-weight:600;font-size:12px}
.r{text-align:right;font-variant-numeric:tabular-nums}.bold{font-weight:700}
.report-footer{margin-top:22px;padding-top:12px;border-top:1px solid #e7e5e4;display:flex;justify-content:space-between;font-size:10px;color:#78716c}
.print-btn{background:#c2410c;color:#fff;border:none;padding:12px 28px;border-radius:8px;font-size:14px;font-family:'Prompt',sans-serif;font-weight:600;cursor:pointer}
.print-wrap{text-align:center;padding:24px;border-bottom:2px dashed #e7e5e4;margin-bottom:20px}
@media screen{body[contenteditable="true"] td:focus{outline:2px solid #0ea5e9;background:#e0f2fe}}
</style></head><body>
<div class="no-print print-wrap">
  <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
    <button class="print-btn" onclick="window.print()">🖨️ พิมพ์ / บันทึกเป็น PDF</button>
    <button class="print-btn" style="background:#0ea5e9" onclick="toggleEdit(this)">✏️ แก้ไขรายงานก่อนบันทึก</button>
  </div>
  <p style="margin-top:10px;font-size:11px;color:#78716c">รายงานค่าใช้จ่ายบริษัทล้วน (ค่าดำเนินการ + รายจ่ายประจำ + ผ่อนเจ้าหนี้) — ไม่รวมรายรับและกำไร/ขาดทุน</p>
</div>
<div class="report-header">
  <div class="header-left"><div class="logo">฿</div><div>
    <div class="header-title">รายงานค่าใช้จ่ายบริษัท</div>
    <div class="header-sub">ค่าดำเนินการ · รายจ่ายประจำ · ผ่อนเจ้าหนี้/เงินกู้</div>
  </div></div>
  <div class="header-right">
    <div>📅 ช่วงเวลา: <strong>${fmtD(fromDate)} – ${fmtD(toDate)}</strong></div>
    <div>จำนวนประเภท: <strong>${catArr.length}</strong></div>
    <div>สร้างเมื่อ: <strong>${now}</strong></div>
  </div>
</div>
<div class="kpi-grid">
  <div class="kpi accent"><div class="kpi-label">ค่าใช้จ่ายรวม</div><div class="kpi-value">฿${fmtN(total)}</div><div class="kpi-sub">${catArr.length} ประเภท · ${monthKeys.length} เดือน</div></div>
  <div class="kpi"><div class="kpi-label">จำนวนประเภท</div><div class="kpi-value">${fmtI(catArr.length)}</div><div class="kpi-sub">ที่มีค่าใช้จ่าย</div></div>
  <div class="kpi"><div class="kpi-label">เฉลี่ยต่อเดือน</div><div class="kpi-value">฿${fmtN(monthKeys.length>0?total/monthKeys.length:0)}</div><div class="kpi-sub">${monthKeys.length} เดือนที่มีข้อมูล</div></div>
</div>
<div class="section">
  <div class="section-header"><div class="section-title">ค่าใช้จ่าย แยกตามประเภท (มาก → น้อย)</div></div>
  <table><thead><tr><th>ประเภท</th><th class="r" style="width:150px">ยอด</th><th class="r" style="width:70px">สัดส่วน</th><th style="width:210px">กราฟ</th></tr></thead>
  <tbody>${catRows||'<tr><td colspan="4" style="text-align:center;color:#a8a29e;padding:16px">ไม่มีค่าใช้จ่ายในช่วงนี้</td></tr>'}</tbody>
  <tfoot><tr><td>รวมทั้งหมด</td><td class="r">฿${fmtN(total)}</td><td class="r">100%</td><td></td></tr></tfoot></table>
</div>
<div class="section">
  <div class="section-header"><div class="section-title">ค่าใช้จ่าย รายเดือน</div></div>
  <table><thead><tr><th>เดือน</th><th class="r" style="width:180px">ยอดค่าใช้จ่าย</th></tr></thead>
  <tbody>${monthRows||'<tr><td colspan="2" style="text-align:center;color:#a8a29e;padding:16px">ไม่มีข้อมูล</td></tr>'}</tbody>
  <tfoot><tr><td>รวมทั้งหมด</td><td class="r">฿${fmtN(total)}</td></tr></tfoot></table>
</div>
${exps.length>0?`<div class="section">
  <div class="section-header"><div class="section-title">รายละเอียดค่าดำเนินการ (${exps.length} รายการ)</div></div>
  <table><thead><tr><th style="width:90px">วันที่</th><th style="width:180px">ประเภท</th><th>หมายเหตุ</th><th class="r" style="width:130px">จำนวนเงิน</th></tr></thead>
  <tbody>${detailRows}</tbody></table>
  <p style="margin-top:8px;font-size:10px;color:#78716c">* รายจ่ายประจำและผ่อนเจ้าหนี้ถูกรวมในยอดแยกตามประเภท/รายเดือนด้านบนแล้ว (ไม่แสดงเป็นรายการแยกในตารางนี้)</p>
</div>`:''}
<div class="report-footer"><span>ForHouse Cost — รายงานค่าใช้จ่ายบริษัท (เอกสารภายใน) &nbsp;❖&nbsp; ${now}</span><span>ช่วงเวลา ${fmtD(fromDate)} – ${fmtD(toDate)}</span></div>
<script>function toggleEdit(btn){var on=document.body.getAttribute('contenteditable')!=='true';document.body.setAttribute('contenteditable',on?'true':'false');btn.textContent=on?'✓ กำลังแก้ไข — กดเพื่อจบ':'✏️ แก้ไขรายงานก่อนบันทึก';btn.style.background=on?'#059669':'#0ea5e9';}</script>
</body></html>`;
  const win = window.open('', '_blank', 'width=960,height=750');
  if (!win) { alert('กรุณาอนุญาต Popup ในเบราว์เซอร์เพื่อดูรายงาน PDF'); return; }
  win.document.write(html); win.document.close();
}

// ---- Modal: เพิ่ม/แก้ไขรายจ่ายบริษัท ----
function CompanyExpenseModal({ open, onClose, initial }) {
  const app = window.useApp();
  const cats = app.companyExpenseCats || [];
  const [date, setDate]   = useState(initial?.date || todayStr());
  const [cat, setCat]     = useState(initial?.category || (cats[0]?.name || ''));
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount) : '');
  const [note, setNote]   = useState(initial?.note || '');

  useEffect(() => {
    if (!open) return;
    setDate(initial?.date || todayStr());
    setCat(initial?.category || (cats[0]?.name || ''));
    setAmount(initial?.amount != null ? String(initial.amount) : '');
    setNote(initial?.note || '');
  }, [open, initial]); // eslint-disable-line

  const save = () => {
    if (!cat) return app.pushToast('โปรดเลือกประเภทค่าใช้จ่าย', 'error');
    if (!(Number(amount) > 0)) return app.pushToast('โปรดระบุจำนวนเงิน', 'error');
    const payload = { date, category: cat, amount: Number(amount), note: note.trim() };
    if (initial?.id) { app.updateCompanyExpense(initial.id, payload); app.pushToast('แก้ไขรายจ่ายเรียบร้อย'); }
    else { app.addCompanyExpense(payload); app.pushToast('บันทึกรายจ่ายบริษัทแล้ว'); }
    onClose();
  };

  const IS = { background:'var(--bg-2)', border:'1px solid var(--line)', borderRadius:8, padding:'8px 12px', fontSize:13, color:'var(--ink-1)', fontFamily:'inherit', width:'100%', outline:'none', boxSizing:'border-box' };
  const LS = { fontSize:12, color:'var(--ink-3)', marginBottom:5, display:'block' };

  return (
    <window.Modal open={open} onClose={onClose} title={initial?.id ? 'แก้ไขรายจ่ายบริษัท' : 'เพิ่มรายจ่ายบริษัท'} width={460}
      footer={<div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-accent" onClick={save}><Icon name="save" size={13}/> บันทึก</button>
      </div>}>
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div><label style={LS}>วันที่</label><input type="date" style={IS} value={date} onChange={e=>setDate(e.target.value)} /></div>
        <div>
          <label style={LS}>ประเภทค่าใช้จ่าย</label>
          {cats.length === 0
            ? <div className="text-small text-muted">ยังไม่มีประเภท — กด "จัดการประเภท" ในหน้าบัญชีบริษัทเพื่อเพิ่มก่อน</div>
            : <select style={{ ...IS, cursor:'pointer' }} value={cat} onChange={e=>setCat(e.target.value)}>
                {cats.map(c=>(<option key={c.id} value={c.name}>{c.name}</option>))}
              </select>}
        </div>
        <div><label style={LS}>จำนวนเงิน (บาท)</label><window.MoneyInput style={{ ...IS, fontFamily:'JetBrains Mono, monospace' }} value={amount} onChange={setAmount} placeholder="0.00" /></div>
        <div><label style={LS}>หมายเหตุ / รายละเอียด</label><input style={IS} value={note} onChange={e=>setNote(e.target.value)} placeholder="เช่น เงินเดือน ก.ย. / ค่าเช่าออฟฟิศ" /></div>
      </div>
    </window.Modal>
  );
}

// ---- Modal: จัดการประเภทค่าใช้จ่ายบริษัท ----
function CompanyCatManagerModal({ open, onClose }) {
  const app = window.useApp();
  const cats = app.companyExpenseCats || [];
  const [name, setName]   = useState('');
  const [color, setColor] = useState('#6366f1');
  const [editId, setEditId]       = useState(null);
  const [editName, setEditName]   = useState('');
  const [editColor, setEditColor] = useState('#6366f1');

  const add = () => {
    if (!name.trim()) return app.pushToast('โปรดระบุชื่อประเภท', 'error');
    app.addCompanyCat({ name: name.trim(), color });
    setName(''); app.pushToast('เพิ่มประเภทแล้ว');
  };
  const del = (c) => { if (confirm(`ลบประเภท "${c.name}"?\n(รายจ่ายเดิมที่ใช้ประเภทนี้ยังอยู่ ไม่ถูกลบ)`)) app.deleteCompanyCat(c.id); };
  const startEdit = (c) => { setEditId(c.id); setEditName(c.name); setEditColor(c.color || '#6366f1'); };
  const saveEdit = () => {
    if (!editName.trim()) return app.pushToast('โปรดระบุชื่อประเภท', 'error');
    app.updateCompanyCat(editId, { name: editName.trim(), color: editColor });
    setEditId(null); app.pushToast('แก้ไขประเภทแล้ว');
  };

  const IS = { background:'var(--bg-2)', border:'1px solid var(--line)', borderRadius:8, padding:'8px 12px', fontSize:13, color:'var(--ink-1)', fontFamily:'inherit', outline:'none', boxSizing:'border-box' };

  return (
    <window.Modal open={open} onClose={onClose} title="จัดการประเภทค่าใช้จ่ายบริษัท" width={480}
      footer={<div style={{ display:'flex', justifyContent:'flex-end' }}><button className="btn btn-ghost" onClick={onClose}>ปิด</button></div>}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div className="row gap-8" style={{ alignItems:'center' }}>
          <input type="color" value={color} onChange={e=>setColor(e.target.value)} style={{ width:36, height:36, border:'1px solid var(--line)', borderRadius:8, background:'none', cursor:'pointer', flexShrink:0 }} />
          <input style={{ ...IS, flex:1 }} value={name} onChange={e=>setName(e.target.value)} placeholder="ชื่อประเภทใหม่ เช่น ค่าซ่อมบำรุงรถ" onKeyDown={e=>{ if(e.key==='Enter') add(); }} />
          <button className="btn btn-accent btn-sm" onClick={add}><Icon name="plus" size={13}/> เพิ่ม</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:320, overflowY:'auto' }}>
          {cats.length === 0 && <div className="text-small text-muted" style={{ textAlign:'center', padding:'12px 0' }}>ยังไม่มีประเภท</div>}
          {cats.map(c=> c.id === editId ? (
            <div key={c.id} className="row gap-8" style={{ alignItems:'center', padding:'8px 10px', border:'1px solid var(--accent)', borderRadius:8, background:'var(--accent-soft)' }}>
              <input type="color" value={editColor} onChange={e=>setEditColor(e.target.value)} style={{ width:32, height:32, border:'1px solid var(--line)', borderRadius:8, background:'none', cursor:'pointer', flexShrink:0 }} />
              <input style={{ ...IS, flex:1 }} value={editName} onChange={e=>setEditName(e.target.value)} autoFocus onKeyDown={e=>{ if(e.key==='Enter') saveEdit(); if(e.key==='Escape') setEditId(null); }} />
              <button className="btn btn-accent btn-sm" onClick={saveEdit} title="บันทึก"><Icon name="save" size={13}/></button>
              <button className="btn btn-ghost btn-sm" onClick={()=>setEditId(null)} title="ยกเลิก"><Icon name="x" size={13}/></button>
            </div>
          ) : (
            <div key={c.id} className="row between" style={{ padding:'8px 10px', border:'1px solid var(--line)', borderRadius:8 }}>
              <span className="row gap-8" style={{ alignItems:'center' }}>
                <span style={{ width:12, height:12, borderRadius:'50%', background:c.color, display:'inline-block' }} />
                {c.name}
              </span>
              <span className="row gap-8">
                <button className="topbar-icon-btn" style={{ width:30, height:30 }} onClick={()=>startEdit(c)} title="แก้ไขประเภท"><Icon name="edit" size={13}/></button>
                <button className="topbar-icon-btn" style={{ width:30, height:30, color:'var(--danger)' }} onClick={()=>del(c)} title="ลบประเภท"><Icon name="trash" size={13}/></button>
              </span>
            </div>
          ))}
        </div>
      </div>
    </window.Modal>
  );
}

// ---- Modal: เพิ่ม/แก้ไขรายจ่ายประจำทุกเดือน ----
function RecurringModal({ open, onClose, initial }) {
  const app = window.useApp();
  const cats = app.companyExpenseCats || [];
  const [category, setCategory] = useState('');
  const [amount, setAmount]     = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]   = useState('');
  const [note, setNote]         = useState('');
  const firstOfThisMonth = () => new Date().toISOString().slice(0,8) + '01';

  useEffect(() => {
    if (!open) return;
    setCategory(initial?.category || (cats[0]?.name || ''));
    setAmount(initial?.amount != null ? String(initial.amount) : '');
    setStartDate(initial?.startDate || firstOfThisMonth());
    setEndDate(initial?.endDate || '');
    setNote(initial?.note || '');
  }, [open, initial]); // eslint-disable-line

  const save = () => {
    if (!category) return app.pushToast('โปรดเลือกประเภทค่าใช้จ่าย', 'error');
    if (!(Number(amount) > 0)) return app.pushToast('โปรดระบุยอด/เดือน', 'error');
    if (!startDate) return app.pushToast('โปรดระบุเดือนที่เริ่ม', 'error');
    const payload = { category, amount: Number(amount), startDate, endDate: endDate || '', note: note.trim() };
    if (initial?.id) { app.updateCompanyRecurring(initial.id, payload); app.pushToast('แก้ไขรายจ่ายประจำแล้ว'); }
    else { app.addCompanyRecurring(payload); app.pushToast('เพิ่มรายจ่ายประจำแล้ว'); }
    onClose();
  };

  const IS = { background:'var(--bg-2)', border:'1px solid var(--line)', borderRadius:8, padding:'8px 12px', fontSize:13, color:'var(--ink-1)', fontFamily:'inherit', width:'100%', outline:'none', boxSizing:'border-box' };
  const LS = { fontSize:12, color:'var(--ink-3)', marginBottom:5, display:'block' };

  return (
    <window.Modal open={open} onClose={onClose} title={initial?.id ? 'แก้ไขรายจ่ายประจำ' : 'เพิ่มรายจ่ายประจำ (ทุกเดือน)'} width={480}
      footer={<div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-accent" onClick={save}><Icon name="save" size={13}/> บันทึก</button>
      </div>}>
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div>
          <label style={LS}>ประเภทค่าใช้จ่าย</label>
          {cats.length===0
            ? <div className="text-small text-muted">ยังไม่มีประเภท — กด "จัดการประเภท" เพื่อเพิ่มก่อน</div>
            : <select style={{ ...IS, cursor:'pointer' }} value={category} onChange={e=>setCategory(e.target.value)}>{cats.map(c=>(<option key={c.id} value={c.name}>{c.name}</option>))}</select>}
        </div>
        <div><label style={LS}>ยอดต่อเดือน (บาท)</label><window.MoneyInput style={{ ...IS, fontFamily:'JetBrains Mono, monospace' }} value={amount} onChange={setAmount} placeholder="0.00" /></div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div><label style={LS}>เริ่มเดือน</label><input type="date" style={IS} value={startDate} onChange={e=>setStartDate(e.target.value)} /></div>
          <div><label style={LS}>ถึงเดือน (เว้นว่าง = ต่อเนื่อง)</label><input type="date" style={IS} value={endDate} onChange={e=>setEndDate(e.target.value)} /></div>
        </div>
        <div><label style={LS}>หมายเหตุ</label><input style={IS} value={note} onChange={e=>setNote(e.target.value)} placeholder="เช่น ค่าเช่าออฟฟิศ / เงินเดือนพนักงาน" /></div>
        <div className="text-small text-muted">ระบบจะนับยอดนี้เป็นค่าดำเนินการทุกเดือน ตั้งแต่เดือนที่เริ่มจนถึงเดือนปัจจุบัน (หรือเดือนที่กำหนด)</div>
      </div>
    </window.Modal>
  );
}

// ---- Modal: เพิ่ม/แก้ไขเจ้าหนี้ (เงินกู้) ----
function CreditorModal({ open, onClose, initial }) {
  const app = window.useApp();
  const [creditor, setCreditor] = useState('');
  const [principal, setPrincipal] = useState('');
  const [monthly, setMonthly]     = useState('');
  const [total, setTotal]         = useState('');
  const [paid, setPaid]           = useState('0');
  const [startDate, setStartDate] = useState(todayStr());
  const [note, setNote]           = useState('');

  useEffect(() => {
    if (!open) return;
    setCreditor(initial?.creditor || '');
    setPrincipal(initial?.principal != null ? String(initial.principal) : '');
    setMonthly(initial?.monthlyPayment != null ? String(initial.monthlyPayment) : '');
    setTotal(initial?.totalInstallments != null ? String(initial.totalInstallments) : '');
    setPaid(initial?.paidInstallments != null ? String(initial.paidInstallments) : '0');
    setStartDate(initial?.startDate || todayStr());
    setNote(initial?.note || '');
  }, [open, initial]); // eslint-disable-line

  const save = () => {
    if (!creditor.trim()) return app.pushToast('โปรดระบุชื่อเจ้าหนี้', 'error');
    if (!(Number(monthly) > 0)) return app.pushToast('โปรดระบุยอดผ่อนต่อเดือน', 'error');
    if (!(Number(total) > 0)) return app.pushToast('โปรดระบุจำนวนงวดทั้งหมด', 'error');
    const tot = Math.round(Number(total) || 0);
    const payload = {
      creditor: creditor.trim(), principal: Number(principal) || 0, monthlyPayment: Number(monthly) || 0,
      totalInstallments: tot, paidInstallments: Math.max(0, Math.min(Math.round(Number(paid) || 0), tot)),
      startDate, note: note.trim(),
    };
    if (initial?.id) { app.updateCompanyCreditor(initial.id, payload); app.pushToast('แก้ไขเจ้าหนี้เรียบร้อย'); }
    else { app.addCompanyCreditor(payload); app.pushToast('เพิ่มเจ้าหนี้แล้ว'); }
    onClose();
  };

  const IS = { background:'var(--bg-2)', border:'1px solid var(--line)', borderRadius:8, padding:'8px 12px', fontSize:13, color:'var(--ink-1)', fontFamily:'inherit', width:'100%', outline:'none', boxSizing:'border-box' };
  const LS = { fontSize:12, color:'var(--ink-3)', marginBottom:5, display:'block' };
  const remain = Math.max(0, (Number(total)||0) - (Number(paid)||0));
  const previewOut = (Number(monthly)||0) * remain;

  return (
    <window.Modal open={open} onClose={onClose} title={initial?.id ? 'แก้ไขเจ้าหนี้ / เงินกู้' : 'เพิ่มเจ้าหนี้ / เงินกู้'} width={500}
      footer={<div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-accent" onClick={save}><Icon name="save" size={13}/> บันทึก</button>
      </div>}>
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div><label style={LS}>ชื่อเจ้าหนี้ / แหล่งกู้</label><input style={IS} value={creditor} onChange={e=>setCreditor(e.target.value)} placeholder="เช่น ธนาคารกสิกรไทย / คุณสมชาย" /></div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div><label style={LS}>ยอดเงินกู้ (บาท)</label><window.MoneyInput style={{ ...IS, fontFamily:'JetBrains Mono, monospace' }} value={principal} onChange={setPrincipal} placeholder="0.00" /></div>
          <div><label style={LS}>ยอดผ่อน/เดือน (บาท)</label><window.MoneyInput style={{ ...IS, fontFamily:'JetBrains Mono, monospace' }} value={monthly} onChange={setMonthly} placeholder="0.00" /></div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
          <div><label style={LS}>จำนวนงวดทั้งหมด</label><input type="number" min="1" step="1" style={IS} value={total} onChange={e=>setTotal(e.target.value)} placeholder="เช่น 12" /></div>
          <div><label style={LS}>ชำระแล้ว (งวด)</label><input type="number" min="0" step="1" style={IS} value={paid} onChange={e=>setPaid(e.target.value)} placeholder="0" /></div>
          <div><label style={LS}>เริ่มผ่อนงวดแรก</label><input type="date" style={IS} value={startDate} onChange={e=>setStartDate(e.target.value)} /></div>
        </div>
        <div><label style={LS}>หมายเหตุ</label><input style={IS} value={note} onChange={e=>setNote(e.target.value)} placeholder="เช่น กู้มาหมุนซื้อวัสดุ" /></div>
        <div style={{ padding:'10px 14px', borderRadius:9, background:'rgba(220,38,38,0.06)', border:'1px solid rgba(220,38,38,0.2)' }}>
          <div className="row between"><span className="text-small text-muted">เหลืออีก {remain} งวด · ยอดค้างชำระ</span><span className="mono" style={{ color:'#dc2626', fontWeight:700 }}>฿{fmt(previewOut)}</span></div>
        </div>
      </div>
    </window.Modal>
  );
}

// ---- Modal: ส่งออกรายงานบัญชีบริษัท (เลือกประเภทได้) ----
function CompanyReportModal({ open, onClose }) {
  const app = window.useApp();
  const firstOfMonth = () => { const d=new Date(); d.setDate(1); return d.toISOString().slice(0,10); };
  const firstOfYear  = () => { const d=new Date(); d.setMonth(0); d.setDate(1); return d.toISOString().slice(0,10); };
  const firstOfLastMon = () => { const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,10); };
  const lastOfLastMon  = () => { const d=new Date(); d.setDate(0); return d.toISOString().slice(0,10); };

  const [fromDate, setFromDate] = useState(firstOfYear);
  const [toDate, setToDate]     = useState(todayStr);
  const [selected, setSelected] = useState(null); // null = ยังไม่ init → เลือกทั้งหมด

  // รายชื่อประเภททั้งหมด = ประเภทที่ตั้งไว้ ∪ ประเภทที่มีในรายจ่ายจริง (กันประเภทที่ถูกลบ)
  const allNames = useMemo(() => {
    const s = new Set((app.companyExpenseCats||[]).map(c=>c.name));
    (app.companyExpenses||[]).forEach(e=>{ if(e.category) s.add(e.category); });
    return Array.from(s);
  }, [app.companyExpenseCats, app.companyExpenses]);

  const sel = selected === null ? allNames : selected;
  const toggle = (n) => setSelected(cur => { const base = cur===null?allNames:cur; return base.includes(n) ? base.filter(x=>x!==n) : [...base, n]; });
  const allOn = sel.length === allNames.length;
  const setAll = () => setSelected(allOn ? [] : allNames);

  const PRESETS = [
    { label:'เดือนนี้', from:firstOfMonth, to:()=>todayStr() },
    { label:'เดือนที่แล้ว', from:firstOfLastMon, to:lastOfLastMon },
    { label:'ปีนี้', from:firstOfYear, to:()=>todayStr() },
  ];

  const colorOf = (n) => (app.companyExpenseCats||[]).find(c=>c.name===n)?.color || '#9ca3af';

  const run = () => {
    const inRange = (d) => d && d>=fromDate && d<=toDate;
    const incomeGross = (app.records||[]).filter(r=>window.isIncome(r) && inRange(r.date)).reduce((s,r)=>s+computeTotals(r).total,0);
    const companyIncome = incomeGross * COMPANY_FEE_RATE;
    const expenses = (app.companyExpenses||[]).filter(e=>inRange(e.date) && sel.includes(e.category));
    const catRows = sel.map(n=>{
      const es = expenses.filter(e=>e.category===n);
      return { name:n, color:colorOf(n), count:es.length, total:es.reduce((s,e)=>s+Number(e.amount||0),0) };
    }).filter(c=>c.count>0).sort((a,b)=>b.total-a.total);
    try {
      doExportCompanyPDF({ fromDate, toDate, incomeGross, companyIncome, expenses, catRows, selectedNames: sel });
      app.pushToast('เปิดหน้าต่าง PDF แล้ว — เลือก "บันทึกเป็น PDF"');
      onClose();
    } catch(e) { console.error('[CompanyReport]', e); app.pushToast('ส่งออกไม่สำเร็จ: '+e.message, 'error'); }
  };

  const IS = { background:'var(--bg-2)', border:'1px solid var(--line)', borderRadius:8, padding:'8px 12px', fontSize:13, color:'var(--ink-1)', fontFamily:'inherit', width:'100%', outline:'none', boxSizing:'border-box' };
  const LS = { fontSize:12, color:'var(--ink-3)', marginBottom:5, display:'block' };

  return (
    <window.Modal open={open} onClose={onClose} title="ส่งออกรายงานบัญชีบริษัท" width={540}
      footer={<div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-accent" onClick={run} disabled={sel.length===0}><Icon name="receipt" size={13}/> สร้าง PDF</button>
      </div>}>
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        <div>
          <div style={LS}>ช่วงเวลาสำเร็จรูป</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {PRESETS.map(p=>(<button key={p.label} className="btn btn-ghost btn-sm" style={{ fontSize:12 }} onClick={()=>{ setFromDate(p.from()); setToDate(p.to()); }}>{p.label}</button>))}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div><label style={LS}>ตั้งแต่วันที่</label><input type="date" style={IS} value={fromDate} onChange={e=>setFromDate(e.target.value)} /></div>
          <div><label style={LS}>ถึงวันที่</label><input type="date" style={IS} value={toDate} onChange={e=>setToDate(e.target.value)} /></div>
        </div>
        <div>
          <div className="row between" style={{ marginBottom:8 }}>
            <span style={LS}>ประเภทค่าใช้จ่ายที่จะนำมาลบกับรายรับ</span>
            <button className="btn btn-ghost btn-sm" style={{ fontSize:11.5 }} onClick={setAll}>{allOn?'ไม่เลือกทั้งหมด':'เลือกทั้งหมด'}</button>
          </div>
          {allNames.length === 0 ? <div className="text-small text-muted">ยังไม่มีประเภทค่าใช้จ่าย</div> : (
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:240, overflowY:'auto' }}>
              {allNames.map(n=>{
                const on = sel.includes(n);
                return (
                  <div key={n} className="row gap-8" style={{ alignItems:'center', padding:'7px 10px', border:'1px solid var(--line)', borderRadius:8, cursor:'pointer', background: on?'rgba(217,119,6,0.06)':'transparent' }} onClick={()=>toggle(n)}>
                    <div style={{ width:18, height:18, borderRadius:5, border:'2px solid', borderColor: on?'#d97706':'var(--ink-4)', background: on?'#d97706':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {on && <Icon name="check" size={11} stroke={3} style={{ color:'#fff' }} />}
                    </div>
                    <span style={{ width:11, height:11, borderRadius:'50%', background:colorOf(n), display:'inline-block' }} />
                    <span style={{ fontSize:13 }}>{n}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="text-small text-muted" style={{ marginTop:8 }}>รายงานจะนำเฉพาะยอดของประเภทที่เลือก มาลบกับรายรับ ({(COMPANY_FEE_RATE*100).toFixed(0)}% ของยอดรับลูกค้า) แล้วสรุปกำไร/ขาดทุน</div>
        </div>
      </div>
    </window.Modal>
  );
}

// ---- รายงานรวม กำไร/ขาดทุนรายเดือน (รายรับจริง − ต้นทุน − ค่าดำเนินการ) ----
function doExportProfitReport(opts) {
  const { records = [], projects = [], companyExpenses = [], companyExpenseCats = [], companyCreditors = [], companyRecurring = [], carryover = 0, fromDate, toDate, opexCategories = null } = opts;
  const inR = d => d && d >= fromDate && d <= toDate;
  const catOk = e => !opexCategories || opexCategories.includes(e.category);
  const months = {};
  const ens = k => (months[k] || (months[k] = { income:0, cost:0, opex:0 }));
  const projCost = {};   // ต้นทุนแยกตามโครงการ (แยกวัสดุ/เครื่องจักร/อื่นๆ/ค่าแรง)
  const catOpex = {};    // ค่าดำเนินการแยกตามประเภท
  let tMat=0, tMach=0, tOther=0, tLabor=0;   // รวมต้นทุนแยกประเภท
  records.forEach(r => {
    if (!inR(r.date)) return;
    const k = r.date.slice(0,7);
    if (window.isIncome(r)) ens(k).income += computeTotals(r).total;
    else if (isExpense(r) && countsInDashboard(r)) {
      const t = computeTotals(r).total;
      ens(k).cost += t;
      const pcx = projCost[r.projectId] || (projCost[r.projectId] = { material:0, machine:0, other:0, labor:0, total:0 });
      if (r.type === 'material')      { pcx.material += t; tMat += t; }
      else if (r.type === 'machine')  { pcx.machine += t;  tMach += t; }
      else if (r.type === 'labor' || r.type === 'lump-labor') { pcx.labor += t; tLabor += t; }
      else                            { pcx.other += t;    tOther += t; }
      pcx.total += t;
    }
  });
  companyExpenses.forEach(e => {
    if (!inR(e.date) || !catOk(e)) return;
    ens(e.date.slice(0,7)).opex += Number(e.amount||0);
    const c = e.category || '—';
    catOpex[c] = (catOpex[c] || 0) + Number(e.amount||0);
  });
  // ผ่อนเจ้าหนี้/เงินกู้ → นับเป็นค่าดำเนินการ (แมปเข้าเดือนตามวันเริ่มผ่อน)
  const loanPm = loanPaymentsByMonth(companyCreditors, fromDate, toDate);
  Object.entries(loanPm.byMonth).forEach(([ym, amt]) => { ens(ym).opex += amt; });
  if (loanPm.total > 0) catOpex['ผ่อนเจ้าหนี้ / เงินกู้'] = (catOpex['ผ่อนเจ้าหนี้ / เงินกู้'] || 0) + loanPm.total;
  // รายจ่ายประจำทุกเดือน → นับเป็นค่าดำเนินการ (ตามประเภท)
  const recSource = opexCategories ? companyRecurring.filter(r => opexCategories.includes(r.category)) : companyRecurring;
  const recPm = recurringByMonth(recSource, fromDate, toDate);
  Object.entries(recPm.byMonth).forEach(([ym, amt]) => { ens(ym).opex += amt; });
  Object.entries(recPm.byCat).forEach(([cat, amt]) => { catOpex[cat] = (catOpex[cat] || 0) + amt; });

  const keys = Object.keys(months).sort();
  let tIncome=0, tCost=0, tOpex=0;
  keys.forEach(k => { tIncome+=months[k].income; tCost+=months[k].cost; tOpex+=months[k].opex; });
  const carry = Number(carryover||0);
  const tIncomeAll = tIncome + carry;
  const tExpense = tCost + tOpex;
  const netProfit = tIncomeAll - tExpense;
  // แยกรายรับตามสัดส่วน: รายรับค่าดำเนินการ = 15% ของรายรับจริง · รายรับต้นทุน = 85% ที่เหลือ
  const opexIncome = tIncome * COMPANY_FEE_RATE;
  const costIncome = tIncome - opexIncome;
  const costProfit = costIncome - tCost;   // กำไร/ขาดทุน ส่วนต้นทุน
  const opexProfit = opexIncome - tOpex;   // กำไร/ขาดทุน ส่วนค่าดำเนินการ

  const fmtN = v => Number(v||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
  const fmtD = s => s ? new Date(s+'T00:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'}) : '—';
  const now = new Date().toLocaleString('th-TH',{dateStyle:'long',timeStyle:'short'});
  const pc = v => v>=0 ? '#059669' : '#dc2626';
  const money = (v, color) => `<span style="color:${color||'#1c1917'}">${v<0?'−':''}฿${fmtN(Math.abs(v))}</span>`;

  const rows = keys.map((k,i) => {
    const m = months[k]; const exp = m.cost + m.opex; const p = m.income - exp;
    return `<tr class="${i%2===0?'alt':''}">
      <td>${monthLabelTH(k)}</td>
      <td class="r">฿${fmtN(m.income)}</td>
      <td class="r">฿${fmtN(m.cost)}</td>
      <td class="r">฿${fmtN(m.opex)}</td>
      <td class="r bold">฿${fmtN(exp)}</td>
      <td class="r bold">${money(p, pc(p))}</td>
    </tr>`;
  }).join('');

  // กราฟแท่งง่าย ๆ — ต้นทุนแยกโครงการ + ค่าดำเนินการแยกประเภท (เรียงมาก→น้อย)
  const projById = {}; projects.forEach(p => { projById[p.id] = p; });
  const catColor = {}; companyExpenseCats.forEach(c => { catColor[c.name] = c.color; });
  const bar = (v, max, color) => `<div style="background:#f0ede8;border-radius:99px;height:7px"><div style="height:7px;border-radius:99px;background:${color};width:${max>0?Math.round(v/max*100):0}%"></div></div>`;
  const projEntries = Object.entries(projCost).sort((a,b)=>b[1].total-a[1].total);
  const maxProj = projEntries.length ? projEntries[0][1].total : 0;
  const projRows = projEntries.map(([pid,v],i)=>{ const p=projById[pid]; const col=p?.color||'#d97706'; return `<tr class="${i%2===0?'alt':''}"><td><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${col};margin-right:7px"></span>${p?.name||'ไม่ระบุโครงการ'}</td><td class="r">฿${fmtN(v.material)}</td><td class="r">฿${fmtN(v.machine)}</td><td class="r">฿${fmtN(v.other)}</td><td class="r">฿${fmtN(v.labor)}</td><td class="r bold">฿${fmtN(v.total)}</td><td style="width:150px">${bar(v.total,maxProj,col)}</td></tr>`; }).join('');
  const catEntries = Object.entries(catOpex).sort((a,b)=>b[1]-a[1]);
  const maxCat = catEntries.length ? catEntries[0][1] : 0;
  const catRows = catEntries.map(([name,v],i)=>{ const col=catColor[name]||'#c2410c'; return `<tr class="${i%2===0?'alt':''}"><td><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${col};margin-right:7px"></span>${name}</td><td class="r bold">฿${fmtN(v)}</td><td class="r" style="width:60px">${tOpex>0?Math.round(v/tOpex*100):0}%</td><td style="width:210px">${bar(v,maxCat,col)}</td></tr>`; }).join('');

  // รายรับ — แยกตามโครงการ (กราฟ) + รายละเอียดแต่ละยอด
  const incomeRecs = records.filter(r => window.isIncome(r) && inR(r.date)).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const incByProj = {};
  incomeRecs.forEach(r => { incByProj[r.projectId] = (incByProj[r.projectId]||0) + computeTotals(r).total; });
  const incProjEntries = Object.entries(incByProj).sort((a,b)=>b[1]-a[1]);
  const maxIncProj = incProjEntries.length ? incProjEntries[0][1] : 0;
  const incProjRows = incProjEntries.map(([pid,v],i)=>{ const p=projById[pid]; const col=p?.color||'#059669'; return `<tr class="${i%2===0?'alt':''}"><td><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${col};margin-right:7px"></span>${p?.name||'ไม่ระบุโครงการ'}</td><td style="font-size:10.5px;color:#78716c">${p?.code||'—'}</td><td class="r bold" style="color:#059669">฿${fmtN(v)}</td><td class="r" style="width:60px">${tIncome>0?Math.round(v/tIncome*100):0}%</td><td style="width:180px">${bar(v,maxIncProj,col)}</td></tr>`; }).join('');
  const incDetailRows = incomeRecs.map((r,i)=>{ const p=projById[r.projectId]; const detail=(r.items||[]).map(it=>it.name).filter(Boolean).join(', ') || r.period || '—'; return `<tr class="${i%2===0?'alt':''}"><td class="mono" style="font-size:10px">${r.docNo||'—'}</td><td style="white-space:nowrap">${fmtD(r.date)}</td><td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p?.name||'—'}</td><td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.vendor||'—'}</td><td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${detail}</td><td class="r bold" style="color:#059669">฿${fmtN(computeTotals(r).total)}</td></tr>`; }).join('');

  const html = `<!DOCTYPE html><html lang="th"><head>
<meta charset="UTF-8"><title>รายงานกำไร/ขาดทุนรายเดือน ${fromDate} – ${toDate}</title>
<link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Prompt',sans-serif;font-size:12px;color:#1c1917;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@page{size:A4 landscape;margin:14mm}
@media print{.no-print{display:none!important}}
.report-header{background:#1c1917;color:#fff;padding:22px 28px;display:flex;justify-content:space-between;align-items:flex-start}
.logo{width:46px;height:46px;background:#059669;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#fff;flex-shrink:0}
.header-left{display:flex;gap:16px;align-items:center}
.header-title{font-size:18px;font-weight:700;letter-spacing:-0.3px;line-height:1.3}
.header-sub{font-size:11px;color:#a8a29e;margin-top:3px}
.header-right{text-align:right;font-size:11px;color:#a8a29e;line-height:2}
.header-right strong{color:#fff;font-weight:600}
.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0}
.kpi{border-radius:10px;padding:16px 18px;border:1px solid #e7e5e4;background:#fafaf9}
.kpi-label{font-size:10px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;opacity:.7;margin-bottom:6px}
.kpi-value{font-size:20px;font-weight:700;letter-spacing:-0.5px;font-variant-numeric:tabular-nums}
.kpi-sub{font-size:10px;margin-top:4px;opacity:.75}
.section{margin:16px 0}
.section-header{display:flex;align-items:center;gap:10px;margin-bottom:12px;border-left:4px solid #059669;padding-left:10px}
.section-title{font-size:13px;font-weight:700}
table{width:100%;border-collapse:collapse;font-size:11.5px}
thead tr{background:#292524;color:#fff}
thead th{padding:9px 14px;text-align:left;font-weight:600;font-size:10.5px;white-space:nowrap}
tbody td{padding:8.5px 14px;border-bottom:1px solid #f5f5f4;vertical-align:middle}
tbody tr.alt td{background:#fafaf9}
tfoot td{padding:10px 14px;background:#1c1917;color:#fff;font-weight:600;font-size:12px}
.r{text-align:right;font-variant-numeric:tabular-nums}.bold{font-weight:700}
.report-footer{margin-top:22px;padding-top:12px;border-top:1px solid #e7e5e4;display:flex;justify-content:space-between;font-size:10px;color:#78716c}
.print-btn{background:#059669;color:#fff;border:none;padding:12px 28px;border-radius:8px;font-size:14px;font-family:'Prompt',sans-serif;font-weight:600;cursor:pointer}
.print-wrap{text-align:center;padding:24px;border-bottom:2px dashed #e7e5e4;margin-bottom:20px}
@media screen{body[contenteditable="true"] td:focus{outline:2px solid #0ea5e9;background:#e0f2fe}}
</style></head><body>
<div class="no-print print-wrap">
  <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
    <button class="print-btn" onclick="window.print()">🖨️ พิมพ์ / บันทึกเป็น PDF</button>
    <button class="print-btn" style="background:#0ea5e9" onclick="toggleEdit(this)">✏️ แก้ไขรายงานก่อนบันทึก</button>
  </div>
  <p style="margin-top:10px;font-size:11px;color:#78716c">รายรับใช้ยอดจริง (ไม่หัก 15%) · รายจ่าย = ต้นทุนโครงการ + ค่าดำเนินการบริษัท · เอกสารภายในสำหรับผู้บริหาร</p>
</div>
<div class="report-header">
  <div class="header-left"><div class="logo">฿</div><div>
    <div class="header-title">รายงานรวม — กำไร/ขาดทุนรายเดือน</div>
    <div class="header-sub">รายรับจริง − (ต้นทุนโครงการ + ค่าดำเนินการบริษัท)</div>
  </div></div>
  <div class="header-right">
    <div>📅 ช่วงเวลา: <strong>${fmtD(fromDate)} – ${fmtD(toDate)}</strong></div>
    <div>จำนวนเดือน: <strong>${keys.length}</strong></div>
    <div>สร้างเมื่อ: <strong>${now}</strong></div>
  </div>
</div>
<div class="kpi-grid">
  <div class="kpi" style="background:#ecfdf5;border-color:#a7f3d0"><div class="kpi-label" style="color:#059669">รายรับจริงรวม</div><div class="kpi-value" style="color:#059669">฿${fmtN(tIncomeAll)}</div><div class="kpi-sub">${carry>0?`รับจริง ฿${fmtN(tIncome)} + ยกมา ฿${fmtN(carry)}`:'ไม่หักค่าดำเนินการ 15%'}</div></div>
  <div class="kpi" style="background:#fff7ed;border-color:#fed7aa"><div class="kpi-label" style="color:#c2410c">รายจ่ายรวม</div><div class="kpi-value" style="color:#c2410c">฿${fmtN(tExpense)}</div><div class="kpi-sub">ต้นทุน ฿${fmtN(tCost)} + ค่าดำเนินการ ฿${fmtN(tOpex)}</div></div>
  <div class="kpi" style="background:${netProfit>=0?'#ecfdf5':'#fef2f2'};border-color:${netProfit>=0?'#a7f3d0':'#fecaca'}"><div class="kpi-label" style="color:${pc(netProfit)}">${netProfit>=0?'กำไรสุทธิ':'ขาดทุนสุทธิ'}</div><div class="kpi-value" style="color:${pc(netProfit)}">${netProfit<0?'−':''}฿${fmtN(Math.abs(netProfit))}</div><div class="kpi-sub">${netProfit>=0?'บริษัทมีกำไร':'บริษัทขาดทุน'}</div></div>
</div>
<div class="section">
  <div class="section-header"><div class="section-title">สรุปกำไร/ขาดทุน แยกส่วน (รายรับต้นทุน 85% / รายรับค่าดำเนินการ 15%)</div></div>
  <div class="kpi-grid" style="grid-template-columns:repeat(2,1fr);margin:0 0 12px">
    <div class="kpi" style="background:${costProfit>=0?'#ecfdf5':'#fef2f2'};border-color:${costProfit>=0?'#a7f3d0':'#fecaca'}">
      <div class="kpi-label" style="color:${pc(costProfit)}">ส่วนต้นทุนโครงการ · ${costProfit>=0?'กำไร':'ขาดทุน'}</div>
      <div class="kpi-value" style="color:${pc(costProfit)}">${costProfit<0?'−':''}฿${fmtN(Math.abs(costProfit))}</div>
      <div class="kpi-sub">รายรับ 85% ฿${fmtN(costIncome)} − ต้นทุนโครงการ ฿${fmtN(tCost)}</div>
    </div>
    <div class="kpi" style="background:${opexProfit>=0?'#ecfdf5':'#fef2f2'};border-color:${opexProfit>=0?'#a7f3d0':'#fecaca'}">
      <div class="kpi-label" style="color:${pc(opexProfit)}">ส่วนค่าดำเนินการ · ${opexProfit>=0?'กำไร':'ขาดทุน'}</div>
      <div class="kpi-value" style="color:${pc(opexProfit)}">${opexProfit<0?'−':''}฿${fmtN(Math.abs(opexProfit))}</div>
      <div class="kpi-sub">รายรับ 15% ฿${fmtN(opexIncome)} − ค่าดำเนินการ ฿${fmtN(tOpex)}</div>
    </div>
  </div>
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;background:#1c1917;color:#fff;padding:13px 20px;border-radius:10px">
    <span style="font-weight:600;font-size:12px">รวมกำไร/ขาดทุนสุทธิ${carry>0?` (รวมยอดยกมา ฿${fmtN(carry)})`:''} · รับ ฿${fmtN(tIncomeAll)} − จ่าย ฿${fmtN(tExpense)}</span>
    <span style="font-weight:700;font-size:18px;color:${netProfit>=0?'#6ee7b7':'#fca5a5'}">${netProfit<0?'−':''}฿${fmtN(Math.abs(netProfit))}</span>
  </div>
</div>
<div class="section">
  <div class="section-header"><div class="section-title">สรุปกำไร/ขาดทุน แยกรายเดือน</div></div>
  <table>
    <thead><tr><th>เดือน</th><th class="r">รายรับจริง</th><th class="r">ต้นทุนโครงการ</th><th class="r">ค่าดำเนินการ</th><th class="r">รวมรายจ่าย</th><th class="r">กำไร/ขาดทุน</th></tr></thead>
    <tbody>${rows||'<tr><td colspan="6" style="text-align:center;color:#a8a29e;padding:16px">ไม่มีข้อมูลในช่วงเวลานี้</td></tr>'}</tbody>
    <tfoot>
      ${carry>0?`<tr><td>ยอดยกมาจากปีก่อน (นับเป็นรับ)</td><td class="r">฿${fmtN(carry)}</td><td class="r">—</td><td class="r">—</td><td class="r">—</td><td class="r">฿${fmtN(carry)}</td></tr>`:''}
      <tr><td>รวมทั้งหมด</td><td class="r">฿${fmtN(tIncomeAll)}</td><td class="r">฿${fmtN(tCost)}</td><td class="r">฿${fmtN(tOpex)}</td><td class="r">฿${fmtN(tExpense)}</td><td class="r" style="background:${netProfit>=0?'#047857':'#b91c1c'}">${netProfit<0?'−':''}฿${fmtN(Math.abs(netProfit))}</td></tr>
    </tfoot>
  </table>
</div>
<div class="section">
  <div class="section-header" style="border-left-color:#059669"><div class="section-title">รายรับ แยกตามโครงการ (มาก → น้อย)</div></div>
  <table>
    <thead><tr style="background:#065f46"><th>โครงการ</th><th style="width:100px">รหัส</th><th class="r" style="width:150px">ยอดรับ</th><th class="r" style="width:70px">สัดส่วน</th><th style="width:190px">กราฟ</th></tr></thead>
    <tbody>${incProjRows||'<tr><td colspan="5" style="text-align:center;color:#a8a29e;padding:16px">ไม่มีรายรับในช่วงนี้</td></tr>'}</tbody>
    <tfoot><tr><td colspan="2">รวมรายรับจริง</td><td class="r">฿${fmtN(tIncome)}</td><td class="r">100%</td><td></td></tr></tfoot>
  </table>
</div>
${incomeRecs.length>0?`<div class="section">
  <div class="section-header" style="border-left-color:#059669"><div class="section-title">รายละเอียดรายรับ (${incomeRecs.length} รายการ)</div></div>
  <table>
    <thead><tr style="background:#065f46"><th style="width:100px">เลขที่</th><th style="width:80px">วันที่</th><th>โครงการ</th><th>ผู้จ่าย / ลูกค้า</th><th>รายละเอียด / งวดงาน</th><th class="r" style="width:130px">ยอดรับ</th></tr></thead>
    <tbody>${incDetailRows}</tbody>
    <tfoot><tr><td colspan="5">รวมรายรับจริง</td><td class="r">฿${fmtN(tIncome)}</td></tr></tfoot>
  </table>
</div>`:''}
<div class="section">
  <div class="section-header" style="border-left-color:#d97706"><div class="section-title">ต้นทุนโครงการ แยกรายโครงการ + แยกประเภท (มาก → น้อย)</div></div>
  <table>
    <thead><tr><th>โครงการ</th><th class="r">วัสดุ</th><th class="r">เครื่องจักร</th><th class="r">อื่นๆ</th><th class="r">ค่าแรง</th><th class="r" style="width:130px">รวมต้นทุน</th><th style="width:150px">กราฟ</th></tr></thead>
    <tbody>${projRows||'<tr><td colspan="7" style="text-align:center;color:#a8a29e;padding:16px">ไม่มีต้นทุนในช่วงนี้</td></tr>'}</tbody>
    <tfoot><tr><td>รวมต้นทุนโครงการ</td><td class="r">฿${fmtN(tMat)}</td><td class="r">฿${fmtN(tMach)}</td><td class="r">฿${fmtN(tOther)}</td><td class="r">฿${fmtN(tLabor)}</td><td class="r">฿${fmtN(tCost)}</td><td></td></tr></tfoot>
  </table>
</div>
<div class="section">
  <div class="section-header" style="border-left-color:#c2410c"><div class="section-title">ค่าดำเนินการ แยกตามประเภท (มาก → น้อย)</div></div>
  <table>
    <thead><tr><th>ประเภทค่าดำเนินการ</th><th class="r" style="width:150px">ยอด</th><th class="r" style="width:70px">สัดส่วน</th><th style="width:220px">กราฟ</th></tr></thead>
    <tbody>${catRows||'<tr><td colspan="4" style="text-align:center;color:#a8a29e;padding:16px">ไม่มีค่าดำเนินการในช่วงนี้</td></tr>'}</tbody>
    <tfoot><tr><td>รวมค่าดำเนินการ</td><td class="r">฿${fmtN(tOpex)}</td><td class="r">100%</td><td></td></tr></tfoot>
  </table>
</div>
<div class="report-footer"><span>ForHouse Cost — รายงานกำไร/ขาดทุน (เอกสารภายใน) &nbsp;❖&nbsp; ${now}</span><span>ช่วงเวลา ${fmtD(fromDate)} – ${fmtD(toDate)}</span></div>
<script>function toggleEdit(btn){var on=document.body.getAttribute('contenteditable')!=='true';document.body.setAttribute('contenteditable',on?'true':'false');btn.textContent=on?'✓ กำลังแก้ไข — กดเพื่อจบ':'✏️ แก้ไขรายงานก่อนบันทึก';btn.style.background=on?'#059669':'#0ea5e9';}</script>
</body></html>`;
  const win = window.open('', '_blank', 'width=1000,height=750');
  if (!win) { alert('กรุณาอนุญาต Popup ในเบราว์เซอร์เพื่อดูรายงาน PDF'); return; }
  win.document.write(html); win.document.close();
}

// ---- Modal: รายงานรวม กำไร/ขาดทุนรายเดือน ----
function ProfitReportModal({ open, onClose }) {
  const app = window.useApp();
  const firstOfYear = () => { const d=new Date(); d.setMonth(0); d.setDate(1); return d.toISOString().slice(0,10); };
  const firstOfLastYear = () => { const d=new Date(); return new Date(d.getFullYear()-1,0,1).toISOString().slice(0,10); };
  const endOfLastYear = () => { const d=new Date(); return new Date(d.getFullYear()-1,11,31).toISOString().slice(0,10); };
  const [fromDate, setFromDate] = useState(firstOfYear);
  const [toDate, setToDate]     = useState(todayStr);
  const [includeCarry, setIncludeCarry] = useState(true);
  const [selectedCats, setSelectedCats] = useState(null); // null = ทั้งหมด
  const [busy, setBusy] = useState(false);

  const allCatNames = useMemo(() => {
    const s = new Set((app.companyExpenseCats||[]).map(c=>c.name));
    (app.companyExpenses||[]).forEach(e=>{ if(e.category) s.add(e.category); });
    return Array.from(s);
  }, [app.companyExpenseCats, app.companyExpenses]);
  const selCats = selectedCats === null ? allCatNames : selectedCats;
  const toggleCat = (n) => setSelectedCats(cur => { const base = cur===null?allCatNames:cur; return base.includes(n)?base.filter(x=>x!==n):[...base,n]; });
  const allCatsOn = selCats.length === allCatNames.length;
  const colorOfCat = (n) => (app.companyExpenseCats||[]).find(c=>c.name===n)?.color || '#9ca3af';

  const PRESETS = [
    { label:'ปีนี้', from:firstOfYear, to:()=>todayStr() },
    { label:'ปีที่แล้ว', from:firstOfLastYear, to:endOfLastYear },
    { label:'12 เดือนล่าสุด', from:()=>{const d=new Date();d.setMonth(d.getMonth()-11);d.setDate(1);return d.toISOString().slice(0,10);}, to:()=>todayStr() },
  ];

  const preview = useMemo(() => {
    const inR = d => d && d>=fromDate && d<=toDate;
    let income=0, cost=0, opex=0;
    (app.records||[]).forEach(r=>{ if(!inR(r.date))return; if(window.isIncome(r))income+=computeTotals(r).total; else if(isExpense(r)&&countsInDashboard(r))cost+=computeTotals(r).total; });
    (app.companyExpenses||[]).forEach(e=>{ if(inR(e.date) && selCats.includes(e.category))opex+=Number(e.amount||0); });
    opex += loanPaymentsByMonth(app.companyCreditors, fromDate, toDate).total;
    const recSrc = (app.companyRecurring||[]).filter(r=>selCats.includes(r.category));
    opex += recurringByMonth(recSrc, fromDate, toDate).total;
    const carry = includeCarry ? Number(app.carryoverIncome||0) : 0;
    return { income: income+carry, expense: cost+opex, net: (income+carry)-(cost+opex) };
  }, [app.records, app.companyExpenses, app.companyCreditors, app.companyRecurring, app.carryoverIncome, fromDate, toDate, includeCarry, selCats]);

  const run = () => {
    setBusy(true);
    setTimeout(() => {
      try {
        doExportProfitReport({ records: app.records, projects: app.projects, companyExpenses: app.companyExpenses,
          companyExpenseCats: app.companyExpenseCats, companyCreditors: app.companyCreditors, companyRecurring: app.companyRecurring,
          carryover: includeCarry ? app.carryoverIncome : 0, fromDate, toDate, opexCategories: selCats });
        app.pushToast('เปิดหน้าต่าง PDF แล้ว — เลือก "บันทึกเป็น PDF"');
        onClose();
      } catch(e){ console.error('[ProfitReport]', e); app.pushToast('ส่งออกไม่สำเร็จ: '+e.message, 'error'); }
      finally { setBusy(false); }
    }, 60);
  };

  const IS = { background:'var(--bg-2)', border:'1px solid var(--line)', borderRadius:8, padding:'8px 12px', fontSize:13, color:'var(--ink-1)', fontFamily:'inherit', width:'100%', outline:'none', boxSizing:'border-box' };
  const LS = { fontSize:12, color:'var(--ink-3)', marginBottom:5, display:'block' };

  return (
    <window.Modal open={open} onClose={onClose} title="รายงานรวม กำไร/ขาดทุนรายเดือน" width={540}
      footer={<div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose} disabled={busy}>ยกเลิก</button>
        <button className="btn btn-accent" onClick={run} disabled={busy}><Icon name="receipt" size={13}/> {busy?'กำลังสร้าง…':'สร้าง PDF'}</button>
      </div>}>
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        <div>
          <div style={LS}>ช่วงเวลาสำเร็จรูป</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {PRESETS.map(p=>(<button key={p.label} className="btn btn-ghost btn-sm" style={{ fontSize:12 }} onClick={()=>{ setFromDate(p.from()); setToDate(p.to()); }}>{p.label}</button>))}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div><label style={LS}>ตั้งแต่วันที่</label><input type="date" style={IS} value={fromDate} onChange={e=>setFromDate(e.target.value)} /></div>
          <div><label style={LS}>ถึงวันที่</label><input type="date" style={IS} value={toDate} onChange={e=>setToDate(e.target.value)} /></div>
        </div>
        <div>
          <div className="row between" style={{ marginBottom:8 }}>
            <span style={LS}>ประเภทค่าดำเนินการที่จะรวมเป็นรายจ่าย</span>
            {allCatNames.length>0 && <button className="btn btn-ghost btn-sm" style={{ fontSize:11.5 }} onClick={()=>setSelectedCats(allCatsOn?[]:allCatNames)}>{allCatsOn?'ไม่เลือกทั้งหมด':'เลือกทั้งหมด'}</button>}
          </div>
          {allCatNames.length===0 ? <div className="text-small text-muted">ยังไม่มีประเภทค่าดำเนินการ</div> : (
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:200, overflowY:'auto' }}>
              {allCatNames.map(n=>{ const on=selCats.includes(n); return (
                <div key={n} className="row gap-8" style={{ alignItems:'center', padding:'7px 10px', border:'1px solid var(--line)', borderRadius:8, cursor:'pointer', background: on?'rgba(217,119,6,0.06)':'transparent' }} onClick={()=>toggleCat(n)}>
                  <div style={{ width:18, height:18, borderRadius:5, border:'2px solid', borderColor: on?'#d97706':'var(--ink-4)', background: on?'#d97706':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {on && <Icon name="check" size={11} stroke={3} style={{ color:'#fff' }} />}
                  </div>
                  <span style={{ width:11, height:11, borderRadius:'50%', background:colorOfCat(n), display:'inline-block' }} />
                  <span style={{ fontSize:13 }}>{n}</span>
                </div>
              ); })}
            </div>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--bg-2)', borderRadius:9, border:'1px solid var(--line)', cursor:'pointer' }} onClick={()=>setIncludeCarry(v=>!v)}>
          <div style={{ width:18, height:18, borderRadius:5, border:'2px solid', borderColor: includeCarry ? '#059669' : 'var(--ink-4)', background: includeCarry ? '#059669' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            {includeCarry && <Icon name="check" size={11} stroke={3} style={{ color:'#fff' }} />}
          </div>
          <div><div style={{ fontSize:13, fontWeight:500 }}>รวมยอดยกมาจากปีก่อน (฿{fmt(Number(app.carryoverIncome||0))})</div><div style={{ fontSize:11, color:'var(--ink-3)', marginTop:1 }}>นับเป็นรับเพิ่มในยอดรวม (ไม่กระจายรายเดือน)</div></div>
        </div>
        <div style={{ padding:'14px 16px', borderRadius:10, background:'rgba(5,150,105,0.06)', border:'1px solid rgba(5,150,105,0.2)' }}>
          <div className="row between"><span className="text-small text-muted">รายรับจริง (ไม่หัก 15%)</span><span className="mono" style={{ color:'#059669', fontWeight:600 }}>฿{fmt(preview.income)}</span></div>
          <div className="row between" style={{ marginTop:4 }}><span className="text-small text-muted">หัก ต้นทุน + ค่าดำเนินการ</span><span className="mono" style={{ color:'#c2410c', fontWeight:600 }}>−฿{fmt(preview.expense)}</span></div>
          <div className="row between" style={{ marginTop:8, paddingTop:8, borderTop:'1px solid var(--line)' }}><strong>{preview.net>=0?'กำไรสุทธิ':'ขาดทุนสุทธิ'}</strong><strong className="mono" style={{ color: preview.net>=0?'#059669':'#dc2626' }}>{preview.net<0?'−':''}฿{fmt(Math.abs(preview.net))}</strong></div>
        </div>
      </div>
    </window.Modal>
  );
}

// ---- Modal: ส่งออกรายงานค่าใช้จ่ายบริษัทล้วน ----
function CompanyExpenseReportModal({ open, onClose }) {
  const app = window.useApp();
  const firstOfYear   = () => { const d=new Date(); d.setMonth(0); d.setDate(1); return d.toISOString().slice(0,10); };
  const firstOfMonth  = () => { const d=new Date(); d.setDate(1); return d.toISOString().slice(0,10); };
  const firstOfLastMon= () => { const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,10); };
  const lastOfLastMon = () => { const d=new Date(); d.setDate(0); return d.toISOString().slice(0,10); };
  const [fromDate, setFromDate] = useState(firstOfYear);
  const [toDate, setToDate]     = useState(todayStr);
  const [selectedCats, setSelectedCats] = useState(null); // null = ทั้งหมด
  const [busy, setBusy] = useState(false);
  const PRESETS = [
    { label:'เดือนนี้', from:firstOfMonth, to:()=>todayStr() },
    { label:'เดือนที่แล้ว', from:firstOfLastMon, to:lastOfLastMon },
    { label:'ปีนี้', from:firstOfYear, to:()=>todayStr() },
  ];
  const allCatNames = useMemo(() => {
    const s = new Set((app.companyExpenseCats||[]).map(c=>c.name));
    (app.companyExpenses||[]).forEach(e=>{ if(e.category) s.add(e.category); });
    (app.companyRecurring||[]).forEach(r=>{ if(r.category) s.add(r.category); });
    if ((app.companyCreditors||[]).length>0) s.add(LOAN_CAT);
    return Array.from(s);
  }, [app.companyExpenseCats, app.companyExpenses, app.companyRecurring, app.companyCreditors]);
  const selCats = selectedCats === null ? allCatNames : selectedCats;
  const toggleCat = (n) => setSelectedCats(cur => { const base = cur===null?allCatNames:cur; return base.includes(n)?base.filter(x=>x!==n):[...base,n]; });
  const allCatsOn = selCats.length === allCatNames.length;
  const colorOfCat = (n) => n===LOAN_CAT ? '#dc2626' : ((app.companyExpenseCats||[]).find(c=>c.name===n)?.color || '#9ca3af');

  const preview = useMemo(() => {
    const inR = d => d && d>=fromDate && d<=toDate;
    const catIn = n => selCats.includes(n);
    let t = (app.companyExpenses||[]).filter(e=>inR(e.date) && catIn(e.category||'—')).reduce((s,e)=>s+Number(e.amount||0),0);
    t += recurringByMonth((app.companyRecurring||[]).filter(r=>catIn(r.category)), fromDate, toDate).total;
    if (catIn(LOAN_CAT)) t += loanPaymentsByMonth(app.companyCreditors, fromDate, toDate).total;
    return t;
  }, [app.companyExpenses, app.companyRecurring, app.companyCreditors, fromDate, toDate, selCats]);
  const run = () => {
    setBusy(true);
    setTimeout(() => {
      try {
        doExportCompanyExpenseReport({ companyExpenses: app.companyExpenses, companyExpenseCats: app.companyExpenseCats,
          companyCreditors: app.companyCreditors, companyRecurring: app.companyRecurring, fromDate, toDate, categories: selCats });
        app.pushToast('เปิดหน้าต่าง PDF แล้ว — เลือก "บันทึกเป็น PDF"');
        onClose();
      } catch(e){ console.error('[CompanyExpenseReport]', e); app.pushToast('ส่งออกไม่สำเร็จ: '+e.message, 'error'); }
      finally { setBusy(false); }
    }, 60);
  };
  const IS = { background:'var(--bg-2)', border:'1px solid var(--line)', borderRadius:8, padding:'8px 12px', fontSize:13, color:'var(--ink-1)', fontFamily:'inherit', width:'100%', outline:'none', boxSizing:'border-box' };
  const LS = { fontSize:12, color:'var(--ink-3)', marginBottom:5, display:'block' };
  return (
    <window.Modal open={open} onClose={onClose} title="ส่งออกรายงานค่าใช้จ่ายบริษัท" width={520}
      footer={<div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose} disabled={busy}>ยกเลิก</button>
        <button className="btn btn-accent" onClick={run} disabled={busy}><Icon name="receipt" size={13}/> {busy?'กำลังสร้าง…':'สร้าง PDF'}</button>
      </div>}>
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        <div>
          <div style={LS}>ช่วงเวลาสำเร็จรูป</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {PRESETS.map(p=>(<button key={p.label} className="btn btn-ghost btn-sm" style={{ fontSize:12 }} onClick={()=>{ setFromDate(p.from()); setToDate(p.to()); }}>{p.label}</button>))}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div><label style={LS}>ตั้งแต่วันที่</label><input type="date" style={IS} value={fromDate} onChange={e=>setFromDate(e.target.value)} /></div>
          <div><label style={LS}>ถึงวันที่</label><input type="date" style={IS} value={toDate} onChange={e=>setToDate(e.target.value)} /></div>
        </div>
        <div>
          <div className="row between" style={{ marginBottom:8 }}>
            <span style={LS}>ประเภทค่าใช้จ่ายที่จะรายงาน</span>
            {allCatNames.length>0 && <button className="btn btn-ghost btn-sm" style={{ fontSize:11.5 }} onClick={()=>setSelectedCats(allCatsOn?[]:allCatNames)}>{allCatsOn?'ไม่เลือกทั้งหมด':'เลือกทั้งหมด'}</button>}
          </div>
          {allCatNames.length===0 ? <div className="text-small text-muted">ยังไม่มีประเภทค่าใช้จ่าย</div> : (
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:200, overflowY:'auto' }}>
              {allCatNames.map(n=>{ const on=selCats.includes(n); return (
                <div key={n} className="row gap-8" style={{ alignItems:'center', padding:'7px 10px', border:'1px solid var(--line)', borderRadius:8, cursor:'pointer', background: on?'rgba(194,65,12,0.06)':'transparent' }} onClick={()=>toggleCat(n)}>
                  <div style={{ width:18, height:18, borderRadius:5, border:'2px solid', borderColor: on?'#c2410c':'var(--ink-4)', background: on?'#c2410c':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {on && <Icon name="check" size={11} stroke={3} style={{ color:'#fff' }} />}
                  </div>
                  <span style={{ width:11, height:11, borderRadius:'50%', background:colorOfCat(n), display:'inline-block' }} />
                  <span style={{ fontSize:13 }}>{n}</span>
                </div>
              ); })}
            </div>
          )}
        </div>
        <div style={{ padding:'14px 16px', borderRadius:10, background:'rgba(217,119,6,0.07)', border:'1px solid rgba(217,119,6,0.25)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span className="text-small text-muted">ค่าใช้จ่ายรวมในช่วงนี้ ({selCats.length}/{allCatNames.length} ประเภท)</span>
          <span className="mono" style={{ fontWeight:700, color:'#c2410c' }}>฿{fmt(preview)}</span>
        </div>
        <div className="text-small text-muted">รายงานนี้แสดงเฉพาะค่าใช้จ่าย — ไม่มีรายรับและกำไร/ขาดทุน (แยกตามประเภท · รายเดือน · รายละเอียด)</div>
      </div>
    </window.Modal>
  );
}

// ---- หน้าบัญชีบริษัท ----
window.CompanyFinanceView = function CompanyFinanceView() {
  const app = window.useApp();
  const [range, setRange]   = useState('all'); // all | year | month
  const [selMonth, setSelMonth] = useState(new Date().toISOString().slice(0,7)); // YYYY-MM (ใช้กับ range='month')
  const [expModal, setExpModal] = useState({ open:false, initial:null });
  const [catOpen, setCatOpen]   = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [profitOpen, setProfitOpen] = useState(false);
  const [expReportOpen, setExpReportOpen] = useState(false);
  const [credModal, setCredModal] = useState({ open:false, initial:null });
  const [recModal, setRecModal]   = useState({ open:false, initial:null });

  // ── เจ้าหนี้ / เงินกู้ ─────────────────────────────
  const creditors = (app.companyCreditors || []).slice().sort((a,b)=>{
    const ao=(Number(a.totalInstallments)-Number(a.paidInstallments))>0?0:1;
    const bo=(Number(b.totalInstallments)-Number(b.paidInstallments))>0?0:1;
    if (ao!==bo) return ao-bo; // ที่ยังค้างขึ้นก่อน
    return (b.monthlyPayment*(b.totalInstallments-b.paidInstallments)) - (a.monthlyPayment*(a.totalInstallments-a.paidInstallments));
  });
  const credStat = (c) => {
    const total = Math.max(0, Math.round(Number(c.totalInstallments)||0));
    const paid  = Math.max(0, Math.min(Math.round(Number(c.paidInstallments)||0), total));
    const remain = total - paid;
    const monthly = Number(c.monthlyPayment)||0;
    const outstanding = monthly * remain;
    const totalRepay = monthly * total;
    const interest = Math.max(0, totalRepay - (Number(c.principal)||0));
    const pct = total>0 ? Math.round(paid/total*100) : 0;
    let nextDue = '';
    if (c.startDate && remain>0) { const d=new Date(c.startDate+'T00:00:00'); d.setMonth(d.getMonth()+paid); nextDue=d.toISOString().slice(0,10); }
    return { total, paid, remain, monthly, outstanding, totalRepay, interest, pct, nextDue, done: remain===0 && total>0 };
  };
  const credOutstandingTotal = creditors.reduce((s,c)=>s+credStat(c).outstanding, 0);
  const credMonthlyTotal = creditors.reduce((s,c)=>{ const st=credStat(c); return s + (st.remain>0 ? st.monthly : 0); }, 0);
  const payInstallment = (c) => {
    const st = credStat(c);
    if (st.remain<=0) return;
    app.updateCompanyCreditor(c.id, { paidInstallments: st.paid + 1 });
    app.pushToast(`บันทึกชำระงวดที่ ${st.paid+1}/${st.total} ของ ${c.creditor} แล้ว`);
  };

  const bounds = useMemo(() => {
    const d = new Date();
    if (range === 'year')  return { from: new Date(d.getFullYear(),0,1).toISOString().slice(0,10), to: new Date(d.getFullYear(),11,31).toISOString().slice(0,10) };
    if (range === 'month') return { from: selMonth + '-01', to: selMonth + '-31' };
    return { from: '0000-01-01', to: '9999-12-31' };
  }, [range, selMonth]);
  const inRange = (s) => s && s>=bounds.from && s<=bounds.to;

  const incomeRecs = (app.records||[]).filter(r=>window.isIncome(r) && inRange(r.date));
  const incomeGross = incomeRecs.reduce((s,r)=>s+computeTotals(r).total,0);
  const companyIncome = incomeGross * COMPANY_FEE_RATE;
  const expenses = (app.companyExpenses||[]).filter(e=>inRange(e.date)).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const expenseTotal = expenses.reduce((s,e)=>s+Number(e.amount||0),0);
  const loanOpexTotal = loanPaymentsByMonth(app.companyCreditors, bounds.from, bounds.to).total;
  const recData = recurringByMonth(app.companyRecurring, bounds.from, bounds.to);
  const recTotal = recData.total;
  const totalOpex = expenseTotal + loanOpexTotal + recTotal;   // ค่าดำเนินการรวม (รวมผ่อนเจ้าหนี้ + รายจ่ายประจำ)
  const profit = companyIncome - totalOpex;
  const colorOf = (n) => (app.companyExpenseCats||[]).find(c=>c.name===n)?.color || '#9ca3af';

  const byCat = useMemo(() => {
    const m = {};
    expenses.forEach(e=>{ const k=e.category||'—'; if(!m[k]) m[k]={name:k,color:colorOf(k),count:0,total:0}; m[k].count++; m[k].total+=Number(e.amount||0); });
    Object.entries(recData.byCat).forEach(([cat,amt])=>{ if(!m[cat]) m[cat]={name:cat,color:colorOf(cat),count:0,total:0}; m[cat].total+=amt; });
    if (loanOpexTotal > 0) m['ผ่อนเจ้าหนี้ / เงินกู้'] = { name:'ผ่อนเจ้าหนี้ / เงินกู้', color:'#dc2626', count:0, total:loanOpexTotal };
    return Object.values(m).sort((a,b)=>b.total-a.total);
  }, [expenses, app.companyExpenseCats, loanOpexTotal, recTotal]);


  const card = (label, value, sub, color, bg, border) => (
    <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:12, padding:'16px 18px' }}>
      <div style={{ fontSize:11, fontWeight:600, letterSpacing:.3, color, opacity:.85, marginBottom:6 }}>{label}</div>
      <div className="mono" style={{ fontSize:22, fontWeight:700, color, letterSpacing:-.5 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:4 }}>{sub}</div>}
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">บัญชีบริษัท</h1>
          <div className="page-sub">รายรับค่าดำเนินการ {(COMPANY_FEE_RATE*100).toFixed(0)}% (auto จากยอดรับลูกค้า) · รายจ่ายบริษัท · กำไร/ขาดทุน — เห็นเฉพาะผู้ดูแลระบบ</div>
        </div>
        <div className="row gap-8" style={{ flexWrap:'wrap' }}>
          <button className="btn btn-ghost" onClick={()=>setCatOpen(true)}><Icon name="tag" size={14}/> จัดการประเภท</button>
          <button className="btn btn-ghost" onClick={()=>setProfitOpen(true)} title="รายงานรวม รายรับจริง − ต้นทุน − ค่าดำเนินการ = กำไร/ขาดทุนรายเดือน"><Icon name="chart" size={14}/> รายงานกำไร/ขาดทุน</button>
          <button className="btn btn-ghost" onClick={()=>setReportOpen(true)}><Icon name="download" size={14}/> ส่งออกรายงาน</button>
          <button className="btn btn-ghost" onClick={()=>setExpReportOpen(true)} title="รายงานเฉพาะค่าใช้จ่าย (ไม่มีรายรับ/กำไร-ขาดทุน)"><Icon name="receipt" size={14}/> รายงานค่าใช้จ่าย</button>
          <button className="btn btn-ghost" onClick={()=>setRecModal({ open:true, initial:null })}><Icon name="clock" size={14}/> เพิ่มรายจ่ายประจำ</button>
          <button className="btn btn-ghost" onClick={()=>setCredModal({ open:true, initial:null })}><Icon name="safe" size={14}/> เพิ่มเจ้าหนี้</button>
          <button className="btn btn-accent" onClick={()=>setExpModal({ open:true, initial:null })}><Icon name="plus" size={14}/> เพิ่มรายจ่าย</button>
        </div>
      </div>

      <div className="card" style={{ display:'flex', flexDirection:'column', gap:18 }}>
        {/* ช่วงเวลา */}
        <div className="row gap-8" style={{ flexWrap:'wrap', alignItems:'center' }}>
          <button className={"btn btn-sm " + (range==='all'?'btn-accent':'btn-ghost')} onClick={()=>setRange('all')}>ทั้งหมด</button>
          <button className={"btn btn-sm " + (range==='year'?'btn-accent':'btn-ghost')} onClick={()=>setRange('year')}>ปีนี้</button>
          <div className="row gap-8" style={{ alignItems:'center', gap:6 }}>
            <button className={"btn btn-sm " + (range==='month'?'btn-accent':'btn-ghost')} onClick={()=>setRange('month')}>รายเดือน</button>
            <input type="month" className="select" value={selMonth} max={new Date().toISOString().slice(0,7)}
              onChange={e=>{ if(e.target.value){ setSelMonth(e.target.value); setRange('month'); } }}
              style={{ fontSize:13, padding:'6px 10px', borderColor: range==='month'?'var(--accent)':undefined, color: range==='month'?'var(--accent-ink)':undefined }} />
          </div>
        </div>

        {/* KPI */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12 }}>
          {card(`รายรับบริษัท (ค่าดำเนินการ ${(COMPANY_FEE_RATE*100).toFixed(0)}%)`, '฿'+fmt(companyIncome), `จากยอดรับลูกค้า ฿${fmt(incomeGross)} · ${incomeRecs.length} รายการ`, '#059669', 'rgba(5,150,105,0.07)', 'rgba(5,150,105,0.25)')}
          {card('รายจ่ายบริษัทรวม', '฿'+fmt(totalOpex), [`รายจ่าย ฿${fmt(expenseTotal)}`, recTotal>0?`ประจำ ฿${fmt(recTotal)}`:'', loanOpexTotal>0?`ผ่อนเจ้าหนี้ ฿${fmt(loanOpexTotal)}`:''].filter(Boolean).join(' + '), '#c2410c', 'rgba(217,119,6,0.07)', 'rgba(217,119,6,0.25)')}
          {card(profit>=0?'กำไรสุทธิ (รับ−จ่าย)':'ขาดทุนสุทธิ (รับ−จ่าย)', (profit<0?'−':'')+'฿'+fmt(Math.abs(profit)), profit>=0?'บริษัทมีกำไร':'บริษัทขาดทุน', profit>=0?'#059669':'#dc2626', profit>=0?'rgba(5,150,105,0.07)':'rgba(220,38,38,0.07)', profit>=0?'rgba(5,150,105,0.25)':'rgba(220,38,38,0.25)')}
        </div>

        {/* สรุปตามประเภท */}
        {byCat.length > 0 && (
          <div>
            <div className="text-small text-muted" style={{ marginBottom:8 }}>รายจ่ายแยกตามประเภท</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {byCat.map(c=>(
                <div key={c.name} className="row between" style={{ padding:'8px 10px', border:'1px solid var(--line)', borderRadius:8 }}>
                  <span className="row gap-8" style={{ alignItems:'center' }}>
                    <span style={{ width:11, height:11, borderRadius:'50%', background:c.color, display:'inline-block' }} />
                    {c.name} {c.count > 0 && <span className="text-small text-muted">· {c.count} รายการ</span>}
                  </span>
                  <span className="mono" style={{ fontWeight:600 }}>฿{fmt(c.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* รายการรายจ่าย */}
      <div className="card" style={{ marginTop:16 }}>
        <div className="row between" style={{ marginBottom:12, flexWrap:'wrap', gap:8 }}>
          <strong>รายการรายจ่ายบริษัท</strong>
          <span className="text-small text-muted">{expenses.length} รายการ · รวม <strong className="mono" style={{ color:'var(--ink-1)' }}>฿{fmt(expenseTotal)}</strong></span>
        </div>
        {expenses.length === 0 ? (
          <div className="empty">
            <div className="empty-illust"><Icon name="chart" size={28}/></div>
            <div className="empty-title">ยังไม่มีรายจ่ายบริษัท</div>
            <div className="empty-sub">กด "เพิ่มรายจ่าย" เพื่อบันทึกรายการแรก</div>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="table" style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ textAlign:'left', color:'var(--ink-3)', fontSize:12 }}>
                  <th style={{ padding:'8px 10px' }}>วันที่</th>
                  <th style={{ padding:'8px 10px' }}>ประเภท</th>
                  <th style={{ padding:'8px 10px' }}>หมายเหตุ</th>
                  <th style={{ padding:'8px 10px', textAlign:'right' }}>จำนวนเงิน</th>
                  <th style={{ padding:'8px 10px', width:80 }}></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e=>(
                  <tr key={e.id} style={{ borderTop:'1px solid var(--line)' }}>
                    <td style={{ padding:'9px 10px', whiteSpace:'nowrap' }}>{fmtDate(e.date)}</td>
                    <td style={{ padding:'9px 10px' }}>
                      <span className="row gap-8" style={{ alignItems:'center', whiteSpace:'nowrap' }}>
                        <span style={{ width:9, height:9, borderRadius:'50%', background:colorOf(e.category), display:'inline-block', flexShrink:0 }} />
                        {e.category||'—'}
                      </span>
                    </td>
                    <td style={{ padding:'9px 10px', color:'var(--ink-2)' }}>{e.note||'—'}</td>
                    <td style={{ padding:'9px 10px', textAlign:'right', fontWeight:600, whiteSpace:'nowrap' }} className="mono">฿{fmt(e.amount)}</td>
                    <td style={{ padding:'9px 10px' }}>
                      <div className="row gap-8" style={{ justifyContent:'flex-end' }}>
                        <button className="topbar-icon-btn" style={{ width:30, height:30 }} onClick={()=>setExpModal({ open:true, initial:e })} title="แก้ไข"><Icon name="edit" size={13}/></button>
                        <button className="topbar-icon-btn" style={{ width:30, height:30, color:'var(--danger)' }} onClick={()=>{ if(confirm('ลบรายจ่ายนี้?')){ app.deleteCompanyExpense(e.id); app.pushToast('ลบรายจ่ายแล้ว'); } }} title="ลบ"><Icon name="trash" size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* รายจ่ายประจำทุกเดือน */}
      <div className="card" style={{ marginTop:16 }}>
        <div className="row between" style={{ marginBottom:12, flexWrap:'wrap', gap:8 }}>
          <strong>รายจ่ายประจำ (ทุกเดือน)</strong>
          <span className="text-small text-muted">
            {(app.companyRecurring||[]).length} รายการ · รวม <strong className="mono" style={{ color:'#c2410c' }}>฿{fmt((app.companyRecurring||[]).reduce((s,r)=>s+Number(r.amount||0),0))}</strong>/เดือน
          </span>
        </div>
        {(app.companyRecurring||[]).length===0 ? (
          <div className="empty">
            <div className="empty-illust"><Icon name="clock" size={28}/></div>
            <div className="empty-title">ยังไม่มีรายจ่ายประจำ</div>
            <div className="empty-sub">กด "เพิ่มรายจ่ายประจำ" สำหรับค่าใช้จ่ายตายตัวทุกเดือน (ค่าเช่า เงินเดือน ฯลฯ)</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {(app.companyRecurring||[]).slice().sort((a,b)=>Number(b.amount)-Number(a.amount)).map(r=>(
              <div key={r.id} className="row between" style={{ padding:'10px 12px', border:'1px solid var(--line)', borderRadius:8, flexWrap:'wrap', gap:8 }}>
                <span className="row gap-8" style={{ alignItems:'center', minWidth:0 }}>
                  <span style={{ width:11, height:11, borderRadius:'50%', background:colorOf(r.category), display:'inline-block', flexShrink:0 }} />
                  <span style={{ fontWeight:600 }}>{r.category}</span>
                  <span className="text-small text-muted">· ตั้งแต่ {r.startDate?monthLabelTH(r.startDate.slice(0,7)):'—'}{r.endDate?` ถึง ${monthLabelTH(r.endDate.slice(0,7))}`:' (ต่อเนื่อง)'}{r.note?` · ${r.note}`:''}</span>
                </span>
                <span className="row gap-8" style={{ alignItems:'center', flexShrink:0 }}>
                  <span className="mono" style={{ fontWeight:700, color:'#c2410c' }}>฿{fmt(r.amount)}/เดือน</span>
                  <button className="topbar-icon-btn" style={{ width:30, height:30 }} onClick={()=>setRecModal({ open:true, initial:r })} title="แก้ไข"><Icon name="edit" size={13}/></button>
                  <button className="topbar-icon-btn" style={{ width:30, height:30, color:'var(--danger)' }} onClick={()=>{ if(confirm(`ลบรายจ่ายประจำ "${r.category}"?`)){ app.deleteCompanyRecurring(r.id); app.pushToast('ลบรายจ่ายประจำแล้ว'); } }} title="ลบ"><Icon name="trash" size={13}/></button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* เจ้าหนี้ / เงินกู้ */}
      <div className="card" style={{ marginTop:16 }}>
        <div className="row between" style={{ marginBottom:12, flexWrap:'wrap', gap:8 }}>
          <strong>เจ้าหนี้ / เงินกู้</strong>
          <span className="text-small text-muted">
            ยอดค้างชำระรวม <strong className="mono" style={{ color:'#dc2626' }}>฿{fmt(credOutstandingTotal)}</strong>
            {credMonthlyTotal>0 && <> · ต้องผ่อนรวม/เดือน <strong className="mono" style={{ color:'var(--ink-1)' }}>฿{fmt(credMonthlyTotal)}</strong></>}
          </span>
        </div>
        {creditors.length===0 ? (
          <div className="empty">
            <div className="empty-illust"><Icon name="safe" size={28}/></div>
            <div className="empty-title">ยังไม่มีเจ้าหนี้ / เงินกู้</div>
            <div className="empty-sub">กด "เพิ่มเจ้าหนี้" เพื่อบันทึกเงินกู้ที่นำมาหมุนในธุรกิจ</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {creditors.map(c=>{ const st=credStat(c); return (
              <div key={c.id} style={{ border:'1px solid var(--line)', borderRadius:10, padding:'12px 14px', opacity: st.done?0.7:1 }}>
                <div className="row between" style={{ flexWrap:'wrap', gap:8, alignItems:'flex-start' }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontWeight:600 }}>{c.creditor}{st.done && <span className="badge" style={{ marginLeft:8, background:'rgba(22,163,74,0.12)', color:'#16a34a' }}>ชำระครบแล้ว ✓</span>}</div>
                    <div className="text-small text-muted">
                      ยอดกู้ ฿{fmt(c.principal)} · ผ่อน ฿{fmt(st.monthly)}/เดือน · {st.total} งวด
                      {st.interest>0 && <> · ดอกเบี้ยรวม ~฿{fmt(st.interest)}</>}
                      {c.note && <> · {c.note}</>}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div className="text-small text-muted">ยอดค้าง</div>
                    <div className="mono" style={{ fontSize:18, fontWeight:700, color: st.done?'#16a34a':'#dc2626' }}>฿{fmt(st.outstanding)}</div>
                  </div>
                </div>
                <div style={{ margin:'10px 0 6px' }}>
                  <div className="text-small text-muted" style={{ marginBottom:4 }}>ชำระแล้ว {st.paid}/{st.total} งวด ({st.pct}%){st.nextDue && <> · งวดถัดไปครบกำหนด {fmtDate(st.nextDue)}</>}</div>
                  <div style={{ background:'var(--bg-2)', borderRadius:99, height:8, overflow:'hidden' }}>
                    <div style={{ height:8, borderRadius:99, background: st.done?'#16a34a':'var(--accent)', width: st.pct+'%' }} />
                  </div>
                </div>
                <div className="row gap-8" style={{ justifyContent:'flex-end', marginTop:8 }}>
                  {!st.done && <button className="btn btn-accent btn-sm" onClick={()=>payInstallment(c)}><Icon name="check" size={13}/> จ่ายงวดนี้</button>}
                  <button className="btn btn-ghost btn-sm" onClick={()=>setCredModal({ open:true, initial:c })}><Icon name="edit" size={13}/> แก้ไข</button>
                  <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }} onClick={()=>{ if(confirm(`ลบเจ้าหนี้ "${c.creditor}"?`)){ app.deleteCompanyCreditor(c.id); app.pushToast('ลบเจ้าหนี้แล้ว'); } }}><Icon name="trash" size={13}/> ลบ</button>
                </div>
              </div>
            ); })}
          </div>
        )}
      </div>

      <CompanyExpenseModal open={expModal.open} initial={expModal.initial} onClose={()=>setExpModal({ open:false, initial:null })} />
      <CompanyCatManagerModal open={catOpen} onClose={()=>setCatOpen(false)} />
      <CompanyReportModal open={reportOpen} onClose={()=>setReportOpen(false)} />
      <CompanyExpenseReportModal open={expReportOpen} onClose={()=>setExpReportOpen(false)} />
      <ProfitReportModal open={profitOpen} onClose={()=>setProfitOpen(false)} />
      <CreditorModal open={credModal.open} initial={credModal.initial} onClose={()=>setCredModal({ open:false, initial:null })} />
      <RecurringModal open={recModal.open} initial={recModal.initial} onClose={()=>setRecModal({ open:false, initial:null })} />
    </>
  );
};
