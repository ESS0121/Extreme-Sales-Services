// frontend/js/admin.js

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://extreme-sales-services.onrender.com';

const token = localStorage.getItem('ess_token');
const role = localStorage.getItem('ess_role');

if (!token || role !== 'admin') {
    alert("Unauthorized! Redirecting to login...");
    window.location.href = 'auth/login.html';
}

const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
};

// Tabs Logic
function switchTab(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('block');
        tab.classList.add('hidden');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-blue-100', 'text-blue-700');
        btn.classList.add('text-gray-500', 'hover:bg-gray-50');
    });

    document.getElementById(tabId).classList.remove('hidden');
    document.getElementById(tabId).classList.add('block');
    btnElement.classList.add('bg-blue-100', 'text-blue-700');
    btnElement.classList.remove('text-gray-500', 'hover:bg-gray-50');

    if (tabId === 'tab-products') fetchProducts();
    if (tabId === 'tab-enquiries') fetchEnquiries();
    if (tabId === 'tab-amc') fetchAmcData();
}

// ------ SERVICE REQUESTS & USERS LOGIC ------ //
const tableBody = document.getElementById('requestTableBody');
const refreshBtn = document.getElementById('refreshBtn');

let availableTechnicians = [];
async function loadTechnicians() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/users/technicians`, { headers: authHeaders });
        const data = await response.json();
        if (data.success) availableTechnicians = data.technicians;
    } catch(err) {}
}

async function fetchRequests() {
    if (availableTechnicians.length === 0) await loadTechnicians();
    try {
        const response = await fetch(`${API_BASE}/api/admin/requests`, { headers: authHeaders });
        const data = await response.json();
        if (data.success) {
            renderTable(data.requests);
            
            // Render Analytics Banner if present
            if(data.analytics) {
                const statJobs = document.getElementById('statJobs');
                const statItems = document.getElementById('statItems');
                const statAmc = document.getElementById('statAmc');
                
                if (statJobs) statJobs.innerText = data.analytics.pendingJobs;
                if (statItems) statItems.innerText = data.analytics.totalItems;
                if (statAmc) statAmc.innerText = data.analytics.activeAmc;
            }
        }
    } catch (error) {}
}

function renderTable(requests) {
    tableBody.innerHTML = '';
    const serviceNames = {
        'Repair': '🔧 AC Repair',
        'Servicing': '🧼 Servicing',
        'Installation': '🏗️ Installation',
        'Gas Refill': '🧊 Gas Refill',
        'Inspection': '🔍 Inspection'
    };

    requests.forEach(req => {
        const row = document.createElement('tr');
        row.className = "hover:bg-gray-50 transition border-b";
        const niceServiceType = serviceNames[req.service_type] || req.service_type;

        let techOptions = '<option value="" disabled selected>Assign Technician...</option>';
        availableTechnicians.forEach(tech => {
            const isSelected = req.technician_id === tech.id ? 'selected' : '';
            const workload = tech.active_jobs > 0 ? ` (${tech.active_jobs} jobs)` : ' (Free)';
            techOptions += `<option value="${tech.id}" ${isSelected}>${tech.name}${workload}</option>`;
        });

        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="text-sm font-bold text-gray-900">${req.name}</div>
                <div class="text-sm text-gray-500">${req.phone}</div>
                <div class="text-xs font-mono text-blue-600 mt-1">${req.request_id}</div>
            </td>
            <td class="px-6 py-4 text-sm font-medium text-gray-700">${niceServiceType}</td>
            <td class="px-6 py-4">
                <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${req.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}">
                    ${req.status}
                </span>
            </td>
            <td class="px-6 py-4 text-sm flex flex-col gap-2">
                 <select onchange="assignTechnician('${req.request_id}', this.value)" class="block w-full bg-white border border-gray-300 rounded-md py-1 px-2 focus:ring-blue-500 text-xs">
                    ${techOptions}
                </select>
                <select onchange="updateRequestStatus('${req.request_id}', this.value)" class="block w-full bg-white border border-gray-300 rounded-md py-1 px-2 focus:ring-blue-500 text-xs">
                    <option value="Pending" ${req.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Assigned" ${req.status === 'Assigned' ? 'selected' : ''}>Assigned</option>
                    <option value="In Progress" ${req.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                    <option value="Completed" ${req.status === 'Completed' ? 'selected' : ''}>Completed</option>
                </select>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function updateRequestStatus(requestId, newStatus) {
    await fetch(`${API_BASE}/api/admin/update-status`, { method: 'PATCH', headers: authHeaders, body: JSON.stringify({ requestId, newStatus }) });
    fetchRequests();
}

async function assignTechnician(requestId, technicianId) {
    await fetch(`${API_BASE}/api/admin/assign-technician`, { method: 'PATCH', headers: authHeaders, body: JSON.stringify({ requestId, technicianId }) });
    loadTechnicians().then(() => fetchRequests()); 
}

document.getElementById('createUserForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        name: document.getElementById('newUserName').value,
        email: document.getElementById('newUserEmail').value,
        role: document.getElementById('newUserRole').value,
        password: document.getElementById('newUserPass').value,
        phone: document.getElementById('newUserPhone').value
    };

    const res = await fetch(`${API_BASE}/api/admin/users`, { method: 'POST', headers: authHeaders, body: JSON.stringify(payload) });
    if (res.ok) {
        alert(payload.role + " created successfully!");
        e.target.reset();
        await loadTechnicians();
        fetchRequests();
    } else alert("Failed to create user.");
});


// ------ PRODUCTS INVENTORY LOGIC ------ //
const productGrid = document.getElementById('productGridAdmin');

async function fetchProducts() {
    try {
        const response = await fetch(`${API_BASE}/api/products`);
        const data = await response.json();
        if (data.success) {
            productGrid.innerHTML = '';
            data.products.forEach(p => {
                const card = document.createElement('div');
                card.className = "bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow transition relative";
                
                let badgeColor = p.category === 'new_ac' ? 'bg-blue-500' : (p.category === 'spare_part' ? 'bg-orange-500' : 'bg-gray-600');
                let badgeText = p.category.replace('_', ' ').toUpperCase();

                card.innerHTML = `
                    <div class="h-40 overflow-hidden bg-gray-100 flex items-center justify-center">
                        <img src="${p.image_url}" alt="${p.name}" class="w-full h-full object-cover text-xs text-gray-400">
                    </div>
                    <span class="absolute top-2 left-2 ${badgeColor} text-white text-[10px] px-2 py-0.5 rounded font-bold tracking-wide">${badgeText}</span>
                    <div class="p-4 flex flex-col gap-1">
                        <h3 class="font-bold text-gray-800 leading-tight">${p.name}</h3>
                        <p class="text-xs text-gray-500 truncate">${p.description}</p>
                        <p class="text-blue-700 font-extrabold mt-1">₹${p.price}</p>
                        <button onclick="deleteProduct('${p.id}')" class="mt-3 text-sm text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50 py-1 rounded w-full transition">Delete Product</button>
                    </div>
                `;
                productGrid.appendChild(card);
            });
        }
    } catch (e) {}
}

document.getElementById('addProductForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        name: document.getElementById('prodName').value,
        category: document.getElementById('prodCategory').value,
        price: document.getElementById('prodPrice').value,
        quantity: document.getElementById('prodQuantity').value || 1,
        image_url: document.getElementById('prodImage').value,
        description: document.getElementById('prodDesc').value || '',
        condition: document.getElementById('prodCategory').value === 'used_ac' ? 'used' : 'new',
        brand: 'Various'
    };

    const res = await fetch(`${API_BASE}/api/admin/products`, { method: 'POST', headers: authHeaders, body: JSON.stringify(payload) });
    if (res.ok) { e.target.reset(); fetchProducts(); }
});

async function deleteProduct(id) {
    if(!confirm("Delete this product?")) return;
    await fetch(`${API_BASE}/api/admin/products/${id}`, { method: 'DELETE', headers: authHeaders });
    fetchProducts();
}


// ------ ENQUIRIES LOGIC ------ //
const enquiryTableBody = document.getElementById('enquiryTableBody');

async function fetchEnquiries() {
     try {
        const response = await fetch(`${API_BASE}/api/admin/enquiries`, { headers: authHeaders });
        const data = await response.json();
        
        if (data.success) {
            enquiryTableBody.innerHTML = '';
            data.enquiries.forEach(enq => {
                const row = document.createElement('tr');
                row.className = "hover:bg-gray-50 transition border-b";
                const dateStr = new Date(enq.created_at).toLocaleDateString();

                row.innerHTML = `
                    <td class="px-6 py-4 text-sm text-gray-500">${dateStr}</td>
                    <td class="px-6 py-4">
                        <div class="text-sm font-bold text-gray-900">${enq.name}</div>
                        <div class="text-sm text-gray-500">${enq.phone}</div>
                    </td>
                    <td class="px-6 py-4 text-sm font-mono text-blue-600 font-bold">${enq.product_name}</td>
                    <td class="px-6 py-4 text-sm text-gray-700 italic">"${enq.message}"</td>
                `;
                enquiryTableBody.appendChild(row);
            });
        }
    } catch (e) {}
}


// ------ AMC MANAGER LOGIC ------ ///
const amcTableBody = document.getElementById('amcTableBody');
const amcPlansGrid = document.getElementById('amcPlansGridAdmin');

async function fetchAmcData() {
    try {
        const response = await fetch(`${API_BASE}/api/amc-plans`);
        const data = await response.json();
        if (data.success) {
            amcPlansGrid.innerHTML = '';
            data.plans.forEach(plan => {
                const div = document.createElement('div');
                div.className = "bg-white border border-gray-200 rounded-xl p-6 text-center shadow-md relative";
                div.innerHTML = `
                    <h3 class="font-bold text-gray-800 text-xl border-b pb-2 mb-4">${plan.name}</h3>
                    <p class="text-blue-600 font-black text-3xl mb-1">₹${plan.price}<span class="text-sm text-gray-400 font-normal">/yr</span></p>
                    <p class="text-gray-800 font-bold text-sm bg-blue-50 py-1 rounded inline-block px-3 mb-4">${plan.services_per_year} Free Services</p>
                    <p class="text-gray-500 text-sm italic min-h-[40px]">${plan.description}</p>
                    <button onclick="deleteAmcPlan('${plan.id}')" class="mt-6 text-red-500 text-xs hover:underline uppercase tracking-wider font-bold">Delete Plan Tier</button>
                `;
                amcPlansGrid.appendChild(div);
            });
        }
    } catch(e) {}

    try {
        const res = await fetch(`${API_BASE}/api/admin/customer-amc`, { headers: authHeaders });
        const cdata = await res.json();
        if (cdata.success) {
            amcTableBody.innerHTML = '';
            cdata.subscriptions.forEach(sub => {
                const tr = document.createElement('tr');
                const isPending = sub.status === 'Pending';
                
                let actionBtn = isPending 
                    ? `<button onclick="activateAmc('${sub.id}')" class="bg-green-500 text-white px-3 py-1.5 rounded-full shadow text-xs font-bold hover:bg-green-600 transition uppercase tracking-wide">Accept Payment & Activate</button>`
                    : `<span class="text-gray-400 text-xs font-mono">Active till ${new Date(sub.end_date).toLocaleDateString()}</span>`;

                tr.innerHTML = `
                    <td class="px-6 py-4 text-sm text-gray-500">${new Date(sub.created_at).toLocaleDateString()}</td>
                    <td class="px-6 py-4">
                        <div class="text-sm font-bold text-gray-900">${sub.customer_name}</div>
                        <div class="text-sm text-gray-500">${sub.phone}</div>
                    </td>
                    <td class="px-6 py-4 text-sm font-bold text-blue-700">${sub.plan_name}</td>
                    <td class="px-6 py-4">
                        <span class="px-3 py-1 inline-flex text-xs leading-5 font-bold shadow-sm rounded-full ${isPending ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : 'bg-green-100 text-green-800 border border-green-200'}">
                            ${sub.status} ${!isPending ? `<span class="ml-1 opacity-75">(${sub.remaining_services} left)</span>` : ''}
                        </span>
                    </td>
                    <td class="px-6 py-4">${actionBtn}</td>
                `;
                amcTableBody.appendChild(tr);
            });
        }
    } catch(e) {}
}

document.getElementById('addAmcPlanForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        name: document.getElementById('amcPlanName').value,
        price: document.getElementById('amcPlanPrice').value,
        services_per_year: document.getElementById('amcPlanServices').value,
        description: document.getElementById('amcPlanDesc').value
    };
    const res = await fetch(`${API_BASE}/api/admin/amc-plans`, { method: 'POST', headers: authHeaders, body: JSON.stringify(payload) });
    if(res.ok) { e.target.reset(); fetchAmcData(); }
});

async function deleteAmcPlan(id) {
    if(!confirm("Delete this AMC Plan tier entirely?")) return;
    await fetch(`${API_BASE}/api/admin/amc-plans/${id}`, { method: 'DELETE', headers: authHeaders });
    fetchAmcData();
}

async function activateAmc(id) {
    const services = prompt("Confirm how many services are included in this 1 year plan:", "3");
    if(!services || isNaN(services)) return;
    
    await fetch(`${API_BASE}/api/admin/customer-amc/${id}/activate`, { 
        method: 'PATCH', headers: authHeaders, 
        body: JSON.stringify({ services_per_year: services })
    });
    fetchAmcData();
}

// Event Listeners
refreshBtn.addEventListener('click', () => {
    fetchRequests();
    fetchProducts();
    fetchEnquiries();
    fetchAmcData();
});

// Initial Load
fetchRequests();