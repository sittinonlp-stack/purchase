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
    };
  }

  function jsRecordToDb(rec, imageUrls) {
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
    };
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
        // Already a remote URL → keep as-is
        if (typeof img === 'string' && img.startsWith('http')) {
          urls.push(img);
          continue;
        }
        // Object with .file (from form input) or just a File
        const file = (img && img.file instanceof File) ? img.file : (img instanceof File ? img : null);
        if (!file) continue;

        const ext = (file.name || 'image').split('.').pop().toLowerCase() || 'jpg';
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
        const { error } = await client.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
        if (error) { console.warn('[Image upload]', error.message); continue; }
        const { data } = client.storage.from(bucket).getPublicUrl(path);
        if (data?.publicUrl) urls.push(data.publicUrl);
      } catch (e) {
        console.warn('[Image upload] error:', e);
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
    async deleteMatCat(id) {
      const { error } = await window.supabaseClient.from('material_categories').delete().eq('id', id);
      if (error) throw error;
    },

    // ── Machinery categories ──────────────────────
    async insertMachCat(c) {
      const { error } = await window.supabaseClient.from('machinery_categories').insert(jsCat(c));
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
    async deleteLaborCat(id) {
      const { error } = await window.supabaseClient.from('labor_categories').delete().eq('id', id);
      if (error) throw error;
    },

    // ── Lump-labor categories ─────────────────────
    async insertLumpLaborCat(c) {
      const { error } = await window.supabaseClient.from('lump_labor_categories').insert(jsCat(c));
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

      // 1. Upload images
      const imageUrls = await uploadImages(rec.images || []);

      // 2. Insert record row
      const dbRec = jsRecordToDb(rec, imageUrls);
      const { error: recErr } = await client.from('records').insert(dbRec);
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

      // 1. Upload any new images, keep existing URLs
      const imageUrls = await uploadImages(patch.images || []);

      // 2. Update record row
      const dbPatch = jsRecordToDb({ ...patch, id }, imageUrls);
      const { error: recErr } = await client.from('records').update(dbPatch).eq('id', id);
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
