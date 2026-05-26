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
    return { id: row.id, name: row.name, leader: row.leader || '', phone: row.phone || '', size: Number(row.size || 1), specialty: row.specialty || '', note: row.note || '' };
  }
  function jsTeam(t) {
    return { id: t.id, name: t.name, leader: t.leader || '', phone: t.phone || '', size: Number(t.size || 1), specialty: t.specialty || '', note: t.note || '' };
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

  // ──────────────────────────────────────────────────
  // Image upload helper
  // ──────────────────────────────────────────────────

  async function uploadImages(images) {
    const client = window.supabaseClient;
    const bucket = window.SUPABASE_STORAGE_BUCKET || 'procurement-images';
    if (!client || !images || images.length === 0) return [];

    const urls = [];
    for (const img of images) {
      try {
        // ── กรณีที่ 1: URL สาธารณะอยู่แล้ว → เก็บไว้ตามเดิม
        if (typeof img === 'string' && img.startsWith('http')) {
          urls.push(img);
          continue;
        }
        if (img && typeof img.dataUrl === 'string' && img.dataUrl.startsWith('http')) {
          urls.push(img.dataUrl);
          continue;
        }

        let file = null;

        // ── กรณีที่ 2: File object ตรง ๆ หรือ { file: File }
        if (img instanceof File) {
          file = img;
        } else if (img && img.file instanceof File) {
          file = img.file;
        }
        // ── กรณีที่ 3: base64 dataUrl จาก FileReader (เช่น quick-receipt)
        //    แปลงเป็น Blob แล้ว upload ขึ้น Storage
        else if (img && typeof img.dataUrl === 'string' && img.dataUrl.startsWith('data:')) {
          try {
            const res  = await fetch(img.dataUrl);
            const blob = await res.blob();
            const mime = blob.type || 'image/jpeg';
            const ext  = mime.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
            file = new File([blob], (img.name || `photo.${ext}`), { type: mime });
          } catch (convErr) {
            console.warn('[Image upload] base64→Blob failed:', convErr);
            // Fallback: เก็บ dataUrl โดยตรงในกรณี Storage ไม่พร้อม
            urls.push(img.dataUrl);
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
          // Fallback: เก็บ dataUrl โดยตรงถ้า Storage ล้มเหลว
          if (img && img.dataUrl) urls.push(img.dataUrl);
          continue;
        }
        const { data } = client.storage.from(bucket).getPublicUrl(path);
        if (data?.publicUrl) urls.push(data.publicUrl);
      } catch (e) {
        console.warn('[Image upload] unexpected error:', e);
        if (img && img.dataUrl) urls.push(img.dataUrl); // fallback
      }
    }
    return urls;
  }

  // ──────────────────────────────────────────────────
  // DB operations
  // ──────────────────────────────────────────────────

  const db = {

    // ── Load all data on startup ──────────────────
    async loadAll() {
      const client = window.supabaseClient;
      if (!client) throw new Error('No Supabase client');

      const [
        { data: projects,    error: e1 },
        { data: matCats,     error: e2 },
        { data: machCats,    error: e3 },
        { data: labCats,     error: e4 },
        { data: lumpLabCats, error: e7 },
        { data: otherCats,   error: e8 },
        { data: teams,       error: e5 },
        { data: recs,        error: e6 },
      ] = await Promise.all([
        client.from('projects').select('*').order('created_at'),
        client.from('material_categories').select('*').order('created_at'),
        client.from('machinery_categories').select('*').order('created_at'),
        client.from('labor_categories').select('*').order('created_at'),
        client.from('lump_labor_categories').select('*').order('created_at'),
        client.from('other_categories').select('*').order('created_at'),
        client.from('worker_teams').select('*').order('created_at'),
        client.from('records').select('*, record_items(*), work_logs(*)').order('created_at', { ascending: false }),
      ]);

      const firstErr = e1 || e2 || e3 || e4 || e7 || e8 || e5 || e6;
      if (firstErr) throw firstErr;

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
      const { error } = await window.supabaseClient.from('worker_teams').insert(jsTeam(t));
      if (error) throw error;
    },
    async updateWorkerTeam(id, patch) {
      const { error } = await window.supabaseClient.from('worker_teams').update(jsTeam({ ...patch, id })).eq('id', id);
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

      // 2. Insert record row — auto-fallback ถ้าคอลัมน์ deposit ยังไม่มีใน DB
      const dbRec = jsRecordToDb(rec, imageUrls, depositReturnImageUrls);
      let { error: recErr } = await client.from('records').insert(dbRec);
      if (recErr && isMissingColumnError(recErr)) {
        console.warn('[DB] missing deposit columns — retry without them (โปรดรัน migration-deposit-fields.sql)');
        const fallback = stripDepositFields(dbRec);
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

      // 4. Insert work logs (labor records)
      if (rec.workLogs && rec.workLogs.length > 0) {
        const dbLogs = rec.workLogs.map(log => ({
          id: log.id || window.newId(),
          record_id: rec.id,
          date: log.date,
          note: log.note || '',
          images: log.images || [],
        }));
        const { error: logsErr } = await client.from('work_logs').insert(dbLogs);
        if (logsErr) throw logsErr;
      }
    },

    // ── Records (update) ──────────────────────────
    async updateRecord(id, patch) {
      const client = window.supabaseClient;

      // 1. Upload images (รูปแนบหลัก + รูปสลิปคืนเงินประกัน)
      const [imageUrls, depositReturnImageUrls] = await Promise.all([
        uploadImages(patch.images || []),
        uploadImages(patch.depositReturnImages || []),
      ]);

      // 2. Update record row — auto-fallback ถ้าคอลัมน์ deposit ยังไม่มีใน DB
      const dbPatch = jsRecordToDb({ ...patch, id }, imageUrls, depositReturnImageUrls);
      let { error: recErr } = await client.from('records').update(dbPatch).eq('id', id);
      if (recErr && isMissingColumnError(recErr)) {
        console.warn('[DB] missing deposit columns — retry without them (โปรดรัน migration-deposit-fields.sql)');
        const fallback = stripDepositFields(dbPatch);
        ({ error: recErr } = await client.from('records').update(fallback).eq('id', id));
      }
      if (recErr) throw recErr;

      // 3. Replace items (delete old → insert new)
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

      // 4. Replace work logs
      if (patch.workLogs !== undefined) {
        await client.from('work_logs').delete().eq('record_id', id);
        if (patch.workLogs.length > 0) {
          const dbLogs = patch.workLogs.map(log => ({
            id: log.id || window.newId(),
            record_id: id,
            date: log.date,
            note: log.note || '',
            images: log.images || [],
          }));
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
