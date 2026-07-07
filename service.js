// frontend/js/service.js
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://extreme-sales-services.onrender.com';

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
            
            // Trigger visual transitions after a micro delay
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                modal.classList.add('opacity-100');
                const successIcon = document.getElementById('successIcon');
                if (successIcon) {
                    successIcon.classList.remove('scale-0');
                    successIcon.classList.add('scale-100');
                }
            }, 50);
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

// ------ INLINE FORM VALIDATION ------ //
const validateInput = (input, isValid) => {
    if (input.value.trim() === '') {
        input.classList.remove('valid-input', 'invalid-input');
        return;
    }
    if (isValid) {
        input.classList.add('valid-input');
        input.classList.remove('invalid-input');
    } else {
        input.classList.add('invalid-input');
        input.classList.remove('valid-input');
    }
};

const nameField = document.getElementById('name');
if (nameField) {
    nameField.addEventListener('input', () => {
        validateInput(nameField, nameField.value.trim().length >= 2);
    });
}

const emailField = document.getElementById('email');
if (emailField) {
    emailField.addEventListener('input', () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        validateInput(emailField, emailRegex.test(emailField.value.trim()));
    });
}

if (phoneInput) {
    phoneInput.addEventListener('input', () => {
        const phone = phoneInput.value.trim();
        validateInput(phoneInput, phone.length === 10 && /^\d+$/.test(phone));
    });
}

const addressField = document.getElementById('address');
if (addressField) {
    addressField.addEventListener('input', () => {
        validateInput(addressField, addressField.value.trim().length >= 6);
    });
}