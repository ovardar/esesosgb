import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        accidents: resolve(__dirname, 'accidents.html'),
        actions: resolve(__dirname, 'actions.html'),
        companyDetail: resolve(__dirname, 'company-detail.html'),
        crm: resolve(__dirname, 'crm.html'),
        crmDetail: resolve(__dirname, 'crm-detail.html'),
        crmOffer: resolve(__dirname, 'crm-offer.html'),
        crmReports: resolve(__dirname, 'crm-reports.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        login: resolve(__dirname, 'login.html'),
        medical: resolve(__dirname, 'medical.html'),
        nearMissAdmin: resolve(__dirname, 'near-miss-admin.html'),
        nearMiss: resolve(__dirname, 'near-miss.html'),
        offline: resolve(__dirname, 'offline.html'),
        periodic: resolve(__dirname, 'periodic.html'),
        ppe: resolve(__dirname, 'ppe.html'),
        risk: resolve(__dirname, 'risk.html'),
        saasAdmin: resolve(__dirname, 'saas-admin.html'),
        schedule: resolve(__dirname, 'schedule.html'),
        staff: resolve(__dirname, 'staff.html'),
        trainingVerify: resolve(__dirname, 'training-verify.html'),
        training: resolve(__dirname, 'training.html'),
        workers: resolve(__dirname, 'workers.html'),
        'offline-db': resolve(__dirname, 'js/offline-db.js'),
        'sync-risks': resolve(__dirname, 'js/sync-risks.js'),
        'supabase-config': resolve(__dirname, 'js/supabase-config.js'),
        navigation: resolve(__dirname, 'js/navigation.js')
      },
      output: {
        // Hashing'i devre dışı bırakarak dosya isimlerini ve yollarını koruyoruz.
        // Bu sayede service-worker.js içindeki statik caching şeması bozulmuyor.
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'css/style.css';
          }
          return 'assets/[name].[ext]';
        }
      }
    }
  }
});
