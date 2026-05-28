// backend/updateAdmin.js
// Run this ONCE to update the admin credentials in Firestore.
// Usage: node updateAdmin.js

require('dotenv').config();
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const serviceAccount = require('./firebase-credentials.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateAdmin() {
    const OLD_EMAIL = "admin@example.com";   // old email to find the record
    const NEW_EMAIL = "extremess0121@gmail.com";
    const NEW_PASSWORD = "ESS@123";

    // Try to find by old email first
    let snap = await db.collection('users').where('email', '==', OLD_EMAIL).get();

    // If old email not found, try new email (already updated before)
    if (snap.empty) {
        snap = await db.collection('users').where('email', '==', NEW_EMAIL).get();
        if (snap.empty) {
            console.log("❌ No admin user found with either email. Run seedAdmin.js instead.");
            process.exit(1);
        }
        console.log("ℹ️  Found existing record with new email. Updating password only...");
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(NEW_PASSWORD, salt);

    const docRef = snap.docs[0].ref;
    await docRef.update({
        email: NEW_EMAIL,
        password_hash: password_hash,
        updated_at: new Date().toISOString()
    });

    console.log("✅ Admin credentials updated successfully!");
    console.log("   Email    : " + NEW_EMAIL);
    console.log("   Password : " + NEW_PASSWORD);
    process.exit(0);
}

updateAdmin().catch(err => {
    console.error("❌ Error:", err.message);
    process.exit(1);
});
