// ============================================================
// db.js — Database layer (Supabase CRUD operations)
// ชื่อคอลัมน์ DB: snake_case  ←→  JS: camelCase
// ============================================================
(function () {
  // ──────────────────────────────────────────────────
  // Helpers: DB ↔ JS mapping
  // ──────────────────────────────────────────────────

  function dbProject(row) {
    return { id: row.id, code: row.code, name: row.name, client: row.client || '', color: row.color || '#d97706', status: row.status || 'active' };
  }
  function jsProject(p) {
    return { id: p.id, code: p.code, name: p.name, client: p.client || '', color: p.color || '#d97706', status: p.status || 'active' };
  }

  function dbCat(row) {
    return { id: row.id, name: row.name, color: row.color || '#9ca3af' };
  }
  function jsCat(c) {
    return { id: c.id, name: c.name, color: c.color || '#9ca3af' };
  }

  function dbTeam(row) {
    return {
      id: row.id, name: row.name,
      leader: row.leader || '', phone: row.phone || '',
      size: Number(row.size || 1), specialty: row.specialty || '', note: row.note || '',
      // ── รูปภาพทีมช่าง (migration-worker-team-images.sql) ──
      images: row.images || [],
      // ── ข้อมูลสำหรับออกเอกสาร (migration-worker-team-doc-fields.sql) ──
      needsDoc: Boolean(row.needs_doc),
      fullName: row.full_name || '',
      idCard:   row.id_card   || '',
      address:  row.address   || '',
      // ── รูปภาพเอกสาร (migration-worker-team-doc-images.sql) ──
      docImages: row.doc_images || [],
    };
  }
  function jsTeam(t, imageUrls, docImageUrls) {
    return {
      id: t.id, name: t.name,
      leader: t.leader || '', phone: t.phone || '',
      size: Number(t.size || 1), specialty: t.specialty || '', note: t.note || '',
      images: imageUrls !== undefined ? imageUrls : (t.images || []),
      needs_doc: Boolean(t.needsDoc),
      full_name: t.fullName || '',
      id_card:   t.idCard   || '',
      address:   t.address  || '',
      doc_images: docImageUrls !== undefined ? docImageUrls : (t.docImages || []),
    };
  }

  function dbRecord(row) {
    // record_items and work_logs are joined via Supabase select
    const items = (row.record_items || [])
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(it => ({
        id: it.id,
        name: it.name || '',
        categoryId: it.category_id || '',
        qty: Number(it.qty || 0),
        unit: it.unit || '',
        price: Number(it.price || 0),
      }));

    const workLogs = (row.work_logs || []).map(log => ({
      id: log.id,
      date: log.date,
      note: log.note || '',
      images: log.images || [],
    }));

    return {
      id: row.id,
      type: row.type,
      docNo: row.doc_no,
      date: row.date,
      projectId: row.project_id || '',
      vendor: row.vendor || '',
      workerTeamId: row.worker_team_id || '',
      period: row.period || '',
      vatMode: row.vat_mode || 'exclusive',
      vatRate: Number(row.vat_rate || 0),
      whtEnabled: Boolean(row.wht_enabled),
      whtRate: Number(row.wht_rate || 0),
      advanceDeduction: Number(row.advance_deduction || 0),
      retentionDeduction: Number(row.retention_deduction || 0),
      docs: row.docs || [],
      note: row.note || '',
      images: row.images || [],
      items,
      workLogs,
      // ── เงินประกันสินค้า ──────────────────────────
      depositAmount:        Number(row.deposit_amount || 0),
      depositStatus:        row.deposit_status || 'none',
      depositReturnDate:    row.deposit_return_date || '',
      depositReturnImages:  row.deposit_return_images || [],
      depositReturnNote:    row.deposit_return_note || '',
      // ── meta JSONB — ใช้เก็บข้อมูลเฉพาะ type (เช่น receipt) ──
      meta: row.meta || {},
      // ── lightweight flags stored inside meta ──────
      accountingPosted: Boolean((row.meta || {}).accountingPosted),
      approved:         Boolean((row.meta || {}).approved),
      // ── สถานะการจ่ายเงินจริง (สลิป + วันที่โอน) ──
      paid:             Boolean((row.meta || {}).paid),
      paidDate:         (row.meta || {}).paidDate || '',
      paidSlips:        (row.meta || {}).paidSlips || [],
      // ── ค่าแรง: จ่ายคืนเงินประกันผลงาน ──────────
      isRetentionPayout: Boolean((row.meta || {}).isRetentionPayout),
      retentionReturned: Boolean((row.meta || {}).retentionReturned),
      // ── ส่วนลด (ก่อน VAT) ────────────────────────
      discountEnabled:  Boolean((row.meta || {}).discountEnabled),
      discountType:     (row.meta || {}).discountType || 'baht',
      discountValue:    Number((row.meta || {}).discountValue || 0),
      // ── ผู้สร้างเอกสาร (เก็บใน meta) ──────────────
      createdBy:        (row.meta || {}).createdBy || null,
      // ── ข้อมูลผู้รับเงิน (labor / lump-labor) ────
      docInfo: (row.meta || {}).docInfo || { name: '', taxId: '', address: '' },
    };
  }

  function jsRecordToDb(rec, imageUrls, depositReturnImageUrls) {
    return {
      id: rec.id,
      type: rec.type,
      doc_no: rec.docNo || '',
      date: rec.date,
      project_id: rec.projectId || null,
      vendor: rec.vendor || '',
      worker_team_id: rec.workerTeamId || null,
      period: rec.period || '',
      vat_mode: rec.vatMode || 'exclusive',
      vat_rate: Number(rec.vatRate || 0),
      wht_enabled: Boolean(rec.whtEnabled),
      wht_rate: Number(rec.whtRate || 0),
      advance_deduction: Number(rec.advanceDeduction || 0),
      retention_deduction: Number(rec.retentionDeduction || 0),
      docs: rec.docs || [],
      note: rec.note || '',
      images: imageUrls || [],
      // ── เงินประกันสินค้า ──────────────────────────
      deposit_amount:        Number(rec.depositAmount || 0),
      deposit_status:        rec.depositStatus || 'none',
      deposit_return_date:   rec.depositReturnDate || null,
      deposit_return_images: depositReturnImageUrls !== undefined
                               ? depositReturnImageUrls
                               : (rec.depositReturnImages || []),
      deposit_return_note:   rec.depositReturnNote || '',
      // ── meta JSONB (รวม lightweight flags เช่น accountingPosted, approved, createdBy) ──
      meta: {
        ...(rec.meta || {}),
        accountingPosted: Boolean(rec.accountingPosted),
        approved: Boolean(rec.approved),
        paid: Boolean(rec.paid),
        paidDate: rec.paidDate || '',
        paidSlips: rec.paidSlips || [],
        isRetentionPayout: Boolean(rec.isRetentionPayout),
        retentionReturned: Boolean(rec.retentionReturned),
        discountEnabled: Boolean(rec.discountEnabled),
        discountType: rec.discountType || 'baht',
        discountValue: Number(rec.discountValue || 0),
        ...(rec.docInfo ? { docInfo: rec.docInfo } : {}),
        ...(rec.createdBy ? { createdBy: rec.createdBy } : {}),
      },
    };
  }

  // ──────────────────────────────────────────────────
  // Error utilities — ตรวจจับและจัดการกับคอลัมน์ที่ยังไม่มีใน DB
  // ──────────────────────────────────────────────────
  function isMissingColumnError(err) {
    if (!err) return false;
    const msg = (err.message || err.hint || '').toLowerCase();
    // Postgres code 42703 = undefined_column
    return err.code === '42703' || msg.includes('column') && msg.includes('does not exist');
  }

  function stripDepositFields(obj) {
    const out = { ...obj };
    delete out.deposit_amount;
    delete out.deposit_status;
    delete out.deposit_return_date;
    delete out.deposit_return_images;
    delete out.deposit_return_note;
    return out;
  }

  function stripMetaField(obj) {
    const out = { ...obj };
    delete out.meta;
    return out;
  }

  // ──────────────────────────────────────────────────
  // Image upload helper
  // ──────────────────────────────────────────────────

  async function uploadImages(images) {
    const client = window.supabaseClient;
    const bucket = window.SUPABASE_STORAGE_BUCKET || 'procurement-images';
    if (!client || !images || images.length === 0) return [];

    const urls = [];
    for (const img of images) {
      // normalize: รองรับทั้ง string ("http..." / "data:...") และ object { dataUrl, file, name }
      const strImg   = typeof img === 'string' ? img : null;
      const objUrl   = (img && typeof img.dataUrl === 'string') ? img.dataUrl : null;
      const httpUrl  = (strImg && strImg.startsWith('http')) ? strImg
                     : (objUrl && objUrl.startsWith('http')) ? objUrl : null;
      const b64      = (strImg && strImg.startsWith('data:')) ? strImg
                     : (objUrl && objUrl.startsWith('data:')) ? objUrl : null;
      const name     = (img && img.name) || '';
      try {
        // ── กรณีที่ 1: URL สาธารณะอยู่แล้ว → เก็บไว้ตามเดิม
        if (httpUrl) { urls.push(httpUrl); continue; }

        let file = null;

        // ── กรณีที่ 2: File object ตรง ๆ หรือ { file: File }
        if (img instanceof File) {
          file = img;
        } else if (img && img.file instanceof File) {
          file = img.file;
        }
        // ── กรณีที่ 3: base64 data URL (string ตรง ๆ หรือใน { dataUrl })
        //    แปลงเป็น Blob แล้ว upload ขึ้น Storage
        else if (b64) {
          try {
            const res  = await fetch(b64);
            const blob = await res.blob();
            const mime = blob.type || 'image/jpeg';
            const ext  = mime.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
            file = new File([blob], (name || `photo.${ext}`), { type: mime });
          } catch (convErr) {
            console.warn('[Image upload] base64→Blob failed:', convErr);
            // Fallback: เก็บ base64 ไว้ตามเดิมในกรณี Storage ไม่พร้อม
            urls.push(b64);
            continue;
          }
        }

        if (!file) continue;

        const ext  = (file.name || 'image').split('.').pop().toLowerCase() || 'jpg';
        const path = `receipts/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
        const { error } = await client.storage.from(bucket).upload(path, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        });
        if (error) {
          console.warn('[Image upload] Storage error:', error.message, '→ falling back to dataUrl');
          // Fallback: เก็บ base64 โดยตรงถ้า Storage ล้มเหลว (เช่น bucket ยังไม่ถูกสร้าง)
          if (b64) urls.push(b64);
          continue;
        }
        const { data } = client.storage.from(bucket).getPublicUrl(path);
        if (data?.publicUrl) urls.push(data.publicUrl);
      } catch (e) {
        console.warn('[Image upload] unexpected error:', e);
        if (b64) urls.push(b64); // fallback
      }
    }
    return urls;
  }

  // ──────────────────────────────────────────────────
  // DB operations
  // ──────────────────────────────────────────────────

  const db = {

    // ── Load all data on startup ──────────────────
    // มี retry — กันกรณีโหลดช้า/หลุดเป็นบางครั้ง (intermittent timeout)
    async loadAll() {
      const client = window.supabaseClient;
      if (!client) throw new Error('No Supabase client');

      const attempt = async () => {
        // ดึงข้อมูลหลัก (เบา) แยกจาก records (หนักเพราะ join + รูป) เพื่อลดโอกาส timeout รวม
        const [
          { data: projects,    error: e1 },
          { data: matCats,     error: e2 },
          { data: machCats,    error: e3 },
          { data: labCats,     error: e4 },
          { data: lumpLabCats, error: e7 },
          { data: otherCats,   error: e8 },
          { data: teams,       error: e5 },
        ] = await Promise.all([
          client.from('projects').select('*').order('created_at'),
          client.from('material_categories').select('*').order('created_at'),
          client.from('machinery_categories').select('*').order('created_at'),
          client.from('labor_categories').select('*').order('created_at'),
          client.from('lump_labor_categories').select('*').order('created_at'),
          client.from('other_categories').select('*').order('created_at'),
          client.from('worker_teams').select('*').order('created_at'),
        ]);
        const lightErr = e1 || e2 || e3 || e4 || e7 || e8 || e5;
        if (lightErr) throw lightErr;

        // โหลด record ทั้งหมด (รวมโครงการที่เก็บถาวร) — เก็บถาวรเป็นแค่การซ่อนจากตัวเลือกโครงการ
        // ข้อมูลรายรับ-รายจ่ายยังคงนับรวมในแดชบอร์ดและประวัติเหมือนเดิม
        const { data: recs, error: e6 } = await client
          .from('records')
          .select('*, record_items(*), work_logs(*)')
          .order('created_at', { ascending: false });
        if (e6) throw e6;

        return {
          projects:        (projects    || []).map(dbProject),
          matCats:         (matCats     || []).map(dbCat),
          machCats:        (machCats    || []).map(dbCat),
          laborCats:       (labCats     || []).map(dbCat),
          lumpLaborCats:   (lumpLabCats || []).map(dbCat),
          otherCats:       (otherCats   || []).map(dbCat),
          workerTeams:     (teams       || []).map(dbTeam),
          records:         (recs        || []).map(dbRecord),
        };
      };

      let lastErr;
      for (let i = 0; i < 3; i++) {
        try {
          return await attempt();
        } catch (err) {
          lastErr = err;
          // auth error — ไม่ต้อง retry (ให้ caller จัดการ signOut)
          const msg = (err?.message || '').toLowerCase();
          if (err?.status === 401 || msg.includes('jwt') || msg.includes('refresh token')) throw err;
          console.warn(`[DB] loadAll attempt ${i + 1} failed, retrying…`, err?.message || err);
          await new Promise(r => setTimeout(r, 800 * (i + 1)));
        }
      }
      throw lastErr;
    },

    // ── Projects ─────────────────────────────────
    async insertProject(p) {
      const { error } = await window.supabaseClient.from('projects').insert(jsProject(p));
      if (error) throw error;
    },
    async deleteProject(id) {
      const { error } = await window.supabaseClient.from('projects').delete().eq('id', id);
      if (error) throw error;
    },
    // Cascade-delete: ลบรายการทั้งหมดในโครงการก่อน แล้วลบโครงการ
    // (record_items + work_logs ถูกลบอัตโนมัติผ่าน ON DELETE CASCADE)
    async deleteProjectCascade(projectId) {
      const client = window.supabaseClient;
      const { error: recErr } = await client.from('records').delete().eq('project_id', projectId);
      if (recErr) throw recErr;
      const { error: projErr } = await client.from('projects').delete().eq('id', projectId);
      if (projErr) throw projErr;
    },
    async updateProject(id, patch) {
      const { error } = await window.supabaseClient.from('projects').update(jsProject({ ...patch, id })).eq('id', id);
      if (error) throw error;
    },
    // โหลด record ของโครงการเดียว (สำหรับโครงการที่เก็บถาวร — โหลดเมื่อต้องการ)
    async loadProjectRecords(projectId) {
      const { data, error } = await window.supabaseClient
        .from('records')
        .select('*, record_items(*), work_logs(*)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(dbRecord);
    },

    // ── Material categories ───────────────────────
    async insertMatCat(c) {
      const { error } = await window.supabaseClient.from('material_categories').insert(jsCat(c));
      if (error) throw error;
    },
    async updateMatCat(id, patch) {
      const { error } = await window.supabaseClient.from('material_categories').update(jsCat({ ...patch, id })).eq('id', id);
      if (error) throw error;
    },
    async deleteMatCat(id) {
      const { error } = await window.supabaseClient.from('material_categories').delete().eq('id', id);
      if (error) throw error;
    },

    // ── Machinery categories ──────────────────────
    async insertMachCat(c) {
      const { error } = await window.supabaseClient.from('machinery_categories').insert(jsCat(c));
      if (error) throw error;
    },
    async updateMachCat(id, patch) {
      const { error } = await window.supabaseClient.from('machinery_categories').update(jsCat({ ...patch, id })).eq('id', id);
      if (error) throw error;
    },
    async deleteMachCat(id) {
      const { error } = await window.supabaseClient.from('machinery_categories').delete().eq('id', id);
      if (error) throw error;
    },

    // ── Labor categories ──────────────────────────
    async insertLaborCat(c) {
      const { error } = await window.supabaseClient.from('labor_categories').insert(jsCat(c));
      if (error) throw error;
    },
    async updateLaborCat(id, patch) {
      const { error } = await window.supabaseClient.from('labor_categories').update(jsCat({ ...patch, id })).eq('id', id);
      if (error) throw error;
    },
    async deleteLaborCat(id) {
      const { error } = await window.supabaseClient.from('labor_categories').delete().eq('id', id);
      if (error) throw error;
    },

    // ── Lump-labor categories ─────────────────────
    async insertLumpLaborCat(c) {
      const { error } = await window.supabaseClient.from('lump_labor_categories').insert(jsCat(c));
      if (error) throw error;
    },
    async updateLumpLaborCat(id, patch) {
      const { error } = await window.supabaseClient.from('lump_labor_categories').update(jsCat({ ...patch, id })).eq('id', id);
      if (error) throw error;
    },
    async deleteLumpLaborCat(id) {
      const { error } = await window.supabaseClient.from('lump_labor_categories').delete().eq('id', id);
      if (error) throw error;
    },

    // ── Other-expense categories ──────────────────
    async insertOtherCat(c) {
      const { error } = await window.supabaseClient.from('other_categories').insert(jsCat(c));
      if (error) throw error;
    },
    async updateOtherCat(id, patch) {
      const { error } = await window.supabaseClient.from('other_categories').update(jsCat({ ...patch, id })).eq('id', id);
      if (error) throw error;
    },
    async deleteOtherCat(id) {
      const { error } = await window.supabaseClient.from('other_categories').delete().eq('id', id);
      if (error) throw error;
    },

    // ── Worker teams ──────────────────────────────
    async insertWorkerTeam(t) {
      // อัปโหลดรูปทีมช่าง + รูปเอกสาร (base64 → Storage URL) ก่อนบันทึก
      const imageUrls    = await uploadImages(t.images || []);
      const docImageUrls = await uploadImages(t.docImages || []);
      const full = jsTeam(t, imageUrls, docImageUrls);
      let { error } = await window.supabaseClient.from('worker_teams').insert(full);
      if (error && isMissingColumnError(error)) {
        // migration ใหม่ยังไม่ได้รัน (images / doc_images / doc fields) → retry ไม่รวมคอลัมน์ใหม่
        const { images, doc_images, needs_doc, full_name, id_card, address, ...base } = full;
        ({ error } = await window.supabaseClient.from('worker_teams').insert(base));
      }
      if (error) throw error;
    },
    async updateWorkerTeam(id, patch) {
      const imageUrls    = await uploadImages(patch.images || []);
      const docImageUrls = await uploadImages(patch.docImages || []);
      const full = jsTeam({ ...patch, id }, imageUrls, docImageUrls);
      let { error } = await window.supabaseClient.from('worker_teams').update(full).eq('id', id);
      if (error && isMissingColumnError(error)) {
        // migration ใหม่ยังไม่ได้รัน (images / doc_images / doc fields) → retry ไม่รวมคอลัมน์ใหม่
        const { images, doc_images, needs_doc, full_name, id_card, address, ...base } = full;
        ({ error } = await window.supabaseClient.from('worker_teams').update(base).eq('id', id));
      }
      if (error) throw error;
    },
    async deleteWorkerTeam(id) {
      const { error } = await window.supabaseClient.from('worker_teams').delete().eq('id', id);
      if (error) throw error;
    },

    // ── Records (insert) ──────────────────────────
    async insertRecord(rec) {
      const client = window.supabaseClient;

      // 1. Upload images (รูปแนบหลัก + รูปสลิปคืนเงินประกัน)
      const [imageUrls, depositReturnImageUrls] = await Promise.all([
        uploadImages(rec.images || []),
        uploadImages(rec.depositReturnImages || []),
      ]);

      // 2. Insert record row — auto-fallback ถ้าคอลัมน์ใหม่ยังไม่มีใน DB
      const dbRec = jsRecordToDb(rec, imageUrls, depositReturnImageUrls);
      let { error: recErr } = await client.from('records').insert(dbRec);
      if (recErr && isMissingColumnError(recErr)) {
        console.warn('[DB] missing optional columns — retry without deposit/meta (โปรดรัน migration ที่ค้าง)');
        const fallback = stripMetaField(stripDepositFields(dbRec));
        ({ error: recErr } = await client.from('records').insert(fallback));
      }
      if (recErr) throw recErr;

      // 3. Insert items
      if (rec.items && rec.items.length > 0) {
        const dbItems = rec.items.map((it, i) => ({
          id: it.id || window.newId(),
          record_id: rec.id,
          name: it.name || '',
          category_id: it.categoryId || '',
          qty: Number(it.qty || 0),
          unit: it.unit || '',
          price: Number(it.price || 0),
          sort_order: i,
        }));
        const { error: itemsErr } = await client.from('record_items').insert(dbItems);
        if (itemsErr) throw itemsErr;
      }

      // 4. Insert work logs (labor records) — อัปโหลดรูปใน log ขึ้น Storage ด้วย
      if (rec.workLogs && rec.workLogs.length > 0) {
        const dbLogs = await Promise.all(rec.workLogs.map(async (log) => ({
          id: log.id || window.newId(),
          record_id: rec.id,
          date: log.date,
          note: log.note || '',
          images: await uploadImages(log.images || []),
        })));
        const { error: logsErr } = await client.from('work_logs').insert(dbLogs);
        if (logsErr) throw logsErr;
      }
    },

    // ── Records (update) ──────────────────────────
    async updateRecord(id, patch) {
      const client = window.supabaseClient;
      const has = (k) => Object.prototype.hasOwnProperty.call(patch, k);

      // ── สร้าง db patch แบบ "เฉพาะคอลัมน์ที่มีใน patch จริง ๆ" ──────────────
      // สำคัญ: ห้ามใช้ jsRecordToDb() กับ partial patch เพราะมันจะเติม field อื่น
      // ด้วย null/'' (เช่น project_id, vendor, worker_team_id) → ทับข้อมูลจริงหาย
      // เช่น { workLogs } หรือ { depositStatus, ... } จะลบโครงการ/ผู้ขายทิ้ง
      const dbPatch = {};
      if (has('type'))               dbPatch.type = patch.type;
      if (has('docNo'))              dbPatch.doc_no = patch.docNo || '';
      if (has('date'))               dbPatch.date = patch.date;
      if (has('projectId'))          dbPatch.project_id = patch.projectId || null;
      if (has('vendor'))             dbPatch.vendor = patch.vendor || '';
      if (has('workerTeamId'))       dbPatch.worker_team_id = patch.workerTeamId || null;
      if (has('period'))             dbPatch.period = patch.period || '';
      if (has('vatMode'))            dbPatch.vat_mode = patch.vatMode || 'exclusive';
      if (has('vatRate'))            dbPatch.vat_rate = Number(patch.vatRate || 0);
      if (has('whtEnabled'))         dbPatch.wht_enabled = Boolean(patch.whtEnabled);
      if (has('whtRate'))            dbPatch.wht_rate = Number(patch.whtRate || 0);
      if (has('advanceDeduction'))   dbPatch.advance_deduction = Number(patch.advanceDeduction || 0);
      if (has('retentionDeduction')) dbPatch.retention_deduction = Number(patch.retentionDeduction || 0);
      if (has('docs'))               dbPatch.docs = patch.docs || [];
      if (has('note'))               dbPatch.note = patch.note || '';

      // รูปแนบหลัก — อัปโหลดเฉพาะเมื่อ patch มี key 'images'
      if (has('images')) dbPatch.images = await uploadImages(patch.images || []);

      // เงินประกันสินค้า
      if (has('depositAmount'))       dbPatch.deposit_amount = Number(patch.depositAmount || 0);
      if (has('depositStatus'))       dbPatch.deposit_status = patch.depositStatus || 'none';
      if (has('depositReturnDate'))   dbPatch.deposit_return_date = patch.depositReturnDate || null;
      if (has('depositReturnImages')) dbPatch.deposit_return_images = await uploadImages(patch.depositReturnImages || []);
      if (has('depositReturnNote'))   dbPatch.deposit_return_note = patch.depositReturnNote || '';

      // meta JSONB — merge เข้ากับของเดิม (flags ต่าง ๆ ที่เก็บใน meta)
      const META_KEYS = ['accountingPosted', 'approved', 'docInfo', 'meta',
        'paid', 'paidDate', 'paidSlips', 'isRetentionPayout', 'retentionReturned',
        'discountEnabled', 'discountType', 'discountValue'];
      if (META_KEYS.some(has)) {
        const { data: row } = await client.from('records').select('meta').eq('id', id).single();
        const newMeta = { ...(row?.meta || {}), ...(patch.meta || {}) };
        if (has('accountingPosted')) newMeta.accountingPosted = Boolean(patch.accountingPosted);
        if (has('approved'))         newMeta.approved = Boolean(patch.approved);
        if (has('docInfo'))          newMeta.docInfo = patch.docInfo;
        if (has('paid'))             newMeta.paid = Boolean(patch.paid);
        if (has('paidDate'))         newMeta.paidDate = patch.paidDate || '';
        if (has('paidSlips'))        newMeta.paidSlips = await uploadImages(patch.paidSlips || []);
        if (has('isRetentionPayout')) newMeta.isRetentionPayout = Boolean(patch.isRetentionPayout);
        if (has('retentionReturned')) newMeta.retentionReturned = Boolean(patch.retentionReturned);
        if (has('discountEnabled'))  newMeta.discountEnabled = Boolean(patch.discountEnabled);
        if (has('discountType'))     newMeta.discountType = patch.discountType || 'baht';
        if (has('discountValue'))    newMeta.discountValue = Number(patch.discountValue || 0);
        dbPatch.meta = newMeta;
      }

      // อัปเดต record row — เฉพาะเมื่อมีคอลัมน์ให้อัปเดต + auto-fallback ถ้าคอลัมน์ใหม่ยังไม่มีใน DB
      if (Object.keys(dbPatch).length > 0) {
        let { error: recErr } = await client.from('records').update(dbPatch).eq('id', id);
        if (recErr && isMissingColumnError(recErr)) {
          console.warn('[DB] missing optional columns — retry without deposit/meta (โปรดรัน migration ที่ค้าง)');
          const fallback = stripMetaField(stripDepositFields(dbPatch));
          if (Object.keys(fallback).length > 0) {
            ({ error: recErr } = await client.from('records').update(fallback).eq('id', id));
          } else {
            recErr = null;
          }
        }
        if (recErr) throw recErr;
      }

      // Replace items (delete old → insert new) — เฉพาะเมื่อ patch มี items
      if (patch.items !== undefined) {
        await client.from('record_items').delete().eq('record_id', id);
        if (patch.items.length > 0) {
          const dbItems = patch.items.map((it, i) => ({
            id: it.id || window.newId(),
            record_id: id,
            name: it.name || '',
            category_id: it.categoryId || '',
            qty: Number(it.qty || 0),
            unit: it.unit || '',
            price: Number(it.price || 0),
            sort_order: i,
          }));
          const { error: itemsErr } = await client.from('record_items').insert(dbItems);
          if (itemsErr) throw itemsErr;
        }
      }

      // Replace work logs — อัปโหลดรูปใน log ขึ้น Storage ด้วย (กันการเก็บ base64 object ลง TEXT[])
      if (patch.workLogs !== undefined) {
        await client.from('work_logs').delete().eq('record_id', id);
        if (patch.workLogs.length > 0) {
          const dbLogs = await Promise.all(patch.workLogs.map(async (log) => ({
            id: log.id || window.newId(),
            record_id: id,
            date: log.date,
            note: log.note || '',
            images: await uploadImages(log.images || []),
          })));
          const { error: logsErr } = await client.from('work_logs').insert(dbLogs);
          if (logsErr) throw logsErr;
        }
      }
    },

    // ── Records (delete) ──────────────────────────
    async deleteRecord(id) {
      // ON DELETE CASCADE handles items + work_logs automatically
      const { error } = await window.supabaseClient.from('records').delete().eq('id', id);
      if (error) throw error;
    },

    // ── Records (fetch single, with joins) ─────────
    async fetchRecord(id) {
      const { data, error } = await window.supabaseClient
        .from('records')
        .select('*, record_items(*), work_logs(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return dbRecord(data);
    },

    // ── Realtime subscriptions ────────────────────
    // ส่ง handlers map เพื่อตอบสนองต่อ event ที่เกี่ยวข้อง
    // คืน channel object สำหรับ unsubscribe ภายหลัง
    subscribe(handlers) {
      const client = window.supabaseClient;
      if (!client) return null;

      const channelName = 'app-rt-' + Math.random().toString(36).slice(2, 9);
      const channel = client.channel(channelName);

      // debounce refetch ของ record เดียวกัน (กรณี items/logs ถูก insert ต่อเนื่อง)
      const pendingRefetch = new Map();
      const scheduleRefetch = (id) => {
        if (!id) return;
        if (pendingRefetch.has(id)) return;
        const timer = setTimeout(async () => {
          pendingRefetch.delete(id);
          try {
            const rec = await db.fetchRecord(id);
            handlers.onRecordChange?.(rec);
          } catch (e) {
            // record อาจถูกลบไปแล้ว — ไม่ต้อง log warning
            if (e.code !== 'PGRST116') console.warn('[RT] refetch failed:', e);
          }
        }, 200);
        pendingRefetch.set(id, timer);
      };

      // ── records (parent) ───────────────────
      channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'records' },
        (p) => scheduleRefetch(p.new.id));
      channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'records' },
        (p) => scheduleRefetch(p.new.id));
      channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'records' },
        (p) => handlers.onRecordDelete?.(p.old.id));

      // ── child tables: refetch parent ──────
      for (const tbl of ['record_items', 'work_logs']) {
        channel.on('postgres_changes', { event: '*', schema: 'public', table: tbl }, (p) => {
          const rid = p.new?.record_id || p.old?.record_id;
          scheduleRefetch(rid);
        });
      }

      // ── projects ───────────────────────────
      channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'projects' },
        (p) => handlers.onProjectInsert?.(dbProject(p.new)));
      channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects' },
        (p) => handlers.onProjectUpdate?.(dbProject(p.new)));
      channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'projects' },
        (p) => handlers.onProjectDelete?.(p.old.id));

      // ── categories (5 tables) ──────────────
      const CATS = {
        material_categories:    'Mat',
        machinery_categories:   'Mach',
        labor_categories:       'Labor',
        lump_labor_categories:  'LumpLabor',
        other_categories:       'Other',
      };
      for (const [table, name] of Object.entries(CATS)) {
        channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table },
          (p) => handlers[`on${name}CatInsert`]?.(dbCat(p.new)));
        channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table },
          (p) => handlers[`on${name}CatUpdate`]?.(dbCat(p.new)));
        channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table },
          (p) => handlers[`on${name}CatDelete`]?.(p.old.id));
      }

      // ── worker teams ───────────────────────
      channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'worker_teams' },
        (p) => handlers.onTeamInsert?.(dbTeam(p.new)));
      channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'worker_teams' },
        (p) => handlers.onTeamUpdate?.(dbTeam(p.new)));
      channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'worker_teams' },
        (p) => handlers.onTeamDelete?.(p.old.id));

      channel.subscribe((status) => {
        console.log('[RT] ' + channelName + ' status:', status);
        handlers.onStatusChange?.(status);
      });

      return channel;
    },

    unsubscribe(channel) {
      if (channel && window.supabaseClient) {
        try { window.supabaseClient.removeChannel(channel); } catch (e) { /* ignore */ }
      }
    },

    // ── Profiles ──────────────────────────────────
    async getProfile(userId) {
      const { data, error } = await window.supabaseClient
        .from('profiles').select('*').eq('id', userId).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    },

    async getAllProfiles() {
      const { data, error } = await window.supabaseClient
        .from('profiles').select('*').order('created_at');
      if (error) throw error;
      return data || [];
    },

    async updateProfileName(userId, fullName) {
      const { error } = await window.supabaseClient
        .from('profiles').update({ full_name: fullName }).eq('id', userId);
      if (error) throw error;
    },

    // Admin only: change a user's role
    async updateUserRole(userId, role) {
      const { error } = await window.supabaseClient
        .from('profiles').update({ role }).eq('id', userId);
      if (error) throw error;
    },

    // Admin only: delete a user profile (removes app access; auth.users row remains)
    async deleteUserProfile(userId) {
      const { error } = await window.supabaseClient
        .from('profiles').delete().eq('id', userId);
      if (error) throw error;
    },

    // Update own profile (name, avatar_url, etc.)
    async updateProfile(userId, patch) {
      const { error } = await window.supabaseClient
        .from('profiles').update(patch).eq('id', userId);
      if (error) throw error;
    },

    // Upload avatar image → returns public URL
    async uploadAvatar(userId, file) {
      const client = window.supabaseClient;
      const bucket = window.SUPABASE_STORAGE_BUCKET || 'procurement-images';
      const ext = (file.name || 'avatar').split('.').pop().toLowerCase() || 'jpg';
      const path = `avatars/${userId}-${Date.now()}.${ext}`;
      const { error } = await client.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: true });
      if (error) throw error;
      const { data } = client.storage.from(bucket).getPublicUrl(path);
      return data?.publicUrl || '';
    },
  };

  window.db = db;
  console.log('[DB] Database layer พร้อม ✓');
})();
