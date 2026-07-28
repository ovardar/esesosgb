// CODENTRA OFFICIAL LANDING & BRAND GUIDE INTERACTIVE SCRIPT
// Designed for www.codentra.com.tr based on OKUBENI.txt standards

document.addEventListener('DOMContentLoaded', () => {
  // 1. NAVBAR STICKY SCROLL BLUR
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // 2. MOBILE MENU TOGGLE
  const mobileToggle = document.getElementById('mobileToggle');
  const navMenu = document.getElementById('navMenu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });

    // Close menu when link is clicked
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
      });
    });
  }

  // 3. SAMPLE NACE DATABASE FOR OSGB DEMO WIDGET
  const naceData = [
    { code: '41.20.01', name: 'İkamet amaçlı binaların inşaatı', danger: 'Çok Tehlikeli', color: 'danger', period: 'Aylık İş Güvenliği Uzmanı 40 dk/çalışan' },
    { code: '49.41.01', name: 'Karayolu ile şehirlerarası eşya taşımacılığı', danger: 'Tehlikeli', color: 'warning', period: 'Aylık İş Güvenliği Uzmanı 20 dk/çalışan' },
    { code: '62.01.01', name: 'Bilgisayar programlama faaliyetleri (Yazılım Geliştirme)', danger: 'Az Tehlikeli', color: 'info', period: 'Aylık İş Güvenliği Uzmanı 10 dk/çalışan' },
    { code: '10.71.01', name: 'Taze fırın ürünleri ve unlu mamuller imalatı', danger: 'Tehlikeli', color: 'warning', period: 'Aylık İş Güvenliği Uzmanı 20 dk/çalışan' },
    { code: '86.10.01', name: 'Hastane ve sağlık merkezi hizmetleri', danger: 'Çok Tehlikeli', color: 'danger', period: 'Aylık İş Güvenliği Uzmanı 40 dk/çalışan' },
    { code: '47.11.01', name: 'Süpermarket ve mağazalarda perakende ticaret', danger: 'Az Tehlikeli', color: 'info', period: 'Aylık İş Güvenliği Uzmanı 10 dk/çalışan' },
    { code: '43.21.01', name: 'Binaların elektrik tesisatı, kablolama ve pano montajı', danger: 'Çok Tehlikeli', color: 'danger', period: 'Aylık İş Güvenliği Uzmanı 40 dk/çalışan' },
    { code: '25.11.01', name: 'Metal yapı ve çatı imalatı işleri', danger: 'Çok Tehlikeli', color: 'danger', period: 'Aylık İş Güvenliği Uzmanı 40 dk/çalışan' },
    { code: '56.10.01', name: 'Restoran ve lokanta işletmeciliği', danger: 'Az Tehlikeli', color: 'info', period: 'Aylık İş Güvenliği Uzmanı 10 dk/çalışan' }
  ];

  const naceInput = document.getElementById('naceInput');
  const btnSearch = document.getElementById('btnNaceSearch');
  const naceResults = document.getElementById('naceResults');

  function performSearch() {
    if (!naceResults) return;
    const query = (naceInput ? naceInput.value : '').trim().toLowerCase();

    if (!query) {
      renderResults(naceData.slice(0, 4));
      return;
    }

    const filtered = naceData.filter(item => 
      item.code.toLowerCase().includes(query) || 
      item.name.toLowerCase().includes(query) ||
      item.danger.toLowerCase().includes(query)
    );

    renderResults(filtered);
  }

  function renderResults(items) {
    if (!naceResults) return;

    if (items.length === 0) {
      naceResults.innerHTML = `
        <div class="nace-item-card" style="justify-content: center; color: #94a3b8;">
          Arama kriterine uygun NACE kodu bulunamadı. "İnşaat", "Lojistik", "Yazılım" veya "41.20" deneyebilirsiniz.
        </div>
      `;
      return;
    }

    naceResults.innerHTML = items.map(item => `
      <div class="nace-item-card">
        <div>
          <span class="nace-code">${item.code}</span>
          <span style="color: #F7F5F2; font-weight: 500;">${item.name}</span>
          <div style="font-size: 0.75rem; color: #94A3B8; margin-top: 2px;">${item.period}</div>
        </div>
        <span class="tag tag-${item.color}">${item.danger}</span>
      </div>
    `).join('');
  }

  // Initial render of top demo items
  if (naceResults) {
    renderResults(naceData.slice(0, 4));
  }

  if (btnSearch) {
    btnSearch.addEventListener('click', performSearch);
  }

  if (naceInput) {
    naceInput.addEventListener('keyup', (e) => {
      performSearch();
    });
  }

  // 4. COLOR SWATCH COPY TO CLIPBOARD
  document.querySelectorAll('.color-card').forEach(card => {
    card.addEventListener('click', () => {
      const hex = card.getAttribute('data-hex');
      if (hex) {
        navigator.clipboard.writeText(hex).then(() => {
          const hexEl = card.querySelector('.color-hex');
          if (hexEl) {
            const originalText = hexEl.textContent;
            hexEl.textContent = 'KOPYALANDI! ✓';
            setTimeout(() => {
              hexEl.textContent = originalText;
            }, 1500);
          }
        }).catch(err => {
          console.error('Kopyalama başarısız', err);
        });
      }
    });
  });
});
