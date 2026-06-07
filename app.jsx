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
  if (view === 'new-labor')      { title = 'บันทึกค่าแรง'; sub = 'บันทึก / แก้ไข'; }
  if (view === 'new-lump-labor') { title = 'ค่าแรงเหมาจ่าย'; sub = 'บันทึก / แก้ไข'; }
  if (view === 'new-other')     { title = 'ค่าใช้จ่ายอื่นๆ'; sub = 'บันทึก / แก้ไข'; }
  if (view === 'new-income')    { title = 'บันทึกรายรับ'; sub = 'บันทึก / แก้ไข'; }
  if (view === 'income-history'){ title = 'ประวัติบันทึกรายรับ'; sub = 'เงินรับเข้าโครงการ'; }
  if (view === 'new-receipt')    { title = 'ใบเสร็จรับเงิน'; sub = 'ออก / แก้ไข'; }
  if (view === 'new-tax-invoice'){ title = 'ใบเสร็จรับเงิน/ใบกำกับภาษี'; sub = 'ออก / แก้ไข (มี VAT)'; }
  if (view === 'new-invoice')    { title = 'ใบแจ้งหนี้'; sub = 'ตั้งเบิกงวดงานกับลูกค้า'; }
  if (view === 'receipts-list')  { title = 'ประวัติใบเสร็จรับเงิน'; sub = 'ใบเสร็จที่ออกให้ลูกค้าทั้งหมด'; }
  if (view === 'tax-invoices-list') { title = 'ประวัติใบกำกับภาษี'; sub = 'ใบกำกับภาษีที่ออกให้ลูกค้าทั้งหมด'; }
  if (view === 'invoices-list')  { title = 'ประวัติใบแจ้งหนี้'; sub = 'ใบแจ้งหนี้ที่ตั้งเบิกกับลูกค้า'; }
  if (view === 'quick-receipt') { title = 'ถ่ายรูปใบเสร็จ'; sub = 'บิลด่วนจากมือถือ'; }
  if (view === 'receipts')     { title = 'รูปถ่ายใบเสร็จ'; sub = 'บิลด่วนจากมือถือ'; }
  if (view === 'history')       { title = 'ประวัติทั้งหมด'; sub = 'รายการย้อนหลัง'; }
  if (view === 'labor-history') { title = 'ประวัติการเบิกค่าแรง'; sub = 'ค่าแรงรายวัน และค่าแรงเหมาจ่าย'; }
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
          {view === 'quick-receipt' && <window.QuickReceiptView key={'qr-' + (app.editingId || 'new')} />}
          {view === 'receipts'   && <window.ReceiptsView />}
          {view === 'history'       && <window.HistoryView />}
          {view === 'labor-history' && <window.LaborHistoryView />}
          {view === 'projects'   && <window.ProjectsView />}
          {view === 'categories' && <window.CategoriesView />}
          {view === 'teams'      && <window.TeamsView />}
          {view === 'users'      && app.isAdmin && <window.UsersView />}
          {view === 'deposits'   && <window.DepositsView />}
          {view === 'new-labor' && (
            <window.LaborForm
              key={'lab-' + (app.editingId || 'new')}
              initial={initial && (initial.type === 'labor' || initial.type === 'lump-labor') ? initial : null}
              onSubmit={(rec) => {
                if (app.editingId) {
                  app.updateRecord(app.editingId, rec);
                  app.pushToast(rec.type === 'lump-labor' ? 'แก้ไขและสลับเป็นเหมาจ่ายแล้ว' : 'แก้ไขรายการค่าแรงเรียบร้อย');
                } else {
                  app.addRecord(rec);
                  app.pushToast('บันทึกค่าแรงแล้ว');
                }
                clearEditing();
                app.setView('labor-history');
              }}
              onCancel={() => { clearEditing(); app.setView('labor-history'); }}
            />
          )}
          {view === 'new-lump-labor' && (
            <window.LumpLaborForm
              key={'ll-' + (app.editingId || 'new')}
              initial={initial && (initial.type === 'lump-labor' || initial.type === 'labor') ? initial : null}
              onSubmit={(rec) => {
                if (app.editingId) {
                  app.updateRecord(app.editingId, rec);
                  app.pushToast(rec.type === 'labor' ? 'แก้ไขและสลับเป็นค่าแรงแล้ว' : 'แก้ไขรายการเหมาจ่ายเรียบร้อย');
                } else {
                  app.addRecord(rec);
                  app.pushToast('บันทึกค่าแรงเหมาจ่ายแล้ว');
                }
                clearEditing();
                app.setView('labor-history');
              }}
              onCancel={() => { clearEditing(); app.setView('labor-history'); }}
            />
          )}
          {view === 'new-other' && (
            <window.OtherExpenseForm
              key={'other-' + (app.editingId || 'new')}
              initial={initial && initial.type === 'other' ? initial : null}
              onSubmit={(rec) => {
                if (app.editingId) {
                  app.updateRecord(app.editingId, rec);
                  app.pushToast('แก้ไขรายการค่าใช้จ่ายเรียบร้อย');
                } else {
                  app.addRecord(rec);
                  app.pushToast('บันทึกค่าใช้จ่ายอื่นๆ แล้ว');
                }
                clearEditing();
                app.setView('history');
              }}
              onCancel={() => { clearEditing(); app.setView('dashboard'); }}
            />
          )}
          {view === 'new-income' && (
            <window.IncomeForm
              key={'income-' + (app.editingId || 'new')}
              initial={initial && initial.type === 'income' ? initial : null}
              onSubmit={(rec) => {
                if (app.editingId) {
                  app.updateRecord(app.editingId, rec);
                  app.pushToast('แก้ไขบันทึกรายรับเรียบร้อย');
                } else {
                  app.addRecord(rec);
                  app.pushToast('บันทึกรายรับแล้ว');
                }
                clearEditing();
                app.setView('income-history');
              }}
              onCancel={() => { clearEditing(); app.setView('dashboard'); }}
            />
          )}
          {view === 'income-history' && <window.IncomeHistoryView />}
          {view === 'new-receipt' && (
            <window.ReceiptForm
              key={'rcpt-' + (app.editingId || 'new')}
              initial={initial && initial.type === 'receipt' ? initial : null}
              onSubmit={(rec) => {
                if (app.editingId) {
                  app.updateRecord(app.editingId, rec);
                  app.pushToast('แก้ไขใบเสร็จเรียบร้อย');
                } else {
                  app.addRecord(rec);
                  app.pushToast('บันทึกใบเสร็จแล้ว');
                }
                clearEditing();
                app.setView('receipts-list');
              }}
              onCancel={() => { clearEditing(); app.setView('dashboard'); }}
            />
          )}
          {view === 'receipts-list' && <window.ReceiptsListView />}
          {view === 'new-tax-invoice' && (
            <window.TaxInvoiceForm
              key={'tiv-' + (app.editingId || 'new')}
              initial={initial && initial.type === 'tax-invoice' ? initial : null}
              onSubmit={(rec) => {
                if (app.editingId) {
                  app.updateRecord(app.editingId, rec);
                  app.pushToast('แก้ไขใบกำกับภาษีเรียบร้อย');
                } else {
                  app.addRecord(rec);
                  app.pushToast('บันทึกใบกำกับภาษีแล้ว');
                }
                clearEditing();
                app.setView('tax-invoices-list');
              }}
              onCancel={() => { clearEditing(); app.setView('dashboard'); }}
            />
          )}
          {view === 'tax-invoices-list' && <window.TaxInvoicesListView />}
          {view === 'new-invoice' && (
            <window.InvoiceForm
              key={'iv-' + (app.editingId || 'new')}
              initial={initial && initial.type === 'invoice' ? initial : null}
              onSubmit={(rec) => {
                if (app.editingId) {
                  app.updateRecord(app.editingId, rec);
                  app.pushToast('แก้ไขใบแจ้งหนี้เรียบร้อย');
                } else {
                  app.addRecord(rec);
                  app.pushToast('บันทึกใบแจ้งหนี้แล้ว');
                }
                clearEditing();
                app.setView('invoices-list');
              }}
              onCancel={() => { clearEditing(); app.setView('dashboard'); }}
            />
          )}
          {view === 'invoices-list' && <window.InvoicesListView />}
        </div>
      </div>
      {app.detailId && <window.DetailDrawer />}
      <window.QuickReceiptFab />
      <window.ToastStack />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
