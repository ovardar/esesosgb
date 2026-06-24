export default [
  {
    ignores: ['dist/**']
  },
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Tarayıcı Global Değişkenleri
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        navigator: 'readonly',
        alert: 'readonly',
        prompt: 'readonly',
        confirm: 'readonly',
        Image: 'readonly',
        URL: 'readonly',
        indexedDB: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        crypto: 'readonly',
        fetch: 'readonly',
        MutationObserver: 'readonly',
        // Service Worker Globals
        self: 'readonly',
        caches: 'readonly',
        // Node / Build Globals
        __dirname: 'readonly',
        // Projeye Özel Global Değişkenler (Supabase ve Çevrimdışı Servisler)
        dbClient: 'writable',
        supabase: 'readonly',
        OSGBOfflineDB: 'writable',
        OSGBRiskSync: 'writable',
        CURRENT_AUTH: 'writable',
        lastLoadedCompanies: 'writable',
        selectedRiskPhotoBlob: 'writable',
        selectedRiskPhotoName: 'writable',
        selectedRiskPhotoType: 'writable',
        themes: 'readonly',
        requireAuthAndRole: 'readonly',
        calculateFineKinney: 'readonly',
        fetchCompaniesToSelect: 'readonly',
        fetchRisks: 'readonly',
        updateConnectionStatus: 'readonly',
        updateOfflineRiskCount: 'readonly',
        registerServiceWorker: 'readonly',
        makeLocalId: 'readonly',
        selectedRiskPhotoBlob: 'writable',
        selectedRiskPhotoName: 'writable',
        selectedRiskPhotoType: 'writable',
        formatBytes: 'readonly',
        setPhotoStatus: 'readonly',
        loadImageFromFile: 'readonly',
        canvasToBlob: 'readonly',
        compressImageFile: 'readonly',
        prepareRiskPhoto: 'readonly',
        updateOfflineRiskCount: 'readonly',
        manualSyncRisks: 'readonly',
        saveRisk: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'no-undef': 'warn'
    }
  }
];
