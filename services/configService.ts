import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';

// =============================================================================================
// KONFIGURASI DATABASE PUSAT (FIREBASE)
// =============================================================================================
// Project: kerocare-4dd07
// Region: asia-southeast1

const firebaseConfig = {
  apiKey: "AIzaSyCoVrVO49TT9AYG9pNYxNcdDoewwMxYLw4",
  authDomain: "kerocare-4dd07.firebaseapp.com",
  databaseURL: "https://kerocare-4dd07-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "kerocare-4dd07",
  storageBucket: "kerocare-4dd07.firebasestorage.app",
  messagingSenderId: "783986267097",
  appId: "1:783986267097:web:8979cbdc30de07af96ffc8",
  measurementId: "G-70GJN70EJ9"
};

// =============================================================================================

let db: any = null;

try {
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
  console.log("✅ Terhubung ke Database Pusat (Firebase kerocare-4dd07) - Siap menerima perintah Admin.");
} catch (e) {
  console.error("Gagal menghubungkan ke Firebase:", e);
}

export interface GlobalConfig {
  announcement: string;
  geminiApiKey: string;
}

// Fungsi untuk mendengarkan perubahan data secara Realtime (Untuk User)
export const subscribeToConfig = (callback: (data: GlobalConfig) => void) => {
  if (!db) return () => {};

  const configRef = ref(db, 'kero_config');
  const unsubscribe = onValue(configRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      console.log("🔄 Menerima Update Config Baru dari Pusat...");
      callback({
        announcement: data.announcement || "",
        geminiApiKey: data.geminiApiKey || ""
      });
    }
  });

  return unsubscribe;
};

// Fungsi untuk Admin mengupdate data ke Pusat (Untuk Admin Panel)
export const updateGlobalConfig = (announcement: string, apiKey: string) => {
  if (!db) {
    alert("GAGAL MENYIMPAN: Gagal terhubung ke Database Firebase.");
    return;
  }
  
  set(ref(db, 'kero_config'), {
    announcement,
    geminiApiKey: apiKey,
    lastUpdated: new Date().toISOString()
  }).then(() => {
    alert("✅ SUKSES: Data tersimpan di Database Pusat.\n\nDalam 1-2 detik, semua HP pengunjung akan otomatis terupdate.");
  }).catch((error) => {
    alert("GAGAL: " + error.message + "\n\nMohon cek tab 'Rules' di Firebase Console, pastikan .write = true.");
  });
};