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

  const printNow = () => {
    // ปิด modal ก่อน → set print mode ใน body → window.print()
    document.body.classList.add('printing-receipt');
    setTimeout(() => {
      window.print();
      setTimeout(() => document.body.classList.remove('printing-receipt'), 200);
    }, 100);
  };

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
