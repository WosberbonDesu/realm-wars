// ===== TOUR DETAIL PAGE - TABS =====
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;

        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        const target = document.getElementById('tab-' + tabId);
        if (target) target.classList.add('active');
    });
});

// ===== AUTH PAGE - LOGIN/REGISTER TABS =====
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const authType = tab.dataset.auth;

        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

        tab.classList.add('active');
        const target = document.getElementById('auth-' + authType);
        if (target) target.classList.add('active');
    });
});

// ===== PASSWORD TOGGLE =====
document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = btn.parentElement.querySelector('input');
        const icon = btn.querySelector('i');

        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    });
});

// ===== PASSWORD STRENGTH METER =====
const registerPassword = document.getElementById('registerPassword');
if (registerPassword) {
    registerPassword.addEventListener('input', () => {
        const val = registerPassword.value;
        const bar = document.querySelector('.strength-bar');
        if (!bar) return;

        let strength = 0;
        if (val.length >= 8) strength++;
        if (/[A-Z]/.test(val)) strength++;
        if (/[0-9]/.test(val)) strength++;
        if (/[^A-Za-z0-9]/.test(val)) strength++;

        const widths = ['0%', '25%', '50%', '75%', '100%'];
        const colors = ['#e74c3c', '#e74c3c', '#f39c12', '#27ae60', '#27ae60'];

        bar.style.width = widths[strength];
        bar.style.background = colors[strength];
    });
}

// ===== LOGIN FORM =====
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Giriş başarılı! Ana sayfaya yönlendiriliyorsunuz...');
    });
}

// ===== REGISTER FORM =====
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Üyeliğiniz başarıyla oluşturuldu! E-posta adresinize doğrulama linki gönderildi.');
    });
}

// ===== BOOKING FORM - PRICE CALCULATOR =====
const personCount = document.getElementById('personCount');
const roomType = document.getElementById('roomType');
const totalPrice = document.getElementById('totalPrice');

function updatePrice() {
    if (!personCount || !roomType || !totalPrice) return;

    const basePrice = 89900;
    const personIndex = personCount.selectedIndex;
    const persons = personIndex < 4 ? personIndex + 1 : 5;
    const singleSupplement = roomType.selectedIndex === 1 ? 12000 : 0;

    const total = (basePrice * persons) + (singleSupplement * persons);
    totalPrice.textContent = '₺' + total.toLocaleString('tr-TR');
}

if (personCount) personCount.addEventListener('change', updatePrice);
if (roomType) roomType.addEventListener('change', updatePrice);

// ===== BOOK NOW =====
const bookNow = document.getElementById('bookNow');
if (bookNow) {
    bookNow.addEventListener('click', () => {
        alert('Rezervasyon talebiniz alınmıştır!\n\nEn kısa sürede sizinle iletişime geçeceğiz.\n\n(Demo amaçlı - gerçek ödeme sistemi entegre edilecektir)');
    });
}

// ===== FILTER FUNCTIONALITY =====
const applyFilters = document.getElementById('applyFilters');
const clearFilters = document.getElementById('clearFilters');

if (applyFilters) {
    applyFilters.addEventListener('click', () => {
        const region = document.getElementById('filterRegion').value;
        const cards = document.querySelectorAll('.tour-list-card');
        let visibleCount = 0;

        cards.forEach(card => {
            const cardRegion = card.dataset.region;
            const show = region === 'all' || cardRegion === region;
            card.style.display = show ? 'grid' : 'none';
            if (show) visibleCount++;
        });

        const countEl = document.querySelector('.result-count strong');
        if (countEl) countEl.textContent = visibleCount;
    });
}

if (clearFilters) {
    clearFilters.addEventListener('click', () => {
        document.getElementById('filterRegion').value = 'all';
        document.getElementById('filterMonth').value = 'all';

        const priceMin = document.getElementById('priceMin');
        const priceMax = document.getElementById('priceMax');
        if (priceMin) priceMin.value = '';
        if (priceMax) priceMax.value = '';

        document.querySelectorAll('.filter-card input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });

        document.querySelectorAll('.tour-list-card').forEach(card => {
            card.style.display = 'grid';
        });

        const countEl = document.querySelector('.result-count strong');
        if (countEl) countEl.textContent = document.querySelectorAll('.tour-list-card').length;
    });
}

// ===== SORT FUNCTIONALITY =====
const sortSelect = document.getElementById('sortTours');
if (sortSelect) {
    sortSelect.addEventListener('change', () => {
        const container = document.querySelector('.tour-list');
        if (!container) return;

        const cards = Array.from(container.querySelectorAll('.tour-list-card'));
        const sortType = sortSelect.selectedIndex;

        cards.sort((a, b) => {
            const priceA = parseInt(a.dataset.price);
            const priceB = parseInt(b.dataset.price);
            const daysA = parseInt(a.dataset.days);
            const daysB = parseInt(b.dataset.days);

            switch (sortType) {
                case 1: return priceA - priceB;
                case 2: return priceB - priceA;
                case 3: return daysA - daysB;
                case 4: return daysB - daysA;
                default: return 0;
            }
        });

        cards.forEach(card => container.appendChild(card));
    });
}

// ===== SCROLL ANIMATIONS FOR PAGE ELEMENTS =====
const pageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.tour-list-card, .program-day, .feature-item, .review-card, .benefit-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    pageObserver.observe(el);
});
