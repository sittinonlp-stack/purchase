/* global React, ReactDOM */
// ============================
// App root
// ============================

// ErrorBoundary — prevents white screen when something crashes
// (e.g. session expired after long tab inactivity, network errors)
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('[App] Render error:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight:'100vh', display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center', padding:24,
          background:'#f8f7f4', fontFamily:'Prompt, IBM Plex Sans Thai, sans-serif',
        }}>
          <div style={{
            width:64, height:64, borderRadius:'50%',
            background:'rgba(239,68,68,0.12)', display:'grid', placeItems:'center',
            marginBottom:20, fontSize:28,
          }}>⚠️</div>
          <h2 style={{ fontSize:18, marginBottom:8, color:'#1f1d18' }}>เกิดข้อผิดพลาดในการแสดงผล</h2>
          <p style={{ color:'#7a6f64', fontSize:13, marginBottom:20, maxWidth:380, textAlign:'center', lineHeight:1.6 }}>
            อาจเกิดจากเซสชั่นหมดอายุหลังจากที่หน้านี้ไม่ได้ใช้งานนาน — โหลดหน้าใหม่เพื่อใช้งานต่อ
          </p>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => window.location.reload()} style={{
              padding:'10px 22px', background:'#d97706', color:'#1f1d18',
              border:'none', borderRadius:8, cursor:'pointer', fontFamily:'inherit',
              fontWeight:600, fontSize:14,
            }}>🔄 โหลดหน้าใหม่</button>
            <button onClick={() => this.setState({ error: null })} style={{
              padding:'10px 16px', background:'transparent', color:'#7a6f64',
              border:'1px solid #e2ddd8', borderRadius:8, cursor:'pointer',
              fontFamily:'inherit', fontSize:13,
            }}>ลองอีกครั้ง</button>
          </div>
          <details style={{ marginTop:24, fontSize:11, color:'#9ca3af', maxWidth:520 }}>
            <summary style={{ cursor:'pointer' }}>รายละเอียดข้อผิดพลาด (สำหรับนักพัฒนา)</summary>
            <pre style={{ marginTop:8, padding:10, background:'#f0ebe4', borderRadius:6,
              overflow:'auto', fontSize:10, lineHeight:1.5 }}>
              {String(this.state.error?.stack || this.state.error)}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <window.AppProvider>
        <Shell />
      </window.AppProvider>
    </ErrorBoundary>
  );
}

function Shell() {
  const app = window.useApp();
  const view = app.view;

  let title = 'แดชบอร์ด', sub = 'ภาพรวมทั้งหมด';
  if (view === 'new-material') { title = 'จัดซื้อวัสดุ'; sub = 'บันทึก / แก้ไข'; }
  if (view === 'new-machine')  { title = 'เช่าเครื่องจักร'; sub = 'บันทึก / แก้ไข'; }
  if (view === 'new-labor')    { title = 'บันทึกค่าแรง'; sub = 'บันทึก / แก้ไข'; }
  if (view === 'history')      { title = 'ประวัติทั้งหมด'; sub = 'รายการย้อนหลัง'; }
  if (view === 'projects')     { title = 'โครงการ'; sub = 'จัดการโครงการ'; }
  if (view === 'categories')   { title = 'หมวดหมู่'; sub = 'จัดการหมวดหมู่'; }
  if (view === 'teams')        { title = 'ทีมช่าง'; sub = 'จัดการทีมช่างและประวัติ'; }
  if (view === 'users')        { title = 'จัดการผู้ใช้'; sub = 'กำหนดสิทธิ์การเข้าถึง'; }
  if (view === 'deposits')     { title = 'เงินประกันสินค้า'; sub = 'ติดตามเงินมัดจำและสถานะการรับคืน'; }

  const initial = app.editingId ? app.records.find(r => r.id === app.editingId) : null;
  const clearEditing = () => app.setEditingId(null);

  return (
    <div className="app">
      <window.Sidebar />
      <div className="main">
        <window.Topbar title={title} sub={sub} />
        <div className="content">
          {view === 'dashboard' && <window.DashboardView />}
          {view === 'new-material' && (
            <window.PurchaseForm
              key={'mat-' + (app.editingId || 'new')}
              type="material"
              initial={initial && initial.type === 'material' ? initial : null}
              onSubmit={(rec) => {
                if (app.editingId) {
                  app.updateRecord(app.editingId, rec);
                  app.pushToast('แก้ไขรายการเรียบร้อย');
                } else {
                  app.addRecord(rec);
                  app.pushToast('บันทึกการจัดซื้อแล้ว');
                }
                clearEditing();
                app.setView('history');
              }}
              onCancel={() => { clearEditing(); app.setView('dashboard'); }}
            />
          )}
          {view === 'new-machine' && (
            <window.PurchaseForm
              key={'mach-' + (app.editingId || 'new')}
              type="machine"
              initial={initial && initial.type === 'machine' ? initial : null}
              onSubmit={(rec) => {
                if (app.editingId) {
                  app.updateRecord(app.editingId, rec);
                  app.pushToast('แก้ไขรายการเรียบร้อย');
                } else {
                  app.addRecord(rec);
                  app.pushToast('บันทึกการเช่าเครื่องจักรแล้ว');
                }
                clearEditing();
                app.setView('history');
              }}
              onCancel={() => { clearEditing(); app.setView('dashboard'); }}
            />
          )}
          {view === 'history'    && <window.HistoryView />}
          {view === 'projects'   && <window.ProjectsView />}
          {view === 'categories' && <window.CategoriesView />}
          {view === 'teams'      && <window.TeamsView />}
          {view === 'users'      && app.isAdmin && <window.UsersView />}
          {view === 'deposits'   && <window.DepositsView />}
          {view === 'new-labor' && (
            <window.LaborForm
              key={'lab-' + (app.editingId || 'new')}
              initial={initial && initial.type === 'labor' ? initial : null}
              onSubmit={(rec) => {
                if (app.editingId) {
                  app.updateRecord(app.editingId, rec);
                  app.pushToast('แก้ไขรายการค่าแรงเรียบร้อย');
                } else {
                  app.addRecord(rec);
                  app.pushToast('บันทึกค่าแรงแล้ว');
                }
                clearEditing();
                app.setView('history');
              }}
              onCancel={() => { clearEditing(); app.setView('dashboard'); }}
            />
          )}
        </div>
      </div>
      {app.detailId && <window.DetailDrawer />}
      <window.ToastStack />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
