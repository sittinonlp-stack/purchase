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

// 'YYYY-MM' → ป้ายเดือนภาษาไทย เช่น "มิถุนายน 2569"
function monthLabelTH(ym) {
  if (!ym) return '';
  const [y, mo] = ym.split('-');
  return new Date(Number(y), Number(mo) - 1, 1)
    .toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
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
    // matRecs = material + machine + other (เหมือนกับ HistoryView "ทั้งหมด")
    const matRecs   = exp.filter(r => r.type === 'material' || r.type === 'machine' || r.type === 'other');
    // ค่าแรง/เหมาจ่าย — นับเฉพาะที่อนุมัติแล้ว
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
    const incomeTotal = incomeGross - incomeFee;      // ยอดรับสุทธิหลังหัก
    const incomeCount = incomeRecs.length;
    const netTotal    = incomeTotal - totalAmount;    // คงเหลือสุทธิ (รับหลังหัก − จ่าย)
    return { totalAmount, matCount, laborCount, matTotal, laborTotal, whtTotal, depositTotal, depositCount, incomeGross, incomeFee, incomeTotal, incomeCount, netTotal };
  }, [periodRecords]);

  // by-project chart (รายจ่ายจริงเท่านั้น)
  const byProject = useMemo(() => {
    const m = {};
    app.records.forEach((r) => {
      if (!isExpense(r)) return;
      if ((r.type === 'labor' || r.type === 'lump-labor') && !r.approved) return;
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
      if ((r.type === 'labor' || r.type === 'lump-labor') && !r.approved) return;
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
      if ((r.type === 'labor' || r.type === 'lump-labor') && !r.approved) return;
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
      if ((r.type === 'labor' || r.type === 'lump-labor') && !r.approved) return;
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

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-label">ยอดรับทั้งหมด (หักค่าดำเนินการ 15%)</div>
          <div className="stat-value mono" style={{ color:'#059669' }}>฿{fmt(stats.incomeTotal)}</div>
          <div className="stat-delta"><Icon name="money" size={11} stroke={2.5} /> รับจริง ฿{fmt(stats.incomeGross)} − ค่าดำเนินการ ฿{fmt(stats.incomeFee)}</div>
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
      title={posted ? 'ลงบัญชีแล้ว — คลิกเพื่อยกเลิก' : 'คลิกเพื่อทำเครื่องหมายว่าลงบัญชีแล้ว'}
      style={{
        width: 26, height: 26, borderRadius: 6, flexShrink: 0,
        border: posted ? '2px solid #059669' : '2px solid #d1d5db',
        background: posted ? '#059669' : '#fff',
        color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 150ms',
        fontSize: 15, fontWeight: 700, lineHeight: 1,
        padding: 0,
      }}
    >
      {posted ? '✓' : ''}
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
    app.updateRecord(record.id, { approved: !approved });
  };

  // non-admin: แสดงเฉพาะสถานะ ไม่ให้กด
  if (!app.isAdmin) {
    return (
      <div title={approved ? 'อนุมัติแล้ว' : 'รออนุมัติ'} style={{
        width: 26, height: 26, borderRadius: 6, flexShrink: 0,
        border: approved ? '2px solid #2563eb' : '2px solid #e5e7eb',
        background: approved ? '#2563eb' : '#f9fafb',
        color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, fontWeight: 700, lineHeight: 1,
        cursor: 'default',
      }}>
        {approved ? '✓' : ''}
      </div>
    );
  }

  return (
    <button
      onClick={toggle}
      title={approved ? 'อนุมัติแล้ว — คลิกเพื่อยกเลิก' : 'คลิกเพื่ออนุมัติ (Admin)'}
      style={{
        width: 26, height: 26, borderRadius: 6, flexShrink: 0,
        border: approved ? '2px solid #2563eb' : '2px solid #d1d5db',
        background: approved ? '#2563eb' : '#fff',
        color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 150ms',
        fontSize: 15, fontWeight: 700, lineHeight: 1,
        padding: 0,
      }}
    >
      {approved ? '✓' : ''}
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
  const eligible = record.approved && record.accountingPosted;

  // ยังไม่อนุมัติ+ลงบัญชี และยังไม่จ่าย → ยังจ่ายไม่ได้
  if (!eligible && !paid) {
    return <span style={{ fontSize: 11, color: 'var(--ink-4)' }} title="ต้องอนุมัติและลงบัญชีก่อนจึงบันทึกการจ่ายได้">—</span>;
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
        <button onClick={openModal} title={`จ่ายแล้ว ${fmtDate(record.paidDate)} — คลิกดู/แก้ไข`}
          style={{
            display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 1,
            padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
            border: '1.5px solid #059669', background: 'rgba(5,150,105,0.1)', color: '#059669',
            fontSize: 12, fontWeight: 600, lineHeight: 1.2,
          }}>
          <span>✓ จ่ายแล้ว</span>
          {record.paidDate && <span className="mono" style={{ fontSize: 10.5, fontWeight: 500 }}>{fmtDate(record.paidDate)}</span>}
        </button>
      ) : (
        <button onClick={openModal} title="บันทึกการจ่ายเงิน (แนบสลิป + วันที่โอน)"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
            border: '1.5px solid var(--accent)', background: 'var(--accent)', color: '#1f1d18',
            fontSize: 12.5, fontWeight: 600, lineHeight: 1,
          }}>
          <Icon name="money" size={13} /> จ่ายแล้ว
        </button>
      )}

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)} style={{ zIndex: 1100 }}>
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
        </div>
      )}
    </>
  );
}

function RecordsTable({ records, onOpen, showApprove = false, showPaid = false }) {
  const app = window.useApp();
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
            <th style={{ width: 44, textAlign: 'center' }} title="ลงบันทึกค่าใช้จ่ายในบัญชีแล้ว">
              <span style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.03em' }}>บัญชี</span>
            </th>
            {showApprove && (
              <th style={{ width: 52, textAlign: 'center' }} title="อนุมัติโดย Admin">
                <span style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.03em' }}>อนุมัติ</span>
              </th>
            )}
            <th className="hide-mobile" style={{ width: 130 }}>เลขที่</th>
            <th className="hide-mobile" style={{ width: 90 }}>วันที่</th>
            <th className="hide-mobile">โครงการ</th>
            <th>ผู้ขาย / รายการ</th>
            <th className="hide-mobile" style={{ width: 100 }}>ประเภท</th>
            <th className="hide-mobile" style={{ width: 160 }}>เอกสาร</th>
            <th style={{ width: 130 }} className="num">ยอดสุทธิ</th>
            {showPaid && <th style={{ width: 110, textAlign: 'center' }} title="สถานะการจ่ายเงินจริง">การจ่าย</th>}
          </tr>
        </thead>
        <tbody>
          {records.map((r) => {
            const proj = app.projects.find(p => p.id === r.projectId);
            const total = computeTotals(r).total;
            // row highlight: อนุมัติแล้ว = น้ำเงินอ่อน, ลงบัญชี = เขียวอ่อน, ทั้งคู่ = น้ำเงินอ่อน
            const rowBg = r.approved
              ? 'rgba(37,99,235,0.05)'
              : r.accountingPosted ? 'rgba(5,150,105,0.04)' : undefined;
            return (
              <tr key={r.id} onClick={() => onOpen(r.id)} style={{ background: rowBg }}>
                {/* ── Accounting checkbox ── */}
                <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                  <AccCheckbox record={r} />
                </td>
                {/* ── Approve checkbox (แสดงเฉพาะเมื่อ showApprove=true) ── */}
                {showApprove && (
                  <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <ApproveCheckbox record={r} />
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
                <td className="hide-mobile">
                  <div className="doc-mini">
                    {r.docs.map((d) => {
                      const doc = DOC_TYPES.find(x => x.id === d);
                      return <span key={d} className="badge">{doc?.label.replace('ใบ', '').trim()}</span>;
                    })}
                    {r.whtEnabled && <span className="badge amber">หัก {r.whtRate}%</span>}
                  </div>
                </td>
                <td className="num mono" style={{ fontWeight: 500 }}>{fmt(total)}</td>
                {showPaid && (
                  <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <PaidButton record={r} />
                  </td>
                )}
              </tr>
            );
          })}
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

  const filtered = useMemo(() => {
    // แสดงเฉพาะ material, machine, other — labor/lump-labor ย้ายไป LaborHistoryView
    // และไม่รวมรายรับ (income) ซึ่งมีหน้าประวัติของตัวเอง
    let arr = app.records.filter(r =>
      r.type !== 'quick-receipt' && r.type !== 'receipt' &&
      r.type !== 'tax-invoice'   && r.type !== 'invoice' &&
      r.type !== 'labor'         && r.type !== 'lump-labor' &&
      !window.isIncome(r)
    );
    if (typeFilter !== 'all') arr = arr.filter(r => r.type === typeFilter);
    if (projFilter !== 'all') arr = arr.filter(r => r.projectId === projFilter);
    if (accFilter === 'unposted') arr = arr.filter(r => !r.accountingPosted);
    if (accFilter === 'posted')   arr = arr.filter(r =>  r.accountingPosted);
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
  }, [app.records, q, typeFilter, projFilter, sortKey, accFilter]);

  const sum = filtered.reduce((s, r) => s + computeTotals(r).total, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">ประวัติทั้งหมด</h1>
          <div className="page-sub">เรียกดู ค้นหา และเปิดดูรายละเอียดบิลย้อนหลังได้ตลอดเวลา</div>
        </div>
        <div className="row gap-8">
          <button className="btn btn-ghost"><Icon name="download" size={14} /> ส่งออก Excel</button>
          <button className="btn btn-accent" onClick={() => app.setView('new-material')}>
            <Icon name="plus" size={14} stroke={2.5} /> บันทึกใหม่
          </button>
        </div>
      </div>

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
          <select className="select" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
            <option value="date-desc">วันที่ ใหม่ → เก่า</option>
            <option value="date-asc">วันที่ เก่า → ใหม่</option>
            <option value="amount-desc">ยอดเงิน มาก → น้อย</option>
            <option value="amount-asc">ยอดเงิน น้อย → มาก</option>
          </select>
          <select className="select" value={accFilter} onChange={(e) => setAccFilter(e.target.value)}
            style={{ borderColor: accFilter !== 'all' ? '#059669' : undefined, color: accFilter !== 'all' ? '#059669' : undefined }}>
            <option value="all">สถานะบัญชี: ทั้งหมด</option>
            <option value="unposted">ยังไม่ลงบัญชี</option>
            <option value="posted">ลงบัญชีแล้ว</option>
          </select>
          <div className="spacer"></div>
          <div className="text-small text-muted">
            พบ <strong style={{ color: 'var(--ink-1)' }} className="mono">{filtered.length}</strong> รายการ ·
            ยอดรวม <strong className="mono" style={{ color: 'var(--ink-1)' }}>฿{fmt(sum)}</strong>
          </div>
        </div>
        <RecordsTable records={filtered} onOpen={(id) => app.setDetailId(id)} />
      </div>
    </>
  );
};

// ---- Projects view ----
window.ProjectsView = function ProjectsView() {
  const app = window.useApp();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // project obj | null
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
                  {p.status === 'active'
                    ? <span className="badge green dot">ดำเนินการ</span>
                    : p.status === 'archived'
                    ? <span className="badge gray dot">เก็บถาวร</span>
                    : <span className="badge gray dot">ปิดแล้ว</span>}
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

  const renderList = (cats, which) => (
    <div className="col gap-8">
      {cats.map((c) => (
        <div key={c.id} className="row gap-12" style={{
          padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10,
          transition: 'border 200ms'
        }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--ink-3)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--line)'}
        >
          <span style={{ width: 14, height: 14, borderRadius: 4, background: c.color, flexShrink: 0 }}></span>
          <span style={{ flex: 1, fontWeight: 500, fontSize: 13.5 }}>{c.name}</span>
          <span className="badge gray mono">ใช้ {countByCat[c.id] || 0} ครั้ง</span>
          {/* ปุ่มแก้ไข — ทุกคนกดได้ */}
          <button className="topbar-icon-btn" style={{ width: 30, height: 30 }} title="แก้ไข"
            onClick={() => setEditCat({ cat: c, which })}>
            <Icon name="edit" size={13} />
          </button>
          {app.isAdmin && (
            <button className="topbar-icon-btn" style={{ width: 30, height: 30 }} title="ลบ"
              onClick={() => {
                if (countByCat[c.id]) { app.pushToast('ลบไม่ได้ — มีรายการใช้หมวดนี้อยู่', 'error'); return; }
                const fn = which === 'mach' ? app.deleteMachCat : which === 'labor' ? app.deleteLaborCat : which === 'lump-labor' ? app.deleteLumpLaborCat : which === 'other' ? app.deleteOtherCat : app.deleteMatCat;
                fn(c.id);
                app.pushToast('ลบหมวดหมู่แล้ว');
              }}>
              <Icon name="trash" size={13} />
            </button>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">หมวดหมู่</h1>
          <div className="page-sub">จัดการหมวดหมู่ของวัสดุและเครื่องจักร — เพิ่มได้ตามต้องการ</div>
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
          <div className="card-body">{renderList(app.matCats, 'mat')}</div>
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
          <div className="card-body">{renderList(app.machCats, 'mach')}</div>
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
          <div className="card-body">{renderList(app.laborCats, 'labor')}</div>
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
          <div className="card-body">{renderList(app.lumpLaborCats || [], 'lump-labor')}</div>
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
          <div className="card-body">{renderList(app.otherCats || [], 'other')}</div>
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
          <select className="select" value={sortKey} onChange={e => setSortKey(e.target.value)}>
            <option value="date-desc">วันที่ ใหม่ → เก่า</option>
            <option value="date-asc">วันที่ เก่า → ใหม่</option>
            <option value="amount-desc">ยอดเงิน มาก → น้อย</option>
            <option value="amount-asc">ยอดเงิน น้อย → มาก</option>
          </select>

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
window.DetailDrawer = function DetailDrawer() {
  const app = window.useApp();
  const rec = app.records.find(r => r.id === app.detailId);

  // Lightbox state — รูปไหน + ชุดรูปไหน
  const [lbImgs, setLbImgs] = useState([]);
  const [lbIdx,  setLbIdx]  = useState(-1);
  const openLb  = (images, idx) => { setLbImgs(images); setLbIdx(idx); };
  const closeLb = () => setLbIdx(-1);

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
            {(rec.type === 'receipt' || rec.type === 'tax-invoice' || rec.type === 'invoice') && (
              <button className="btn btn-ghost btn-sm" onClick={() => {
                const c = window.getCompanySettings();
                const titleLabel = rec.type === 'tax-invoice' ? 'ใบกำกับภาษี'
                  : rec.type === 'invoice' ? 'ใบแจ้งหนี้'
                  : 'ใบเสร็จ';
                const Component = rec.type === 'tax-invoice' ? window.PrintableTaxInvoice
                  : rec.type === 'invoice' ? window.PrintableInvoice
                  : window.PrintableReceipt;
                window.openPrintPopup(Component, titleLabel + ' ' + rec.docNo, rec, c, app);
              }} title="พิมพ์">
                <Icon name="download" size={13} /> พิมพ์
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
                : rec.type === 'receipt' ? 'new-receipt'
                : rec.type === 'tax-invoice' ? 'new-tax-invoice'
                : rec.type === 'invoice' ? 'new-invoice'
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
          {rec.note && (
            <div className="detail-row">
              <div className="label">หมายเหตุ</div>
              <div className="value">{rec.note}</div>
            </div>
          )}
        </div>

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

        {/* Items table — ซ่อนสำหรับ quick-receipt */}
        {!isQuickReceipt && <div className="detail-section">
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
            {rec.whtEnabled && <div className="summary-row"><span className="label">หัก ณ ที่จ่าย {rec.whtRate}%</span><span className="value" style={{ color: 'var(--danger)' }}>− {fmt(totals.wht)}</span></div>}
            {Number(rec.advanceDeduction) > 0 && <div className="summary-row"><span className="label" style={{ color: 'var(--warn)' }}>หักเบิกล่วงหน้า</span><span className="value" style={{ color: 'var(--warn)' }}>− {fmt(totals.advance)}</span></div>}
            {Number(rec.retentionDeduction) > 0 && <div className="summary-row"><span className="label" style={{ color: 'var(--info)' }}>หักเงินประกัน</span><span className="value" style={{ color: 'var(--info)' }}>− {fmt(totals.retention)}</span></div>}
            <div className="summary-row total"><span className="label">ยอดสุทธิ</span><span className="value">{fmt(totals.total)} บาท</span></div>
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
                  background: p.role === 'admin' ? '#d97706' : '#64748b',
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
                  background: p.role === 'admin' ? 'rgba(217,119,6,0.15)' : 'rgba(100,116,139,0.12)',
                  color: p.role === 'admin' ? '#d97706' : '#64748b',
                }}>
                  {p.role === 'admin' ? 'Admin' : 'User'}
                </span>

                {/* Actions (can't touch own account) */}
                {!isSelf(p) && (
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
function doExportPDF(records, projects, fromDate, toDate, projId, includeDetails) {
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

  // รายรับ — หักค่าดำเนินการ 15% + คงเหลือสุทธิ
  const incomeGross = incomeRecs.reduce((s,r)=>s+computeTotals(r).total,0);
  const incomeFee   = incomeGross * 0.15;
  const incomeNet   = incomeGross - incomeFee;
  const netBalance  = incomeNet - gNet;

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
      <td class="r">฿${fmtN(s.sub)}</td>
      <td class="r">฿${fmtN(s.vat)}</td>
      <td class="r">฿${fmtN(s.wht)}</td>
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

  const detailRows = !includeDetails ? '' : filtered.map((r,i)=>{
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
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}
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
</style></head><body>

<div class="no-print print-wrap">
  <button class="print-btn" onclick="window.print()">🖨️ พิมพ์ / บันทึกเป็น PDF</button>
  <p style="margin-top:10px;font-size:11px;color:#78716c">เลือก "บันทึกเป็น PDF" ในกล่องโต้ตอบการพิมพ์</p>
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
    <div class="kpi-label" style="color:#059669">ยอดรับสุทธิ (หักค่าดำเนินการ 15%)</div>
    <div class="kpi-value" style="color:#059669">฿${fmtN(incomeNet)}</div>
    <div class="kpi-sub">รับจริง ฿${fmtN(incomeGross)} − ค่าดำเนินการ ฿${fmtN(incomeFee)}</div>
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
  <div class="kpi">
    <div class="kpi-label">VAT / หัก ณ ที่จ่าย</div>
    <div class="kpi-value">฿${fmtN(gVat)}</div>
    <div class="kpi-sub">WHT ฿${fmtN(gWht)} · ก่อน VAT ฿${fmtN(gSub)}</div>
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
      <th style="width:180px">ประเภทรายการ</th>
      <th class="r" style="width:80px">จำนวน (บิล)</th>
      <th class="r">ยอดก่อน VAT</th>
      <th class="r">VAT</th>
      <th class="r">หัก ณ ที่จ่าย</th>
      <th class="r">ยอดสุทธิ</th>
    </tr></thead>
    <tbody>${typeRows}</tbody>
    <tfoot><tr>
      <td>รวมรายจ่ายทั้งหมด</td>
      <td class="r">${fmtI(expenseRecs.length)}</td>
      <td class="r">฿${fmtN(gSub)}</td>
      <td class="r">฿${fmtN(gVat)}</td>
      <td class="r">฿${fmtN(gWht)}</td>
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

${includeDetails && filtered.length > 0 ? `
<div class="page-break"></div>

<!-- SECTION 4: All records -->
<div class="section">
  <div class="section-header">
    <div class="section-num">4</div>
    <div class="section-title">รายการทั้งหมด (${filtered.length} รายการ)</div>
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
  <span>ระบบจัดซื้องานรับเหมาก่อสร้าง &nbsp;❖&nbsp; รายงานนี้สร้างโดยระบบอัตโนมัติ &nbsp;❖&nbsp; ${now}</span>
  <span>ช่วงเวลา ${fmtD(fromDate)} – ${fmtD(toDate)}</span>
</div>

<script>
  document.fonts && document.fonts.ready
    ? document.fonts.ready.then(()=>setTimeout(()=>window.print(),400))
    : setTimeout(()=>window.print(),1200);
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
          doExportPDF(app.records, app.projects, fromDate, toDate, projId, includeDetails);
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

// ---- Quick Receipt View (ถ่ายรูปใบเสร็จด่วน) ----
window.QuickReceiptView = function QuickReceiptView() {
  const app = window.useApp();
  const editRec = app.editingId ? app.records.find(r => r.id === app.editingId) : null;

  const [projectId, setProjectId] = useState(editRec?.projectId || app.projects[0]?.id || '');
  const [date,      setDate]      = useState(editRec?.date || todayStr());
  const [amount,    setAmount]    = useState(editRec?.items?.[0]?.price || 0);
  const [note,      setNote]      = useState(editRec?.note || '');
  const [images,    setImages]    = useState(editRec?.images || []);

  const cameraRef  = useRef(null);
  const galleryRef = useRef(null);

  // โหลดรูปจาก FileList → บีบอัด → base64
  const fromFiles = (fileList) => {
    const files = Array.from(fileList).slice(0, 20 - images.length);
    if (!files.length) return;
    Promise.all(files.map(async (f) => {
      const dataUrl = await window.compressImageFile(f);
      return { id: newId(), name: f.name, dataUrl: dataUrl || '' };
    })).then(arr => setImages(prev => [...prev, ...arr.filter(a => a.dataUrl)]));
  };

  const removeImage = (id) => setImages(prev => prev.filter(img => img.id !== id));

  const handleCancel = () => {
    if (app.editingId) app.setEditingId(null);
    app.setView('receipts');
  };

  const handleSave = () => {
    if (!projectId) return app.pushToast('กรุณาเลือกโครงการ', 'warn');
    if (images.length === 0) return app.pushToast('กรุณาถ่ายรูปหรือเลือกรูปอย่างน้อย 1 รูป', 'warn');

    const ts = Date.now().toString(36).toUpperCase();
    // เก็บจำนวนเงินเป็น item เดียว เพื่อให้ computeTotals คำนวณถูก
    const amountNum = Number(amount) || 0;
    const patch = {
      type: 'quick-receipt',
      date, projectId, note, images,
      items: amountNum > 0
        ? [{ id: newId(), name: 'ยอดค่าใช้จ่าย', qty: 1, unit: 'รายการ', price: amountNum, categoryId: '' }]
        : [],
      docs: [], vendor: 'บิลด่วน',
      vatMode: 'exclusive', vatRate: 0,
      whtEnabled: false, whtRate: 0,
      advanceDeduction: 0, retentionDeduction: 0,
      depositAmount: 0, depositStatus: 'none',
      workLogs: [], workerTeamId: null,
    };

    if (app.editingId) {
      app.updateRecord(app.editingId, patch);
      app.pushToast('แก้ไขบิลด่วนแล้ว');
      app.setEditingId(null);
    } else {
      app.addRecord({ ...patch, docNo: `QR-${date.replace(/-/g, '')}-${ts}` });
      app.pushToast('บันทึกบิลด่วนแล้ว 📸');
    }
    app.setView('receipts');
  };

  const isEditing = !!app.editingId;
  const proj = app.projects.find(p => p.id === projectId);

  return (
    <div className="qr-page">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">{isEditing ? 'แก้ไขบิลด่วน' : 'ถ่ายรูปใบเสร็จ'}</h1>
          <div className="page-sub">บันทึกบิลด่วนจากมือถือ — เลือกโครงการ วันที่ แล้วถ่ายรูปใบเสร็จ</div>
        </div>
      </div>

      <div className="qr-body">
        {/* Project + Date */}
        <div className="form-grid">
          <div className="field">
            <label className="field-label">
              โครงการ <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <select className="input" value={projectId} onChange={e => setProjectId(e.target.value)}>
              <option value="">— เลือกโครงการ —</option>
              {app.projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {proj && (
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6, fontSize:12, color:'var(--ink-3)' }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:proj.color, flexShrink:0 }}></span>
                {proj.code}
              </div>
            )}
          </div>
          <div className="field">
            <label className="field-label">วันที่</label>
            <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        {/* Amount field */}
        <div className="field">
          <label className="field-label">จำนวนเงิน (ไม่บังคับ)</label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              fontSize: 14, fontWeight: 600, color: 'var(--ink-3)', pointerEvents: 'none',
            }}>฿</span>
            <input
              className="input mono"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount || ''}
              onChange={e => setAmount(e.target.value)}
              style={{ paddingLeft: 30 }}
            />
          </div>
          {Number(amount) > 0 && (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
              ยอด: <strong className="mono" style={{ color: 'var(--ink-1)' }}>฿{fmt(Number(amount))}</strong>
            </div>
          )}
        </div>

        {/* Camera zone */}
        <div className="qr-zone">
          <div className="qr-zone-header">
            <Icon name="camera" size={15} stroke={1.75} />
            <span>รูปใบเสร็จ / หลักฐาน</span>
            <span className="badge gray mono" style={{ marginLeft:'auto' }}>{images.length}/20</span>
          </div>

          {images.length === 0 ? (
            /* Empty — ปุ่มใหญ่ชัดเจนสำหรับมือถือ */
            <div className="qr-empty">
              <div className="qr-empty-icon">
                <Icon name="camera" size={52} stroke={1} />
              </div>
              <div className="qr-empty-label">ยังไม่มีรูป</div>
              <div className="qr-empty-sub">ถ่ายรูปใบเสร็จ หรือเลือกจากแกลเลอรี</div>
              <div className="qr-btn-group">
                <button className="btn qr-cam-btn" type="button" onClick={() => cameraRef.current?.click()}>
                  <Icon name="camera" size={18} stroke={1.75} /> ถ่ายรูป
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => galleryRef.current?.click()}>
                  <Icon name="image" size={16} /> เลือกจากแกลเลอรี
                </button>
              </div>
            </div>
          ) : (
            /* รูปที่เพิ่มแล้ว */
            <div className="qr-photos-wrap">
              <div className="qr-photo-grid">
                {images.map(img => (
                  <div key={img.id} className="qr-photo-tile">
                    <img src={imgSrc(img)} alt={img.name} />
                    <button className="qr-remove-btn" type="button" onClick={() => removeImage(img.id)} title="ลบรูปนี้">
                      <Icon name="x" size={11} stroke={2.5} />
                    </button>
                  </div>
                ))}
                {images.length < 20 && (
                  <button className="qr-add-tile" type="button" onClick={() => cameraRef.current?.click()}>
                    <Icon name="camera" size={22} stroke={1.5} />
                    <span>ถ่ายเพิ่ม</span>
                  </button>
                )}
              </div>
              <button className="btn btn-ghost btn-sm" type="button"
                style={{ alignSelf:'flex-start', marginTop:10 }}
                onClick={() => galleryRef.current?.click()}>
                <Icon name="image" size={13} /> เพิ่มจากแกลเลอรี
              </button>
            </div>
          )}
        </div>

        {/* Note */}
        <div className="field">
          <label className="field-label">หมายเหตุ (ไม่บังคับ)</label>
          <input className="input"
            placeholder="เช่น ปูน 50 ถุง, ค่าส่งของ, วัสดุสำหรับห้อง 3..."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        {/* Validation hint */}
        {images.length === 0 && (
          <div style={{
            display:'flex', alignItems:'center', gap:8, padding:'10px 14px',
            background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.25)',
            borderRadius:10, fontSize:12.5, color:'#b45309',
          }}>
            <Icon name="bell" size={13} />
            ต้องมีรูปอย่างน้อย 1 รูปจึงจะบันทึกได้
          </div>
        )}

        {/* Action buttons */}
        <div className="row gap-10" style={{ marginTop: 8 }}>
          <button className="btn btn-ghost" type="button" onClick={handleCancel}>
            ยกเลิก
          </button>
          <button
            className="btn btn-accent"
            type="button"
            style={{ flex:1, justifyContent:'center', padding:'12px 24px', fontSize:15, gap:8 }}
            onClick={handleSave}
            disabled={!projectId || images.length === 0}
          >
            <Icon name="save" size={18} stroke={1.75} />
            {isEditing
              ? 'บันทึกการแก้ไข'
              : `บันทึกบิลด่วน${images.length > 0 ? ` (${images.length} รูป)` : ''}`}
          </button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        style={{ display:'none' }}
        onChange={e => { if (e.target.files?.length) fromFiles(e.target.files); e.target.value = ''; }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display:'none' }}
        onChange={e => { if (e.target.files?.length) fromFiles(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
};

// ---- Receipts View (รูปถ่ายใบเสร็จ — แยกจาก History) ----
window.ReceiptsView = function ReceiptsView() {
  const app = window.useApp();
  const [projFilter, setProjFilter] = useState('all');
  const [sortKey,    setSortKey]    = useState('date-desc');

  const receipts = useMemo(() => {
    let arr = app.records.filter(r => r.type === 'quick-receipt');
    if (projFilter !== 'all') arr = arr.filter(r => r.projectId === projFilter);
    arr.sort((a, b) => {
      if (sortKey === 'date-desc') return (b.date || '').localeCompare(a.date || '');
      if (sortKey === 'date-asc')  return (a.date || '').localeCompare(b.date || '');
      if (sortKey === 'amount-desc') return computeTotals(b).total - computeTotals(a).total;
      if (sortKey === 'amount-asc')  return computeTotals(a).total - computeTotals(b).total;
      return 0;
    });
    return arr;
  }, [app.records, projFilter, sortKey]);

  const totalAmount  = receipts.reduce((s, r) => s + computeTotals(r).total, 0);
  const totalPhotos  = receipts.reduce((s, r) => s + (r.images || []).length, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">รูปถ่ายใบเสร็จ</h1>
          <div className="page-sub">บิลด่วนจากมือถือ — {receipts.length} รายการ · {totalPhotos} รูป</div>
        </div>
        <button className="btn btn-accent" onClick={() => app.setView('quick-receipt')}>
          <Icon name="camera" size={14} stroke={1.75} /> ถ่ายรูปใหม่
        </button>
      </div>

      {/* Stats */}
      {receipts.length > 0 && (
        <div className="stat-grid" style={{ marginBottom: 20 }}>
          <div className="stat">
            <div className="stat-label">รายการทั้งหมด</div>
            <div className="stat-value mono">{fmtInt(receipts.length)}</div>
            <div className="stat-icon" style={{ background:'rgba(14,165,233,0.1)', color:'#0ea5e9' }}>
              <Icon name="receipt" size={18} />
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">ยอดรวมทั้งหมด</div>
            <div className="stat-value mono">฿{fmt(totalAmount)}</div>
            <div className="stat-icon" style={{ background:'rgba(14,165,233,0.1)', color:'#0ea5e9' }}>
              <Icon name="money" size={18} />
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">รูปถ่ายทั้งหมด</div>
            <div className="stat-value mono">{fmtInt(totalPhotos)}</div>
            <div className="stat-icon" style={{ background:'rgba(14,165,233,0.1)', color:'#0ea5e9' }}>
              <Icon name="image" size={18} />
            </div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <select className="select" value={projFilter} onChange={e => setProjFilter(e.target.value)}>
          <option value="all">ทุกโครงการ</option>
          {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="select" value={sortKey} onChange={e => setSortKey(e.target.value)}>
          <option value="date-desc">วันที่ ใหม่ → เก่า</option>
          <option value="date-asc">วันที่ เก่า → ใหม่</option>
          <option value="amount-desc">ยอดเงิน มาก → น้อย</option>
          <option value="amount-asc">ยอดเงิน น้อย → มาก</option>
        </select>
        <div className="spacer" />
        <div className="text-small text-muted">
          พบ <strong className="mono" style={{ color:'var(--ink-1)' }}>{receipts.length}</strong> รายการ
          {totalAmount > 0 && <> · ฿<strong className="mono" style={{ color:'var(--ink-1)' }}>{fmt(totalAmount)}</strong></>}
        </div>
      </div>

      {/* Empty state */}
      {receipts.length === 0 ? (
        <div className="empty">
          <div className="empty-illust" style={{ color:'#0ea5e9' }}><Icon name="camera" size={32} /></div>
          <div className="empty-title">ยังไม่มีรูปถ่ายใบเสร็จ</div>
          <div className="empty-sub">กดปุ่มกล้องด้านล่างขวา หรือกด "ถ่ายรูปใหม่" เพื่อบันทึกบิลด่วน</div>
          <button className="btn btn-accent" style={{ marginTop:16 }} onClick={() => app.setView('quick-receipt')}>
            <Icon name="camera" size={14} /> ถ่ายรูปใหม่
          </button>
        </div>
      ) : (
        /* Card grid */
        <div className="receipts-grid">
          {receipts.map(r => {
            const proj  = app.projects.find(p => p.id === r.projectId);
            const total = computeTotals(r).total;
            const imgs  = r.images || [];
            const thumb = imgs[0];

            return (
              <div key={r.id} className="receipt-card"
                style={{ outline: r.accountingPosted ? '2px solid rgba(5,150,105,0.35)' : undefined }}
                onClick={() => app.setDetailId(r.id)}>
                {/* Thumbnail */}
                <div className="rc-photo">
                  {thumb
                    ? <img src={imgSrc(thumb)} alt="ใบเสร็จ" />
                    : <div className="rc-no-photo"><Icon name="camera" size={26} stroke={1.25} /></div>}
                  {imgs.length > 1 && (
                    <span className="rc-count">+{imgs.length - 1}</span>
                  )}
                </div>

                {/* Info */}
                <div className="rc-info">
                  <div className="rc-date">{fmtDate(r.date)}</div>
                  {proj && (
                    <div className="rc-proj">
                      <span style={{ width:7, height:7, borderRadius:'50%', background:proj.color, display:'inline-block', flexShrink:0 }} />
                      <span className="rc-proj-name">{proj.name}</span>
                    </div>
                  )}
                  {total > 0 ? (
                    <div className="rc-amount">฿{fmt(total)}</div>
                  ) : (
                    <div className="rc-amount-none">ไม่ระบุยอด</div>
                  )}
                  {r.note && <div className="rc-note">{r.note}</div>}

                  {/* ── Accounting toggle ── */}
                  <button
                    onClick={(e) => { e.stopPropagation(); app.updateRecord(r.id, { accountingPosted: !r.accountingPosted }); }}
                    title={r.accountingPosted ? 'ลงบัญชีแล้ว — คลิกเพื่อยกเลิก' : 'คลิกเพื่อทำเครื่องหมายว่าลงบัญชีแล้ว'}
                    style={{
                      marginTop: 8,
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '3px 9px 3px 6px',
                      borderRadius: 20,
                      border: r.accountingPosted ? '1.5px solid #059669' : '1.5px solid #d1d5db',
                      background: r.accountingPosted ? 'rgba(5,150,105,0.1)' : '#fff',
                      color: r.accountingPosted ? '#059669' : '#9ca3af',
                      fontSize: 11.5, fontWeight: r.accountingPosted ? 600 : 400,
                      cursor: 'pointer', transition: 'all 150ms',
                    }}
                  >
                    <span style={{
                      width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                      border: r.accountingPosted ? 'none' : '1.5px solid #d1d5db',
                      background: r.accountingPosted ? '#059669' : 'transparent',
                      color: '#fff', fontSize: 11, fontWeight: 700,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}>{r.accountingPosted ? '✓' : ''}</span>
                    {r.accountingPosted ? 'ลงบัญชีแล้ว' : 'ยังไม่ลงบัญชี'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

// ============================================================
// ReceiptsListView — ประวัติใบเสร็จรับเงิน (แยกจาก HistoryView)
// แสดงเฉพาะ type === 'receipt'
// ============================================================
window.ReceiptsListView = function ReceiptsListView() {
  const app = window.useApp();
  const [q, setQ] = useState('');
  const [projFilter, setProjFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [sortKey, setSortKey] = useState('date-desc');

  // เฉพาะใบเสร็จ
  const allReceipts = useMemo(() =>
    app.records.filter(r => r.type === 'receipt'), [app.records]);

  // โครงการที่เคยมีใบเสร็จ — สำหรับ dropdown
  const usedProjects = useMemo(() => {
    const ids = new Set(allReceipts.map(r => r.projectId).filter(Boolean));
    return app.projects.filter(p => ids.has(p.id));
  }, [allReceipts, app.projects]);

  // filtered + sorted
  const filtered = useMemo(() => {
    let arr = allReceipts;
    if (projFilter !== 'all')     arr = arr.filter(r => r.projectId === projFilter);
    if (paymentFilter !== 'all')  arr = arr.filter(r => (r.meta?.paymentMethod || 'cash') === paymentFilter);
    if (q.trim()) {
      const s = q.toLowerCase();
      arr = arr.filter(r =>
        (r.docNo || '').toLowerCase().includes(s) ||
        (r.vendor || '').toLowerCase().includes(s) ||
        (r.meta?.customerTaxId || '').toLowerCase().includes(s) ||
        (r.items || []).some(i => (i.name || '').toLowerCase().includes(s))
      );
    }
    return [...arr].sort((a, b) => {
      if (sortKey === 'date-desc') return (b.date || '').localeCompare(a.date || '');
      if (sortKey === 'date-asc')  return (a.date || '').localeCompare(b.date || '');
      if (sortKey === 'amount-desc') return computeTotals(b).total - computeTotals(a).total;
      if (sortKey === 'amount-asc')  return computeTotals(a).total - computeTotals(b).total;
      return 0;
    });
  }, [allReceipts, q, projFilter, paymentFilter, sortKey]);

  const totalAmount = filtered.reduce((s, r) => s + computeTotals(r).total, 0);
  const grandTotal  = allReceipts.reduce((s, r) => s + computeTotals(r).total, 0);

  // นับวิธีชำระเงิน
  const paymentStats = useMemo(() => {
    const m = { cash: 0, transfer: 0, cheque: 0, credit: 0 };
    allReceipts.forEach(r => {
      const k = r.meta?.paymentMethod || 'cash';
      if (m[k] !== undefined) m[k]++;
    });
    return m;
  }, [allReceipts]);

  const PAY_LABEL = { cash: 'เงินสด', transfer: 'โอนเงิน', cheque: 'เช็ค', credit: 'เครดิต' };

  // นับเดือนนี้
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthReceipts = allReceipts.filter(r => (r.date || '').slice(0, 7) === thisMonth);
  const monthTotal = monthReceipts.reduce((s, r) => s + computeTotals(r).total, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">ประวัติใบเสร็จรับเงิน</h1>
          <div className="page-sub">ใบเสร็จที่ออกให้ลูกค้าทั้งหมด · ค้นหา ดู แก้ไข และพิมพ์</div>
        </div>
        <div className="row gap-8">
          <button className="btn btn-accent" onClick={() => app.setView('new-receipt')}>
            <Icon name="plus" size={14} stroke={2.5} /> ออกใบเสร็จใหม่
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat">
          <div className="stat-icon" style={{ background: 'rgba(5,150,105,0.12)', color: '#059669' }}>
            <Icon name="receipt" size={16} />
          </div>
          <div className="stat-label">ใบเสร็จทั้งหมด</div>
          <div className="stat-value mono">{allReceipts.length}</div>
          <div className="stat-change positive">ยอดรวม ฿{fmt(grandTotal)}</div>
        </div>
        <div className="stat">
          <div className="stat-icon" style={{ background: 'rgba(217,119,6,0.12)', color: 'var(--accent)' }}>
            <Icon name="calendar" size={16} />
          </div>
          <div className="stat-label">เดือนนี้</div>
          <div className="stat-value mono">{monthReceipts.length}</div>
          <div className="stat-change neutral">฿{fmt(monthTotal)}</div>
        </div>
        <div className="stat">
          <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}>
            <Icon name="money" size={16} />
          </div>
          <div className="stat-label">เงินสด / โอน</div>
          <div className="stat-value mono">{paymentStats.cash} / {paymentStats.transfer}</div>
          <div className="stat-change neutral">รายการ</div>
        </div>
        <div className="stat">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
            <Icon name="clipboard" size={16} />
          </div>
          <div className="stat-label">เช็ค / เครดิต</div>
          <div className="stat-value mono">{paymentStats.cheque} / {paymentStats.credit}</div>
          <div className="stat-change neutral">รายการ</div>
        </div>
      </div>

      {/* Filter + table */}
      <div className="card">
        <div className="filter-bar">
          {/* วิธีชำระ tabs */}
          <div className="tabs">
            <button className={'tab' + (paymentFilter === 'all'      ? ' active' : '')} onClick={() => setPaymentFilter('all')}>
              ทั้งหมด <span className="badge gray mono">{allReceipts.length}</span>
            </button>
            <button className={'tab' + (paymentFilter === 'cash'     ? ' active' : '')} onClick={() => setPaymentFilter('cash')}>
              เงินสด
            </button>
            <button className={'tab' + (paymentFilter === 'transfer' ? ' active' : '')} onClick={() => setPaymentFilter('transfer')}>
              โอนเงิน
            </button>
            <button className={'tab' + (paymentFilter === 'cheque'   ? ' active' : '')} onClick={() => setPaymentFilter('cheque')}>
              เช็ค
            </button>
            <button className={'tab' + (paymentFilter === 'credit'   ? ' active' : '')} onClick={() => setPaymentFilter('credit')}>
              เครดิต
            </button>
          </div>

          <div className="topbar-search" style={{ width: 280, margin: 0 }}>
            <Icon name="search" size={14} />
            <input placeholder="ค้นหา: เลขที่, ลูกค้า, Tax ID, รายการ"
              value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          <select className="select" value={projFilter} onChange={(e) => setProjFilter(e.target.value)}>
            <option value="all">ทุกโครงการ ({usedProjects.length})</option>
            {usedProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <select className="select" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
            <option value="date-desc">วันที่ ใหม่ → เก่า</option>
            <option value="date-asc">วันที่ เก่า → ใหม่</option>
            <option value="amount-desc">ยอดเงิน มาก → น้อย</option>
            <option value="amount-asc">ยอดเงิน น้อย → มาก</option>
          </select>

          <div className="spacer" />
          <div className="text-small text-muted">
            พบ <strong className="mono" style={{ color: 'var(--ink-1)' }}>{filtered.length}</strong> ใบ ·
            ยอดรวม <strong className="mono" style={{ color: 'var(--ink-1)' }}>฿{fmt(totalAmount)}</strong>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-illust"><Icon name="receipt" size={28} /></div>
            <div className="empty-title">
              {allReceipts.length === 0 ? 'ยังไม่มีใบเสร็จ' : 'ไม่พบใบเสร็จที่ตรงกับตัวกรอง'}
            </div>
            <div className="empty-sub">
              {allReceipts.length === 0
                ? 'กดปุ่ม "ออกใบเสร็จใหม่" เพื่อเริ่มต้น'
                : 'ลองล้างตัวกรองหรือเปลี่ยนคำค้นหา'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="history-table">
              <thead>
                <tr>
                  <th style={{ width: 130 }}>เลขที่</th>
                  <th style={{ width: 100 }}>วันที่</th>
                  <th>ลูกค้า</th>
                  <th>โครงการ</th>
                  <th style={{ width: 110 }}>วิธีชำระ</th>
                  <th style={{ width: 130 }} className="num">ยอดรับ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const proj = app.projects.find(p => p.id === r.projectId);
                  const total = computeTotals(r).total;
                  const pm = r.meta?.paymentMethod || 'cash';
                  return (
                    <tr key={r.id} onClick={() => app.setDetailId(r.id)}>
                      <td className="mono" style={{ fontSize: 12.5, fontWeight: 500 }}>{r.docNo}</td>
                      <td style={{ color: 'var(--ink-2)' }}>{fmtDate(r.date)}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{r.vendor || '—'}</div>
                        {r.meta?.customerTaxId && (
                          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                            {r.meta.customerTaxId}
                          </div>
                        )}
                      </td>
                      <td>
                        {proj ? (
                          <div className="row gap-8">
                            <span className="proj-chip-dot" style={{ background: proj.color }}></span>
                            <span style={{ fontSize: 13 }}>{proj.name}</span>
                          </div>
                        ) : <span style={{ color: 'var(--ink-4)' }}>—</span>}
                      </td>
                      <td>
                        <span className="badge gray">{PAY_LABEL[pm] || pm}</span>
                      </td>
                      <td className="num mono" style={{ fontWeight: 600, color: '#059669' }}>
                        {fmt(total)}
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

// ============================================================
// TaxInvoicesListView — ประวัติใบเสร็จ/ใบกำกับภาษี (มี VAT)
// ============================================================
window.TaxInvoicesListView = function TaxInvoicesListView() {
  const app = window.useApp();
  const [q, setQ] = useState('');
  const [projFilter, setProjFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [sortKey, setSortKey] = useState('date-desc');

  const allInvoices = useMemo(() =>
    app.records.filter(r => r.type === 'tax-invoice'), [app.records]);

  const usedProjects = useMemo(() => {
    const ids = new Set(allInvoices.map(r => r.projectId).filter(Boolean));
    return app.projects.filter(p => ids.has(p.id));
  }, [allInvoices, app.projects]);

  const filtered = useMemo(() => {
    let arr = allInvoices;
    if (projFilter !== 'all')    arr = arr.filter(r => r.projectId === projFilter);
    if (paymentFilter !== 'all') arr = arr.filter(r => (r.meta?.paymentMethod || 'cash') === paymentFilter);
    if (q.trim()) {
      const s = q.toLowerCase();
      arr = arr.filter(r =>
        (r.docNo || '').toLowerCase().includes(s) ||
        (r.vendor || '').toLowerCase().includes(s) ||
        (r.meta?.customerTaxId || '').toLowerCase().includes(s) ||
        (r.items || []).some(i => (i.name || '').toLowerCase().includes(s))
      );
    }
    return [...arr].sort((a, b) => {
      if (sortKey === 'date-desc')   return (b.date || '').localeCompare(a.date || '');
      if (sortKey === 'date-asc')    return (a.date || '').localeCompare(b.date || '');
      if (sortKey === 'amount-desc') return computeTotals(b).total - computeTotals(a).total;
      if (sortKey === 'amount-asc')  return computeTotals(a).total - computeTotals(b).total;
      return 0;
    });
  }, [allInvoices, q, projFilter, paymentFilter, sortKey]);

  // VAT รวม — สำหรับยื่นภาษี
  const vatStats = useMemo(() => {
    const arr = filtered.map(r => computeTotals(r));
    return {
      subTotal: arr.reduce((s, t) => s + t.subTotal, 0),
      vatSum:   arr.reduce((s, t) => s + t.vat, 0),
      total:    arr.reduce((s, t) => s + t.total, 0),
    };
  }, [filtered]);

  const grandVatSum = useMemo(() =>
    allInvoices.reduce((s, r) => s + computeTotals(r).vat, 0), [allInvoices]);
  const grandTotal  = useMemo(() =>
    allInvoices.reduce((s, r) => s + computeTotals(r).total, 0), [allInvoices]);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthInvoices = allInvoices.filter(r => (r.date || '').slice(0, 7) === thisMonth);
  const monthVat = monthInvoices.reduce((s, r) => s + computeTotals(r).vat, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">ประวัติใบเสร็จ/ใบกำกับภาษี</h1>
          <div className="page-sub">ใบกำกับภาษีที่ออกให้ลูกค้า · พร้อมยอด VAT รวมสำหรับยื่นภาษี</div>
        </div>
        <div className="row gap-8">
          <button className="btn btn-accent" onClick={() => app.setView('new-tax-invoice')}>
            <Icon name="plus" size={14} stroke={2.5} /> ออกใบกำกับภาษีใหม่
          </button>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat">
          <div className="stat-icon" style={{ background: 'rgba(146,64,14,0.12)', color: '#92400e' }}>
            <Icon name="receipt" size={16} />
          </div>
          <div className="stat-label">ใบกำกับภาษีทั้งหมด</div>
          <div className="stat-value mono">{allInvoices.length}</div>
          <div className="stat-change positive">฿{fmt(grandTotal)}</div>
        </div>
        <div className="stat">
          <div className="stat-icon" style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626' }}>
            <Icon name="percent" size={16} />
          </div>
          <div className="stat-label">VAT รวม (ทั้งหมด)</div>
          <div className="stat-value mono">฿{fmt(grandVatSum)}</div>
          <div className="stat-change neutral">ยื่นภาษีขาย</div>
        </div>
        <div className="stat">
          <div className="stat-icon" style={{ background: 'rgba(217,119,6,0.12)', color: 'var(--accent)' }}>
            <Icon name="calendar" size={16} />
          </div>
          <div className="stat-label">VAT เดือนนี้</div>
          <div className="stat-value mono">฿{fmt(monthVat)}</div>
          <div className="stat-change neutral">{monthInvoices.length} ใบ</div>
        </div>
        <div className="stat">
          <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}>
            <Icon name="money" size={16} />
          </div>
          <div className="stat-label">ยอดที่กรองอยู่</div>
          <div className="stat-value mono">฿{fmt(vatStats.total)}</div>
          <div className="stat-change neutral">VAT ฿{fmt(vatStats.vatSum)}</div>
        </div>
      </div>

      <div className="card">
        <div className="filter-bar">
          <div className="tabs">
            <button className={'tab' + (paymentFilter === 'all'      ? ' active' : '')} onClick={() => setPaymentFilter('all')}>
              ทั้งหมด <span className="badge gray mono">{allInvoices.length}</span>
            </button>
            <button className={'tab' + (paymentFilter === 'cash'     ? ' active' : '')} onClick={() => setPaymentFilter('cash')}>เงินสด</button>
            <button className={'tab' + (paymentFilter === 'transfer' ? ' active' : '')} onClick={() => setPaymentFilter('transfer')}>โอนเงิน</button>
            <button className={'tab' + (paymentFilter === 'cheque'   ? ' active' : '')} onClick={() => setPaymentFilter('cheque')}>เช็ค</button>
            <button className={'tab' + (paymentFilter === 'credit'   ? ' active' : '')} onClick={() => setPaymentFilter('credit')}>เครดิต</button>
          </div>

          <div className="topbar-search" style={{ width: 280, margin: 0 }}>
            <Icon name="search" size={14} />
            <input placeholder="ค้นหา: เลขที่, ลูกค้า, Tax ID, รายการ"
              value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          <select className="select" value={projFilter} onChange={(e) => setProjFilter(e.target.value)}>
            <option value="all">ทุกโครงการ ({usedProjects.length})</option>
            {usedProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <select className="select" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
            <option value="date-desc">วันที่ ใหม่ → เก่า</option>
            <option value="date-asc">วันที่ เก่า → ใหม่</option>
            <option value="amount-desc">ยอดเงิน มาก → น้อย</option>
            <option value="amount-asc">ยอดเงิน น้อย → มาก</option>
          </select>

          <div className="spacer" />
          <div className="text-small text-muted">
            <strong className="mono" style={{ color: 'var(--ink-1)' }}>{filtered.length}</strong> ใบ ·
            ก่อนภาษี <strong className="mono" style={{ color: 'var(--ink-1)' }}>฿{fmt(vatStats.subTotal)}</strong> ·
            VAT <strong className="mono" style={{ color: '#dc2626' }}>฿{fmt(vatStats.vatSum)}</strong>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-illust"><Icon name="receipt" size={28} /></div>
            <div className="empty-title">
              {allInvoices.length === 0 ? 'ยังไม่มีใบกำกับภาษี' : 'ไม่พบใบที่ตรงกับตัวกรอง'}
            </div>
            <div className="empty-sub">
              {allInvoices.length === 0
                ? 'กดปุ่ม "ออกใบกำกับภาษีใหม่" เพื่อเริ่มต้น'
                : 'ลองล้างตัวกรองหรือเปลี่ยนคำค้นหา'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="history-table">
              <thead>
                <tr>
                  <th style={{ width: 130 }}>เลขที่</th>
                  <th style={{ width: 100 }}>วันที่</th>
                  <th>ลูกค้า</th>
                  <th style={{ width: 120 }}>Tax ID</th>
                  <th style={{ width: 100 }} className="num">ก่อน VAT</th>
                  <th style={{ width: 90 }} className="num">VAT</th>
                  <th style={{ width: 110 }} className="num">รวมสุทธิ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const t = computeTotals(r);
                  return (
                    <tr key={r.id} onClick={() => app.setDetailId(r.id)}>
                      <td className="mono" style={{ fontSize: 12.5, fontWeight: 500 }}>{r.docNo}</td>
                      <td style={{ color: 'var(--ink-2)' }}>{fmtDate(r.date)}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{r.vendor || '—'}</div>
                        {r.meta?.customerBranch && (
                          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                            {r.meta.customerBranch}
                          </div>
                        )}
                      </td>
                      <td className="mono" style={{ fontSize: 12 }}>
                        {r.meta?.customerTaxId || <span style={{ color: 'var(--ink-4)' }}>—</span>}
                      </td>
                      <td className="num mono" style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{fmt(t.subTotal)}</td>
                      <td className="num mono" style={{ fontSize: 12.5, color: '#dc2626' }}>{fmt(t.vat)}</td>
                      <td className="num mono" style={{ fontWeight: 600, color: '#92400e' }}>{fmt(t.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg)', fontWeight: 600 }}>
                  <td colSpan={4} style={{ textAlign: 'right', padding: '10px 12px' }}>รวม {filtered.length} ใบ:</td>
                  <td className="num mono" style={{ padding: '10px 12px' }}>{fmt(vatStats.subTotal)}</td>
                  <td className="num mono" style={{ padding: '10px 12px', color: '#dc2626' }}>{fmt(vatStats.vatSum)}</td>
                  <td className="num mono" style={{ padding: '10px 12px', color: '#92400e' }}>{fmt(vatStats.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

// ============================================================
// InvoicesListView — ประวัติใบแจ้งหนี้ (Invoice billing)
// ============================================================
window.InvoicesListView = function InvoicesListView() {
  const app = window.useApp();
  const [q, setQ] = useState('');
  const [projFilter, setProjFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState('date-desc');

  const allInvoices = useMemo(() =>
    app.records.filter(r => r.type === 'invoice'), [app.records]);

  const usedProjects = useMemo(() => {
    const ids = new Set(allInvoices.map(r => r.projectId).filter(Boolean));
    return app.projects.filter(p => ids.has(p.id));
  }, [allInvoices, app.projects]);

  const todayKey = todayStr();
  const in7Days = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })();

  const statusOf = (rec) => {
    const due = rec.meta?.dueDate;
    if (!due) return 'no-due';
    if (due < todayKey) return 'overdue';
    if (due <= in7Days) return 'upcoming';
    return 'pending';
  };

  const filtered = useMemo(() => {
    let arr = allInvoices;
    if (projFilter !== 'all') arr = arr.filter(r => r.projectId === projFilter);
    if (statusFilter !== 'all') {
      if (statusFilter === 'this-month') {
        const thisMonth = new Date().toISOString().slice(0, 7);
        arr = arr.filter(r => (r.date || '').slice(0, 7) === thisMonth);
      } else {
        arr = arr.filter(r => statusOf(r) === statusFilter);
      }
    }
    if (q.trim()) {
      const s = q.toLowerCase();
      arr = arr.filter(r =>
        (r.docNo || '').toLowerCase().includes(s) ||
        (r.vendor || '').toLowerCase().includes(s) ||
        (r.meta?.contractNo || '').toLowerCase().includes(s) ||
        (r.items || []).some(i => (i.name || '').toLowerCase().includes(s))
      );
    }
    return [...arr].sort((a, b) => {
      if (sortKey === 'date-desc')   return (b.date || '').localeCompare(a.date || '');
      if (sortKey === 'date-asc')    return (a.date || '').localeCompare(b.date || '');
      if (sortKey === 'due-asc')     return (a.meta?.dueDate || '').localeCompare(b.meta?.dueDate || '');
      if (sortKey === 'amount-desc') return computeTotals(b).total - computeTotals(a).total;
      if (sortKey === 'amount-asc')  return computeTotals(a).total - computeTotals(b).total;
      return 0;
    });
  }, [allInvoices, q, projFilter, statusFilter, sortKey]);

  const grandTotal = useMemo(() => allInvoices.reduce((s, r) => s + computeTotals(r).total, 0), [allInvoices]);
  const filteredTotal = filtered.reduce((s, r) => s + computeTotals(r).total, 0);

  const overdueList   = allInvoices.filter(r => statusOf(r) === 'overdue');
  const upcomingList  = allInvoices.filter(r => statusOf(r) === 'upcoming');
  const overdueTotal  = overdueList.reduce((s, r) => s + computeTotals(r).total, 0);
  const upcomingTotal = upcomingList.reduce((s, r) => s + computeTotals(r).total, 0);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthList = allInvoices.filter(r => (r.date || '').slice(0, 7) === thisMonth);
  const monthTotal = monthList.reduce((s, r) => s + computeTotals(r).total, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">ประวัติใบแจ้งหนี้</h1>
          <div className="page-sub">ใบแจ้งหนี้ที่ตั้งเบิกกับลูกค้า · ติดตามวันครบกำหนดและสถานะ</div>
        </div>
        <div className="row gap-8">
          <button className="btn btn-accent" onClick={() => app.setView('new-invoice')}>
            <Icon name="plus" size={14} stroke={2.5} /> ออกใบแจ้งหนี้ใหม่
          </button>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat">
          <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.12)', color: '#1d4ed8' }}>
            <Icon name="clipboard" size={16} />
          </div>
          <div className="stat-label">ใบแจ้งหนี้ทั้งหมด</div>
          <div className="stat-value mono">{allInvoices.length}</div>
          <div className="stat-change positive">฿{fmt(grandTotal)}</div>
        </div>
        <div className="stat" style={{ borderLeft: overdueList.length > 0 ? '3px solid #dc2626' : '' }}>
          <div className="stat-icon" style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626' }}>
            <Icon name="bell" size={16} />
          </div>
          <div className="stat-label">เกินกำหนดชำระ</div>
          <div className="stat-value mono" style={{ color: overdueList.length > 0 ? '#dc2626' : undefined }}>
            {overdueList.length}
          </div>
          <div className="stat-change neutral">฿{fmt(overdueTotal)}</div>
        </div>
        <div className="stat">
          <div className="stat-icon" style={{ background: 'rgba(217,119,6,0.12)', color: 'var(--accent)' }}>
            <Icon name="calendar" size={16} />
          </div>
          <div className="stat-label">ครบกำหนดใน 7 วัน</div>
          <div className="stat-value mono">{upcomingList.length}</div>
          <div className="stat-change neutral">฿{fmt(upcomingTotal)}</div>
        </div>
        <div className="stat">
          <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}>
            <Icon name="money" size={16} />
          </div>
          <div className="stat-label">ออกบิลเดือนนี้</div>
          <div className="stat-value mono">{monthList.length}</div>
          <div className="stat-change neutral">฿{fmt(monthTotal)}</div>
        </div>
      </div>

      <div className="card">
        <div className="filter-bar">
          <div className="tabs">
            <button className={'tab' + (statusFilter === 'all'        ? ' active' : '')} onClick={() => setStatusFilter('all')}>
              ทั้งหมด <span className="badge gray mono">{allInvoices.length}</span>
            </button>
            <button className={'tab' + (statusFilter === 'overdue'    ? ' active' : '')} onClick={() => setStatusFilter('overdue')}>
              เกินกำหนด {overdueList.length > 0 && <span className="badge" style={{ background:'#dc2626', color:'#fff' }}>{overdueList.length}</span>}
            </button>
            <button className={'tab' + (statusFilter === 'upcoming'   ? ' active' : '')} onClick={() => setStatusFilter('upcoming')}>
              ใน 7 วัน
            </button>
            <button className={'tab' + (statusFilter === 'this-month' ? ' active' : '')} onClick={() => setStatusFilter('this-month')}>
              เดือนนี้
            </button>
          </div>

          <div className="topbar-search" style={{ width: 280, margin: 0 }}>
            <Icon name="search" size={14} />
            <input placeholder="ค้นหา: เลขที่, ลูกค้า, สัญญา, รายการ"
              value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          <select className="select" value={projFilter} onChange={(e) => setProjFilter(e.target.value)}>
            <option value="all">ทุกโครงการ ({usedProjects.length})</option>
            {usedProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <select className="select" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
            <option value="date-desc">วันออก ใหม่ → เก่า</option>
            <option value="date-asc">วันออก เก่า → ใหม่</option>
            <option value="due-asc">ครบกำหนด เร็วสุด</option>
            <option value="amount-desc">ยอดเงิน มาก → น้อย</option>
            <option value="amount-asc">ยอดเงิน น้อย → มาก</option>
          </select>

          <div className="spacer" />
          <div className="text-small text-muted">
            <strong className="mono" style={{ color: 'var(--ink-1)' }}>{filtered.length}</strong> ใบ ·
            ยอดรวม <strong className="mono" style={{ color: 'var(--ink-1)' }}>฿{fmt(filteredTotal)}</strong>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-illust"><Icon name="clipboard" size={28} /></div>
            <div className="empty-title">
              {allInvoices.length === 0 ? 'ยังไม่มีใบแจ้งหนี้' : 'ไม่พบใบที่ตรงกับตัวกรอง'}
            </div>
            <div className="empty-sub">
              {allInvoices.length === 0
                ? 'กดปุ่ม "ออกใบแจ้งหนี้ใหม่" เพื่อเริ่มต้น'
                : 'ลองล้างตัวกรองหรือเปลี่ยนคำค้นหา'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="history-table">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>เลขที่</th>
                  <th style={{ width: 90 }}>วันออก</th>
                  <th style={{ width: 110 }}>ครบกำหนด</th>
                  <th>ลูกค้า</th>
                  <th style={{ width: 80 }}>งวด</th>
                  <th style={{ width: 120 }}>สถานะ</th>
                  <th style={{ width: 120 }} className="num">ยอดเรียกเก็บ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const t = computeTotals(r);
                  const st = statusOf(r);
                  const proj = app.projects.find(p => p.id === r.projectId);
                  const inst = r.meta?.installmentNo
                    ? `${r.meta.installmentNo}${r.meta.installmentTotal ? '/' + r.meta.installmentTotal : ''}`
                    : '—';

                  const statusBadge = st === 'overdue'
                    ? <span className="badge" style={{ background:'rgba(220,38,38,0.15)', color:'#dc2626', border:'1px solid rgba(220,38,38,0.3)' }}>⚠ เกินกำหนด</span>
                    : st === 'upcoming'
                    ? <span className="badge" style={{ background:'rgba(217,119,6,0.15)', color:'#d97706', border:'1px solid rgba(217,119,6,0.3)' }}>ใกล้ครบกำหนด</span>
                    : st === 'pending'
                    ? <span className="badge gray">ตั้งเบิก</span>
                    : <span className="badge gray">ไม่ระบุ</span>;

                  return (
                    <tr key={r.id} onClick={() => app.setDetailId(r.id)}>
                      <td className="mono" style={{ fontSize: 12.5, fontWeight: 500 }}>{r.docNo}</td>
                      <td style={{ color: 'var(--ink-2)' }}>{fmtDate(r.date)}</td>
                      <td style={{
                        color: st === 'overdue' ? '#dc2626'
                          : st === 'upcoming' ? '#d97706'
                          : 'var(--ink-2)',
                        fontWeight: st === 'overdue' || st === 'upcoming' ? 600 : 400,
                      }}>{r.meta?.dueDate ? fmtDate(r.meta.dueDate) : '—'}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{r.vendor || '—'}</div>
                        {proj && (
                          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                            {proj.name}
                          </div>
                        )}
                      </td>
                      <td className="mono" style={{ fontSize: 12.5, color: '#1d4ed8', fontWeight: 600 }}>{inst}</td>
                      <td>{statusBadge}</td>
                      <td className="num mono" style={{ fontWeight: 600, color: '#1d4ed8' }}>{fmt(t.total)}</td>
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

  const allLabor = useMemo(() =>
    app.records.filter(r => r.type === 'labor' || r.type === 'lump-labor'),
    [app.records]);

  const filtered = useMemo(() => {
    let arr = allLabor;
    if (typeFilter !== 'all') arr = arr.filter(r => r.type === typeFilter);
    if (projFilter !== 'all') arr = arr.filter(r => r.projectId === projFilter);
    if (teamFilter !== 'all') arr = arr.filter(r => r.workerTeamId === teamFilter);
    if (accFilter === 'unposted')       arr = arr.filter(r => !r.accountingPosted);
    if (accFilter === 'posted')         arr = arr.filter(r =>  r.accountingPosted);
    if (approveFilter === 'pending')    arr = arr.filter(r => !r.approved);
    if (approveFilter === 'approved')   arr = arr.filter(r =>  r.approved);
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
  }, [allLabor, typeFilter, projFilter, teamFilter, accFilter, approveFilter, sortKey, q]);

  const sum      = filtered.reduce((s, r) => s + computeTotals(r).total, 0);
  const laborSum = filtered.filter(r => r.type === 'labor')     .reduce((s, r) => s + computeTotals(r).total, 0);
  const lumpSum  = filtered.filter(r => r.type === 'lump-labor').reduce((s, r) => s + computeTotals(r).total, 0);

  // ค้างอนุมัติ — คำนวณจากรายการทั้งหมด (ไม่ขึ้นกับตัวกรอง)
  const pendingRecs  = allLabor.filter(r => !r.approved);
  const pendingSum   = pendingRecs.reduce((s, r) => s + computeTotals(r).total, 0);
  const pendingCount = pendingRecs.length;

  // เงินประกันผลงานคงค้าง (retention) — แยกตามทีมช่าง (net = หักที่จ่ายคืนแล้ว)
  // held  = retentionDeduction ของบิลปกติ (ยังไม่ settled)
  // paid  = ยอดจ่ายคืนที่อนุมัติแล้ว (isRetentionPayout)
  const retentionByTeam = useMemo(() => {
    const m = {};
    allLabor.forEach(r => {
      const tid = r.workerTeamId || '__none__';
      if (r.isRetentionPayout) {
        if (!r.approved) return;
        if (!m[tid]) m[tid] = { held: 0, paid: 0, heldCount: 0, paidCount: 0 };
        m[tid].paid += computeTotals(r).total;
        m[tid].paidCount++;
      } else {
        const ret = Number(r.retentionDeduction || 0);
        if (ret <= 0 || r.retentionReturned) return;
        if (!m[tid]) m[tid] = { held: 0, paid: 0, heldCount: 0, paidCount: 0 };
        m[tid].held += ret;
        m[tid].heldCount++;
      }
    });
    // ยอดคงค้างสุทธิต่อทีม = held − paid (ไม่ติดลบ)
    Object.values(m).forEach(v => { v.balance = Math.max(0, v.held - v.paid); });
    return m;
  }, [allLabor]);
  // retentionTotal = ยอดคงค้างสุทธิรวมทุกทีม
  const retentionTotal = Object.values(retentionByTeam).reduce((s, v) => s + v.balance, 0);
  const [retentionOpen, setRetentionOpen] = useState(false);

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
        {retentionTotal > 0 && (
          <div className="stat" style={{ cursor: 'pointer' }} onClick={() => setRetentionOpen(true)}
            title="คลิกดูรายละเอียดเงินประกันผลงานแยกตามทีมช่าง">
            <div className="stat-label">เงินประกันผลงานค้างคืน</div>
            <div className="stat-value mono" style={{ color: 'var(--info)' }}>{"฿"+fmt(retentionTotal)}</div>
            <div className="stat-delta"><Icon name="chevron" size={11} stroke={2.5} /> คลิกบันทึกจ่ายคืน</div>
            <div className="stat-icon green"><Icon name="percent" size={18} /></div>
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
                วิธีจ่ายคืน: เปิดหน้า <strong>บันทึกค่าแรง / เหมาจ่าย</strong> แล้วติ๊ก <strong>"จ่ายคืนเงินประกันผลงาน"</strong> ข้างงวดงาน เมื่ออนุมัติแล้วยอดจะถูกหักอัตโนมัติ
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
          <select className="select" value={sortKey} onChange={e => setSortKey(e.target.value)}>
            <option value="date-desc">วันที่ ใหม่ → เก่า</option>
            <option value="date-asc">วันที่ เก่า → ใหม่</option>
            <option value="amount-desc">ยอดเงิน มาก → น้อย</option>
            <option value="amount-asc">ยอดเงิน น้อย → มาก</option>
          </select>
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
          </select>
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

  const allIncome = useMemo(() => app.records.filter(r => window.isIncome(r)), [app.records]);

  const filtered = useMemo(() => {
    let arr = allIncome.slice();
    if (projFilter !== 'all') arr = arr.filter(r => r.projectId === projFilter);
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
  }, [allIncome, projFilter, accFilter, sortKey, q]);

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
          <button className="btn btn-accent" onClick={() => app.setView('new-income')}>
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
          <select className="select" value={projFilter} onChange={e => setProjFilter(e.target.value)}>
            <option value="all">ทุกโครงการ</option>
            {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="select" value={sortKey} onChange={e => setSortKey(e.target.value)}>
            <option value="date-desc">วันที่ ใหม่ → เก่า</option>
            <option value="date-asc">วันที่ เก่า → ใหม่</option>
            <option value="amount-desc">ยอดเงิน มาก → น้อย</option>
            <option value="amount-asc">ยอดเงิน น้อย → มาก</option>
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
