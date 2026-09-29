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
  preparedByName:      '',
  preparedBySignature: '',
  approvedByName:      '',
  approvedBySignature: '',
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
.rcpt-sig{text-align:center;padding-top:12px}
.rcpt-sig-img{max-height:56px;max-width:150px;object-fit:contain;display:block;margin:0 auto 4px}
.rcpt-sig-line{border-bottom:1px solid #000;margin-bottom:4px}
.rcpt-sig-label{font-size:11px;color:#333}
.rcpt-sig-name{font-size:11px;color:#000;margin-top:1px}
.rcpt-sig-date{font-size:10.5px;color:#777;margin-top:4px}
.rcpt-stamp{position:absolute;top:48%;left:50%;transform:translate(-50%,-50%) rotate(-15deg);border:3px solid rgba(206,32,32,.5);border-radius:10px;padding:10px 30px 8px;text-align:center;color:rgba(206,32,32,.62);pointer-events:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.rcpt-stamp:before{content:"";position:absolute;inset:4px;border:1.5px solid rgba(206,32,32,.4);border-radius:6px}
.rcpt-stamp-main{font-size:40px;font-weight:700;letter-spacing:.06em;line-height:1}
.rcpt-stamp-en{font-size:13px;font-weight:600;letter-spacing:.22em;margin-top:6px}
.rcpt-stamp-date{font-size:11px;letter-spacing:.05em;margin-top:6px;padding-top:5px;border-top:1px solid rgba(206,32,32,.35)}
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

            {/* ── ลายเซ็นต์ผู้จัดทำ / ผู้อนุมัติ ── */}
            <div className="field full" style={{ borderTop: '1px dashed var(--line)', paddingTop: 16, marginTop: 4 }}>
              <label className="field-label" style={{ fontSize: 13, fontWeight: 600 }}>
                <Icon name="pen" size={13} /> ลายเซ็นต์ (ใช้กับใบแจ้งหนี้ทุกฉบับ)
              </label>
              <div className="form-grid" style={{ marginTop: 12 }}>
                <div className="field">
                  <label className="field-label">ชื่อผู้จัดทำเอกสาร</label>
                  <input className="input" value={c.preparedByName || ''} onChange={(e) => setC({ ...c, preparedByName: e.target.value })} placeholder="ชื่อ-นามสกุล" />
                  <SignatureImagePicker
                    value={c.preparedBySignature || ''}
                    onChange={(v) => setC({ ...c, preparedBySignature: v })}
                    label="ลายเซ็นต์ผู้จัดทำ"
                  />
                </div>
                <div className="field">
                  <label className="field-label">ชื่อผู้อนุมัติ</label>
                  <input className="input" value={c.approvedByName || ''} onChange={(e) => setC({ ...c, approvedByName: e.target.value })} placeholder="ชื่อ-นามสกุล" />
                  <SignatureImagePicker
                    value={c.approvedBySignature || ''}
                    onChange={(v) => setC({ ...c, approvedBySignature: v })}
                    label="ลายเซ็นต์ผู้อนุมัติ"
                  />
                </div>
              </div>
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
// PrintablePaymentApproval — ใบอนุมัติสั่งจ่าย (ส่งฝ่ายบัญชี)
// ──────────────────────────────────────────────
function PrintablePaymentApproval({ rec, company, app }) {
  const totals = computeTotals(rec);
  const proj = app?.projects?.find(p => p.id === rec.projectId);
  const di = rec.docInfo || {};
  const typeLabel = rec.type === 'material' ? 'จัดซื้อวัสดุ'
    : rec.type === 'machine' ? 'เช่าเครื่องจักร'
    : rec.type === 'labor' || rec.type === 'lump-labor' ? 'ค่าแรง'
    : 'ค่าใช้จ่าย';
  const rows = [['รวมเป็นเงิน', totals.subTotal]];
  if (totals.discountAmt > 0) rows.push(['ส่วนลด', -totals.discountAmt]);
  if (totals.vat > 0)        rows.push(['ภาษีมูลค่าเพิ่ม (VAT)', totals.vat]);
  if (totals.wht > 0)        rows.push([totals.advance > 0 ? 'หัก ณ ที่จ่าย (หลังหักเบิกล่วงหน้า)' : 'หัก ณ ที่จ่าย', -totals.wht]);
  if (totals.advance > 0)    rows.push(['หักเบิกล่วงหน้า', -totals.advance]);
  if (totals.retention > 0)  rows.push(['หักเงินประกันผลงาน', -totals.retention]);

  // ── แบ่งจ่ายเป็นงวด: ใบอนุมัติสำหรับ "งวดปัจจุบัน" (ดึงมาจากปุ่มพิมพ์) ──
  const inst = rec._printInstallment;
  const isInst = !!inst;
  const whtRate = rec.whtEnabled ? Number(rec.whtRate || 0) / 100 : 0;
  const instNo = (rec._printInstallmentIndex || 0) + 1;
  const instCount = rec._printInstallmentCount || 0;
  const instAmount = Number(inst?.amount || 0);
  const instWht = instAmount * whtRate;
  const instNet = instAmount - instWht;
  const instPaidGross = (rec.installments || []).filter(i => i.paid).reduce((s, i) => s + Number(i.amount || 0), 0);
  const instOutstandingAfter = Math.max(0, totals.beforeWht - instPaidGross - instAmount);
  const payAmount = isInst ? instNet : totals.total;

  return (
    <div className="printable-receipt">
      {/* Header */}
      <div className="rcpt-header">
        <div className="rcpt-company">
          {company.logoDataUrl && <img src={company.logoDataUrl} alt="logo" className="rcpt-logo" />}
          <div>
            <div className="rcpt-company-name">{company.name || 'ชื่อบริษัท'}</div>
            {company.branch  && <div className="rcpt-company-line">{company.branch}</div>}
            {company.address && <div className="rcpt-company-line">{company.address}</div>}
            <div className="rcpt-company-line">
              {company.phone && <span>โทร {company.phone}</span>}
              {company.phone && company.email && <span> · </span>}
              {company.email && <span>{company.email}</span>}
            </div>
            {company.taxId && <div className="rcpt-company-line">เลขประจำตัวผู้เสียภาษี: <span className="rcpt-mono">{company.taxId}</span></div>}
          </div>
        </div>
        <div className="rcpt-title-box">
          <div className="rcpt-title">ใบอนุมัติสั่งจ่าย</div>
          <div className="rcpt-title-en">PAYMENT APPROVAL</div>
          <div className="rcpt-original">สำหรับฝ่ายบัญชี{isInst ? ` · งวดที่ ${instNo}/${instCount}` : ''}</div>
        </div>
      </div>

      {/* Doc info */}
      <div className="rcpt-info-row">
        <div className="rcpt-info-cell"><div className="rcpt-info-label">เลขที่บิล / No.</div><div className="rcpt-info-value rcpt-mono">{rec.docNo}</div></div>
        <div className="rcpt-info-cell"><div className="rcpt-info-label">วันที่เอกสาร / Date</div><div className="rcpt-info-value">{fmtDate(rec.date)}</div></div>
        <div className="rcpt-info-cell"><div className="rcpt-info-label">ประเภท / Type</div><div className="rcpt-info-value">{typeLabel}</div></div>
        {proj && <div className="rcpt-info-cell"><div className="rcpt-info-label">โครงการ / Project</div><div className="rcpt-info-value">{proj.name}</div></div>}
      </div>

      {/* Payee */}
      <div className="rcpt-customer">
        <div className="rcpt-customer-title">ผู้ขาย / ผู้รับเงิน — Payee</div>
        <div className="rcpt-customer-grid">
          <div>
            <div className="rcpt-customer-name">{rec.vendor || di.name || '—'}</div>
            {di.address && <div className="rcpt-customer-line">{di.address}</div>}
          </div>
          <div className="rcpt-customer-side">
            {di.taxId && <div className="rcpt-customer-line"><span className="rcpt-customer-key">เลขผู้เสียภาษี:</span> <span className="rcpt-mono">{di.taxId}</span></div>}
          </div>
        </div>
      </div>

      {/* งวด banner — เฉพาะบิลแบ่งจ่ายเป็นงวด */}
      {isInst && (
        <div style={{ margin: '0 0 10px', padding: '10px 14px', border: '1px solid #cabfb0', borderRadius: 8, background: '#faf7f1' }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>อนุมัติจ่าย งวดที่ {instNo} จาก {instCount} งวด</div>
          {inst.detail && <div style={{ fontSize: 13, marginTop: 2 }}>รายละเอียด: {inst.detail}</div>}
          <div style={{ fontSize: 12, color: '#6b6157', marginTop: 4 }}>
            ยอดสัญญารวม {fmt(totals.beforeWht)} · จ่ายไปแล้ว {fmt(instPaidGross)} · คงเหลือหลังงวดนี้ {fmt(instOutstandingAfter)} บาท
          </div>
        </div>
      )}

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
          {isInst ? (
            <tr>
              <td className="rcpt-num">1</td>
              <td>{inst.detail || `${typeLabel} — งวดที่ ${instNo}/${instCount}`}<div style={{ fontSize: 11, color: '#6b6157' }}>{(rec.items || []).map(it => it.name).filter(Boolean).join(', ')}</div></td>
              <td className="rcpt-num rcpt-mono">1</td>
              <td>งวด</td>
              <td className="rcpt-num rcpt-mono">{fmt(instAmount)}</td>
              <td className="rcpt-num rcpt-mono">{fmt(instAmount)}</td>
            </tr>
          ) : (rec.items || []).map((it, i) => (
            <tr key={it.id || i}>
              <td className="rcpt-num">{i + 1}</td>
              <td>{it.name || '—'}</td>
              <td className="rcpt-num rcpt-mono">{Number(it.qty || 0)}</td>
              <td>{it.unit || ''}</td>
              <td className="rcpt-num rcpt-mono">{fmt(Number(it.price || 0))}</td>
              <td className="rcpt-num rcpt-mono">{fmt(Number(it.qty || 0) * Number(it.price || 0))}</td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 5 - (isInst ? 1 : (rec.items || []).length)) }).map((_, i) => (
            <tr key={'empty-' + i} className="rcpt-empty-row"><td colSpan={6}>&nbsp;</td></tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="rcpt-totals">
        <div className="rcpt-totals-left">
          <div className="rcpt-amount-words">
            <span className="rcpt-amount-words-label">จำนวนเงินที่อนุมัติจ่าย{isInst ? ` งวดที่ ${instNo}` : ''} (ตัวอักษร):</span>
            <div className="rcpt-amount-words-text">({thaiBahtText(payAmount)})</div>
          </div>
        </div>
        <div className="rcpt-totals-right">
          {isInst ? (
            <>
              <div className="rcpt-total-row"><span>ยอดงวดที่ {instNo}</span><span className="rcpt-mono">{fmt(instAmount)}</span></div>
              {instWht > 0 && <div className="rcpt-total-row"><span>หัก ณ ที่จ่าย {rec.whtRate}%</span><span className="rcpt-mono">{fmt(-instWht)}</span></div>}
              <div className="rcpt-total-row rcpt-total-grand"><span>ยอดสุทธิที่ต้องจ่ายงวดนี้</span><span className="rcpt-mono">{fmt(instNet)} บาท</span></div>
            </>
          ) : (
            <>
              {rows.map(([label, val], i) => (
                <div className="rcpt-total-row" key={i}><span>{label}</span><span className="rcpt-mono">{fmt(val)}</span></div>
              ))}
              <div className="rcpt-total-row rcpt-total-grand"><span>ยอดสุทธิที่ต้องจ่าย</span><span className="rcpt-mono">{fmt(totals.total)} บาท</span></div>
            </>
          )}
        </div>
      </div>

      {rec.note && <div className="rcpt-note" style={{ marginBottom: 8 }}><span className="rcpt-note-label">หมายเหตุ:</span> {rec.note}</div>}

      {/* Signatures */}
      <div className="rcpt-signatures">
        <div className="rcpt-sig">
          {company.preparedBySignature && <img src={company.preparedBySignature} className="rcpt-sig-img" alt="" />}
          <div className="rcpt-sig-line"></div>
          <div className="rcpt-sig-label">ผู้จัดทำ / Prepared by</div>
          {company.preparedByName && <div className="rcpt-sig-name">({company.preparedByName})</div>}
          <div className="rcpt-sig-date">วันที่ {fmtDate(rec.date)}</div>
        </div>
        <div className="rcpt-sig">
          {company.approvedBySignature && <img src={company.approvedBySignature} className="rcpt-sig-img" alt="" />}
          <div className="rcpt-sig-line"></div>
          <div className="rcpt-sig-label">ผู้อนุมัติสั่งจ่าย / Approved by</div>
          {company.approvedByName && <div className="rcpt-sig-name">({company.approvedByName})</div>}
          <div className="rcpt-sig-date">วันที่ ............................</div>
        </div>
      </div>

      {/* ตราปั๊ม "อนุมัติแล้ว" — แดงโปร่งแสง มองเห็นรายละเอียดด้านหลังได้ */}
      <div className="rcpt-stamp">
        <div className="rcpt-stamp-main">อนุมัติแล้ว</div>
        <div className="rcpt-stamp-en">APPROVED FOR PAYMENT</div>
        <div className="rcpt-stamp-date">{fmtDate(rec.approvedDate || rec.date)}</div>
      </div>
    </div>
  );
}
window.PrintablePaymentApproval = PrintablePaymentApproval;


