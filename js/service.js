// frontend/js/service.js
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://ess-backend.onrender.com';

const form = document.getElementById('bookingForm');
const modal = document.getElementById('successModal');
const trackingIdDisplay = document.getElementById('trackingIdDisplay');
const closeModalBtn = document.getElementById('closeModalBtn');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Check if these IDs exist in your HTML exactly as written here
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const serviceInput = document.getElementById('serviceType');
    const addressInput = document.getElementById('address');

    // Safety check to prevent the "null" error
    if (!nameInput || !emailInput || !phoneInput || !serviceInput || !addressInput) {
        console.error("One or more input fields were not found in the HTML!");
        return;
    }

    const formData = {
        name: nameInput.value,
        email: emailInput.value,
        phone: phoneInput.value,
        serviceType: serviceInput.value,
        address: addressInput.value,
        message: document.getElementById('message')?.value || "" // using ?. in case message is missing
    };

    try {
        const response = await fetch(`${API_BASE}/api/services`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            trackingIdDisplay.innerText = data.requestId;
            modal.classList.remove('hidden');
            modal.style.display = 'flex'; // Force display if hidden class isn't enough
        } else {
            alert("Booking failed: " + data.message);
        }
    } catch (error) {
        console.error("Connection Error:", error);
        alert("Could not connect to the server. Is your backend terminal running?");
    }
});

closeModalBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    window.location.href = 'index.html';
});

// ------ ASYNCHRONOUS DYNAMIC AMC LOOKUP ------ //
const phoneInput = document.getElementById('phone');
const amcBanner = document.getElementById('amcDelightBanner');
const amcDetails = document.getElementById('amcDetailsText');

if (phoneInput && amcBanner && amcDetails) {
    phoneInput.addEventListener('input', async () => {
        const phone = phoneInput.value.trim();
        
        // Match standard 10-digit formats
        if (phone.length === 10 && /^\d+$/.test(phone)) {
            try {
                const response = await fetch(`${API_BASE}/api/amc/check?phone=${phone}`);
                const data = await response.json();
                
                if (data.success && data.active) {
                    amcDetails.innerText = `Plan Tier: "${data.planName}" (${data.remainingServices} free servicing visits remaining). This request will be fully covered at zero cost!`;
                    amcBanner.classList.remove('hidden');
                    amcBanner.style.transform = 'scale(1.02)';
                    setTimeout(() => amcBanner.style.transform = 'scale(1)', 200);
                } else {
                    amcBanner.classList.add('hidden');
                }
            } catch (err) {
                console.error("Failed to query AMC endpoint:", err);
            }
        } else {
            amcBanner.classList.add('hidden');
        }
    });
}