/* global React */
// ============================
// Views: Dashboard, History, Projects, Categories
// ============================



// ---- Dashboard ----
window.DashboardView = function DashboardView() {
  const app = window.useApp();
  const stats = useMemo(() => {
    const allTotals = app.records.map((r) => computeTotals(r));
    const totalAmount = allTotals.reduce((s, t) => s + t.total, 0);
    const matCount = app.records.filter(r => r.type === 'material').length;
    const machCount = app.records.filter(r => r.type === 'machine').length;
    const laborCount = app.records.filter(r => r.type === 'labor').length;
    const whtTotal = allTotals.reduce((s, t) => s + t.wht, 0);
    const retentionTotal = app.records.reduce((s, r) => s + Number(r.retentionDeduction || 0), 0);
    return { totalAmount, matCount, machCount, laborCount, whtTotal, retentionTotal };
  }, [app.records]);

  // by-project chart
  const byProject = useMemo(() => {
    const m = {};
    app.records.forEach((r) => {
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
      const k = (r.date || '').slice(0, 7);
      const m = months.find(x => x.key === k);
      if (!m) return;
      const total = computeTotals(r).total;
      if (r.type === 'material') m.mat += total;
      else if (r.type === 'machine') m.mach += total;
      else if (r.type === 'labor') m.labor += total;
    });
    return months;
  }, [app.records]);
  const maxMonth = Math.max(1, ...monthly.map(m => m.mat + m.mach + m.labor));

  const recent = app.records.slice(0, 5);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">แดชบอร์ด</h1>
          <div className="page-sub">ภาพรวมการจัดซื้อและการเช่าเครื่องจักรของทุกโครงการ</div>
        </div>
        <div className="row gap-8">
          <button className="btn btn-ghost" onClick={() => app.setView('new-labor')}>
            <Icon name="hammer" size={14} /> บันทึกค่าแรง
          </button>
          <button className="btn btn-ghost" onClick={() => app.setView('new-machine')}>
            <Icon name="truck" size={14} /> เช่าเครื่องจักร
          </button>
          <button className="btn btn-accent" onClick={() => app.setView('new-material')}>
            <Icon name="plus" size={14} stroke={2.5} /> จัดซื้อวัสดุ
          </button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-label">ยอดจ่ายทั้งหมด</div>
          <div className="stat-value mono">฿{fmt(stats.totalAmount)}</div>
          <div className="stat-delta"><Icon name="arrowUp" size={11} stroke={2.5} /> +12.4% จากเดือนก่อน</div>
          <div className="stat-icon"><Icon name="money" size={18} /></div>
        </div>
        <div className="stat">
          <div className="stat-label">บิลวัสดุ</div>
          <div className="stat-value mono">{fmtInt(stats.matCount)}</div>
          <div className="stat-delta"><Icon name="arrowUp" size={11} stroke={2.5} /> +3 บิลสัปดาห์นี้</div>
          <div className="stat-icon blue"><Icon name="cart" size={18} /></div>
        </div>
        <div className="stat">
          <div className="stat-label">บิลค่าแรง</div>
          <div className="stat-value mono">{fmtInt(stats.laborCount)}</div>
          <div className="stat-delta"><Icon name="hammer" size={11} stroke={2.5} /> {app.workerTeams.length} ทีมช่าง</div>
          <div className="stat-icon" style={{ background: 'oklch(0.94 0.04 290)', color: 'oklch(0.50 0.14 290)' }}><Icon name="hammer" size={18} /></div>
        </div>
        <div className="stat">
          <div className="stat-label">เงินประกันสะสม</div>
          <div className="stat-value mono">฿{fmt(stats.retentionTotal)}</div>
          <div className="stat-delta"><Icon name="clipboard" size={11} stroke={2.5} /> หัก ณ ที่จ่ายสะสม ฿{fmt(stats.whtTotal)}</div>
          <div className="stat-icon green"><Icon name="percent" size={18} /></div>
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

      <style>{`
        @media (max-width: 1100px) {
          .dash-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
};

// ---- Shared records table ----
function RecordsTable({ records, onOpen }) {
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
            <th style={{ width: 130 }}>เลขที่</th>
            <th style={{ width: 90 }}>วันที่</th>
            <th>โครงการ</th>
            <th>ผู้ขาย</th>
            <th style={{ width: 100 }}>ประเภท</th>
            <th style={{ width: 160 }}>เอกสาร</th>
            <th style={{ width: 130 }} className="num">ยอดสุทธิ</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => {
            const proj = app.projects.find(p => p.id === r.projectId);
            const total = computeTotals(r).total;
            return (
              <tr key={r.id} onClick={() => onOpen(r.id)}>
                <td className="mono" style={{ fontSize: 12.5, fontWeight: 500 }}>{r.docNo}</td>
                <td style={{ color: 'var(--ink-2)' }}>{fmtDate(r.date)}</td>
                <td>
                  <div className="row gap-8">
                    <span className="proj-chip-dot" style={{ background: proj?.color || '#999' }}></span>
                    <span style={{ fontSize: 13 }}>{proj?.name || '—'}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--ink-2)' }}>{r.vendor}</td>
                <td>
                  {r.type === 'material'
                    ? <span className="badge amber dot">วัสดุ</span>
                    : r.type === 'machine'
                    ? <span className="badge blue dot">เครื่องจักร</span>
                    : <span className="badge dot" style={{ background: 'oklch(0.94 0.04 290)', color: 'oklch(0.50 0.14 290)', borderColor: 'oklch(0.86 0.06 290)' }}>ค่าแรง</span>}
                </td>
                <td>
                  <div className="doc-mini">
                    {r.docs.map((d) => {
                      const doc = DOC_TYPES.find(x => x.id === d);
                      return <span key={d} className="badge">{doc?.label.replace('ใบ', '').trim()}</span>;
                    })}
                    {r.whtEnabled && <span className="badge amber">หัก {r.whtRate}%</span>}
                  </div>
                </td>
                <td className="num mono" style={{ fontWeight: 500 }}>{fmt(total)}</td>
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
  const [typeFilter, setTypeFilter] = useState('all'); // all | material | machine
  const [projFilter, setProjFilter] = useState('all');
  const [sortKey, setSortKey] = useState('date-desc');

  const filtered = useMemo(() => {
    let arr = app.records.slice();
    if (typeFilter !== 'all') arr = arr.filter(r => r.type === typeFilter);
    if (projFilter !== 'all') arr = arr.filter(r => r.projectId === projFilter);
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
  }, [app.records, q, typeFilter, projFilter, sortKey]);

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
            <button className={"tab" + (typeFilter === 'all' ? ' active' : '')} onClick={() => setTypeFilter('all')}>ทั้งหมด <span className="badge gray mono">{app.records.length}</span></button>
            <button className={"tab" + (typeFilter === 'material' ? ' active' : '')} onClick={() => setTypeFilter('material')}><Icon name="cart" size={13} /> วัสดุ</button>
            <button className={"tab" + (typeFilter === 'machine' ? ' active' : '')} onClick={() => setTypeFilter('machine')}><Icon name="truck" size={13} /> เครื่องจักร</button>
            <button className={"tab" + (typeFilter === 'labor' ? ' active' : '')} onClick={() => setTypeFilter('labor')}><Icon name="hammer" size={13} /> ค่าแรง</button>
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

  // compute spend per project
  const stats = useMemo(() => {
    const m = {};
    app.records.forEach(r => {
      m[r.projectId] = m[r.projectId] || { count: 0, total: 0 };
      m[r.projectId].count++;
      m[r.projectId].total += computeTotals(r).total;
    });
    return m;
  }, [app.records]);

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {app.projects.map((p) => {
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
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => app.setView('history')}>
                    <Icon name="eye" size={12} /> ดูรายการ
                  </button>
                  {app.isAdmin && (
                    <button className="btn btn-danger btn-sm" onClick={() => {
                      if (stats[p.id]) { app.pushToast('ลบไม่ได้ — มีรายการอยู่ในโครงการนี้', 'error'); return; }
                      app.deleteProject(p.id); app.pushToast('ลบโครงการแล้ว');
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

      <AddProjectModal open={open} onClose={() => setOpen(false)} onAdd={(p) => { app.addProject(p); app.pushToast('เพิ่มโครงการแล้ว'); setOpen(false); }} />
    </>
  );
};

// ---- Categories view ----
window.CategoriesView = function CategoriesView() {
  const app = window.useApp();
  const [matOpen, setMatOpen] = useState(false);
  const [machOpen, setMachOpen] = useState(false);
  const [laborOpen, setLaborOpen] = useState(false);

  const countByCat = useMemo(() => {
    const m = {};
    app.records.forEach(r => r.items.forEach(it => { if (it.categoryId) m[it.categoryId] = (m[it.categoryId] || 0) + 1; }));
    return m;
  }, [app.records]);

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
          {app.isAdmin && (
            <button className="topbar-icon-btn" style={{ width: 30, height: 30 }} title="ลบ"
              onClick={() => {
                if (countByCat[c.id]) { app.pushToast('ลบไม่ได้ — มีรายการใช้หมวดนี้อยู่', 'error'); return; }
                const fn = which === 'mach' ? app.deleteMachCat : which === 'labor' ? app.deleteLaborCat : app.deleteMatCat;
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }} className="cat-grid">
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
      </div>

      <AddCategoryModal open={matOpen} onClose={() => setMatOpen(false)} onAdd={(c) => { app.addMatCat(c); app.pushToast('เพิ่มหมวดหมู่วัสดุแล้ว'); setMatOpen(false); }} title="เพิ่มหมวดหมู่วัสดุ" />
      <AddCategoryModal open={machOpen} onClose={() => setMachOpen(false)} onAdd={(c) => { app.addMachCat(c); app.pushToast('เพิ่มหมวดหมู่เครื่องจักรแล้ว'); setMachOpen(false); }} title="เพิ่มหมวดหมู่เครื่องจักร" />
      <AddCategoryModal open={laborOpen} onClose={() => setLaborOpen(false)} onAdd={(c) => { app.addLaborCat(c); app.pushToast('เพิ่มหมวดงานแล้ว'); setLaborOpen(false); }} title="เพิ่มหมวดงาน" />

      <style>{`
        @media (max-width: 1100px) {
          .cat-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
};

// ---- Teams view (worker teams management) ----
window.TeamsView = function TeamsView() {
  const app = window.useApp();
  const [open, setOpen] = useState(false);

  // compute stats per team
  const stats = useMemo(() => {
    const m = {};
    app.records.filter(r => r.type === 'labor').forEach(r => {
      const k = r.workerTeamId;
      if (!k) return;
      m[k] = m[k] || { count: 0, total: 0, projects: new Set(), advance: 0, retention: 0 };
      m[k].count++;
      m[k].total += computeTotals(r).total;
      m[k].advance += Number(r.advanceDeduction || 0);
      m[k].retention += Number(r.retentionDeduction || 0);
      m[k].projects.add(r.projectId);
    });
    return m;
  }, [app.records]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">ทีมช่าง</h1>
          <div className="page-sub">จัดการทีมช่าง — ดูประวัติการเบิกค่าแรงและยอดเงินประกันของแต่ละทีม</div>
        </div>
        <button className="btn btn-accent" onClick={() => setOpen(true)}>
          <Icon name="plus" size={14} stroke={2.5} /> เพิ่มทีมช่าง
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {app.workerTeams.map((t) => {
          const s = stats[t.id] || { count: 0, total: 0, projects: new Set(), advance: 0, retention: 0 };
          return (
            <div key={t.id} className="card" style={{ transition: 'transform 200ms, box-shadow 200ms' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            >
              <div className="card-body">
                <div className="row gap-12 mb-16">
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
                    display: 'grid', placeItems: 'center', color: '#1f1d18', fontWeight: 600, fontSize: 20,
                    flexShrink: 0,
                  }}>{t.name.charAt(0)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 16, marginBottom: 2 }}>{t.name}</h3>
                    <div className="text-small text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.leader} · <span className="mono">{t.phone}</span>
                    </div>
                  </div>
                </div>
                <div className="row gap-6 wrap mb-16">
                  {t.specialty && <span className="badge amber">{t.specialty}</span>}
                  <span className="badge gray">{t.size} คน</span>
                  <span className="badge gray">{s.projects.size} โครงการ</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: '14px 14px', background: 'var(--bg)', borderRadius: 10 }}>
                  <div>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>เบิกสะสม</div>
                    <div className="mono" style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>฿{fmt(s.total)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>เงินประกัน</div>
                    <div className="mono" style={{ fontSize: 15, fontWeight: 600, marginTop: 2, color: 'var(--info)' }}>฿{fmt(s.retention)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>บิล</div>
                    <div className="mono" style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{s.count}</div>
                  </div>
                </div>
                <div className="row gap-8 mt-16">
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => app.setView('history')}>
                    <Icon name="eye" size={12} /> ดูประวัติเบิก
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
    </>
  );
};

// ---- Detail drawer ----
window.DetailDrawer = function DetailDrawer() {
  const app = window.useApp();
  const rec = app.records.find(r => r.id === app.detailId);
  if (!rec) return null;
  const proj = app.projects.find(p => p.id === rec.projectId);
  const cats = rec.type === 'machine' ? app.machCats : rec.type === 'labor' ? app.laborCats : app.matCats;
  const team = rec.type === 'labor' ? app.workerTeams.find(t => t.id === rec.workerTeamId) : null;
  const totals = computeTotals(rec);
  const close = () => app.setDetailId(null);

  const typeBadge = rec.type === 'material'
    ? <span className="badge amber dot">จัดซื้อวัสดุ</span>
    : rec.type === 'machine'
    ? <span className="badge blue dot">เช่าเครื่องจักร</span>
    : <span className="badge dot" style={{ background: 'oklch(0.94 0.04 290)', color: 'oklch(0.50 0.14 290)', borderColor: 'oklch(0.86 0.06 290)' }}>บันทึกค่าแรง</span>;

  // Editable work logs inline (saves immediately via updateRecord)
  const updateLogs = (logs) => app.updateRecord(rec.id, { workLogs: logs });

  return (
    <>
      <div className="drawer-backdrop" onClick={close}></div>
      <aside className="drawer">
        <div style={{ position: 'sticky', top: 0, background: 'var(--surface)', borderBottom: '1px solid var(--line)', zIndex: 2 }}>
          <div className="row gap-12" style={{ padding: '18px 24px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div className="row gap-8" style={{ marginBottom: 4 }}>
                {typeBadge}
                <span className="mono text-small text-muted">{rec.docNo}</span>
                {rec.type === 'labor' && rec.period && <span className="badge gray">{rec.period}</span>}
              </div>
              <h2 style={{ fontSize: 20 }}>{rec.vendor}</h2>
            </div>
            {app.isAdmin && (
              <button className="btn btn-ghost btn-sm" onClick={() => {
                if (!confirm('ยืนยันลบรายการนี้?')) return;
                app.deleteRecord(rec.id); app.pushToast('ลบรายการแล้ว'); close();
              }}><Icon name="trash" size={13} /> ลบ</button>
            )}
            <button className="btn btn-accent btn-sm" onClick={() => {
              app.setEditingId(rec.id);
              const v = rec.type === 'machine' ? 'new-machine' : rec.type === 'labor' ? 'new-labor' : 'new-material';
              app.setView(v);
              close();
            }}><Icon name="edit" size={13} /> แก้ไข</button>
            <button className="topbar-icon-btn" onClick={close}><Icon name="x" /></button>
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
            <div className="label">{rec.type === 'labor' ? 'ทีมช่าง' : 'ผู้ขาย'}</div>
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

        {/* Team history in same project — labor only */}
        {rec.type === 'labor' && team && (
          <div className="detail-section">
            <h3 style={{ fontSize: 13, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>ประวัติทีมในโครงการเดียวกัน</h3>
            <window.TeamHistoryPanel teamId={rec.workerTeamId} projectId={rec.projectId} excludeId={rec.id} compact />
          </div>
        )}

        <div className="detail-section">
          <h3 style={{ fontSize: 13, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>{rec.type === 'labor' ? `รายการงาน (${rec.items.length})` : `รายการ (${rec.items.length})`}</h3>
          <table className="items-table">
            <thead>
              <tr>
                <th>{rec.type === 'labor' ? 'งาน' : 'รายการ'}</th>
                <th style={{ width: 100 }}>{rec.type === 'labor' ? 'หมวดงาน' : 'หมวดหมู่'}</th>
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
                    <td style={{ padding: '10px 8px' }}>{it.name}</td>
                    <td style={{ padding: '10px 8px' }}>
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

        <div className="detail-section">
          <h3 style={{ fontSize: 13, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>เอกสารและภาษี</h3>
          <div className="row gap-8 wrap mb-16">
            {rec.docs.length === 0 && <span className="text-small text-muted">ไม่มีเอกสารกำกับ</span>}
            {rec.docs.map((d) => {
              const doc = DOC_TYPES.find(x => x.id === d);
              return <span key={d} className="badge amber">{doc?.label}</span>;
            })}
            {Number(rec.vatRate) > 0 && <span className="badge gray">{rec.vatMode === 'inclusive' ? 'รวม Vat แล้ว' : 'ไม่รวม Vat'}</span>}
            {rec.whtEnabled && <span className="badge">หัก ณ ที่จ่าย {rec.whtRate}%</span>}
          </div>
          <div className="summary-rows" style={{ maxWidth: 380, marginLeft: 'auto' }}>
            <div className="summary-row"><span className="label">{rec.type === 'labor' ? 'ค่าแรงรวม' : 'ยอดก่อนภาษี'}</span><span className="value">{fmt(totals.subTotal)}</span></div>
            {Number(rec.vatRate) > 0 && <div className="summary-row"><span className="label">Vat {rec.vatRate}%</span><span className="value">{fmt(totals.vat)}</span></div>}
            {rec.whtEnabled && <div className="summary-row"><span className="label">หัก ณ ที่จ่าย {rec.whtRate}%</span><span className="value" style={{ color: 'var(--danger)' }}>− {fmt(totals.wht)}</span></div>}
            {Number(rec.advanceDeduction) > 0 && <div className="summary-row"><span className="label" style={{ color: 'var(--warn)' }}>หักเบิกล่วงหน้า</span><span className="value" style={{ color: 'var(--warn)' }}>− {fmt(totals.advance)}</span></div>}
            {Number(rec.retentionDeduction) > 0 && <div className="summary-row"><span className="label" style={{ color: 'var(--info)' }}>หักเงินประกัน</span><span className="value" style={{ color: 'var(--info)' }}>− {fmt(totals.retention)}</span></div>}
            <div className="summary-row total"><span className="label">ยอดสุทธิ</span><span className="value">{fmt(totals.total)} บาท</span></div>
          </div>
        </div>

        {/* Editable work logs — labor only */}
        {rec.type === 'labor' && (
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

        {rec.images && rec.images.length > 0 && (
          <div className="detail-section">
            <h3 style={{ fontSize: 13, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>รูปภาพแนบ ({rec.images.length})</h3>
            <div className="detail-images">
              {rec.images.map((img, i) => (
                <img key={i} src={img.dataUrl} alt={img.name || ''} />
              ))}
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

// ---- Users Management view (admin only) ----
window.UsersView = function UsersView() {
  const app = window.useApp();
  const [profiles, setProfiles] = React.useState([]);
  const [loading, setLoading]   = React.useState(true);

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

                {/* Toggle button (can't change own role) */}
                {!isSelf(p) && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => toggleRole(p)}
                    title={`เปลี่ยนเป็น ${p.role === 'admin' ? 'User' : 'Admin'}`}
                    style={{ whiteSpace:'nowrap', fontSize:12 }}>
                    <Icon name="shield" size={12} />
                    {p.role === 'admin' ? 'ลด → User' : 'เลื่อน → Admin'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
