// backend/seedAdmin.js
require('dotenv').config();
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const serviceAccount = require('./firebase-credentials.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seedAdmin() {
    const email = "extremess0121@gmail.com";
    const password = "ESS@123";
    
    // Check if exists
    const snap = await db.collection('users').where('email', '==', email).get();
    if (!snap.empty) {
        console.log("Admin already exists!");
        process.exit(0);
    }
    
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    
    await db.collection('users').add({
        name: "Super Admin",
        email: email,
        phone: "1234567890",
        role: "admin",
        password_hash: password_hash,
        created_at: new Date().toISOString()
    });
    
    console.log("✅ Admin created! Login with " + email + " / " + password);
    process.exit(0);
}

seedAdmin();
