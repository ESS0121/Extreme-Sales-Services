// frontend/js/staff.js

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://extreme-sales-services.onrender.com';

const token = localStorage.getItem('ess_token');
const role = localStorage.getItem('ess_role');

if (!token || (role !== 'staff' && role !== 'admin')) {
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

    if (tabId === 'tab-enquiries') fetchEnquiries();
}

// ------ SERVICE REQUESTS LOGIC ------ //
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
        if (data.success) renderTable(data.requests);
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
        row.className = "hover:bg-orange-50 transition duration-200 border-b";
        
        // AMC Tagging rendering
        let niceServiceType = serviceNames[req.service_type] || req.service_type;
        const isAMC = niceServiceType.includes('[✅ AMC Covered]');
        if(isAMC) {
            niceServiceType = niceServiceType.replace('[✅ AMC Covered]', '<br><span class="inline-block mt-1 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm tracking-wide">COVERED BY AMC</span>');
        }

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
                <div class="text-xs font-mono text-gray-400 mt-1">${req.request_id}</div>
            </td>
            <td class="px-6 py-4 text-sm font-medium text-gray-700">${niceServiceType}</td>
            <td class="px-6 py-4">
                <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold shadow-sm rounded-full 
                    ${req.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}">
                    ${req.status}
                </span>
            </td>
            <td class="px-6 py-4 text-sm flex flex-col gap-2">
                 <select onchange="assignTechnician('${req.request_id}', this.value)" class="block w-full bg-white border border-gray-300 rounded-md py-1 px-2 focus:ring-blue-500 text-xs shadow-sm hover:border-gray-400 focus:outline-none transition">
                    ${techOptions}
                </select>
                <select onchange="updateRequestStatus('${req.request_id}', this.value)" class="block w-full bg-white border border-gray-300 rounded-md py-1 px-2 focus:ring-blue-500 text-xs shadow-sm hover:border-gray-400 focus:outline-none transition font-bold">
                    <option value="Pending" ${req.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
                    <option value="Assigned" ${req.status === 'Assigned' ? 'selected' : ''}>🧑‍🔧 Assigned</option>
                    <option value="In Progress" ${req.status === 'In Progress' ? 'selected' : ''}>🛠️ In Progress</option>
                    <option value="Completed" ${req.status === 'Completed' ? 'selected' : ''}>✅ Completed</option>
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
                row.className = "hover:bg-blue-50 transition duration-200 border-b";

                row.innerHTML = `
                    <td class="px-6 py-4 text-sm text-gray-500">${new Date(enq.created_at).toLocaleDateString()}</td>
                    <td class="px-6 py-4">
                        <div class="text-sm font-bold text-gray-900">${enq.name}</div>
                        <div class="text-sm text-gray-500 font-mono mt-1">${enq.phone}</div>
                    </td>
                    <td class="px-6 py-4 text-sm font-bold text-blue-700 bg-blue-50/50">${enq.product_name} <br> <span class="text-[10px] text-gray-400 font-normal">REF: ${enq.product_id}</span></td>
                    <td class="px-6 py-4 text-sm text-gray-700 italic border-l">"${enq.message || 'No additional message.'}"</td>
                `;
                enquiryTableBody.appendChild(row);
            });
        }
    } catch (e) {}
}


// Event Listeners
refreshBtn.addEventListener('click', () => {
    fetchRequests();
    fetchEnquiries();
});

// Initial Load
fetchRequests();
