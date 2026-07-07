// backend/seedAmcPlans.js
require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin
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

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const amcPlans = [
  {
    name: "Eco Saver Plan",
    price: 1200,
    services_per_year: 2,
    description: "2 Jet-pump wet washes, pressure diagnostics, electrical checks & 10% off parts.",
    created_at: new Date().toISOString()
  },
  {
    name: "Comfort Standard Plan",
    price: 2400,
    services_per_year: 3,
    description: "3 Jet-pump deep cleans, free unlimited breakdown visits, electrical checks, and 20% off gas top-ups.",
    created_at: new Date().toISOString()
  },
  {
    name: "Elite Ultimate Plan",
    price: 4500,
    services_per_year: 4,
    description: "4 Quarterly jet cleans, fully covered gas refilling, free capacitor/motor parts replacement, 4-hour priority response.",
    created_at: new Date().toISOString()
  }
];

async function seedPlans() {
  try {
    console.log("Checking for existing AMC plans...");
    const snapshot = await db.collection('amc_plans').get();
    
    // Delete existing plans if there are any to avoid duplicates
    if (!snapshot.empty) {
      console.log(`Found ${snapshot.size} existing plans. Deleting them first...`);
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log("Existing plans deleted successfully.");
    }
    
    console.log("Seeding new plans...");
    for (const plan of amcPlans) {
      const docRef = await db.collection('amc_plans').add(plan);
      console.log(`✅ Added plan: "${plan.name}" with ID: ${docRef.id}`);
    }
    
    console.log("🎉 Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding plans:", error);
    process.exit(1);
  }
}

seedPlans();
