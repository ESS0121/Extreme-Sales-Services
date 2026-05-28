// frontend/js/status.js
const trackForm = document.getElementById('trackingForm');
const formCard = document.getElementById('trackingFormCard');
const resultsCard = document.getElementById('trackingResultsCard');
const displayId = document.getElementById('displayId');
const timelineContent = document.getElementById('timelineContent');

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://extreme-sales-services.onrender.com';

let trackingSource = null;

trackForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('requestId').value.trim();
    const phone = document.getElementById('phone').value.trim();

    if (trackingSource) {
        trackingSource.close();
    }

    // Connect to backend Server-Sent Events (SSE) stream (Resume Wow Factor)
    trackingSource = new EventSource(`${API_BASE}/api/track/live?id=${id}&phone=${phone}`);

    trackingSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.success) {
            if (data.connected && !data.name) {
                console.log("SSE tracking session established...");
                return;
            }

            displayId.innerText = id.toUpperCase();
            formCard.classList.add('hidden');
            resultsCard.classList.remove('hidden');
            
            // Render active tracking timeline stage dynamically
            renderTimeline(data.status);
        } else {
            alert(data.message || "Unable to find record matching details.");
            trackingSource.close();
        }
    };

    trackingSource.onerror = (err) => {
        console.error("SSE stream connection error:", err);
        trackingSource.close();
    };
});

function renderTimeline(currentStatus) {
    const stages = ["Pending", "Assigned", "In Progress", "Completed"];
    let html = '';
    
    stages.forEach((stage) => {
        const isDone = stages.indexOf(stage) <= stages.indexOf(currentStatus);
        const colorClass = isDone ? "text-blue-600 font-bold" : "text-gray-400";
        const dotClass = isDone ? "bg-blue-600 shadow-md" : "bg-gray-300";

        html += `
            <div class="flex items-center space-x-4 mb-8">
                <div class="w-8 h-8 ${dotClass} rounded-full flex items-center justify-center text-white text-xs">
                    ${isDone ? '✓' : ''}
                </div>
                <div class="${colorClass}">${stage}</div>
            </div>
        `;
    });
    timelineContent.innerHTML = html;
}