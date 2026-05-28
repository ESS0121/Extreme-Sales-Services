// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('./middleware/authMiddleware');
const emailService = require('./services/emailService');

// 1. Initialize Firebase Admin
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:", err);
    process.exit(1);
  }
} else {
  try {
    serviceAccount = require('./firebase-credentials.json');
  } catch (err) {
    console.error("Firebase credentials file not found. Set FIREBASE_SERVICE_ACCOUNT environment variable or place firebase-credentials.json in Backend folder.", err);
    process.exit(1);
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();
const path = require('path');

app.use(cors()); 
app.use(express.json()); 

// Serve the frontend folder as static files
app.use(express.static(path.join(__dirname, '../frontend')));

// 2. POST Route: Create a new service request
app.post('/api/services', async (req, res) => {
    try {
        const { name, phone, address, serviceType, message, email } = req.body;

        // Generate a simple unique Request ID
        const requestId = 'AC-' + Math.floor(1000 + Math.random() * 9000);

        // Auto-AMC Check
        let amcNote = "";
        const amcSnap = await db.collection('customer_amc')
            .where('phone', '==', phone)
            .where('status', '==', 'Active')
            .get();

        if (!amcSnap.empty) {
            const amcDoc = amcSnap.docs[0];
            const amcData = amcDoc.data();
            // Optional basic expiration check could go here
            if (amcData.remaining_services > 0) {
                await db.collection('customer_amc').doc(amcDoc.id).update({
                    remaining_services: amcData.remaining_services - 1
                });
                amcNote = " [✅ AMC Covered]";
            }
        }

        const newRequest = {
            request_id: requestId,
            name: name,
            phone: phone,
            email: email || '',
            address: address,
            service_type: serviceType + amcNote,
            issue_description: message || "",
            status: "Pending", // Default starting status
            created_at: new Date().toISOString()
        };

        // Save to "service_requests" collection
        await db.collection('service_requests').add(newRequest);

        // Send confirmation email (non-blocking - don't wait for it)
        if (email) {
            emailService.sendBookingEmail(email, name, requestId, serviceType, phone).catch(err => 
                console.error('Email sending error:', err)
            );
        }

        res.status(201).json({ 
            success: true, 
            requestId: requestId 
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ success: false, message: "Booking failed" });
    }
});

// backend/server.js

// GET: Track a service request
// backend/server.js

app.get('/api/track', async (req, res) => {
    try {
        const { id, phone } = req.query;

        // 1. Safety Check: If ID or Phone are missing, don't crash the server
        if (!id || !phone) {
            return res.status(400).json({ 
                success: false, 
                message: "Please provide both Request ID and Phone Number" 
            });
        }

        const snapshot = await db.collection('service_requests')
            .where('request_id', '==', id)
            .where('phone', '==', phone)
            .get();

        if (snapshot.empty) {
            return res.status(404).json({ success: false, message: "No record found" });
        }

        const requestData = snapshot.docs[0].data();

        res.json({
            success: true,
            status: requestData.status,
            name: requestData.name,
            service: requestData.service_type
        });

    } catch (error) {
        // This will print the actual error in your Terminal so we can see what happened
        console.error("Detailed Tracking Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// GET: Server-Sent Events (SSE) Live Tracking Status Stream (Real-Time Resume Feature)
app.get('/api/track/live', (req, res) => {
    const { id, phone } = req.query;

    if (!id || !phone) {
        return res.status(400).json({ success: false, message: "Request ID and Phone number are required." });
    }

    // Set headers for Server-Sent Events (SSE) stream
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*'); 

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ success: true, connected: true, status: "Pending" })}\n\n`);

    // Setup native Firebase Firestore Real-Time listener
    const unsubscribe = db.collection('service_requests')
        .where('request_id', '==', id.trim())
        .where('phone', '==', phone.trim())
        .onSnapshot(snapshot => {
            if (!snapshot.empty) {
                const docData = snapshot.docs[0].data();
                res.write(`data: ${JSON.stringify({ success: true, status: docData.status, name: docData.name, service: docData.service_type })}\n\n`);
            } else {
                res.write(`data: ${JSON.stringify({ success: false, message: "No active record matching details." })}\n\n`);
            }
        }, error => {
            console.error("Firestore onSnapshot live tracking error:", error);
            res.write(`data: ${JSON.stringify({ success: false, message: "Database connection failed." })}\n\n`);
        });

    // Clean up Firestore listener when connection closes to avoid memory leaks
    req.on('close', () => {
        unsubscribe();
        res.end();
    });
});

// backend/server.js

// 3. Authentication Routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const snapshot = await db.collection('users').where('email', '==', email).get();
        if (snapshot.empty) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const userDoc = snapshot.docs[0];
        const user = userDoc.data();

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: userDoc.id, role: user.role, name: user.name }, 
            process.env.JWT_SECRET || 'fallback_secret_key', 
            { expiresIn: '1d' }
        );

        res.json({ success: true, token, role: user.role });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// Admin Route to Create Users (Staff/Technician)
app.post('/api/admin/users', authMiddleware(['admin']), async (req, res) => {
    try {
        const { name, email, phone, role, password } = req.body;
        
        if (!['admin', 'staff', 'technician'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        await db.collection('users').add({
            name,
            email,
            phone: phone || '',
            role,
            password_hash,
            created_at: new Date().toISOString()
        });

        res.status(201).json({ success: true, message: 'User created successfully' });
    } catch (error) {
        console.error("Create User Error:", error);
        res.status(500).json({ success: false, message: "Failed to create user" });
    }
});

app.get('/api/admin/users/technicians', authMiddleware(['admin', 'staff']), async (req, res) => {
    try {
        const snapshot = await db.collection('users').where('role', '==', 'technician').get();
        const technicians = [];
        
        for (const doc of snapshot.docs) {
            // Count active jobs (Assigned or In Progress)
            const jobsSnap = await db.collection('service_requests')
                .where('technician_id', '==', doc.id)
                .where('status', 'in', ['Assigned', 'In Progress'])
                .get();
                
            technicians.push({
                id: doc.id, 
                name: doc.data().name,
                active_jobs: jobsSnap.size // tracks availability!
            });
        }
        res.json({ success: true, technicians });
    } catch (error) {
        console.error("Tech Fetch Error:", error);
        res.status(500).json({ success: false, message: "Error fetching technicians" });
    }
});

app.patch('/api/admin/assign-technician', authMiddleware(['admin', 'staff']), async (req, res) => {
    try {
        const { requestId, technicianId } = req.body;
        
        const snapshot = await db.collection('service_requests').where('request_id', '==', requestId).get();
        if (snapshot.empty) return res.status(404).json({ success: false, message: "Request not found" });
        
        const docId = snapshot.docs[0].id;
        await db.collection('service_requests').doc(docId).update({
            technician_id: technicianId,
            status: "Assigned"
        });
        
        res.json({ success: true, message: "Technician assigned successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to assign technician" });
    }
});

// GET: Technician specific jobs
app.get('/api/technician/jobs', authMiddleware(['technician']), async (req, res) => {
    try {
        const snapshot = await db.collection('service_requests')
            .where('technician_id', '==', req.user.id)
            .get();

        const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ success: true, requests });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching jobs" });
    }
});

// PATCH: Update the status of a service request
app.patch('/api/admin/update-status', authMiddleware(['admin', 'staff', 'technician']), async (req, res) => {
    try {
        const { requestId, newStatus } = req.body;

        // Find the document with this Request ID
        const snapshot = await db.collection('service_requests')
            .where('request_id', '==', requestId)
            .get();

        if (snapshot.empty) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }

        // Get request data before updating
        const docId = snapshot.docs[0].id;
        const requestData = snapshot.docs[0].data();
        
        // Update the status
        await db.collection('service_requests').doc(docId).update({
            status: newStatus
        });

        // Send status update email (non-blocking)
        if (requestData.email) {
            emailService.sendStatusUpdateEmail(
                requestData.email,
                requestData.name,
                requestId,
                newStatus,
                requestData.service_type
            ).catch(err => console.error('Email sending error:', err));
        }

        res.json({ success: true, message: `Status updated to ${newStatus}` });

    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ success: false, message: "Failed to update status" });
    }
});

// GET: Fetch ALL requests for the admin Portal
app.get('/api/admin/requests', authMiddleware(['admin', 'staff']), async (req, res) => {
    try {
        const snapshot = await db.collection('service_requests')
            .orderBy('created_at', 'desc')
            .get();

        const requests = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Analytics calculation
        const pendingJobs = requests.filter(r => r.status === 'Pending' || r.status === 'Assigned' || r.status === 'In Progress').length;
        
        const amcSnap = await db.collection('customer_amc').where('status', '==', 'Active').get();
        const activeAmc = amcSnap.size;

        const prodSnap = await db.collection('products').get();
        const totalItems = prodSnap.size;

        res.json({ 
            success: true, 
            requests,
            analytics: {
                pendingJobs,
                activeAmc,
                totalItems
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching data" });
    }
});

// --- PHASE 3: PRODUCTS & ENQUIRIES ---

// Public: Get all products
app.get('/api/products', async (req, res) => {
    try {
        const snapshot = await db.collection('products').orderBy('created_at', 'desc').get();
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching products" });
    }
});

// Admin: Add a new product
app.post('/api/admin/products', authMiddleware(['admin']), async (req, res) => {
    try {
        const { name, category, price, quantity, condition, brand, description, image_url } = req.body;
        
        await db.collection('products').add({
            name, category, price: Number(price), quantity: Number(quantity || 1), condition, brand, description, image_url,
            created_at: new Date().toISOString()
        });

        res.status(201).json({ success: true, message: 'Product added successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to add product" });
    }
});

// Admin: Delete a product
app.delete('/api/admin/products/:id', authMiddleware(['admin']), async (req, res) => {
    try {
        await db.collection('products').doc(req.params.id).delete();
        res.json({ success: true, message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to delete product" });
    }
});

// Public: Submit an Enquiry
app.post('/api/enquiries', async (req, res) => {
    try {
        // Enquiries refer to a specific product
        const { product_id, product_name, name, phone, message } = req.body;
        
        await db.collection('enquiries').add({
            product_id, product_name, name, phone, message,
            status: "Pending", // Pending, Contacted, Closed
            created_at: new Date().toISOString()
        });

        res.status(201).json({ success: true, message: 'Enquiry submitted!' });
    } catch (error) {
        res.status(500).json({ success: false, message: "Enquiry failed" });
    }
});

// Admin/Staff: Get Enquiries
app.get('/api/admin/enquiries', authMiddleware(['admin', 'staff']), async (req, res) => {
    try {
        const snapshot = await db.collection('enquiries').orderBy('created_at', 'desc').get();
        const enquiries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ success: true, enquiries });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching enquiries" });
    }
});

// --- PHASE 4: AMC SYSTEM ---

// Public: Get all AMC Plans
app.get('/api/amc-plans', async (req, res) => {
    try {
        const snapshot = await db.collection('amc_plans').orderBy('price', 'asc').get();
        const plans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ success: true, plans });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching AMC plans" });
    }
});

// Admin: Define a new AMC Plan
app.post('/api/admin/amc-plans', authMiddleware(['admin']), async (req, res) => {
    try {
        const { name, price, services_per_year, description } = req.body;
        
        await db.collection('amc_plans').add({
            name, price: Number(price), services_per_year: Number(services_per_year), description,
            created_at: new Date().toISOString()
        });

        res.status(201).json({ success: true, message: 'Plan created' });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to create plan" });
    }
});

// Admin: Delete an AMC plan
app.delete('/api/admin/amc-plans/:id', authMiddleware(['admin']), async (req, res) => {
    try {
        await db.collection('amc_plans').doc(req.params.id).delete();
        res.json({ success: true, message: 'Plan deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to delete plan" });
    }
});

// Public: Quick lookup to check if phone has active AMC (Asynchronous Validation)
app.get('/api/amc/check', async (req, res) => {
    try {
        const { phone } = req.query;
        if (!phone) {
            return res.status(400).json({ success: false, message: "Phone number required" });
        }

        const amcSnap = await db.collection('customer_amc')
            .where('phone', '==', phone.trim())
            .where('status', '==', 'Active')
            .get();

        if (!amcSnap.empty) {
            const amcDoc = amcSnap.docs[0];
            const amcData = amcDoc.data();
            
            res.json({
                success: true,
                active: true,
                planName: amcData.plan_name,
                remainingServices: amcData.remaining_services
            });
        } else {
            res.json({ success: true, active: false });
        }
    } catch (error) {
        console.error("AMC Quick Check Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// Public: Submit an AMC subscription purchase request
app.post('/api/amc/purchase', async (req, res) => {
    try {
        const { plan_id, plan_name, customer_name, phone, email } = req.body;
        
        await db.collection('customer_amc').add({
            plan_id, plan_name, customer_name, phone, email: email || '',
            status: "Pending", 
            remaining_services: 0,
            start_date: null,
            end_date: null,
            created_at: new Date().toISOString()
        });

        // Send AMC confirmation email (non-blocking)
        if (email) {
            emailService.sendAMCConfirmationEmail(email, customer_name, plan_name, phone).catch(err =>
                console.error('Email sending error:', err)
            );
        }

        res.status(201).json({ success: true, message: 'AMC Purchase request submitted' });
    } catch (error) {
        res.status(500).json({ success: false, message: "Request failed" });
    }
});

// Admin: Get all customer AMC subscriptions
app.get('/api/admin/customer-amc', authMiddleware(['admin', 'staff']), async (req, res) => {
    try {
        const snapshot = await db.collection('customer_amc').orderBy('created_at', 'desc').get();
        const subscriptions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ success: true, subscriptions });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching AMC subscriptions" });
    }
});

// Admin: Activate an AMC subscription (Payment received)
app.patch('/api/admin/customer-amc/:id/activate', authMiddleware(['admin']), async (req, res) => {
    try {
        const subId = req.params.id;
        const { services_per_year } = req.body;
        
        const startDate = new Date();
        const endDate = new Date();
        endDate.setFullYear(startDate.getFullYear() + 1);

        await db.collection('customer_amc').doc(subId).update({
            status: "Active",
            remaining_services: Number(services_per_year),
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString()
        });

        res.json({ success: true, message: 'AMC Activated for 1 Year' });
    } catch (error) {
        res.status(500).json({ success: false, message: "Activation failed" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});