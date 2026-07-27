// CODENTRA LANDING PAGE INTERACTIVE SCRIPT

document.addEventListener('DOMContentLoaded', () => {
  // 1. NAVBAR SCROLL EFFECT
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // 2. SAMPLE NACE DATABASE FOR INTERACTIVE DEMO WIDGET
  const naceData = [
    { code: '41.20', name: 'İkamet amaçlı binaların inşaatı', danger: 'Çok Tehlikeli', color: 'danger' },
    { code: '49.41', name: 'Karayolu ile şehirlerarası eşya taşımacılığı', danger: 'Tehlikeli', color: 'warning' },
    { code: '62.01', name: 'Bilgisayar programlama faaliyetleri (Yazılım)', danger: 'Az Tehlikeli', color: 'info' },
    { code: '10.71', name: 'Taze fırın ürünleri ve ekmek imalatı', danger: 'Tehlikeli', color: 'warning' },
    { code: '86.10', name: 'Hastane hizmetleri', danger: 'Çok Tehlikeli', color: 'color' },
    { code: '47.11', name: 'Bakkal ve marketlerde perakende ticaret', danger: 'Az Tehlikeli', color: 'info' },
    { code: '43.21', name: 'Binaların elektrik tesisatı ve kablolama işleri', danger: 'Çok Tehlikeli', color: 'danger' }
  ];

  const naceInput = document.getElementById('naceInput');
  const btnSearch = document.getElementById('btnNaceSearch');
  const naceResults = document.getElementById('naceResults');

  function performSearch() {
    const query = (naceInput.value || '').trim().toLowerCase();
    if (!query) {
      renderResults(naceData.slice(0, 3));
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
    if (items.length === 0) {
      naceResults.innerHTML = `
        <div class="nace-item-card" style="justify-content: center; color: #94a3b8;">
          Sonuç bulunamadı. "İnşaat", "Yazılım", "Lojistik" veya "41.20" deneyin.
        </div>
      `;
      return;
    }

    naceResults.innerHTML = items.map(item => `
      <div class="nace-item-card">
        <div>
          <span class="nace-code">${item.code}</span>
          <span style="color: #ffffff; font-weight: 500;">${item.name}</span>
        </div>
        <span class="tag tag-${item.color === 'color' ? 'danger' : item.color}">${item.danger}</span>
      </div>
    `).join('');
  }

  // Initial render of 3 demo items
  renderResults(naceData.slice(0, 3));

  btnSearch.addEventListener('click', performSearch);
  naceInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') performSearch();
    else performSearch();
  });
});
