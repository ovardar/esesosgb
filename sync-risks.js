(function () {
  const RISK_PHOTO_BUCKET = 'risk-photos';
  let syncInProgress = false;

  function getDbClient() {
    return window.dbClient || null;
  }

  function setText(id, text, color, display) {
    const el = document.getElementById(id);
    if (!el) return;
    if (color) el.style.color = color;
    if (display) el.style.display = display;
    el.innerText = text;
  }

  function showError(message) {
    const text = message || 'Bilinmeyen senkronizasyon hatası.';
    setText('offline_error', 'Son hata: ' + text, '#b91c1c', 'block');
  }

  function clearError() {
    const el = document.getElementById('offline_error');
    if (!el) return;
    el.style.display = 'none';
    el.innerText = '';
  }

  function getFileExtension(fileType) {
    if (!fileType) return 'jpg';
    if (fileType.includes('png')) return 'png';
    if (fileType.includes('webp')) return 'webp';
    if (fileType.includes('jpeg') || fileType.includes('jpg')) return 'jpg';
    return 'jpg';
  }

  async function uploadRiskPhoto(risk) {
    if (!risk.photo_blob) return null;

    const dbClient = getDbClient();
    if (!dbClient) throw new Error('Supabase bağlantısı hazır değil. Sayfayı yenileyip tekrar deneyin.');

    const ext = getFileExtension(risk.photo_type);
    const safeCompanyId = String(risk.company_id || 'unknown-company');
    const path = `${safeCompanyId}/${risk.local_id}.${ext}`;

    const { error } = await dbClient.storage
      .from(RISK_PHOTO_BUCKET)
      .upload(path, risk.photo_blob, {
        contentType: risk.photo_type || 'image/jpeg',
        upsert: true
      });

    if (error) {
      throw new Error('Fotoğraf yüklenemedi. risk-photos bucket ve Storage izinlerini kontrol edin. Detay: ' + error.message);
    }

    const { data } = dbClient.storage
      .from(RISK_PHOTO_BUCKET)
      .getPublicUrl(path);

    return { url: data && data.publicUrl ? data.publicUrl : null, path }; 
  }

  async function findExistingRiskByLocalId(localId) {
    const dbClient = getDbClient();
    const { data, error } = await dbClient
      .from('risk_assessments')
      .select('id, image_url')
      .eq('local_id', localId)
      .maybeSingle();

    if (error) {
      throw new Error('local_id kontrolü yapılamadı. risk_assessments tablosuna local_id alanını eklediğinizden emin olun. Detay: ' + error.message);
    }

    return data || null;
  }

  async function insertOrReuseRisk(risk, imageInfo) {
    const dbClient = getDbClient();

    const existing = await findExistingRiskByLocalId(risk.local_id);
    if (existing) {
      return existing.id;
    }

    const payload = {
      local_id: risk.local_id,
      created_offline_at: risk.created_at || new Date().toISOString(),
      company_id: risk.company_id,
      hazard_title: risk.hazard_title,
      action_plan: risk.action_plan || null,
      responsible_person: risk.responsible_person || null,
      close_note: null,
      closed_at: null,
      probability_o: risk.probability_o,
      frequency_f: risk.frequency_f,
      severity_s: risk.severity_s,
      risk_score: risk.risk_score,
      target_date: risk.target_date,
      status: 'Açık'
    };

    if (imageInfo && imageInfo.url) payload.image_url = imageInfo.url;
    if (imageInfo && imageInfo.path) payload.image_path = imageInfo.path;

    const { data, error } = await dbClient
      .from('risk_assessments')
      .insert([payload])
      .select('id')
      .single();

    if (error) {
      if (error.message && error.message.toLowerCase().includes('duplicate')) {
        const afterDuplicate = await findExistingRiskByLocalId(risk.local_id);
        if (afterDuplicate) return afterDuplicate.id;
      }
      throw new Error('Risk kaydı Supabase tablosuna yazılamadı. Detay: ' + error.message);
    }

    return data ? data.id : null;
  }

  async function syncPendingRisks() {
    clearError();

    if (syncInProgress) {
      setText('offline_status', 'Senkronizasyon zaten devam ediyor. Lütfen birkaç saniye bekleyin.', 'var(--text-muted)');
      return { ok: true, synced: 0, failed: 0, message: 'already-running' };
    }

    if (!navigator.onLine) {
      updateSyncMessage('offline');
      return { ok: false, synced: 0, failed: 0, message: 'offline' };
    }

    const dbClient = getDbClient();
    if (!dbClient) {
      const msg = 'Supabase bağlantısı hazır değil. Sayfayı yenileyip tekrar deneyin.';
      showError(msg);
      return { ok: false, synced: 0, failed: 0, message: msg };
    }

    if (!window.OSGBOfflineDB) {
      const msg = 'Offline veritabanı hazır değil. offline-db.js dosyasının yüklendiğini kontrol edin.';
      showError(msg);
      return { ok: false, synced: 0, failed: 0, message: msg };
    }

    const { data: { session } } = await dbClient.auth.getSession();
    if (!session) {
      const msg = 'Oturum bulunamadı. Yeniden giriş yapın.';
      showError(msg);
      return { ok: false, synced: 0, failed: 0, message: msg };
    }

    syncInProgress = true;

    try {
      const pendingRisks = await window.OSGBOfflineDB.getPendingRisks();
      if (!pendingRisks.length) {
        updateSyncMessage('empty');
        if (window.updateOfflineRiskCount) await window.updateOfflineRiskCount();
        return { ok: true, synced: 0, failed: 0, message: 'empty' };
      }

      setText('offline_status', `${pendingRisks.length} bekleyen kayıt gönderiliyor...`, 'var(--text-muted)');

      let synced = 0;
      let failed = 0;
      let lastError = '';

      for (const risk of pendingRisks) {
        try {
          await window.OSGBOfflineDB.updateRisk(risk.local_id, {
            sync_status: 'syncing',
            last_sync_attempt_at: new Date().toISOString(),
            last_error: null
          });

          const imageInfo = await uploadRiskPhoto(risk);
          const serverId = await insertOrReuseRisk(risk, imageInfo);

          await window.OSGBOfflineDB.updateRisk(risk.local_id, {
            sync_status: 'synced',
            server_id: serverId || null,
            synced_at: new Date().toISOString(),
            image_url: imageInfo && imageInfo.url ? imageInfo.url : null,
            image_path: imageInfo && imageInfo.path ? imageInfo.path : null,
            photo_blob: null,
            last_error: null
          });
          synced += 1;
        } catch (err) {
          failed += 1;
          lastError = err.message || String(err);
          await window.OSGBOfflineDB.updateRisk(risk.local_id, {
            sync_status: 'error',
            last_error: lastError,
            last_sync_attempt_at: new Date().toISOString()
          });
        }
      }

      if (window.updateOfflineRiskCount) await window.updateOfflineRiskCount();
      if (window.fetchRisks) await window.fetchRisks();

      if (failed > 0) {
        setText('offline_status', `${synced} kayıt gönderildi, ${failed} kayıt gönderilemedi.`, '#c2410c');
        showError(lastError);
        return { ok: false, synced, failed, message: lastError };
      }

      updateSyncMessage('done', synced);
      return { ok: true, synced, failed: 0, message: 'done' };
    } finally {
      syncInProgress = false;
    }
  }

  function updateSyncMessage(state, syncedCount) {
    const el = document.getElementById('offline_status');
    if (!el) return;

    if (state === 'offline') {
      el.style.color = '#c2410c';
      el.innerText = 'Çevrimdışı moddasınız. Yeni risk kayıtları cihazda bekleyecek.';
    } else if (state === 'empty') {
      el.style.color = '#16a34a';
      el.innerText = 'Senkron bekleyen risk kaydı yok.';
    } else if (state === 'done') {
      el.style.color = '#16a34a';
      el.innerText = `${syncedCount || 0} bekleyen kayıt başarıyla Supabase’e gönderildi.`;
    }
  }

  window.OSGBRiskSync = { syncPendingRisks };
  window.addEventListener('online', syncPendingRisks);
})();
