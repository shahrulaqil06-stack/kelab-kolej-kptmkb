const supabaseUrl = 'https://nixwismxynfxoegzbjip.supabase.co';
const supabaseKey = 'sb_publishable_HwIr_pD7h6vqi2MMrnyy5g_A7zRSgHE';

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
const TABLE_NAME = 'kelab_kolej';

let isAdmin = false;
let clubs = [];

// --- PENGURUSAN TEMA (DARK / LIGHT MODE) ---
const htmlEl = document.documentElement;
const btnTheme = document.getElementById('btn-theme-toggle');
const themeIcon = document.getElementById('theme-icon');

function toggleTheme() {
  htmlEl.classList.toggle('dark');
  const isDark = htmlEl.classList.contains('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  themeIcon.setAttribute('data-lucide', isDark ? 'moon' : 'sun');
  lucide.createIcons();
}

if (localStorage.getItem('theme') === 'light') {
  htmlEl.classList.remove('dark');
  themeIcon.setAttribute('data-lucide', 'sun');
}
btnTheme.addEventListener('click', toggleTheme);

// --- OPERASI SUPABASE (CRUD) ---
async function loadData() {
  document.getElementById('loading-state').classList.remove('hidden');
  document.getElementById('clubs-grid').classList.add('hidden');
  document.getElementById('empty-state').classList.add('hidden');
  document.getElementById('empty-state-subtext').classList.add('hidden');

  try {
    const { data, error } = await supabaseClient
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false });

    document.getElementById('loading-state').classList.add('hidden');

    if (error) {
      throw error;
    } else {
      clubs = data || [];
      document.getElementById('stat-total-clubs').textContent = clubs.length;
      renderClubs();
    }
  } catch (error) {
    console.error("Ralat DB:", error);

    let errorTitle = "Gagal menyambung ke pangkalan data.";
    let errorDesc = error.message;

    if (error.code === 'PGRST116' || error.message.includes('RLS')) {
      errorTitle = "Akses Disekat (Polisi RLS)";
      errorDesc = "Pastikan anda telah menetapkan polisi keselamatan (RLS Policies) kepada Public di Dashboard Supabase.";
    } else if (error.code === '42P01') {
      errorTitle = "Jadual Belum Dicipta";
      errorDesc = `Jadual '${TABLE_NAME}' belum wujud. Sila buat jadual di Supabase menggunakan kod SQL yang disediakan.`;
    }

    const emptyState = document.getElementById("empty-state");
    emptyState.classList.remove('hidden');
    emptyState.classList.add('flex');
    document.getElementById("empty-state-icon").setAttribute('data-lucide', 'database-zap');
    document.getElementById("empty-state-icon").classList.add('text-red-500');
    document.getElementById("empty-state-text").textContent = errorTitle;

    const subtext = document.getElementById("empty-state-subtext");
    subtext.textContent = errorDesc;
    subtext.classList.remove('hidden');

    showToast(errorTitle, 'error');
    lucide.createIcons();
  }
}

async function saveClub(clubData) {
  const btnSubmit = document.getElementById('btn-submit-form');
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Menyimpan...`;
  lucide.createIcons();

  try {
    if (clubData.id) {
      const { error } = await supabaseClient
        .from(TABLE_NAME)
        .update({
          name: clubData.name,
          supervisor: clubData.supervisor,
          category: clubData.category,
          description: clubData.description,
          join_link: clubData.join_link,
          image_url: clubData.image_url || null
        })
        .eq('id', clubData.id);

      if (error) throw error;
      showToast('Maklumat kelab berjaya dikemas kini!');
    } else {
      delete clubData.id;
      const { error } = await supabaseClient
        .from(TABLE_NAME)
        .insert([clubData]);

      if (error) throw error;
      showToast('Kelab baharu berjaya didaftarkan!');
    }

    closeForm();
    loadData();

  } catch (error) {
    let msg = error.message;
    if (error.message.includes('RLS')) msg = "Akses disekat. Periksa Polisi RLS di Supabase.";
    showToast(`Ralat Menyimpan: ${msg}`, 'error');
    console.error(error);
  }

  btnSubmit.disabled = false;
  btnSubmit.innerHTML = `<i data-lucide="save" class="w-4 h-4"></i> Simpan Rekod`;
  lucide.createIcons();
}

async function deleteClub(id) {
  try {
    const { error } = await supabaseClient
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) throw error;

    showToast('Rekod kelab telah dipadam.');
    loadData();

  } catch (error) {
    let msg = error.message;
    if (error.message.includes('RLS')) msg = "Akses disekat. Periksa Polisi RLS di Supabase.";
    showToast(`Gagal memadam: ${msg}`, 'error');
    console.error(error);
  }
}

// --- PAPARAN KAD KELAB & CARIAN ---
const clubsGrid = document.getElementById("clubs-grid");
const templateCard = document.getElementById("template-club-card");
const searchInput = document.getElementById('search-input');
const filterCat = document.getElementById('filter-category');
const sortOrder = document.getElementById('sort-order');

function renderClubs() {
  clubsGrid.innerHTML = '';
  let filtered = [...clubs];

  const q = searchInput.value.toLowerCase();
  if (q) {
    filtered = filtered.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
    );
  }

  const cat = filterCat.value;
  if (cat !== 'all') filtered = filtered.filter(c => c.category === cat);

  if (sortOrder.value === 'az') {
    filtered.sort((a, b) => (a.name || '').localeCompare((b.name || '')));
  }

  const emptyState = document.getElementById("empty-state");

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    emptyState.classList.add('flex');
    document.getElementById("empty-state-icon").setAttribute('data-lucide', 'folder-search');
    document.getElementById("empty-state-icon").classList.remove('text-red-500');
    document.getElementById("empty-state-text").textContent = "Tiada kelab sepadan dengan carian anda.";
    document.getElementById("empty-state-subtext").classList.add('hidden');
    clubsGrid.classList.add('hidden');
  } else {
    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');
    clubsGrid.classList.remove('hidden');

    filtered.forEach(club => {
      const clone = templateCard.content.cloneNode(true);
      const article = clone.querySelector('.js-card-wrapper');

      clone.querySelector('.js-club-name').textContent = club.name || 'Tiada Nama';
      clone.querySelector('.js-club-supervisor').textContent = club.supervisor || '-';
      clone.querySelector('.js-club-desc').textContent = club.description || '';
      clone.querySelector('.js-club-category').textContent = club.category || 'Umum';

      if (club.image_url && club.image_url.trim() !== "") {
        const img = clone.querySelector('.js-club-img');
        img.src = club.image_url;
        img.onerror = () => { img.classList.add('hidden'); };
        img.onload = () => { img.classList.remove('hidden'); };
      }

      article.addEventListener('click', () => openDetail(club));

      if (isAdmin) {
        const adminControls = clone.querySelector('.js-admin-controls');
        adminControls.classList.remove('hidden');

        clone.querySelector('.js-btn-edit').addEventListener('click', (e) => { e.stopPropagation(); openForm(club); });

        const standard = clone.querySelector('.js-admin-standard');
        const confirm = clone.querySelector('.js-admin-confirm');

        clone.querySelector('.js-btn-delete').addEventListener('click', (e) => {
          e.stopPropagation(); standard.classList.add('hidden'); confirm.classList.remove('hidden'); confirm.classList.add('flex');
        });
        clone.querySelector('.js-btn-confirm-no').addEventListener('click', (e) => {
          e.stopPropagation(); confirm.classList.add('hidden'); confirm.classList.remove('flex'); standard.classList.remove('hidden');
        });
        clone.querySelector('.js-btn-confirm-yes').addEventListener('click', (e) => {
          e.stopPropagation(); deleteClub(club.id);
        });
      }
      clubsGrid.appendChild(clone);
    });
  }
  lucide.createIcons();
}

searchInput.addEventListener('input', renderClubs);
filterCat.addEventListener('change', renderClubs);
sortOrder.addEventListener('change', renderClubs);

// --- BORANG TAMBAH / EDIT KELAB ---
const clubForm = document.getElementById('club-form');

clubForm.addEventListener('submit', (e) => {
  e.preventDefault();
  saveClub({
    id: document.getElementById('edit-club-id').value,
    name: document.getElementById('input-name').value.trim(),
    supervisor: document.getElementById('input-supervisor').value.trim(),
    category: document.getElementById('input-category').value,
    description: document.getElementById('input-desc').value.trim(),
    join_link: document.getElementById('input-link').value.trim(),
    image_url: document.getElementById('input-image').value.trim()
  });
});

function openForm(club = null) {
  document.getElementById('club-form-container').classList.remove('hidden');
  if (club) {
    document.getElementById('form-title').textContent = "Kemas Kini Maklumat Kelab";
    document.getElementById('edit-club-id').value = club.id;
    document.getElementById('input-name').value = club.name || '';
    document.getElementById('input-supervisor').value = club.supervisor || '';
    document.getElementById('input-category').value = club.category || "Akademik";
    document.getElementById('input-desc').value = club.description || '';
    document.getElementById('input