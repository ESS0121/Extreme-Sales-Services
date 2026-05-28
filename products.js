// frontend/js/products.js

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://ess-backend.onrender.com';
const API_URL = `${API_BASE}/api/products`;
const ENQUIRY_URL = `${API_BASE}/api/enquiries`;

const productGrid = document.getElementById('productGrid');
let allProducts = [];
let activeCategory = 'all';
let productPriceRange = { min: 0, max: 100000 };

// ------ FETCH & RENDER ------ //

async function loadProducts() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        
        if (data.success) {
            allProducts = data.products;
            updatePriceRange(allProducts);
            renderProducts(allProducts);
        } else {
            productGrid.innerHTML = `<div class="col-span-full text-center text-red-500 py-12">Failed to load marketplace.</div>`;
        }
    } catch (error) {
        console.error(error);
        productGrid.innerHTML = `<div class="col-span-full text-center text-gray-500 py-12">Unable to connect to server.</div>`;
    }
}

function renderProducts(productsArray) {
    productGrid.innerHTML = '';
    
    if (productsArray.length === 0) {
        productGrid.innerHTML = `<div class="col-span-full text-center text-gray-400 py-12 font-medium">No items found.</div>`;
        return;
    }

    // If this is the first render, update slider bounds based on products
    if (productPriceRange.min === 0 && productPriceRange.max === 100000 && productsArray.length > 0) {
        updatePriceRange(productsArray);
    }

    productsArray.forEach(p => {
        const card = document.createElement('div');
        card.className = "bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all transform hover:-translate-y-1 relative flex flex-col group";

        // Badges
        let badgeClass = "bg-gray-200 text-gray-800";
        let badgeLabel = "Item";
        if (p.category === 'new_ac') { badgeClass = "bg-green-500 text-white shadow-md"; badgeLabel = "Brand New"; }
        if (p.category === 'used_ac') { badgeClass = "bg-purple-500 text-white shadow-md"; badgeLabel = "Certified 2nd Hand"; }
        if (p.category === 'spare_part') { badgeClass = "bg-orange-500 text-white shadow-md"; badgeLabel = "Genuine Spare"; }

        // Encode data for the click handler safely
        const encodedData = encodeURIComponent(JSON.stringify(p));

        card.innerHTML = `
            <div class="h-48 overflow-hidden relative bg-white flex items-center justify-center p-4">
                <img src="${p.image_url}" alt="${p.name}" class="h-full object-contain group-hover:scale-105 transition-transform duration-500">
                <span class="absolute top-3 left-3 ${badgeClass} text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-full tracking-wide">${badgeLabel}</span>
            </div>
            <div class="p-5 flex flex-col flex-1 border-t border-gray-50">
                <h3 class="font-bold text-gray-800 text-lg leading-tight mb-1">${p.name}</h3>
                <p class="text-sm text-gray-500 mb-3 flex-1 line-clamp-2">${p.description || p.category.replace('_', ' ')}</p>
                <div class="flex items-end justify-between mt-auto">
                    <div>
                        <p class="text-xs text-gray-400 font-medium uppercase tracking-wide">Price</p>
                        <p class="text-xl font-black text-blue-600">₹${p.price}</p>
                    </div>
                    <button onclick="openModal('${encodedData}')" class="bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg font-bold shadow-sm transition text-sm">
                        Enquire
                    </button>
                </div>
            </div>
        `;
        productGrid.appendChild(card);
    });
}

// ------ FILTER, SEARCH, SORT ------ //

function applyFilters() {
    const searchTerm = document.getElementById('productSearch')?.value.trim().toLowerCase() || '';
    const sortMode = document.getElementById('productSort')?.value || 'default';

    let filtered = allProducts;

    if (activeCategory !== 'all') {
        filtered = filtered.filter((p) => p.category === activeCategory);
    }

    if (searchTerm) {
        filtered = filtered.filter((p) => {
            return p.name.toLowerCase().includes(searchTerm) || (p.description || '').toLowerCase().includes(searchTerm) || p.category.toLowerCase().includes(searchTerm);
        });
    }

    const minPrice = Number(document.getElementById('minPrice')?.value || 0);
    const maxPrice = Number(document.getElementById('maxPrice')?.value || 0);
    const inStockOnly = document.getElementById('inStockOnly')?.checked || false;

    if (minPrice > 0) {
        filtered = filtered.filter((p) => Number(p.price) >= minPrice);
    }
    if (maxPrice > 0) {
        filtered = filtered.filter((p) => Number(p.price) <= maxPrice);
    }

    // ensure bounds make sense
    if (minPrice > 0 && maxPrice > 0 && minPrice > maxPrice) {
        filtered = [];
    }

    if (inStockOnly) {
        filtered = filtered.filter((p) => {
            if (p.stock === undefined && p.quantity === undefined && p.availability === undefined) return true;
            const stockValue = p.stock ?? p.quantity ?? p.availability;
            return Number(stockValue) > 0;
        });
    }

    if (sortMode === 'price_asc') {
        filtered = filtered.slice().sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortMode === 'price_desc') {
        filtered = filtered.slice().sort((a, b) => Number(b.price) - Number(a.price));
    }

    renderProducts(filtered);
}

// Attach filtering events
const searchInput = document.getElementById('productSearch');
const sortSelect = document.getElementById('productSort');
const minPriceInput = document.getElementById('minPrice');
const maxPriceInput = document.getElementById('maxPrice');
const inStockCheckbox = document.getElementById('inStockOnly');

if (searchInput) searchInput.addEventListener('input', applyFilters);
if (sortSelect) sortSelect.addEventListener('change', applyFilters);
if (minPriceInput) {
    minPriceInput.addEventListener('input', () => {
        document.getElementById('minPriceValue').innerText = minPriceInput.value;
        applyFilters();
    });
}
if (maxPriceInput) {
    maxPriceInput.addEventListener('input', () => {
        document.getElementById('maxPriceValue').innerText = maxPriceInput.value;
        applyFilters();
    });
}
if (inStockCheckbox) inStockCheckbox.addEventListener('change', applyFilters);

// ------ CATEGORY FILTERING ------ //

function filterCategory(cat, btnElement) {
    // Styling toggle
    const buttons = document.querySelectorAll('.cat-btn');
    buttons.forEach(btn => {
        btn.classList.remove('bg-white', 'text-blue-600', 'shadow-md', 'scale-105');
        btn.classList.add('bg-blue-500', 'text-white', 'shadow-inner', 'border', 'border-blue-400');
    });

    btnElement.classList.add('bg-white', 'text-blue-600', 'shadow-md', 'scale-105');
    btnElement.classList.remove('bg-blue-500', 'text-white', 'shadow-inner', 'border', 'border-blue-400');

    // Implementation
    activeCategory = cat;
    applyFilters();
}

function clearFilters() {
    activeCategory = 'all';
    document.getElementById('productSearch').value = '';
    document.getElementById('productSort').value = 'default';
    const minPriceInput = document.getElementById('minPrice');
    const maxPriceInput = document.getElementById('maxPrice');
    const minPriceLabel = document.getElementById('minPriceValue');
    const maxPriceLabel = document.getElementById('maxPriceValue');

    if (minPriceInput && maxPriceInput && minPriceLabel && maxPriceLabel) {
        minPriceInput.value = productPriceRange.min;
        maxPriceInput.value = productPriceRange.max;
        minPriceLabel.innerText = productPriceRange.min;
        maxPriceLabel.innerText = productPriceRange.max;
    }

    document.getElementById('inStockOnly').checked = false;

    const categoryBtns = document.querySelectorAll('.cat-btn');
    categoryBtns.forEach(btn => {
        btn.classList.remove('bg-white', 'text-blue-600', 'shadow-md', 'scale-105');
        btn.classList.add('bg-blue-500', 'text-white', 'shadow-inner', 'border', 'border-blue-400');
    });

    // Restore the all button styles as active
    const allBtn = [...categoryBtns].find(btn => btn.textContent.includes('All Items'));
    if (allBtn) {
        allBtn.classList.add('bg-white', 'text-blue-600', 'shadow-md', 'scale-105');
        allBtn.classList.remove('bg-blue-500', 'text-white', 'shadow-inner', 'border', 'border-blue-400');
    }

    renderProducts(allProducts);
}


// ------ FAST ENQUIRY MODAL LOGIC ------ //

const modal = document.getElementById('enquiryModal');
const modalContent = document.getElementById('modalContent');
const form = document.getElementById('enquiryForm');

function openModal(encodedData) {
    const p = JSON.parse(decodeURIComponent(encodedData));
    
    // Populate
    document.getElementById('modalProductId').value = p.id;
    document.getElementById('modalProductName').innerText = p.name;
    document.getElementById('modalProductPrice').innerText = `₹${p.price}`;
    document.getElementById('modalImage').src = p.image_url;
    document.getElementById('enqSuccessMsg').classList.add('hidden'); // Reset Success label
    
    // Show Flow
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modalContent.classList.remove('scale-95');
    }, 10);
    
    // Auto-focus logic (nice UX touch)
    setTimeout(() => document.getElementById('enqName').focus(), 150);
}

function closeModal() {
    modal.classList.add('opacity-0');
    modalContent.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        form.reset(); // clear inputs
    }, 300);
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
        product_id: document.getElementById('modalProductId').value,
        product_name: document.getElementById('modalProductName').innerText,
        name: document.getElementById('enqName').value,
        phone: document.getElementById('enqPhone').value,
        message: document.getElementById('enqMessage').value
    };

    const btn = form.querySelector('button[type="submit"]');
    btn.innerText = "Sending...";
    btn.disabled = true;

    try {
        const res = await fetch(ENQUIRY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            form.reset();
            document.getElementById('enqSuccessMsg').classList.remove('hidden');
            setTimeout(closeModal, 2000);
        } else {
            alert("Something went wrong saving the enquiry.");
        }
    } catch (e) {
        alert("Network error.");
    } finally {
        btn.innerText = "Submit Enquiry";
        btn.disabled = false;
    }
});

// Close modal when clicking outside of it
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});


// Initialization
loadProducts();

function updatePriceRange(productsArray) {
    if (!productsArray || productsArray.length === 0) {
        return;
    }

    const prices = productsArray
        .map((p) => Number(p.price) || 0)
        .filter((v) => !isNaN(v));

    if (prices.length === 0) {
        return;
    }

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    productPriceRange = { min: minPrice, max: maxPrice };

    const minSlider = document.getElementById('minPrice');
    const maxSlider = document.getElementById('maxPrice');
    const minValue = document.getElementById('minPriceValue');
    const maxValue = document.getElementById('maxPriceValue');

    if (minSlider && maxSlider && minValue && maxValue) {
        minSlider.min = 0;
        minSlider.max = maxPrice;
        minSlider.value = minPrice;
        minValue.innerText = minPrice;

        maxSlider.min = 0;
        maxSlider.max = maxPrice;
        maxSlider.value = maxPrice;
        maxValue.innerText = maxPrice;
    }

    // apply filters so new ranges take effect immediately
    applyFilters();
}

// ------ FILTER, SEARCH, SORT ------ //