// js/script.js

// URL Google Apps Script untuk backend
const scriptURL = 'https://script.google.com/macros/s/AKfycbyRUWGf8gNFHH0YRklWOzWsTOGBTcsGGl-o2owekbd0ek3CZLPS-CBlmGrfTdm4WWs2/exec';

// ============= FUNGSI BANTU BARU UNTUK LOGGING =============
/**
 * Mengirim log aktivitas pengguna ke Google Apps Script.
 * Fungsi ini menjadi pusat untuk semua pencatatan aktivitas.
 * @param {string} activityType - Jenis aktivitas yang akan dicatat (misal: 'MULAI_TES_PM').
 */
function logUserActivity(activityType) {
    const userEmail = sessionStorage.getItem('loggedInUser');
    if (activityType && userEmail) {
        // Kirim data ke backend tanpa menunggu respons
        fetch(`${scriptURL}?action=logActivity&email=${encodeURIComponent(userEmail)}&type=${encodeURIComponent(activityType)}`);
        // Muat ulang data grafik setelah beberapa saat agar data baru bisa muncul
        setTimeout(loadActivityChartData, 1500); 
    }
}
// ==============================================================

// --- Elemen UI Global ---
const publicContent = document.getElementById('publicContent');
const memberArea = document.getElementById('memberArea');
const registrationContainer = document.getElementById('registrationContainer');
const loginContainer = document.getElementById('loginContainer');
const showLoginLink = document.getElementById('showLoginLink');
const showRegisterLink = document.getElementById('showRegisterLink');
const sidebar = document.getElementById('sidebar');
const hamburgerButton = document.getElementById('hamburgerButton');
const sidebarOverlay = document.getElementById('sidebarOverlay');

// --- Logika Sidebar Mobile ---
function toggleSidebar() {
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('hidden');
}
if (hamburgerButton) hamburgerButton.addEventListener('click', toggleSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

// --- Toggle Form Registrasi/Login ---
if (showLoginLink) showLoginLink.addEventListener('click', (e) => { e.preventDefault(); registrationContainer.classList.add('hidden'); loginContainer.classList.remove('hidden'); });
if (showRegisterLink) showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); loginContainer.classList.add('hidden'); registrationContainer.classList.remove('hidden'); });

// --- Logika Area Member & Manajemen Sesi ---
function showMemberArea(email) {
    if (publicContent) publicContent.classList.add('hidden');
    if (memberArea) memberArea.classList.remove('hidden');
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (welcomeMessage) welcomeMessage.textContent = `Selamat datang kembali, ${email}!`;
    loadActivityChartData();
}

const logoutButton = document.getElementById('logoutButton');
if (logoutButton) logoutButton.addEventListener('click', (e) => { 
    e.preventDefault();
    sessionStorage.removeItem('loggedInUser'); 
    window.location.reload(); 
});

// Cek sesi saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (loggedInUser) {
        showMemberArea(loggedInUser);
    } else {
        if(publicContent) publicContent.classList.remove('hidden');
        loadRegistrationChartData();
    }
});

// --- Pendaftaran (Public Area) ---
const registrationForm = document.getElementById('registrationForm');
if (registrationForm) {
    registrationForm.addEventListener('submit', e => {
        e.preventDefault();
        const btn = document.getElementById('submitButton');
        btn.disabled = true; btn.querySelector('.loader').classList.remove('hidden');
        const msgDiv = document.getElementById('registrationMessage');
        const data = Object.fromEntries(new FormData(registrationForm).entries());
        fetch(scriptURL, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'text/plain;charset=utf-8' }})
        .then(res => res.json()).then(res => {
            msgDiv.textContent = res.message;
            msgDiv.className = `mt-4 text-center text-sm font-medium ${res.status === 'success' ? 'text-green-600' : 'text-red-600'}`;
            if (res.status === 'success') { registrationForm.reset(); loadRegistrationChartData(); }
        }).catch(err => { msgDiv.textContent = 'Terjadi kesalahan.'; msgDiv.className = 'mt-4 text-center text-sm font-medium text-red-600'; })
        .finally(() => { btn.disabled = false; btn.querySelector('.loader').classList.add('hidden'); });
    });
}

// --- Login (Public Area) ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const btn = document.getElementById('loginButton');
        btn.disabled = true; btn.querySelector('.loader').classList.remove('hidden');
        const msgDiv = document.getElementById('loginMessage');
        const email = document.getElementById('loginEmail').value;
        fetch(`${scriptURL}?action=checkLogin&email=${encodeURIComponent(email)}`)
        .then(res => res.json()).then(res => {
            if (res.status === 'success') {
                sessionStorage.setItem('loggedInUser', res.email);
                showMemberArea(res.email);
            } else {
                msgDiv.textContent = res.message;
                msgDiv.className = 'mt-4 text-center text-sm font-medium text-red-600';
            }
        }).catch(err => { msgDiv.textContent = 'Terjadi kesalahan.'; msgDiv.className = 'mt-4 text-center text-sm font-medium text-red-600'; })
        .finally(() => { btn.disabled = false; btn.querySelector('.loader').classList.add('hidden'); });
    });
}

// --- Grafik Pendaftaran (Public Area) ---
let registrationChart;
function loadRegistrationChartData() {
    const regChartCanvas = document.getElementById('registrationChart');
    if (!regChartCanvas) return;
    const regChartLoader = document.getElementById('chartLoader');
    const regChartError = document.getElementById('chartError');
    const regCtx = regChartCanvas.getContext('2d');
    
    regChartLoader.style.display = 'flex'; regChartError.textContent = '';
    fetch(scriptURL).then(res => res.json()).then(res => {
        if(res.status === 'success') drawRegistrationChart(res.chartData, regCtx);
        else throw new Error(res.message);
    }).catch(err => { regChartError.textContent = 'Gagal memuat data pendaftaran.'; })
    .finally(() => { regChartLoader.style.display = 'none'; });
}

function drawRegistrationChart(chartData, ctx) {
    if (registrationChart) registrationChart.destroy();
    registrationChart = new Chart(ctx, {
        type: 'bar', data: { labels: chartData.labels, datasets: [{ label: 'Jumlah Pendaftar', data: chartData.data, backgroundColor: 'rgba(79, 70, 229, 0.6)', borderColor: 'rgba(79, 70, 229, 1)', borderWidth: 1 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    });
}

// --- Logika Navigasi Dasbor ---
const sidebarMenu = document.getElementById('sidebarMenu');
const contentPanels = document.querySelectorAll('.content-panel');
const sidebarLinks = document.querySelectorAll('.sidebar-link');

if (sidebarMenu) {
    sidebarMenu.addEventListener('click', (e) => {
        const link = e.target.closest('.sidebar-link');
        if (!link) return;
        e.preventDefault();

        const targetId = link.dataset.target;
        if (!targetId) return;

        // ============= MODIFIKASI: LOGGING UNTUK ANGKET =============
        // Catat aktivitas jika targetnya adalah angket
        if (targetId === 'angket') {
            logUserActivity('BUKA_ANGKET');
        }
        // ==========================================================

        // 1. Atur highlight pada menu
        sidebarLinks.forEach(s_link => {
            s_link.classList.remove('bg-indigo-100', 'text-indigo-700');
        });
        link.classList.add('bg-indigo-100', 'text-indigo-700');

        // 2. Sembunyikan semua panel konten
        contentPanels.forEach(panel => {
            panel.classList.add('hidden');
        });

        // 3. Tampilkan panel yang ditargetkan
        const targetPanel = document.getElementById(`${targetId}-content`);
        if (targetPanel) {
            targetPanel.classList.remove('hidden');
        }

        // 4. Tutup sidebar di mobile
        if (window.innerWidth < 768) {
            toggleSidebar();
        }
    });
}


// --- Logika Modal Presentasi ---
function initializePresentation(modalElement) {
    const slides = modalElement.querySelectorAll('.slide');
    const prevBtn = modalElement.querySelector('#prev-btn');
    const nextBtn = modalElement.querySelector('#next-btn');
    const slideCounter = modalElement.querySelector('#slide-counter');
    const progressBar = modalElement.querySelector('#progress-bar');
    
    if (!slides.length || !prevBtn || !nextBtn) return;
    
    let currentSlide = 0;
    const totalSlides = slides.length;

    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        slides[index].classList.add('active');
        updateUI();
    }

    function updateUI() {
        if(slideCounter) slideCounter.textContent = `Slide ${currentSlide + 1} dari ${totalSlides}`;
        if(progressBar) {
            const progressPercentage = ((currentSlide + 1) / totalSlides) * 100;
            progressBar.style.width = `${progressPercentage}%`;
        }
        prevBtn.disabled = currentSlide === 0;
        
        if (currentSlide === totalSlides - 1) {
            nextBtn.innerHTML = 'Selesai <i class="fas fa-flag-checkered ml-2"></i>';
        } else {
            nextBtn.innerHTML = 'Selanjutnya <i class="fas fa-arrow-right ml-2"></i>';
        }
    }
    
    const newNextBtn = nextBtn.cloneNode(true);
    nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
    const newPrevBtn = prevBtn.cloneNode(true);
    prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);

    newNextBtn.addEventListener('click', () => {
        if (currentSlide < totalSlides - 1) {
            currentSlide++;
            showSlide(currentSlide);
        } else {
            modalElement.classList.remove('active');
        }
    });

    newPrevBtn.addEventListener('click', () => {
        if (currentSlide > 0) {
            currentSlide--;
            showSlide(currentSlide);
        }
    });
    
    showSlide(currentSlide);
}

document.addEventListener('click', (e) => {
    if (e.target.matches('.open-modal-btn')) {
        const modalId = e.target.dataset.targetModal;
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            initializePresentation(modal);
        }
    }

    if (e.target.matches('.close-modal-btn') || e.target.matches('.modal-overlay')) {
        const activeModal = document.querySelector('.modal-overlay.active');
        if (activeModal) {
             if (e.target.matches('.modal-overlay') && activeModal.querySelector('.modal-content').contains(e.target)) {
                 return;
             }
            activeModal.classList.remove('active');
        }
    }
});


// --- Logika Dasbor (Grafik Aktivitas & Riwayat) ---
const downloadButtons = document.getElementById('downloadButtons');
if(downloadButtons) {
    downloadButtons.addEventListener('click', function(e) {
        const button = e.target.closest('.activity-btn');
        if (!button) return;
        const activityType = button.dataset.activity;
        // ============= MODIFIKASI: Menggunakan fungsi logging terpusat =============
        logUserActivity(activityType);
        // =======================================================================
    });
}

const searchHistoryButton = document.getElementById('searchHistoryButton');
if(searchHistoryButton) {
    searchHistoryButton.addEventListener('click', () => {
        const historyEmailInput = document.getElementById('historyEmailInput');
        const historyResultContainer = document.getElementById('historyResultContainer');
        const historyError = document.getElementById('historyError');
        const email = historyEmailInput.value.trim();
        if (!email) {
            historyError.textContent = 'Silakan masukkan email terlebih dahulu.'; return;
        }
        const btnText = document.getElementById('searchHistoryButtonText');
        const loader = document.getElementById('searchHistoryLoader');
        btnText.classList.add('hidden'); loader.classList.remove('hidden'); searchHistoryButton.disabled = true;
        historyError.textContent = ''; historyResultContainer.innerHTML = '';
        fetch(`${scriptURL}?action=getParticipantHistory&email=${encodeURIComponent(email)}`)
            .then(response => response.json())
            .then(result => {
                if (result.status === 'success') { displayHistory(result.history); } 
                else { throw new Error(result.message); }
            })
            .catch(error => { historyError.textContent = 'Gagal mengambil riwayat: ' + error.message; })
            .finally(() => {
                btnText.classList.remove('hidden'); loader.classList.add('hidden'); searchHistoryButton.disabled = false;
            });
    });
}

function displayHistory(history) {
    const historyResultContainer = document.getElementById('historyResultContainer');
    if (history.length === 0) {
        historyResultContainer.innerHTML = '<p class="text-center text-gray-500">Tidak ada aktivitas ditemukan.</p>'; return;
    }
    const table = document.createElement('table');
    table.className = 'w-full text-sm text-left text-gray-500';
    table.innerHTML = `<thead class="text-xs text-gray-700 uppercase bg-gray-50"><tr><th scope="col" class="px-4 py-3">Waktu</th><th scope="col" class="px-4 py-3">Aktivitas</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    history.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'bg-white border-b';
        row.innerHTML = `<td class="px-4 py-3">${item.timestamp}</td><td class="px-4 py-3 font-medium text-gray-900">${item.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</td>`;
        tbody.appendChild(row);
    });
    historyResultContainer.appendChild(table);
}

let activityChart;
function loadActivityChartData() {
    const activityChartCanvas = document.getElementById('activityChart');
    if(!activityChartCanvas) return;
    const activityChartLoader = document.getElementById('activityChartLoader');
    const activityChartError = document.getElementById('activityChartError');
    const activityCtx = activityChartCanvas.getContext('2d');
    
    activityChartLoader.style.display = 'flex'; activityChartError.textContent = '';
    fetch(`${scriptURL}?action=getActivityStats`)
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') { drawActivityChart(result.stats, activityCtx); } 
            else { throw new Error(result.message); }
        })
        .catch(error => { activityChartError.textContent = 'Gagal memuat data aktivitas.'; })
        .finally(() => { activityChartLoader.style.display = 'none'; });
}

function drawActivityChart(stats, ctx) {
    if (activityChart) activityChart.destroy();
    // Menambahkan lebih banyak warna untuk mengakomodasi lebih banyak jenis aktivitas
    const backgroundColors = [
        'rgba(79, 70, 229, 0.6)',   // Indigo for Login
        'rgba(5, 150, 105, 0.6)',   // Teal for Unduh
        'rgba(217, 70, 239, 0.6)',  // Fuchsia for Buka Angket
        'rgba(245, 158, 11, 0.6)',  // Amber for Mulai Tes
        'rgba(220, 38, 38, 0.6)'    // Red for Selesai Tes
    ];
    const borderColors = [
        'rgba(79, 70, 229, 1)',
        'rgba(5, 150, 105, 1)',
        'rgba(217, 70, 239, 1)',
        'rgba(245, 158, 11, 1)',
        'rgba(220, 38, 38, 1)'
    ];

    activityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: stats.labels,
            datasets: [{
                label: 'Jumlah Aktivitas',
                data: stats.data,
                backgroundColor: backgroundColors.slice(0, stats.labels.length),
                borderColor: borderColors.slice(0, stats.labels.length),
                borderWidth: 1
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    });
}


/* =================================================== */
/*  LOGIKA UNTUK KUIS INTERAKTIF (ALPINE.JS)           */
/* =================================================== */
function quizApp() {
    return {
        quizStarted: false,
        quizFinished: false,
        currentQuestionIndex: 0,
        score: 0,
        answerSelected: false,
        questions: [
            // Materi 1: Konsep Dasar
            { question: "Seorang guru SD meminta siswanya membuat diorama ekosistem sawah setelah kunjungan ke sawah dekat sekolah. Pendekatan ini paling mencerminkan prinsip PM yang mana?", options: [ { text: "Berkesadaran", correct: false }, { text: "Bermakna", correct: true }, { text: "Menggembirakan", correct: false }, { text: "Berbasis Teknologi", correct: false } ], feedback: "Benar! Menghubungkan materi kelas (ekosistem) dengan konteks nyata di lingkungan siswa (sawah) membuat pembelajaran menjadi <strong>bermakna</strong>." },
            { question: "Manakah yang merupakan perbedaan mendasar antara Pembelajaran Mendalam (Deep Learning) dan Pembelajaran Permukaan (Surface Learning)?", options: [ { text: "PM menggunakan teknologi, sedangkan pembelajaran permukaan tidak.", correct: false }, { text: "PM berfokus pada pemahaman konsep dan aplikasi, sedangkan pembelajaran permukaan pada hafalan fakta.", correct: true }, { text: "PM hanya untuk siswa SMA, sedangkan pembelajaran permukaan untuk semua jenjang.", correct: false }, { text: "PM membutuhkan waktu lebih lama di kelas.", correct: false } ], feedback: "Tepat! Fokus utama PM adalah <strong>pemahaman konseptual dan aplikasi</strong>, bukan sekadar menghafal fakta untuk lulus ujian." },
            // Materi 2: Strategi Penerapan
            { question: "Siklus pengalaman belajar dalam PM adalah 'Memahami, Mengaplikasi, Merefleksi'. Aktivitas siswa menganalisis data dan merancang solusi untuk masalah banjir di lingkungannya termasuk dalam tahap...", options: [ { text: "Memahami", correct: false }, { text: "Mengaplikasi", correct: true }, { text: "Merefleksi", correct: false }, { text: "Mengevaluasi", correct: false } ], feedback: "Betul! Siswa <strong>mengaplikasikan</strong> pengetahuan yang telah dipahaminya untuk memecahkan masalah nyata." },
            { question: "Seorang guru SMP ingin mendesain aktivitas yang melibatkan dimensi 'Kolaborasi'. Manakah aktivitas yang paling tepat?", options: [ { text: "Siswa mengerjakan LKS yang sama secara individu di dalam kelompok.", correct: false }, { text: "Setiap siswa dalam kelompok diberi peran spesifik (ketua, penulis, peneliti) untuk menyelesaikan sebuah proyek bersama.", correct: true }, { text: "Siswa berdiskusi bebas tanpa tujuan yang jelas.", correct: false }, { text: "Satu siswa mempresentasikan hasil kerja seluruh kelompok.", correct: false } ], feedback: "Tepat sekali! Kolaborasi yang efektif melibatkan <strong>pembagian peran dan tanggung jawab yang jelas</strong> untuk mencapai tujuan bersama." },
            { question: "Dalam memilih strategi implementasi PM, seorang guru harus terlebih dahulu mempertimbangkan...", options: [ { text: "Ketersediaan proyektor di kelas.", correct: false }, { text: "Jenjang pendidikan dan karakteristik siswa.", correct: true }, { text: "Jumlah halaman buku paket.", correct: false }, { text: "Perintah dari kepala sekolah.", correct: false } ], feedback: "Benar. Strategi PM harus disesuaikan dengan <strong>tahap perkembangan dan kebutuhan siswa</strong> di setiap jenjang pendidikan." },
            { question: "Delapan Dimensi Profil Lulusan adalah tujuan akhir dari PM. Dimensi 'Penalaran Kritis' paling baik dikembangkan melalui aktivitas...", options: [ { text: "Menghafal tanggal-tanggal penting dalam sejarah.", correct: false }, { text: "Mengevaluasi validitas berbagai sumber berita tentang suatu topik.", correct: true }, { text: "Mengikuti instruksi langkah demi langkah dalam praktikum.", correct: false }, { text: "Mewarnai peta sesuai dengan legenda yang diberikan.", correct: false } ], feedback: "Tepat! <strong>Mengevaluasi sumber informasi</strong> menuntut siswa untuk menganalisis, membandingkan, dan membuat penilaian, yang merupakan inti dari penalaran kritis." },
            // Materi 3: Praktek Penerapan
            { question: "Tujuan utama dari sesi <i>microteaching</i> dalam pelatihan guru adalah...", options: [ { text: "Untuk menilai guru dan memberikan skor.", correct: false }, { text: "Untuk melatih keterampilan mengajar secara terfokus dalam lingkungan yang aman dan terkendali.", correct: true }, { text: "Untuk menyelesaikan materi pelatihan lebih cepat.", correct: false }, { text: "Untuk menunjukkan siapa guru yang paling berbakat.", correct: false } ], feedback: "Benar. <i>Microteaching</i> adalah sarana <strong>latihan terfokus</strong> di lingkungan yang aman untuk mencoba strategi baru sebelum diterapkan di kelas nyata." },
            { question: "Manakah contoh umpan balik (feedback) yang paling konstruktif setelah sesi simulasi mengajar?", options: [ { text: "“Secara umum sudah bagus, lanjutkan.”", correct: false }, { text: "“Aktivitas kolaborasinya sudah ada, namun akan lebih kuat jika setiap kelompok diberi tantangan masalah yang berbeda untuk didiskusikan.”", correct: true }, { text: "“Saya tidak suka cara Anda berbicara.”", correct: false }, { text: "“Sepertinya Anda kurang persiapan.”", correct: false } ], feedback: "Tepat! Umpan balik yang baik itu <strong>spesifik, fokus pada tindakan, dan memberikan saran perbaikan</strong> yang konkret." },
            { question: "Setelah menerima umpan balik, langkah terpenting yang harus dilakukan guru adalah...", options: [ { text: "Mempertahankan rancangan awal karena sudah paling benar.", correct: false }, { text: "Melakukan refleksi dan menyesuaikan metode pengajaran untuk penerapan berikutnya.", correct: true }, { text: "Mengabaikan umpan balik karena hanya pendapat subjektif.", correct: false }, { text: "Menyerahkan catatan umpan balik kepada atasan.", correct: false } ], feedback: "Benar sekali! Umpan balik menjadi bermakna ketika digunakan sebagai bahan <strong>refleksi untuk melakukan adaptasi dan perbaikan</strong>." },
            { question: "Seorang guru TK mencoba metode bercerita baru dan merasa gagal karena anak-anak kurang fokus. Menurut prinsip PM, respons terbaik guru tersebut adalah...", options: [ { text: "Menyalahkan anak-anak karena tidak bisa diatur.", correct: false }, { text: "Melihatnya sebagai pengalaman belajar, merefleksikan apa yang kurang, dan mencoba adaptasi baru (misal: menggunakan boneka tangan).", correct: true }, { text: "Tidak akan pernah menggunakan metode bercerita lagi.", correct: false }, { text: "Melaporkan kepada kepala sekolah bahwa metode tersebut tidak efektif.", correct: false } ], feedback: "Tepat! PM mendorong pola pikir bertumbuh (growth mindset), di mana setiap tantangan dilihat sebagai <strong>kesempatan untuk belajar, merefleksi, dan beradaptasi</strong>." }
        ],

        // ============= MODIFIKASI: LOGGING UNTUK KUIS =============
        startQuiz() { 
            logUserActivity('MULAI_TES_PM'); // Mencatat saat kuis dimulai
            this.quizStarted = true; 
        },
        // ========================================================
        selectAnswer(index) {
            this.questions[this.currentQuestionIndex].selectedAnswer = index;
            if (this.questions[this.currentQuestionIndex].options[index].correct) { this.score++; }
            this.answerSelected = true;
        },
        // ============= MODIFIKASI: LOGGING UNTUK KUIS =============
        nextQuestion() {
            if (this.currentQuestionIndex < this.questions.length - 1) {
                this.currentQuestionIndex++;
                this.answerSelected = false;
            } else {
                logUserActivity('SELESAI_TES_PM'); // Mencatat saat kuis selesai
                this.quizFinished = true;
            }
        },
        // ========================================================
        getFeedbackMessage() {
            const percentage = (this.score / this.questions.length) * 100;
            if (percentage >= 80) return "Luar biasa! Pemahaman Anda tentang Pembelajaran Mendalam sangat baik.";
            if (percentage >= 60) return "Bagus! Anda sudah memahami konsep-konsep utama. Terus pelajari lebih dalam.";
            return "Terus belajar! Coba pelajari kembali materi untuk memperkuat pemahaman Anda.";
        },
        resetQuiz() {
            this.quizStarted = false;
            this.quizFinished = false;
            this.currentQuestionIndex = 0;
            this.score = 0;
            this.answerSelected = false;
            this.questions.forEach(q => q.selectedAnswer = null);
        }
    }
}
