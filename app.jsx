/* global React, ReactDOM */
// ============================
// App root
// ============================

function App() {
  return (
    <window.AppProvider>
      <Shell />
    </window.AppProvider>
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
