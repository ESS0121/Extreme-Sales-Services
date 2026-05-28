// frontend/js/technician.js

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://extreme-sales-services.onrender.com';

const token = localStorage.getItem('ess_token');
const role = localStorage.getItem('ess_role');

if (!token || role !== 'technician') {
    alert("Unauthorized! Redirecting to login...");
    window.location.href = '../auth/login.html';
}

const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
};

const jobList = document.getElementById('jobList');
const refreshBtn = document.getElementById('refreshBtn');

async function fetchJobs() {
    try {
        const response = await fetch(`${API_BASE}/api/technician/jobs`, { headers: authHeaders });
        const data = await response.json();
        
        if (data.success) {
            renderJobs(data.requests);
        } else if (response.status === 401 || response.status === 403) {
            alert("Session expired");
            localStorage.clear();
            window.location.href = '../auth/login.html';
        }
    } catch (error) {
        console.error("Error fetching jobs:", error);
    }
}

function renderJobs(jobs) {
    jobList.innerHTML = '';
    
    if (jobs.length === 0) {
        jobList.innerHTML = `<li class="text-center text-gray-500 py-8">No jobs assigned currently.</li>`;
        return;
    }

    const serviceNames = {
        'Repair': '🔧 AC Repair',
        'Servicing': '🧼 General Servicing',
        'Installation': '🏗️ Installation',
        'Gas Refill': '🧊 Gas Refill',
        'Inspection': '🔍 Inspection'
    };

    jobs.forEach(job => {
        const li = document.createElement('li');
        li.className = "bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4";
        
        const niceServiceType = serviceNames[job.service_type] || job.service_type;

        li.innerHTML = `
            <div class="flex-1">
                <div class="flex items-center gap-3 mb-1">
                    <span class="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">${job.request_id}</span>
                    <span class="text-sm font-bold text-gray-800">${niceServiceType}</span>
                </div>
                <h3 class="text-lg font-semibold text-gray-900">${job.name}</h3>
                <div class="text-sm text-gray-600 mt-1 flex flex-col sm:flex-row sm:gap-4 md:gap-6">
                    <span class="flex items-center gap-1">📞 ${job.phone}</span>
                    <span class="flex items-center gap-1">📍 ${job.address}</span>
                </div>
            </div>
            
            <div class="flex flex-col sm:flex-row items-center gap-3">
                 <select 
                    onchange="updateRequestStatus('${job.request_id}', this.value)"
                    class="bg-white border ${job.status === 'Completed' ? 'border-green-500 text-green-700' : 'border-gray-300'} rounded-lg py-2 px-3 font-medium outline-none focus:ring-2 focus:ring-blue-500 transition"
                >
                    <option value="" disabled ${!job.status ? 'selected' : ''}>Update...</option>
                    <option value="Assigned" ${job.status === 'Assigned' ? 'selected' : ''}>Assigned</option>
                    <option value="In Progress" ${job.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                    <option value="Completed" ${job.status === 'Completed' ? 'selected' : ''}>Completed</option>
                </select>

                <button onclick="window.open('https://wa.me/${job.phone}', '_blank')" class="bg-green-500 hover:bg-green-600 text-white font-medium px-4 py-2 rounded-lg flex items-center justify-center transition w-full sm:w-auto">
                    Message
                </button>
            </div>
        `;
        jobList.appendChild(li);
    });
}

async function updateRequestStatus(requestId, newStatus) {
    try {
        const response = await fetch(`${API_BASE}/api/admin/update-status`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({ requestId, newStatus })
        });
        if (response.ok) fetchJobs();
    } catch (error) {
        alert("Update failed!");
    }
}

refreshBtn.addEventListener('click', fetchJobs);
fetchJobs();
