(function () {
  const DB_NAME = 'osgb-offline-db';
  const DB_VERSION = 2;
  const RISK_STORE = 'pending_risks';
  const COMPANY_STORE = 'company_cache';
  const META_STORE = 'meta';

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function (event) {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(RISK_STORE)) {
          const riskStore = db.createObjectStore(RISK_STORE, { keyPath: 'local_id' });
          riskStore.createIndex('sync_status', 'sync_status', { unique: false });
          riskStore.createIndex('created_at', 'created_at', { unique: false });
        }

        if (!db.objectStoreNames.contains(COMPANY_STORE)) {
          const companyStore = db.createObjectStore(COMPANY_STORE, { keyPath: 'id' });
          companyStore.createIndex('company_name', 'company_name', { unique: false });
        }

        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'key' });
        }
      };

      request.onsuccess = function () {
        resolve(request.result);
      };
      request.onerror = function () {
        reject(request.error);
      };
    });
  }

  async function withStore(storeName, mode, callback) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const result = callback(store);
      tx.oncomplete = function () {
        resolve(result);
      };
      tx.onerror = function () {
        reject(tx.error);
      };
      tx.onabort = function () {
        reject(tx.error);
      };
    });
  }

  async function saveRisk(risk) {
    return withStore(RISK_STORE, 'readwrite', (store) => store.put(risk));
  }

  async function updateRisk(localId, patch) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(RISK_STORE, 'readwrite');
      const store = tx.objectStore(RISK_STORE);
      const getRequest = store.get(localId);

      getRequest.onsuccess = function () {
        const existing = getRequest.result;
        if (!existing) {
          resolve(false);
          return;
        }
        store.put(Object.assign({}, existing, patch));
      };

      tx.oncomplete = function () {
        resolve(true);
      };
      tx.onerror = function () {
        reject(tx.error);
      };
    });
  }

  async function getAllRisks() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(RISK_STORE, 'readonly');
      const store = tx.objectStore(RISK_STORE);
      const request = store.getAll();
      request.onsuccess = function () {
        resolve(request.result || []);
      };
      request.onerror = function () {
        reject(request.error);
      };
    });
  }

  async function getPendingRisks() {
    const all = await getAllRisks();
    return all.filter((item) => item.sync_status === 'pending' || item.sync_status === 'error');
  }

  async function countPendingRisks() {
    const pending = await getPendingRisks();
    return pending.length;
  }

  async function setMeta(key, value) {
    return withStore(META_STORE, 'readwrite', (store) => store.put({ key, value }));
  }

  async function getMeta(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const store = tx.objectStore(META_STORE);
      const request = store.get(key);
      request.onsuccess = function () {
        resolve(request.result ? request.result.value : null);
      };
      request.onerror = function () {
        reject(request.error);
      };
    });
  }

  async function saveCompanies(companies) {
    const list = Array.isArray(companies) ? companies : [];
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([COMPANY_STORE, META_STORE], 'readwrite');
      const companyStore = tx.objectStore(COMPANY_STORE);
      const metaStore = tx.objectStore(META_STORE);

      const clearRequest = companyStore.clear();
      clearRequest.onsuccess = function () {
        list.forEach((company) => companyStore.put(company));
        metaStore.put({
          key: 'company_cache_meta',
          value: {
            updated_at: new Date().toISOString(),
            count: list.length
          }
        });
      };

      tx.oncomplete = function () {
        resolve(true);
      };
      tx.onerror = function () {
        reject(tx.error);
      };
      tx.onabort = function () {
        reject(tx.error);
      };
    });
  }

  async function getCompanies() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(COMPANY_STORE, 'readonly');
      const store = tx.objectStore(COMPANY_STORE);
      const request = store.getAll();
      request.onsuccess = function () {
        const list = request.result || [];
        list.sort((a, b) => String(a.company_name || '').localeCompare(String(b.company_name || ''), 'tr'));
        resolve(list);
      };
      request.onerror = function () {
        reject(request.error);
      };
    });
  }

  async function getCompanyCacheMeta() {
    return getMeta('company_cache_meta');
  }

  async function deleteRisk(localId) {
    return withStore(RISK_STORE, 'readwrite', (store) => store.delete(localId));
  }

  window.OSGBOfflineDB = {
    saveRisk,
    updateRisk,
    deleteRisk,
    getAllRisks,
    getPendingRisks,
    countPendingRisks,
    saveCompanies,
    getCompanies,
    getCompanyCacheMeta
  };
})();
