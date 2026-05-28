/* global React */
// ============================================================
// receipt.jsx — ใบเสร็จรับเงิน / ใบกำกับภาษี (Receipt)
//
// ส่วนประกอบ:
//   - thaiBahtText(num)           — แปลงตัวเลขเป็นข้อความภาษาไทย
//   - getCompanySettings/save…    — จัดเก็บข้อมูลบริษัทใน localStorage
//   - CompanySettingsModal        — modal แก้ไขข้อมูลบริษัท
//   - ReceiptForm                 — ฟอร์มกรอกข้อมูลใบเสร็จ
//   - PrintableReceipt            — เทมเพลตเอกสารทางการสำหรับพิมพ์
// ============================================================

// ──────────────────────────────────────────────
// แปลงตัวเลข → คำอ่านภาษาไทย (XX บาท XX สตางค์)
// ──────────────────────────────────────────────
function thaiBahtText(amount) {
  const num = Number(amount);
  if (!isFinite(num)) return '';
  if (num === 0) return 'ศูนย์บาทถ้วน';

  const txtNum  = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const txtPos  = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];

  function readSix(numStr) {
    let str = '';
    const len = numStr.length;
    for (let i = 0; i < len; i++) {
      const d = parseInt(numStr[i], 10);
      const pos = len - i - 1;
      if (d === 0) continue;
      if (pos === 0 && d === 1 && len > 1) str += 'เอ็ด';
      else if (pos === 1 && d === 2)        str += 'ยี่';
      else if (pos === 1 && d === 1)        str += '';   // สิบ เฉย ๆ ไม่มีหนึ่ง
      else                                  str += txtNum[d];
      str += txtPos[pos];
    }
    return str;
  }

  function readInt(n) {
    if (n === 0) return '';
    const s = String(n);
    if (s.length <= 6) return readSix(s);
    // ส่วนล้าน + ส่วนที่เหลือ
    const millionPart   = Math.floor(n / 1000000);
    const remainderPart = n % 1000000;
    let txt = readInt(millionPart) + 'ล้าน';
    if (remainderPart > 0) {
      const remTxt = readSix(String(remainderPart).padStart(6, '0').replace(/^0+/, ''));
      txt += remTxt;
    }
    return txt;
  }

  const fixed = num.toFixed(2);
  const [intStr, decStr] = fixed.split('.');
  const intPart = parseInt(intStr, 10);
  const decPart = parseInt(decStr, 10);

  let result = readInt(intPart) + 'บาท';
  if (decPart === 0) result += 'ถ้วน';
  else                result += readSix(String(decPart).padStart(2, '0')) + 'สตางค์';

  return result;
}
window.thaiBahtText = thaiBahtText;

// ──────────────────────────────────────────────
// Company settings — เก็บใน localStorage
// ──────────────────────────────────────────────
const COMPANY_KEY = 'forhouse_company_settings_v1';
const DEFAULT_COMPANY = {
  name:       'บริษัท ฟอร์เฮ้าส์ จำกัด',
  branch:     'สำนักงานใหญ่',
  address:    '',
  phone:      '',
  email:      '',
  taxId:      '',
  logoDataUrl: '',
};

function getCompanySettings() {
  try {
    const raw = localStorage.getItem(COMPANY_KEY);
    if (!raw) return { ...DEFAULT_COMPANY };
    return { ...DEFAULT_COMPANY, ...JSON.parse(raw) };
  } catch (e) {
    return { ...DEFAULT_COMPANY };
  }
}

function saveCompanySettings(c) {
  try { localStorage.setItem(COMPANY_KEY, JSON.stringify(c)); } catch (e) { /* ignore */ }
}

window.getCompanySettings  = getCompanySettings;
window.saveCompanySettings = saveCompanySettings;

// ──────────────────────────────────────────────
// POPUP_CSS — CSS แบบ standalone สำหรับหน้าต่าง popup
// ไม่โหลด styles.css เพื่อป้องกัน body flex ถูก override
// ──────────────────────────────────────────────
const POPUP_CSS = `
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{
  display:flex;flex-direction:column;align-items:center;
  padding:28px 0;min-height:100vh;
  background:#e8e6e1;
  font-family:'Prompt','IBM Plex Sans Thai',sans-serif;font-size:13px;
}
.printable-receipt{
  background:#fff;color:#000;
  font-family:'Prompt','IBM Plex Sans Thai',sans-serif;
  font-size:13px;line-height:1.5;
  padding:18mm 16mm;width:210mm;min-height:297mm;
  box-shadow:0 6px 24px rgba(0,0,0,0.18);
  box-sizing:border-box;position:relative;
}
.rcpt-mono{font-family:'JetBrains Mono',monospace}
.rcpt-num{text-align:right}
.rcpt-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding-bottom:16px;border-bottom:2px solid #000}
.rcpt-company{display:flex;gap:14px;align-items:flex-start;flex:1;min-width:0}
.rcpt-logo{width:64px;height:64px;object-fit:contain;border:1px solid #ccc;border-radius:6px;background:#fff}
.rcpt-company-name{font-size:17px;font-weight:700;margin-bottom:4px}
.rcpt-company-line{font-size:11.5px;color:#333;line-height:1.55}
.rcpt-title-box{text-align:right;flex-shrink:0}
.rcpt-title{font-size:19px;font-weight:700;letter-spacing:0.02em}
.rcpt-title-en{font-size:11px;color:#555;letter-spacing:0.1em;margin-top:2px}
.rcpt-original{display:inline-block;margin-top:8px;padding:4px 12px;border:1.5px solid #000;font-size:10.5px;font-weight:600;letter-spacing:0.06em}
.rcpt-info-row{display:flex;gap:18px;padding:10px 0;margin-bottom:12px;border-bottom:1px dashed #999;font-size:12px}
.rcpt-info-cell{display:flex;flex-direction:column}
.rcpt-info-label{color:#666;font-size:10.5px;letter-spacing:0.05em;text-transform:uppercase}
.rcpt-info-value{font-weight:600;font-size:13px;margin-top:1px}
.rcpt-customer{border:1px solid #999;border-radius:4px;padding:10px 14px;margin-bottom:14px;background:#fafafa}
.rcpt-customer-title{font-size:10px;font-weight:700;letter-spacing:0.08em;color:#555;text-transform:uppercase;margin-bottom:6px}
.rcpt-customer-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.rcpt-customer-name{font-size:14.5px;font-weight:600;margin-bottom:2px}
.rcpt-customer-line{font-size:11.5px;color:#333;line-height:1.6}
.rcpt-customer-key{color:#666;font-size:10.5px}
.rcpt-customer-side{text-align:right}
.rcpt-items{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:11.5px}
.rcpt-items th,.rcpt-items td{border:1px solid #888;padding:6px 8px;vertical-align:top}
.rcpt-items thead th{background:#f0f0f0;font-weight:600;font-size:11px;text-align:center;letter-spacing:0.02em}
.rcpt-items tbody td{height:22px}
.rcpt-items .rcpt-empty-row td{border-color:#ddd}
.rcpt-totals{display:grid;grid-template-columns:1fr 280px;gap:14px;margin-top:4px;margin-bottom:18px}
.rcpt-amount-words{padding:10px 14px;border:1px solid #999;border-radius:4px;background:#fafafa;font-size:11.5px}
.rcpt-amount-words-label{color:#666;font-size:10.5px;letter-spacing:0.05em;text-transform:uppercase}
.rcpt-amount-words-text{margin-top:4px;font-weight:600;font-size:12.5px}
.rcpt-totals-right{border:1px solid #888;border-radius:4px;overflow:hidden}
.rcpt-total-row{display:flex;justify-content:space-between;padding:6px 12px;font-size:12px;border-bottom:1px solid #ddd}
.rcpt-total-row:last-child{border-bottom:none}
.rcpt-total-grand{background:#000;color:#fff;font-weight:700;font-size:14px;padding:9px 12px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.rcpt-footer{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:14px}
.rcpt-footer-left{padding-top:4px}
.rcpt-payment{font-size:12px;margin-bottom:10px}
.rcpt-payment-label{color:#666}
.rcpt-payment-sub{color:#444;font-size:11px;margin-top:2px}
.rcpt-note{font-size:11px;color:#444;line-height:1.6}
.rcpt-note-label{color:#666;font-weight:600}
.rcpt-signatures{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.rcpt-sig{text-align:center;padding-top:26px}
.rcpt-sig-line{border-bottom:1px solid #000;margin-bottom:4px}
.rcpt-sig-label{font-size:11px;color:#333}
.rcpt-sig-name{font-size:11px;color:#000;margin-top:1px}
.rcpt-sig-date{font-size:10.5px;color:#777;margin-top:4px}
.invoice-project-bar{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;padding:10px 14px;margin-bottom:14px;border:1px solid #999;border-radius:4px;background:#fafafa}
.ipb-label{font-size:10px;color:#555;letter-spacing:0.05em;text-transform:uppercase}
.ipb-value{font-size:12.5px;font-weight:500;margin-top:2px}
.invoice-payment-box{margin-top:14px;padding:12px 14px;border:1.5px solid #1d4ed8;border-radius:4px;background:rgba(37,99,235,0.04)}
.invoice-payment-title{font-size:12px;font-weight:700;color:#1d4ed8;letter-spacing:0.05em;margin-bottom:8px;display:flex;align-items:center;gap:6px}
.invoice-payment-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px 16px}
.invoice-payment-item{display:flex;flex-direction:column}
.invoice-payment-label{font-size:10.5px;color:#666;letter-spacing:0.03em}
.invoice-payment-value{font-size:12.5px;font-weight:600;color:#1f1d18;margin-top:1px}
.invoice-payment-terms{margin-top:10px;padding-top:8px;border-top:1px dashed rgba(37,99,235,0.3);font-size:11.5px;color:#333}
@media print{
  @page{size:A4;margin:0}
  body{display:block!important;padding:0!important;background:#fff!important}
  .printable-receipt{box-shadow:none!important;margin:0!important;position:static!important;width:210mm!important;min-height:297mm!important;padding:18mm 16mm!important}
}
`;

// ──────────────────────────────────────────────
// openPrintPopup — เปิดหน้าต่าง popup สะอาด และ render component พิมพ์
// ใช้ POPUP_CSS แบบ inline เพื่อป้องกัน styles.css override body flex
// ──────────────────────────────────────────────
function openPrintPopup(Component, title, rec, company, app) {
  const w = window.open('', '_blank');
  if (!w) {
    // Popup ถูกบล็อก → fallback body-class
    document.body.classList.add('printing-receipt');
    setTimeout(() => {
      window.print();
      setTimeout(() => document.body.classList.remove('printing-receipt'), 200);
    }, 100);
    return;
  }
  const fontHref = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .find(l => l.href.includes('googleapis.com'))?.href || '';
  w.document.write('<!DOCTYPE html><html lang="th"><head>' +
    '<meta charset="UTF-8"><title>' + title + '</title>' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
    (fontHref ? '<link href="' + fontHref + '" rel="stylesheet">' : '') +
    '<style>' + POPUP_CSS + '</style>' +
    '</head><body><div id="proot"></div></body></html>');
  w.document.close();
  setTimeout(() => {
    try {
      const root = window.ReactDOM.createRoot(w.document.getElementById('proot'));
      root.render(window.React.createElement(Component, { rec, company, app }));
      setTimeout(() => w.print(), 600);
    } catch (e) { console.error('[Print]', e); w.close(); }
  }, 400);
}
window.openPrintPopup = openPrintPopup;

// ──────────────────────────────────────────────
// CompanySettingsModal — modal สำหรับแก้ไขข้อมูลบริษัท
// ──────────────────────────────────────────────
function CompanySettingsModal({ open, onClose, onSaved }) {
  const [c, setC] = useState(() => getCompanySettings());
  useEffect(() => { if (open) setC(getCompanySettings()); }, [open]);

  if (!open) return null;

  const save = () => {
    saveCompanySettings(c);
    onSaved?.(c);
    onClose?.();
  };

  const onLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      alert('ไฟล์ใหญ่เกินไป — ใช้รูปขนาดไม่เกิน 500KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setC({ ...c, logoDataUrl: ev.target.result });
    reader.readAsDataURL(file);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 560, maxWidth: '94vw' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="card-title">ข้อมูลบริษัท</div>
            <div className="card-sub">ใช้บนใบเสร็จและเอกสารทางการอื่น ๆ</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="field full">
              <label className="field-label">ชื่อบริษัท / กิจการ <span className="req">*</span></label>
              <input className="input" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
            </div>
            <div className="field">
              <label className="field-label">สาขา</label>
              <input className="input" value={c.branch} onChange={(e) => setC({ ...c, branch: e.target.value })}
                placeholder="สำนักงานใหญ่" />
            </div>
            <div className="field">
              <label className="field-label">เลขประจำตัวผู้เสียภาษี</label>
              <input className="input mono" value={c.taxId} onChange={(e) => setC({ ...c, taxId: e.target.value })}
                placeholder="0-0000-00000-00-0" />
            </div>
            <div className="field full">
              <label className="field-label">ที่อยู่</label>
              <textarea className="textarea" rows={2} value={c.address}
                onChange={(e) => setC({ ...c, address: e.target.value })}
                placeholder="เลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์" />
            </div>
            <div className="field">
              <label className="field-label">โทรศัพท์</label>
              <input className="input mono" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} />
            </div>
            <div className="field">
              <label className="field-label">อีเมล</label>
              <input className="input" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} />
            </div>
            <div className="field full">
              <label className="field-label">โลโก้ (ไม่บังคับ)</label>
              <div className="row gap-12" style={{ alignItems: 'center' }}>
                {c.logoDataUrl && (
                  <img src={c.logoDataUrl} alt="logo" style={{
                    width: 64, height: 64, objectFit: 'contain',
                    border: '1px solid var(--line)', borderRadius: 8, background: '#fff'
                  }} />
                )}
                <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                  <Icon name="camera" size={13} /> เลือกรูป
                  <input type="file" accept="image/*" hidden onChange={onLogoUpload} />
                </label>
                {c.logoDataUrl && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setC({ ...c, logoDataUrl: '' })}>
                    <Icon name="x" size={12} /> ลบ
                  </button>
                )}
              </div>
              <div className="field-hint">รูปขนาดไม่เกิน 500KB · แนะนำสี่เหลี่ยมจัตุรัส</div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-accent" onClick={save}><Icon name="save" size={13} /> บันทึก</button>
        </div>
      </div>
    </div>
  );
}
window.CompanySettingsModal = CompanySettingsModal;

// ──────────────────────────────────────────────
// ReceiptForm — ฟอร์มกรอกข้อมูลใบเสร็จ
// ──────────────────────────────────────────────
window.ReceiptForm = function ReceiptForm({ initial, onSubmit, onCancel }) {
  const app = window.useApp();

  const blank = () => ({
    type: 'receipt',
    docNo: 'RC-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000 + 1000)),
    date: todayStr(),
    projectId: '',
    vendor: '',          // ใช้เป็น "ชื่อลูกค้า" ใน UI
    items: [{ id: newId(), name: '', categoryId: '', qty: 1, unit: 'รายการ', price: 0 }],
    vatMode: 'exclusive',
    vatRate: 0,           // ใบเสร็จเฉย ๆ — ไม่คิด VAT
    whtEnabled: false,
    whtRate: 0,
    docs: [],
    note: '',
    images: [],
    depositAmount: 0,
    depositStatus: 'none',
    meta: {
      customerAddress: '',
      customerTaxId:   '',
      customerBranch:  '',
      paymentMethod:   'cash',  // cash | transfer | cheque
      paymentRef:      '',      // ธนาคาร / เลขที่เช็ค
      chequeDate:      '',
      receivedBy:      '',
      refDocNo:        '',
    },
  });

  const [form, setForm] = useState(() => {
    if (initial) {
      const merged = { ...initial };
      merged.meta = { ...blank().meta, ...(initial.meta || {}) };
      return merged;
    }
    return blank();
  });
  const [companyOpen, setCompanyOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [company, setCompany]         = useState(() => getCompanySettings());

  const totals = useMemo(() => computeTotals(form), [form]);

  const set     = (patch)     => setForm((f) => ({ ...f, ...patch }));
  const setMeta = (metaPatch) => setForm((f) => ({ ...f, meta: { ...(f.meta || {}), ...metaPatch } }));

  const handleSubmit = () => {
    if (!form.vendor.trim())    return app.pushToast('โปรดระบุชื่อลูกค้า', 'error');
    if (!form.items.some(it => it.name.trim() && Number(it.price) > 0)) {
      return app.pushToast('โปรดกรอกรายการอย่างน้อย 1 รายการ พร้อมจำนวนเงิน', 'error');
    }
    onSubmit(form);
  };

  const printNow = () => openPrintPopup(PrintableReceipt, 'ใบเสร็จ ' + (form.docNo || ''), form, company, app);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{initial ? 'แก้ไขใบเสร็จรับเงิน' : 'ออกใบเสร็จรับเงิน'}</h1>
          <div className="page-sub">กรอกข้อมูลลูกค้า รายการสินค้า/บริการ และวิธีชำระเงิน</div>
        </div>
        <div className="row gap-8 dash-actions">
          <button className="btn btn-ghost" onClick={() => setCompanyOpen(true)} title="ตั้งค่าข้อมูลบริษัท">
            <Icon name="settings" size={14} /> ข้อมูลบริษัท
          </button>
          <button className="btn btn-ghost" onClick={() => setPreviewOpen(true)}>
            <Icon name="eye" size={14} /> ดูตัวอย่าง
          </button>
          <button className="btn btn-ghost" onClick={onCancel}><Icon name="x" size={14} /> ยกเลิก</button>
          <button className="btn btn-accent" onClick={handleSubmit}><Icon name="save" size={14} /> บันทึกใบเสร็จ</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 18, alignItems: 'start' }} className="form-layout">
        {/* ── คอลัมน์ซ้าย ─────────────────────────── */}
        <div className="col gap-16" style={{ minWidth: 0 }}>

          {/* Card 1: ข้อมูลเอกสาร */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">ข้อมูลเอกสาร</div>
                <div className="card-sub">เลขที่ใบเสร็จ และวันที่ออก</div>
              </div>
              <span className="badge dot" style={{ background:'rgba(5,150,105,0.12)', color:'#059669', borderColor:'rgba(5,150,105,0.3)' }}>ใบเสร็จรับเงิน</span>
            </div>
            <div className="card-body">
              <div className="form-grid">
                <div className="field">
                  <label className="field-label">เลขที่ใบเสร็จ <span className="req">*</span></label>
                  <input className="input mono" value={form.docNo} onChange={(e) => set({ docNo: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field-label">วันที่ <span className="req">*</span></label>
                  <input className="input" type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
                </div>
                <div className="field full">
                  <label className="field-label">โครงการที่เกี่ยวข้อง (ไม่บังคับ)</label>
                  <window.ProjectPicker value={form.projectId} onChange={(v) => set({ projectId: v })}
                    projects={app.projects} onAdd={() => {}} />
                </div>
                <div className="field full">
                  <label className="field-label">อ้างอิงเอกสาร (ใบเสนอราคา / Invoice) — ไม่บังคับ</label>
                  <input className="input mono" value={form.meta?.refDocNo || ''}
                    onChange={(e) => setMeta({ refDocNo: e.target.value })}
                    placeholder="เช่น QT-2026-0012" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: ลูกค้า */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">ข้อมูลลูกค้า</div>
                <div className="card-sub">ชื่อ ที่อยู่ และเลขประจำตัวผู้เสียภาษี</div>
              </div>
            </div>
            <div className="card-body">
              <div className="form-grid">
                <div className="field full">
                  <label className="field-label">ชื่อลูกค้า / ผู้ซื้อ <span className="req">*</span></label>
                  <input className="input" value={form.vendor}
                    onChange={(e) => set({ vendor: e.target.value })}
                    placeholder="เช่น คุณ สมชาย ใจดี / บจก. ABC" />
                </div>
                <div className="field">
                  <label className="field-label">เลขประจำตัวผู้เสียภาษี</label>
                  <input className="input mono" value={form.meta?.customerTaxId || ''}
                    onChange={(e) => setMeta({ customerTaxId: e.target.value })}
                    placeholder="0-0000-00000-00-0" />
                </div>
                <div className="field">
                  <label className="field-label">สาขา</label>
                  <input className="input" value={form.meta?.customerBranch || ''}
                    onChange={(e) => setMeta({ customerBranch: e.target.value })}
                    placeholder="สำนักงานใหญ่" />
                </div>
                <div className="field full">
                  <label className="field-label">ที่อยู่</label>
                  <textarea className="textarea" rows={2} value={form.meta?.customerAddress || ''}
                    onChange={(e) => setMeta({ customerAddress: e.target.value })}
                    placeholder="เลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: รายการ */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">รายการสินค้า / บริการ</div>
                <div className="card-sub">ระบุชื่อรายการ จำนวน หน่วย และราคา</div>
              </div>
              <span className="badge gray mono">{form.items.length} รายการ</span>
            </div>
            <div className="card-body">
              <window.ItemsTable
                items={form.items}
                setItems={(items) => set({ items })}
                cats={[]}
                onAddCat={() => {}}
                type="receipt"
              />
            </div>
          </div>

          {/* Card 4: การชำระเงิน + หมายเหตุ */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">การชำระเงิน</div>
                <div className="card-sub">วิธีชำระเงิน และผู้รับเงิน</div>
              </div>
            </div>
            <div className="card-body col gap-20">
              {/* Payment method */}
              <div className="field">
                <label className="field-label"><Icon name="money" size={13} /> วิธีชำระเงิน</label>
                <div className="row gap-8 wrap">
                  {[
                    { id: 'cash',     label: 'เงินสด' },
                    { id: 'transfer', label: 'โอนเงิน' },
                    { id: 'cheque',   label: 'เช็ค' },
                    { id: 'credit',   label: 'เครดิต' },
                  ].map(m => (
                    <button key={m.id} type="button"
                      className={'btn btn-sm ' + (form.meta?.paymentMethod === m.id ? 'btn-accent' : 'btn-ghost')}
                      onClick={() => setMeta({ paymentMethod: m.id })}>
                      {m.label}
                    </button>
                  ))}
                </div>

                {(form.meta?.paymentMethod === 'transfer' || form.meta?.paymentMethod === 'cheque') && (
                  <div className="form-grid mt-12">
                    <div className="field">
                      <label className="field-label">
                        {form.meta.paymentMethod === 'cheque' ? 'ธนาคาร / เลขที่เช็ค' : 'ธนาคาร / เลขอ้างอิง'}
                      </label>
                      <input className="input" value={form.meta?.paymentRef || ''}
                        onChange={(e) => setMeta({ paymentRef: e.target.value })}
                        placeholder={form.meta.paymentMethod === 'cheque' ? 'เช่น SCB 1234567' : 'เช่น SCB โอน 12:34'} />
                    </div>
                    {form.meta.paymentMethod === 'cheque' && (
                      <div className="field">
                        <label className="field-label">วันที่ลงเช็ค</label>
                        <input className="input" type="date" value={form.meta?.chequeDate || ''}
                          onChange={(e) => setMeta({ chequeDate: e.target.value })} />
                      </div>
                    )}
                  </div>
                )}

                <div className="form-grid mt-12">
                  <div className="field full">
                    <label className="field-label">ผู้รับเงิน (ชื่อพนักงาน)</label>
                    <input className="input" value={form.meta?.receivedBy || ''}
                      onChange={(e) => setMeta({ receivedBy: e.target.value })}
                      placeholder="ชื่อ-นามสกุล ผู้รับเงิน" />
                  </div>
                </div>
              </div>

              {/* Note */}
              <div className="field">
                <label className="field-label">หมายเหตุ</label>
                <textarea className="textarea" value={form.note}
                  onChange={(e) => set({ note: e.target.value })}
                  placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)" />
              </div>
            </div>
          </div>
        </div>

        {/* ── คอลัมน์ขวา: สรุปยอด ─────────────────── */}
        <div className="form-summary-sticky" style={{ position: 'sticky', top: 84 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">สรุปยอด</div>
              <span className="badge gray mono">{form.items.length} รายการ</span>
            </div>
            <div className="card-body">
              <div className="summary-rows">
                <div className="summary-row total">
                  <span className="label">ยอดเงินรับสุทธิ</span>
                  <span className="value">{fmt(totals.total)} <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>บาท</span></span>
                </div>
              </div>

              <div className="mt-20" style={{ padding: 12, background: 'var(--bg)', borderRadius: 10, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 500, marginBottom: 4, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="sparkle" size={13} /> ตัวอักษร
                </div>
                <div style={{ fontSize: 12 }}>{thaiBahtText(totals.total)}</div>
              </div>
            </div>
          </div>

          <div className="row gap-8 mt-16">
            <button className="btn btn-accent" style={{ flex: 1 }} onClick={handleSubmit}>
              <Icon name="save" size={14} /> บันทึก
            </button>
            <button className="btn btn-ghost" onClick={() => setPreviewOpen(true)}>
              <Icon name="eye" size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Preview modal */}
      {previewOpen && (
        <div className="modal-backdrop" onClick={() => setPreviewOpen(false)}>
          <div className="modal receipt-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header no-print">
              <div className="card-title">ตัวอย่างใบเสร็จ</div>
              <div className="row gap-8">
                <button className="btn btn-accent btn-sm" onClick={printNow}>
                  <Icon name="download" size={13} /> พิมพ์ / บันทึก PDF
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setPreviewOpen(false)}>
                  <Icon name="x" size={13} />
                </button>
              </div>
            </div>
            <div className="modal-body" style={{ background: '#e8e6e1', padding: 24 }}>
              <PrintableReceipt rec={form} company={company} app={app} />
            </div>
          </div>
        </div>
      )}

      <CompanySettingsModal open={companyOpen} onClose={() => setCompanyOpen(false)}
        onSaved={(c) => { setCompany(c); app.pushToast('บันทึกข้อมูลบริษัทแล้ว'); }} />
    </>
  );
};

// ──────────────────────────────────────────────
// PrintableReceipt — เทมเพลตทางการสำหรับพิมพ์
// ──────────────────────────────────────────────
function PrintableReceipt({ rec, company, app }) {
  const totals = computeTotals(rec);
  const proj = app?.projects?.find(p => p.id === rec.projectId);
  const meta = rec.meta || {};

  const paymentLabel = {
    cash:     'เงินสด',
    transfer: 'โอนเงิน',
    cheque:   'เช็ค',
    credit:   'เครดิต',
  }[meta.paymentMethod] || meta.paymentMethod || '—';

  return (
    <div className="printable-receipt">
      {/* Header */}
      <div className="rcpt-header">
        <div className="rcpt-company">
          {company.logoDataUrl && (
            <img src={company.logoDataUrl} alt="logo" className="rcpt-logo" />
          )}
          <div>
            <div className="rcpt-company-name">{company.name || 'ชื่อบริษัท'}</div>
            {company.branch  && <div className="rcpt-company-line">{company.branch}</div>}
            {company.address && <div className="rcpt-company-line">{company.address}</div>}
            <div className="rcpt-company-line">
              {company.phone && <span>โทร {company.phone}</span>}
              {company.phone && company.email && <span> · </span>}
              {company.email && <span>{company.email}</span>}
            </div>
            {company.taxId && (
              <div className="rcpt-company-line">เลขประจำตัวผู้เสียภาษี: <span className="rcpt-mono">{company.taxId}</span></div>
            )}
          </div>
        </div>
        <div className="rcpt-title-box">
          <div className="rcpt-title">ใบเสร็จรับเงิน</div>
          <div className="rcpt-title-en">RECEIPT</div>
          <div className="rcpt-original">ต้นฉบับ (ORIGINAL)</div>
        </div>
      </div>

      {/* Doc info row */}
      <div className="rcpt-info-row">
        <div className="rcpt-info-cell">
          <div className="rcpt-info-label">เลขที่ / No.</div>
          <div className="rcpt-info-value rcpt-mono">{rec.docNo}</div>
        </div>
        <div className="rcpt-info-cell">
          <div className="rcpt-info-label">วันที่ / Date</div>
          <div className="rcpt-info-value">{fmtDate(rec.date)}</div>
        </div>
        {meta.refDocNo && (
          <div className="rcpt-info-cell">
            <div className="rcpt-info-label">อ้างอิง / Ref</div>
            <div className="rcpt-info-value rcpt-mono">{meta.refDocNo}</div>
          </div>
        )}
      </div>

      {/* Customer info */}
      <div className="rcpt-customer">
        <div className="rcpt-customer-title">ลูกค้า / Customer</div>
        <div className="rcpt-customer-grid">
          <div>
            <div className="rcpt-customer-name">{rec.vendor || '—'}</div>
            {meta.customerAddress && (
              <div className="rcpt-customer-line">{meta.customerAddress}</div>
            )}
          </div>
          <div className="rcpt-customer-side">
            {meta.customerTaxId && (
              <div className="rcpt-customer-line">
                <span className="rcpt-customer-key">เลขผู้เสียภาษี:</span>{' '}
                <span className="rcpt-mono">{meta.customerTaxId}</span>
              </div>
            )}
            {meta.customerBranch && (
              <div className="rcpt-customer-line">
                <span className="rcpt-customer-key">สาขา:</span>{' '}
                {meta.customerBranch}
              </div>
            )}
            {proj && (
              <div className="rcpt-customer-line">
                <span className="rcpt-customer-key">โครงการ:</span>{' '}
                {proj.name}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items table */}
      <table className="rcpt-items">
        <thead>
          <tr>
            <th style={{ width: 36 }}>ลำดับ</th>
            <th>รายการ / Description</th>
            <th style={{ width: 56 }} className="rcpt-num">จำนวน</th>
            <th style={{ width: 56 }}>หน่วย</th>
            <th style={{ width: 88 }} className="rcpt-num">ราคา/หน่วย</th>
            <th style={{ width: 110 }} className="rcpt-num">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          {(rec.items || []).map((it, i) => (
            <tr key={it.id || i}>
              <td className="rcpt-num">{i + 1}</td>
              <td>{it.name || '—'}</td>
              <td className="rcpt-num rcpt-mono">{Number(it.qty || 0)}</td>
              <td>{it.unit || ''}</td>
              <td className="rcpt-num rcpt-mono">{fmt(Number(it.price || 0))}</td>
              <td className="rcpt-num rcpt-mono">{fmt(Number(it.qty || 0) * Number(it.price || 0))}</td>
            </tr>
          ))}
          {/* Empty filler rows สำหรับให้ตารางสวย */}
          {Array.from({ length: Math.max(0, 5 - (rec.items || []).length) }).map((_, i) => (
            <tr key={'empty-' + i} className="rcpt-empty-row">
              <td colSpan={6}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="rcpt-totals">
        <div className="rcpt-totals-left">
          <div className="rcpt-amount-words">
            <span className="rcpt-amount-words-label">จำนวนเงินตัวอักษร / Amount in words:</span>
            <div className="rcpt-amount-words-text">({thaiBahtText(totals.total)})</div>
          </div>
        </div>
        <div className="rcpt-totals-right">
          <div className="rcpt-total-row rcpt-total-grand">
            <span>ยอดเงินรับสุทธิ / TOTAL</span>
            <span className="rcpt-mono">{fmt(totals.total)} บาท</span>
          </div>
        </div>
      </div>

      {/* Payment + signatures */}
      <div className="rcpt-footer">
        <div className="rcpt-footer-left">
          <div className="rcpt-payment">
            <span className="rcpt-payment-label">วิธีชำระเงิน:</span> <strong>{paymentLabel}</strong>
            {meta.paymentRef && <div className="rcpt-payment-sub">{meta.paymentRef}</div>}
            {meta.paymentMethod === 'cheque' && meta.chequeDate && (
              <div className="rcpt-payment-sub">วันที่เช็ค: {fmtDate(meta.chequeDate)}</div>
            )}
          </div>
          {rec.note && (
            <div className="rcpt-note">
              <span className="rcpt-note-label">หมายเหตุ:</span> {rec.note}
            </div>
          )}
        </div>
        <div className="rcpt-signatures">
          <div className="rcpt-sig">
            <div className="rcpt-sig-line"></div>
            <div className="rcpt-sig-label">ผู้รับเงิน / Received by</div>
            {meta.receivedBy && <div className="rcpt-sig-name">({meta.receivedBy})</div>}
            <div className="rcpt-sig-date">วันที่ {fmtDate(rec.date)}</div>
          </div>
          <div className="rcpt-sig">
            <div className="rcpt-sig-line"></div>
            <div className="rcpt-sig-label">ผู้จ่ายเงิน / Paid by</div>
            <div className="rcpt-sig-date">วันที่ ............................</div>
          </div>
        </div>
      </div>
    </div>
  );
}
window.PrintableReceipt = PrintableReceipt;

// ============================================================
// TaxInvoiceForm — ฟอร์ม "ใบเสร็จรับเงิน/ใบกำกับภาษี" (มี VAT)
// ============================================================
window.TaxInvoiceForm = function TaxInvoiceForm({ initial, onSubmit, onCancel }) {
  const app = window.useApp();

  const blank = () => ({
    type: 'tax-invoice',
    docNo: 'TIV-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000 + 1000)),
    date: todayStr(),
    projectId: '',
    vendor: '',
    items: [{ id: newId(), name: '', categoryId: '', qty: 1, unit: 'รายการ', price: 0 }],
    vatMode: 'exclusive',
    vatRate: 7,
    whtEnabled: false,
    whtRate: 3,
    docs: [],
    note: '',
    images: [],
    depositAmount: 0,
    depositStatus: 'none',
    meta: {
      copyType:        'original',   // original | copy
      customerAddress: '',
      customerTaxId:   '',
      customerBranch:  'สำนักงานใหญ่',
      paymentMethod:   'cash',
      paymentRef:      '',
      chequeDate:      '',
      receivedBy:      '',
      refDocNo:        '',
    },
  });

  const [form, setForm] = useState(() => {
    if (initial) {
      const merged = { ...initial };
      merged.meta = { ...blank().meta, ...(initial.meta || {}) };
      return merged;
    }
    return blank();
  });
  const [companyOpen, setCompanyOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [company, setCompany]         = useState(() => getCompanySettings());

  const totals = useMemo(() => computeTotals(form), [form]);

  const set     = (patch)     => setForm((f) => ({ ...f, ...patch }));
  const setMeta = (metaPatch) => setForm((f) => ({ ...f, meta: { ...(f.meta || {}), ...metaPatch } }));

  const handleSubmit = () => {
    if (!form.vendor.trim()) return app.pushToast('โปรดระบุชื่อลูกค้า', 'error');
    if (!form.meta?.customerTaxId?.trim()) return app.pushToast('โปรดระบุเลขประจำตัวผู้เสียภาษีของลูกค้า', 'error');
    if (!company.taxId) return app.pushToast('โปรดตั้งค่าเลขผู้เสียภาษีของบริษัทก่อน', 'error');
    if (!form.items.some(it => it.name.trim() && Number(it.price) > 0)) {
      return app.pushToast('โปรดกรอกรายการอย่างน้อย 1 รายการ พร้อมจำนวนเงิน', 'error');
    }
    onSubmit(form);
  };

  const printNow = () => openPrintPopup(PrintableTaxInvoice, 'ใบกำกับภาษี ' + (form.docNo || ''), form, company, app);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{initial ? 'แก้ไขใบเสร็จ/ใบกำกับภาษี' : 'ออกใบเสร็จรับเงิน/ใบกำกับภาษี'}</h1>
          <div className="page-sub">ใบกำกับภาษีตามมาตรฐานกรมสรรพากร · มี VAT และรายละเอียดผู้เสียภาษี</div>
        </div>
        <div className="row gap-8 dash-actions">
          <button className="btn btn-ghost" onClick={() => setCompanyOpen(true)} title="ตั้งค่าข้อมูลบริษัท">
            <Icon name="settings" size={14} /> ข้อมูลบริษัท
          </button>
          <button className="btn btn-ghost" onClick={() => setPreviewOpen(true)}>
            <Icon name="eye" size={14} /> ดูตัวอย่าง
          </button>
          <button className="btn btn-ghost" onClick={onCancel}><Icon name="x" size={14} /> ยกเลิก</button>
          <button className="btn btn-accent" onClick={handleSubmit}><Icon name="save" size={14} /> บันทึก</button>
        </div>
      </div>

      {/* คำเตือน — บริษัทยังไม่ตั้ง Tax ID */}
      {!company.taxId && (
        <div style={{
          padding:'12px 16px', marginBottom:14, borderRadius:10,
          background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.3)',
          fontSize:13, color:'#b91c1c', display:'flex', alignItems:'center', gap:10,
        }}>
          <Icon name="bell" size={16} />
          ต้องตั้งค่า <strong>เลขประจำตัวผู้เสียภาษีของบริษัท</strong> ก่อนออกใบกำกับภาษี
          <button className="btn btn-sm" onClick={() => setCompanyOpen(true)}
            style={{ marginLeft:'auto', background:'#b91c1c', color:'#fff' }}>
            ตั้งค่า
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 18, alignItems: 'start' }} className="form-layout">
        {/* ── คอลัมน์ซ้าย ─────────────────────────── */}
        <div className="col gap-16" style={{ minWidth: 0 }}>

          {/* Card 1: ข้อมูลเอกสาร */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">ข้อมูลเอกสาร</div>
                <div className="card-sub">เลขที่ วันที่ และประเภทเอกสาร</div>
              </div>
              <span className="badge dot" style={{ background:'rgba(217,119,6,0.12)', color:'#92400e', borderColor:'rgba(217,119,6,0.3)' }}>
                ใบกำกับภาษี
              </span>
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
                <div className="field">
                  <label className="field-label">ประเภทฉบับ</label>
                  <div className="row gap-8">
                    {[
                      { id: 'original', label: 'ต้นฉบับ' },
                      { id: 'copy',     label: 'สำเนา' },
                    ].map(c => (
                      <button key={c.id} type="button"
                        className={'btn btn-sm ' + (form.meta?.copyType === c.id ? 'btn-accent' : 'btn-ghost')}
                        onClick={() => setMeta({ copyType: c.id })}>{c.label}</button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">อ้างอิงเอกสาร (ใบเสนอราคา)</label>
                  <input className="input mono" value={form.meta?.refDocNo || ''}
                    onChange={(e) => setMeta({ refDocNo: e.target.value })}
                    placeholder="เช่น QT-2026-0012" />
                </div>
                <div className="field full">
                  <label className="field-label">โครงการที่เกี่ยวข้อง (ไม่บังคับ)</label>
                  <window.ProjectPicker value={form.projectId} onChange={(v) => set({ projectId: v })}
                    projects={app.projects} onAdd={() => {}} />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: ลูกค้า (Tax ID จำเป็น) */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">ข้อมูลลูกค้า</div>
                <div className="card-sub">ใบกำกับภาษีต้องระบุเลขประจำตัวผู้เสียภาษีของลูกค้า</div>
              </div>
            </div>
            <div className="card-body">
              <div className="form-grid">
                <div className="field full">
                  <label className="field-label">ชื่อลูกค้า / นิติบุคคล <span className="req">*</span></label>
                  <input className="input" value={form.vendor}
                    onChange={(e) => set({ vendor: e.target.value })}
                    placeholder="เช่น บจก. ABC คอนสตรัคชั่น" />
                </div>
                <div className="field">
                  <label className="field-label">เลขประจำตัวผู้เสียภาษี <span className="req">*</span></label>
                  <input className="input mono" value={form.meta?.customerTaxId || ''}
                    onChange={(e) => setMeta({ customerTaxId: e.target.value })}
                    placeholder="0-0000-00000-00-0" />
                </div>
                <div className="field">
                  <label className="field-label">สาขา <span className="req">*</span></label>
                  <input className="input" value={form.meta?.customerBranch || ''}
                    onChange={(e) => setMeta({ customerBranch: e.target.value })}
                    placeholder="สำนักงานใหญ่" />
                </div>
                <div className="field full">
                  <label className="field-label">ที่อยู่ <span className="req">*</span></label>
                  <textarea className="textarea" rows={2} value={form.meta?.customerAddress || ''}
                    onChange={(e) => setMeta({ customerAddress: e.target.value })}
                    placeholder="เลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: รายการ */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">รายการสินค้า / บริการ</div>
                <div className="card-sub">ระบุรายการที่ขาย ราคา ก่อน/หลังคำนวณ VAT</div>
              </div>
              <span className="badge gray mono">{form.items.length} รายการ</span>
            </div>
            <div className="card-body">
              <window.ItemsTable
                items={form.items}
                setItems={(items) => set({ items })}
                cats={[]}
                onAddCat={() => {}}
                type="tax-invoice"
              />
            </div>
          </div>

          {/* Card 4: VAT */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">ภาษีมูลค่าเพิ่ม (VAT)</div>
                <div className="card-sub">เลือกว่าราคาในรายการรวม VAT หรือไม่</div>
              </div>
            </div>
            <div className="card-body col gap-16">
              <window.VatModeRow value={form.vatMode} onChange={(v) => set({ vatMode: v })} />
              <div className="row gap-12" style={{ alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>อัตรา VAT</span>
                <div className="input-affix" style={{ width: 130 }}>
                  <input className="input mono" type="number" step="0.5" value={form.vatRate}
                    onChange={(e) => set({ vatRate: e.target.value })} />
                  <div className="input-affix-suffix">%</div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>(มาตรฐาน 7%)</span>
              </div>

              {/* WHT */}
              <div style={{ borderTop: '1px dashed var(--line)', paddingTop: 16 }}>
                <label className="row gap-8" style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={form.whtEnabled}
                    onChange={(e) => set({ whtEnabled: e.target.checked, whtRate: e.target.checked ? 3 : 0 })} />
                  <span style={{ fontSize: 13.5, fontWeight: 500 }}>หัก ณ ที่จ่าย (ถ้ามี)</span>
                </label>
                {form.whtEnabled && (
                  <div className="row gap-12 mt-12" style={{ alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>อัตรา</span>
                    <div className="input-affix" style={{ width: 130 }}>
                      <input className="input mono" type="number" step="0.5" value={form.whtRate}
                        onChange={(e) => set({ whtRate: e.target.value })} />
                      <div className="input-affix-suffix">%</div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>(ค่าบริการมักหัก 3%)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 5: การชำระเงิน */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">การชำระเงิน</div>
                <div className="card-sub">วิธีชำระเงิน และผู้รับเงิน</div>
              </div>
            </div>
            <div className="card-body col gap-20">
              <div className="field">
                <label className="field-label"><Icon name="money" size={13} /> วิธีชำระเงิน</label>
                <div className="row gap-8 wrap">
                  {[
                    { id: 'cash', label: 'เงินสด' },
                    { id: 'transfer', label: 'โอนเงิน' },
                    { id: 'cheque', label: 'เช็ค' },
                    { id: 'credit', label: 'เครดิต' },
                  ].map(m => (
                    <button key={m.id} type="button"
                      className={'btn btn-sm ' + (form.meta?.paymentMethod === m.id ? 'btn-accent' : 'btn-ghost')}
                      onClick={() => setMeta({ paymentMethod: m.id })}>
                      {m.label}
                    </button>
                  ))}
                </div>

                {(form.meta?.paymentMethod === 'transfer' || form.meta?.paymentMethod === 'cheque') && (
                  <div className="form-grid mt-12">
                    <div className="field">
                      <label className="field-label">
                        {form.meta.paymentMethod === 'cheque' ? 'ธนาคาร / เลขที่เช็ค' : 'ธนาคาร / เลขอ้างอิง'}
                      </label>
                      <input className="input" value={form.meta?.paymentRef || ''}
                        onChange={(e) => setMeta({ paymentRef: e.target.value })} />
                    </div>
                    {form.meta.paymentMethod === 'cheque' && (
                      <div className="field">
                        <label className="field-label">วันที่ลงเช็ค</label>
                        <input className="input" type="date" value={form.meta?.chequeDate || ''}
                          onChange={(e) => setMeta({ chequeDate: e.target.value })} />
                      </div>
                    )}
                  </div>
                )}

                <div className="form-grid mt-12">
                  <div className="field full">
                    <label className="field-label">ผู้รับเงิน (ชื่อพนักงาน)</label>
                    <input className="input" value={form.meta?.receivedBy || ''}
                      onChange={(e) => setMeta({ receivedBy: e.target.value })}
                      placeholder="ชื่อ-นามสกุล ผู้รับเงิน" />
                  </div>
                </div>
              </div>

              <div className="field">
                <label className="field-label">หมายเหตุ</label>
                <textarea className="textarea" value={form.note}
                  onChange={(e) => set({ note: e.target.value })}
                  placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)" />
              </div>
            </div>
          </div>
        </div>

        {/* ── คอลัมน์ขวา: สรุปยอด ─────────────────── */}
        <div className="form-summary-sticky" style={{ position: 'sticky', top: 84 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">สรุปยอด</div>
              <span className="badge amber dot">
                {form.vatMode === 'inclusive' ? 'รวม VAT แล้ว' : 'ยังไม่รวม VAT'}
              </span>
            </div>
            <div className="card-body">
              <div className="summary-rows">
                <div className="summary-row">
                  <span className="label">มูลค่าก่อนภาษี</span>
                  <span className="value">{fmt(totals.subTotal)}</span>
                </div>
                <div className="summary-row">
                  <span className="label">VAT {form.vatRate}%</span>
                  <span className="value">{fmt(totals.vat)}</span>
                </div>
                <div className="summary-row" style={{ borderTop: '1px dashed var(--line)', paddingTop: 10 }}>
                  <span className="label">รวมก่อนหัก ณ ที่จ่าย</span>
                  <span className="value">{fmt(totals.beforeWht)}</span>
                </div>
                {form.whtEnabled && (
                  <div className="summary-row">
                    <span className="label">หัก ณ ที่จ่าย {form.whtRate}%</span>
                    <span className="value" style={{ color: 'var(--danger)' }}>− {fmt(totals.wht)}</span>
                  </div>
                )}
                <div className="summary-row total">
                  <span className="label">รับเงินสุทธิ</span>
                  <span className="value">{fmt(totals.total)} <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>บาท</span></span>
                </div>
              </div>

              <div className="mt-20" style={{ padding: 12, background: 'var(--bg)', borderRadius: 10, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 500, marginBottom: 4, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="sparkle" size={13} /> ตัวอักษร
                </div>
                <div style={{ fontSize: 12 }}>{thaiBahtText(totals.total)}</div>
              </div>
            </div>
          </div>

          <div className="row gap-8 mt-16">
            <button className="btn btn-accent" style={{ flex: 1 }} onClick={handleSubmit}>
              <Icon name="save" size={14} /> บันทึก
            </button>
            <button className="btn btn-ghost" onClick={() => setPreviewOpen(true)}>
              <Icon name="eye" size={14} />
            </button>
          </div>
        </div>
      </div>

      {previewOpen && (
        <div className="modal-backdrop" onClick={() => setPreviewOpen(false)}>
          <div className="modal receipt-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header no-print">
              <div className="card-title">ตัวอย่างใบเสร็จ/ใบกำกับภาษี</div>
              <div className="row gap-8">
                <button className="btn btn-accent btn-sm" onClick={printNow}>
                  <Icon name="download" size={13} /> พิมพ์ / บันทึก PDF
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setPreviewOpen(false)}>
                  <Icon name="x" size={13} />
                </button>
              </div>
            </div>
            <div className="modal-body" style={{ background: '#e8e6e1', padding: 24 }}>
              <PrintableTaxInvoice rec={form} company={company} app={app} />
            </div>
          </div>
        </div>
      )}

      <CompanySettingsModal open={companyOpen} onClose={() => setCompanyOpen(false)}
        onSaved={(c) => { setCompany(c); app.pushToast('บันทึกข้อมูลบริษัทแล้ว'); }} />
    </>
  );
};

// ============================================================
// PrintableTaxInvoice — ใบเสร็จรับเงิน/ใบกำกับภาษี (A4 ทางการ)
// ============================================================
function PrintableTaxInvoice({ rec, company, app }) {
  const totals = computeTotals(rec);
  const proj = app?.projects?.find(p => p.id === rec.projectId);
  const meta = rec.meta || {};

  const paymentLabel = {
    cash:     'เงินสด',
    transfer: 'โอนเงิน',
    cheque:   'เช็ค',
    credit:   'เครดิต',
  }[meta.paymentMethod] || meta.paymentMethod || '—';

  const copyLabel = meta.copyType === 'copy' ? 'สำเนา (COPY)' : 'ต้นฉบับ (ORIGINAL)';

  return (
    <div className="printable-receipt">
      {/* Header */}
      <div className="rcpt-header">
        <div className="rcpt-company">
          {company.logoDataUrl && (
            <img src={company.logoDataUrl} alt="logo" className="rcpt-logo" />
          )}
          <div>
            <div className="rcpt-company-name">{company.name || 'ชื่อบริษัท'}</div>
            {company.branch  && <div className="rcpt-company-line">{company.branch}</div>}
            {company.address && <div className="rcpt-company-line">{company.address}</div>}
            <div className="rcpt-company-line">
              {company.phone && <span>โทร {company.phone}</span>}
              {company.phone && company.email && <span> · </span>}
              {company.email && <span>{company.email}</span>}
            </div>
            {company.taxId && (
              <div className="rcpt-company-line" style={{ marginTop: 3 }}>
                <strong>เลขประจำตัวผู้เสียภาษี:</strong> <span className="rcpt-mono">{company.taxId}</span>
              </div>
            )}
          </div>
        </div>
        <div className="rcpt-title-box">
          <div className="rcpt-title">ใบเสร็จรับเงิน / ใบกำกับภาษี</div>
          <div className="rcpt-title-en">RECEIPT / TAX INVOICE</div>
          <div className="rcpt-original">{copyLabel}</div>
        </div>
      </div>

      {/* Doc info */}
      <div className="rcpt-info-row">
        <div className="rcpt-info-cell">
          <div className="rcpt-info-label">เลขที่ / No.</div>
          <div className="rcpt-info-value rcpt-mono">{rec.docNo}</div>
        </div>
        <div className="rcpt-info-cell">
          <div className="rcpt-info-label">วันที่ / Date</div>
          <div className="rcpt-info-value">{fmtDate(rec.date)}</div>
        </div>
        {meta.refDocNo && (
          <div className="rcpt-info-cell">
            <div className="rcpt-info-label">อ้างอิง / Ref</div>
            <div className="rcpt-info-value rcpt-mono">{meta.refDocNo}</div>
          </div>
        )}
      </div>

      {/* Customer */}
      <div className="rcpt-customer">
        <div className="rcpt-customer-title">ลูกค้า / Customer</div>
        <div className="rcpt-customer-grid">
          <div>
            <div className="rcpt-customer-name">{rec.vendor || '—'}</div>
            {meta.customerAddress && (
              <div className="rcpt-customer-line">{meta.customerAddress}</div>
            )}
          </div>
          <div className="rcpt-customer-side">
            <div className="rcpt-customer-line">
              <span className="rcpt-customer-key">เลขผู้เสียภาษี:</span>{' '}
              <span className="rcpt-mono"><strong>{meta.customerTaxId || '—'}</strong></span>
            </div>
            <div className="rcpt-customer-line">
              <span className="rcpt-customer-key">สาขา:</span>{' '}
              {meta.customerBranch || '—'}
            </div>
            {proj && (
              <div className="rcpt-customer-line">
                <span className="rcpt-customer-key">โครงการ:</span> {proj.name}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <table className="rcpt-items">
        <thead>
          <tr>
            <th style={{ width: 36 }}>ลำดับ</th>
            <th>รายการ / Description</th>
            <th style={{ width: 56 }} className="rcpt-num">จำนวน</th>
            <th style={{ width: 56 }}>หน่วย</th>
            <th style={{ width: 88 }} className="rcpt-num">ราคา/หน่วย</th>
            <th style={{ width: 110 }} className="rcpt-num">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          {(rec.items || []).map((it, i) => (
            <tr key={it.id || i}>
              <td className="rcpt-num">{i + 1}</td>
              <td>{it.name || '—'}</td>
              <td className="rcpt-num rcpt-mono">{Number(it.qty || 0)}</td>
              <td>{it.unit || ''}</td>
              <td className="rcpt-num rcpt-mono">{fmt(Number(it.price || 0))}</td>
              <td className="rcpt-num rcpt-mono">{fmt(Number(it.qty || 0) * Number(it.price || 0))}</td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 5 - (rec.items || []).length) }).map((_, i) => (
            <tr key={'empty-' + i} className="rcpt-empty-row">
              <td colSpan={6}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals — VAT breakdown */}
      <div className="rcpt-totals">
        <div className="rcpt-totals-left">
          <div className="rcpt-amount-words">
            <span className="rcpt-amount-words-label">จำนวนเงินตัวอักษร / Amount in words:</span>
            <div className="rcpt-amount-words-text">({thaiBahtText(totals.total)})</div>
          </div>
        </div>
        <div className="rcpt-totals-right">
          <div className="rcpt-total-row">
            <span>มูลค่าก่อนภาษี / Sub-total</span>
            <span className="rcpt-mono">{fmt(totals.subTotal)}</span>
          </div>
          <div className="rcpt-total-row">
            <span>ภาษีมูลค่าเพิ่ม {rec.vatRate}% / VAT</span>
            <span className="rcpt-mono">{fmt(totals.vat)}</span>
          </div>
          <div className="rcpt-total-row" style={{ background:'#f5f5f5', fontWeight:600 }}>
            <span>รวมเงิน / Total</span>
            <span className="rcpt-mono">{fmt(totals.beforeWht)}</span>
          </div>
          {rec.whtEnabled && totals.wht > 0 && (
            <div className="rcpt-total-row">
              <span>หัก ณ ที่จ่าย {rec.whtRate}% / WHT</span>
              <span className="rcpt-mono">−{fmt(totals.wht)}</span>
            </div>
          )}
          <div className="rcpt-total-row rcpt-total-grand">
            <span>รับเงินสุทธิ / NET</span>
            <span className="rcpt-mono">{fmt(totals.total)} บาท</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="rcpt-footer">
        <div className="rcpt-footer-left">
          <div className="rcpt-payment">
            <span className="rcpt-payment-label">วิธีชำระเงิน:</span> <strong>{paymentLabel}</strong>
            {meta.paymentRef && <div className="rcpt-payment-sub">{meta.paymentRef}</div>}
            {meta.paymentMethod === 'cheque' && meta.chequeDate && (
              <div className="rcpt-payment-sub">วันที่เช็ค: {fmtDate(meta.chequeDate)}</div>
            )}
          </div>
          {rec.note && (
            <div className="rcpt-note">
              <span className="rcpt-note-label">หมายเหตุ:</span> {rec.note}
            </div>
          )}
        </div>
        <div className="rcpt-signatures">
          <div className="rcpt-sig">
            <div className="rcpt-sig-line"></div>
            <div className="rcpt-sig-label">ผู้รับเงิน / Received by</div>
            {meta.receivedBy && <div className="rcpt-sig-name">({meta.receivedBy})</div>}
            <div className="rcpt-sig-date">วันที่ {fmtDate(rec.date)}</div>
          </div>
          <div className="rcpt-sig">
            <div className="rcpt-sig-line"></div>
            <div className="rcpt-sig-label">ผู้จ่ายเงิน / Paid by</div>
            <div className="rcpt-sig-date">วันที่ ............................</div>
          </div>
        </div>
      </div>
    </div>
  );
}
window.PrintableTaxInvoice = PrintableTaxInvoice;

// ============================================================
// InvoiceForm — ใบแจ้งหนี้ตั้งเบิกงวดงาน (ก่อนรับเงิน)
// ============================================================
window.InvoiceForm = function InvoiceForm({ initial, onSubmit, onCancel }) {
  const app = window.useApp();

  const blank = () => {
    // due date default = +30 วันจากวันที่ออก
    const due = new Date();
    due.setDate(due.getDate() + 30);
    return {
      type: 'invoice',
      docNo: 'IV-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000 + 1000)),
      date: todayStr(),
      projectId: '',
      vendor: '',
      items: [{ id: newId(), name: 'งานก่อสร้างตามสัญญา งวดที่ ___', categoryId: '', qty: 1, unit: 'งวด', price: 0 }],
      vatMode: 'exclusive',
      vatRate: 0,             // ใบแจ้งหนี้ไม่คิด VAT
      whtEnabled: false,
      whtRate: 0,
      docs: [],
      note: '',
      images: [],
      depositAmount: 0,
      depositStatus: 'none',
      meta: {
        customerAddress:  '',
        customerTaxId:    '',
        customerBranch:   'สำนักงานใหญ่',
        dueDate:          due.toISOString().slice(0, 10),
        installmentNo:    '',
        installmentTotal: '',
        workPeriodFrom:   '',
        workPeriodTo:     '',
        progressPercent:  '',
        contractNo:       '',
        bankName:         '',
        bankAccountNo:    '',
        bankAccountName:  '',
        bankBranch:       '',
        paymentTerms:     'ชำระภายใน 30 วัน นับจากวันที่ออกใบแจ้งหนี้',
        preparedBy:       '',
        approvedBy:       '',
      },
    };
  };

  const [form, setForm] = useState(() => {
    if (initial) {
      const merged = { ...initial };
      merged.meta = { ...blank().meta, ...(initial.meta || {}) };
      return merged;
    }
    return blank();
  });
  const [companyOpen, setCompanyOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [company, setCompany]         = useState(() => getCompanySettings());

  const totals = useMemo(() => computeTotals(form), [form]);

  const set     = (patch)     => setForm((f) => ({ ...f, ...patch }));
  const setMeta = (metaPatch) => setForm((f) => ({ ...f, meta: { ...(f.meta || {}), ...metaPatch } }));

  const handleSubmit = () => {
    if (!form.vendor.trim()) return app.pushToast('โปรดระบุชื่อลูกค้า', 'error');
    if (!form.items.some(it => it.name.trim() && Number(it.price) > 0)) {
      return app.pushToast('โปรดกรอกรายการอย่างน้อย 1 รายการ พร้อมจำนวนเงิน', 'error');
    }
    onSubmit(form);
  };

  const printNow = () => openPrintPopup(PrintableInvoice, 'ใบแจ้งหนี้ ' + (form.docNo || ''), form, company, app);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{initial ? 'แก้ไขใบแจ้งหนี้' : 'ออกใบแจ้งหนี้ตั้งเบิกงวดงาน'}</h1>
          <div className="page-sub">ใบแจ้งหนี้เพื่อตั้งเบิกค่างวดงานกับลูกค้า · ระบุงวดงาน วันครบกำหนด และเลขบัญชี</div>
        </div>
        <div className="row gap-8 dash-actions">
          <button className="btn btn-ghost" onClick={() => setCompanyOpen(true)} title="ตั้งค่าข้อมูลบริษัท">
            <Icon name="settings" size={14} /> ข้อมูลบริษัท
          </button>
          <button className="btn btn-ghost" onClick={() => setPreviewOpen(true)}>
            <Icon name="eye" size={14} /> ดูตัวอย่าง
          </button>
          <button className="btn btn-ghost" onClick={onCancel}><Icon name="x" size={14} /> ยกเลิก</button>
          <button className="btn btn-accent" onClick={handleSubmit}><Icon name="save" size={14} /> บันทึก</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 18, alignItems: 'start' }} className="form-layout">
        <div className="col gap-16" style={{ minWidth: 0 }}>

          {/* Card 1: ข้อมูลเอกสาร + งวดงาน */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">ข้อมูลเอกสาร</div>
                <div className="card-sub">เลขที่ วันออก วันครบกำหนดชำระ และงวดงาน</div>
              </div>
              <span className="badge dot" style={{ background:'rgba(37,99,235,0.12)', color:'#1d4ed8', borderColor:'rgba(37,99,235,0.3)' }}>
                ใบแจ้งหนี้
              </span>
            </div>
            <div className="card-body">
              <div className="form-grid">
                <div className="field">
                  <label className="field-label">เลขที่เอกสาร <span className="req">*</span></label>
                  <input className="input mono" value={form.docNo} onChange={(e) => set({ docNo: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field-label">วันที่ออก <span className="req">*</span></label>
                  <input className="input" type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field-label">
                    <Icon name="calendar" size={13} /> วันครบกำหนดชำระ <span className="req">*</span>
                  </label>
                  <input className="input" type="date" value={form.meta?.dueDate || ''}
                    onChange={(e) => setMeta({ dueDate: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field-label">เลขที่สัญญา / Contract No.</label>
                  <input className="input mono" value={form.meta?.contractNo || ''}
                    onChange={(e) => setMeta({ contractNo: e.target.value })}
                    placeholder="เช่น C-2026-001" />
                </div>

                {/* งวดงาน */}
                <div className="field">
                  <label className="field-label">งวดที่</label>
                  <input className="input mono" value={form.meta?.installmentNo || ''}
                    onChange={(e) => setMeta({ installmentNo: e.target.value })}
                    placeholder="เช่น 3" />
                </div>
                <div className="field">
                  <label className="field-label">จากทั้งหมด (งวด)</label>
                  <input className="input mono" value={form.meta?.installmentTotal || ''}
                    onChange={(e) => setMeta({ installmentTotal: e.target.value })}
                    placeholder="เช่น 5" />
                </div>

                {/* ช่วงงานที่เบิก */}
                <div className="field">
                  <label className="field-label">ช่วงงาน — เริ่ม</label>
                  <input className="input" type="date" value={form.meta?.workPeriodFrom || ''}
                    onChange={(e) => setMeta({ workPeriodFrom: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field-label">ช่วงงาน — สิ้นสุด</label>
                  <input className="input" type="date" value={form.meta?.workPeriodTo || ''}
                    onChange={(e) => setMeta({ workPeriodTo: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field-label">ความก้าวหน้างาน</label>
                  <div className="input-affix">
                    <input className="input mono" type="number" min="0" max="100" step="1"
                      value={form.meta?.progressPercent || ''}
                      onChange={(e) => setMeta({ progressPercent: e.target.value })}
                      placeholder="0" />
                    <div className="input-affix-suffix">%</div>
                  </div>
                </div>

                <div className="field full">
                  <label className="field-label">โครงการ</label>
                  <window.ProjectPicker value={form.projectId} onChange={(v) => set({ projectId: v })}
                    projects={app.projects} onAdd={() => {}} />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: ลูกค้า */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">ข้อมูลลูกค้า</div>
                <div className="card-sub">ชื่อ ที่อยู่ และเลขประจำตัวผู้เสียภาษี</div>
              </div>
            </div>
            <div className="card-body">
              <div className="form-grid">
                <div className="field full">
                  <label className="field-label">ชื่อลูกค้า / นิติบุคคล <span className="req">*</span></label>
                  <input className="input" value={form.vendor}
                    onChange={(e) => set({ vendor: e.target.value })}
                    placeholder="เช่น บจก. ABC คอนสตรัคชั่น" />
                </div>
                <div className="field">
                  <label className="field-label">เลขประจำตัวผู้เสียภาษี</label>
                  <input className="input mono" value={form.meta?.customerTaxId || ''}
                    onChange={(e) => setMeta({ customerTaxId: e.target.value })}
                    placeholder="0-0000-00000-00-0" />
                </div>
                <div className="field">
                  <label className="field-label">สาขา</label>
                  <input className="input" value={form.meta?.customerBranch || ''}
                    onChange={(e) => setMeta({ customerBranch: e.target.value })} />
                </div>
                <div className="field full">
                  <label className="field-label">ที่อยู่</label>
                  <textarea className="textarea" rows={2} value={form.meta?.customerAddress || ''}
                    onChange={(e) => setMeta({ customerAddress: e.target.value })}
                    placeholder="เลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: รายการ */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">รายการเรียกเก็บ</div>
                <div className="card-sub">รายละเอียดงานที่ตั้งเบิก พร้อมจำนวนเงิน</div>
              </div>
              <span className="badge gray mono">{form.items.length} รายการ</span>
            </div>
            <div className="card-body">
              <window.ItemsTable
                items={form.items}
                setItems={(items) => set({ items })}
                cats={[]}
                onAddCat={() => {}}
                type="invoice"
              />
            </div>
          </div>

          {/* Card 4: บัญชีรับโอนเงิน */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title"><Icon name="money" size={14} /> บัญชีรับโอนเงิน</div>
                <div className="card-sub">บัญชีธนาคารที่ให้ลูกค้าโอนเงินมา</div>
              </div>
            </div>
            <div className="card-body">
              <div className="form-grid">
                <div className="field">
                  <label className="field-label">ธนาคาร</label>
                  <input className="input" value={form.meta?.bankName || ''}
                    onChange={(e) => setMeta({ bankName: e.target.value })}
                    placeholder="เช่น ธนาคารกสิกรไทย" />
                </div>
                <div className="field">
                  <label className="field-label">สาขา</label>
                  <input className="input" value={form.meta?.bankBranch || ''}
                    onChange={(e) => setMeta({ bankBranch: e.target.value })}
                    placeholder="เช่น สาขาสีลม" />
                </div>
                <div className="field">
                  <label className="field-label">เลขที่บัญชี</label>
                  <input className="input mono" value={form.meta?.bankAccountNo || ''}
                    onChange={(e) => setMeta({ bankAccountNo: e.target.value })}
                    placeholder="xxx-x-xxxxx-x" />
                </div>
                <div className="field">
                  <label className="field-label">ชื่อบัญชี</label>
                  <input className="input" value={form.meta?.bankAccountName || ''}
                    onChange={(e) => setMeta({ bankAccountName: e.target.value })}
                    placeholder="เช่น บจก. ฟอร์เฮ้าส์" />
                </div>
                <div className="field full">
                  <label className="field-label">เงื่อนไขการชำระเงิน</label>
                  <input className="input" value={form.meta?.paymentTerms || ''}
                    onChange={(e) => setMeta({ paymentTerms: e.target.value })}
                    placeholder="เช่น ชำระภายใน 30 วัน นับจากวันที่ออกใบแจ้งหนี้" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: ผู้จัดทำ + อนุมัติ + หมายเหตุ */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">ลงนาม และหมายเหตุ</div>
                <div className="card-sub">ผู้จัดทำเอกสาร และผู้อนุมัติ</div>
              </div>
            </div>
            <div className="card-body">
              <div className="form-grid">
                <div className="field">
                  <label className="field-label">ผู้จัดทำเอกสาร</label>
                  <input className="input" value={form.meta?.preparedBy || ''}
                    onChange={(e) => setMeta({ preparedBy: e.target.value })}
                    placeholder="ชื่อ-นามสกุล" />
                </div>
                <div className="field">
                  <label className="field-label">ผู้อนุมัติ</label>
                  <input className="input" value={form.meta?.approvedBy || ''}
                    onChange={(e) => setMeta({ approvedBy: e.target.value })}
                    placeholder="ชื่อ-นามสกุล" />
                </div>
                <div className="field full">
                  <label className="field-label">หมายเหตุ</label>
                  <textarea className="textarea" value={form.note}
                    onChange={(e) => set({ note: e.target.value })}
                    placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* คอลัมน์ขวา: สรุปยอด */}
        <div className="form-summary-sticky" style={{ position: 'sticky', top: 84 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">สรุปยอดเรียกเก็บ</div>
              <span className="badge gray mono">{form.items.length} รายการ</span>
            </div>
            <div className="card-body">
              <div className="summary-rows">
                <div className="summary-row total">
                  <span className="label">ยอดที่ต้องรับ</span>
                  <span className="value">{fmt(totals.total)} <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>บาท</span></span>
                </div>
              </div>

              <div className="mt-20" style={{ padding: 12, background: 'rgba(37,99,235,0.06)', borderRadius: 10, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.6, borderLeft:'3px solid #2563eb' }}>
                <div style={{ fontWeight: 500, marginBottom: 4, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6, color:'#1d4ed8' }}>
                  <Icon name="calendar" size={13} /> ครบกำหนดชำระ
                </div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {form.meta?.dueDate ? fmtDate(form.meta.dueDate) : '— โปรดเลือกวันที่ —'}
                </div>
              </div>

              <div className="mt-12" style={{ padding: 12, background: 'var(--bg)', borderRadius: 10, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 500, marginBottom: 4, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="sparkle" size={13} /> ตัวอักษร
                </div>
                <div style={{ fontSize: 12 }}>{thaiBahtText(totals.total)}</div>
              </div>
            </div>
          </div>

          <div className="row gap-8 mt-16">
            <button className="btn btn-accent" style={{ flex: 1 }} onClick={handleSubmit}>
              <Icon name="save" size={14} /> บันทึก
            </button>
            <button className="btn btn-ghost" onClick={() => setPreviewOpen(true)}>
              <Icon name="eye" size={14} />
            </button>
          </div>
        </div>
      </div>

      {previewOpen && (
        <div className="modal-backdrop" onClick={() => setPreviewOpen(false)}>
          <div className="modal receipt-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header no-print">
              <div className="card-title">ตัวอย่างใบแจ้งหนี้</div>
              <div className="row gap-8">
                <button className="btn btn-accent btn-sm" onClick={printNow}>
                  <Icon name="download" size={13} /> พิมพ์ / บันทึก PDF
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setPreviewOpen(false)}>
                  <Icon name="x" size={13} />
                </button>
              </div>
            </div>
            <div className="modal-body" style={{ background: '#e8e6e1', padding: 24 }}>
              <PrintableInvoice rec={form} company={company} app={app} />
            </div>
          </div>
        </div>
      )}

      <CompanySettingsModal open={companyOpen} onClose={() => setCompanyOpen(false)}
        onSaved={(c) => { setCompany(c); app.pushToast('บันทึกข้อมูลบริษัทแล้ว'); }} />
    </>
  );
};

// ============================================================
// PrintableInvoice — ใบแจ้งหนี้ตั้งเบิกงวดงาน (A4 ทางการ)
// ============================================================
function PrintableInvoice({ rec, company, app }) {
  const totals = computeTotals(rec);
  const proj = app?.projects?.find(p => p.id === rec.projectId);
  const meta = rec.meta || {};

  const installmentText = meta.installmentNo
    ? `งวดที่ ${meta.installmentNo}${meta.installmentTotal ? ` / ${meta.installmentTotal}` : ''}`
    : null;

  const workPeriodText = meta.workPeriodFrom && meta.workPeriodTo
    ? `${fmtDate(meta.workPeriodFrom)} — ${fmtDate(meta.workPeriodTo)}`
    : null;

  return (
    <div className="printable-receipt">
      {/* Header */}
      <div className="rcpt-header">
        <div className="rcpt-company">
          {company.logoDataUrl && (
            <img src={company.logoDataUrl} alt="logo" className="rcpt-logo" />
          )}
          <div>
            <div className="rcpt-company-name">{company.name || 'ชื่อบริษัท'}</div>
            {company.branch  && <div className="rcpt-company-line">{company.branch}</div>}
            {company.address && <div className="rcpt-company-line">{company.address}</div>}
            <div className="rcpt-company-line">
              {company.phone && <span>โทร {company.phone}</span>}
              {company.phone && company.email && <span> · </span>}
              {company.email && <span>{company.email}</span>}
            </div>
            {company.taxId && (
              <div className="rcpt-company-line" style={{ marginTop: 3 }}>
                <strong>เลขประจำตัวผู้เสียภาษี:</strong> <span className="rcpt-mono">{company.taxId}</span>
              </div>
            )}
          </div>
        </div>
        <div className="rcpt-title-box">
          <div className="rcpt-title">ใบแจ้งหนี้</div>
          <div className="rcpt-title-en">INVOICE</div>
          <div className="rcpt-original">ต้นฉบับ (ORIGINAL)</div>
        </div>
      </div>

      {/* Doc info */}
      <div className="rcpt-info-row">
        <div className="rcpt-info-cell">
          <div className="rcpt-info-label">เลขที่ / No.</div>
          <div className="rcpt-info-value rcpt-mono">{rec.docNo}</div>
        </div>
        <div className="rcpt-info-cell">
          <div className="rcpt-info-label">วันที่ออก / Issue Date</div>
          <div className="rcpt-info-value">{fmtDate(rec.date)}</div>
        </div>
        <div className="rcpt-info-cell" style={{ background:'rgba(220,38,38,0.06)', padding:'4px 10px', borderRadius:4 }}>
          <div className="rcpt-info-label" style={{ color:'#dc2626' }}>ครบกำหนด / Due Date</div>
          <div className="rcpt-info-value" style={{ color:'#dc2626', fontWeight:700 }}>{fmtDate(meta.dueDate)}</div>
        </div>
        {meta.contractNo && (
          <div className="rcpt-info-cell">
            <div className="rcpt-info-label">สัญญา / Contract</div>
            <div className="rcpt-info-value rcpt-mono">{meta.contractNo}</div>
          </div>
        )}
      </div>

      {/* Customer */}
      <div className="rcpt-customer">
        <div className="rcpt-customer-title">ลูกค้า / Bill To</div>
        <div className="rcpt-customer-grid">
          <div>
            <div className="rcpt-customer-name">{rec.vendor || '—'}</div>
            {meta.customerAddress && <div className="rcpt-customer-line">{meta.customerAddress}</div>}
          </div>
          <div className="rcpt-customer-side">
            {meta.customerTaxId && (
              <div className="rcpt-customer-line">
                <span className="rcpt-customer-key">เลขผู้เสียภาษี:</span>{' '}
                <span className="rcpt-mono">{meta.customerTaxId}</span>
              </div>
            )}
            {meta.customerBranch && (
              <div className="rcpt-customer-line">
                <span className="rcpt-customer-key">สาขา:</span> {meta.customerBranch}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Project + Installment info */}
      {(proj || installmentText || workPeriodText || meta.progressPercent) && (
        <div className="invoice-project-bar">
          {proj && (
            <div className="ipb-cell">
              <div className="ipb-label">โครงการ</div>
              <div className="ipb-value">{proj.name}</div>
            </div>
          )}
          {installmentText && (
            <div className="ipb-cell">
              <div className="ipb-label">งวดงาน</div>
              <div className="ipb-value" style={{ color:'#1d4ed8', fontWeight:700 }}>{installmentText}</div>
            </div>
          )}
          {workPeriodText && (
            <div className="ipb-cell">
              <div className="ipb-label">ช่วงงาน</div>
              <div className="ipb-value">{workPeriodText}</div>
            </div>
          )}
          {meta.progressPercent && (
            <div className="ipb-cell">
              <div className="ipb-label">ความก้าวหน้า</div>
              <div className="ipb-value">{meta.progressPercent}%</div>
            </div>
          )}
        </div>
      )}

      {/* Items table */}
      <table className="rcpt-items">
        <thead>
          <tr>
            <th style={{ width: 36 }}>ลำดับ</th>
            <th>รายการ / Description</th>
            <th style={{ width: 56 }} className="rcpt-num">จำนวน</th>
            <th style={{ width: 56 }}>หน่วย</th>
            <th style={{ width: 88 }} className="rcpt-num">ราคา/หน่วย</th>
            <th style={{ width: 110 }} className="rcpt-num">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          {(rec.items || []).map((it, i) => (
            <tr key={it.id || i}>
              <td className="rcpt-num">{i + 1}</td>
              <td>{it.name || '—'}</td>
              <td className="rcpt-num rcpt-mono">{Number(it.qty || 0)}</td>
              <td>{it.unit || ''}</td>
              <td className="rcpt-num rcpt-mono">{fmt(Number(it.price || 0))}</td>
              <td className="rcpt-num rcpt-mono">{fmt(Number(it.qty || 0) * Number(it.price || 0))}</td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 4 - (rec.items || []).length) }).map((_, i) => (
            <tr key={'empty-' + i} className="rcpt-empty-row">
              <td colSpan={6}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="rcpt-totals">
        <div className="rcpt-totals-left">
          <div className="rcpt-amount-words">
            <span className="rcpt-amount-words-label">จำนวนเงินตัวอักษร / Amount in words:</span>
            <div className="rcpt-amount-words-text">({thaiBahtText(totals.total)})</div>
          </div>
        </div>
        {/* กล่อง AMOUNT DUE */}
        <div style={{
          border: '2px solid #1a1a1a', borderRadius: 4, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
        }}>
          {/* header label — พื้นเทาอ่อน */}
          <div style={{
            background: '#f0f0f0', borderBottom: '1px solid #bbb',
            WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
            padding: '5px 12px',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            color: '#333', textTransform: 'uppercase',
          }}>
            ยอดที่ต้องชำระ / Amount Due
          </div>
          {/* ตัวเลขหลัก — พื้นขาว ตัวเลขใหญ่ดำ */}
          <div style={{
            background: '#fff',
            WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
            padding: '10px 14px',
            display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 5,
          }}>
            <span className="rcpt-mono" style={{ fontSize: 28, fontWeight: 700, color: '#000', letterSpacing: '0.02em' }}>
              {fmt(totals.total)}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#222' }}>บาท</span>
          </div>
        </div>
      </div>

      {/* Payment info box */}
      <div className="invoice-payment-box">
        <div className="invoice-payment-title">
          <Icon name="money" size={14} /> ข้อมูลการชำระเงิน / Payment Information
        </div>
        <div className="invoice-payment-grid">
          <div className="invoice-payment-item">
            <div className="invoice-payment-label">ธนาคาร / Bank</div>
            <div className="invoice-payment-value">{meta.bankName || '—'}</div>
          </div>
          <div className="invoice-payment-item">
            <div className="invoice-payment-label">สาขา / Branch</div>
            <div className="invoice-payment-value">{meta.bankBranch || '—'}</div>
          </div>
          <div className="invoice-payment-item">
            <div className="invoice-payment-label">เลขที่บัญชี / Acc No.</div>
            <div className="invoice-payment-value rcpt-mono">{meta.bankAccountNo || '—'}</div>
          </div>
          <div className="invoice-payment-item">
            <div className="invoice-payment-label">ชื่อบัญชี / Acc Name</div>
            <div className="invoice-payment-value">{meta.bankAccountName || '—'}</div>
          </div>
        </div>
        {meta.paymentTerms && (
          <div className="invoice-payment-terms">
            <strong>เงื่อนไข:</strong> {meta.paymentTerms}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="rcpt-footer">
        <div className="rcpt-footer-left">
          {rec.note && (
            <div className="rcpt-note">
              <span className="rcpt-note-label">หมายเหตุ:</span> {rec.note}
            </div>
          )}
        </div>
        <div className="rcpt-signatures">
          <div className="rcpt-sig">
            <div className="rcpt-sig-line"></div>
            <div className="rcpt-sig-label">ผู้จัดทำ / Prepared by</div>
            {meta.preparedBy && <div className="rcpt-sig-name">({meta.preparedBy})</div>}
          </div>
          <div className="rcpt-sig">
            <div className="rcpt-sig-line"></div>
            <div className="rcpt-sig-label">ผู้อนุมัติ / Approved by</div>
            {meta.approvedBy && <div className="rcpt-sig-name">({meta.approvedBy})</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
window.PrintableInvoice = PrintableInvoice;

