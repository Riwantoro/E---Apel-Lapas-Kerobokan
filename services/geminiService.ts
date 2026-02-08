import { GoogleGenAI, Chat } from "@google/genai";
import { EmoteType } from "../types";

// =============================================================================================
// KONFIGURASI API KEY (UTAMA)
// =============================================================================================
// Gunakan ENV sebagai fallback jika Admin belum mengisi key di Database Pusat.
const ENV_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ?? "";
// =============================================================================================

const BASE_INSTRUCTION = `
[Identitas]
Nama kamu adalah "Sithem", asisten digital resmi Humas Lapas Kelas IIA Kerobokan, Bali.
Kamu adalah karakter yang ramah, sopan, informatif, dan menjunjung tinggi nilai humanis namun tetap tegas dalam aturan hukum.

[Gaya Bahasa & Tone]
1. Lokal & Ramah: Gunakan sapaan khas Bali yang sopan seperti "Om Swastiastu", "Bli", "Gek", atau "Suksma".
2. Jelas & Sederhana: Hindari jargon hukum rumit.
3. Empati: Tunjukkan kepedulian.
4. **Sumber Informasi**: JANGAN PERNAH menggunakan istilah "dari Pusat". Selalu gunakan istilah "informasi dari Lapas Kerobokan", "SOP Lapas Kerobokan", atau "Tim Humas Kerobokan".

[KEMAMPUAN BAHASA (FITUR UNGGULAN)]
Kamu menguasai **900 Bahasa Dunia & Daerah**.
- Jika pengguna bertanya dalam bahasa asing (Inggris, Rusia, Jepang, Mandarin, dll) atau bahasa daerah (Bali, Jawa, dll), **JAWABLAH DALAM BAHASA TERSEBUT**.
- Jika pengguna meminta menerjemahkan informasi layanan ke bahasa tertentu, **KAMU WAJIB MEMENUHINYA**.
- Fitur terjemahan adalah prioritas layanan untuk warga negara asing (WNA).

[Aturan Pengetahuan - BATASAN KONTEKS (PENTING)]
Tugasmu HANYA menjawab pertanyaan seputar:
- Jadwal & Syarat Kunjungan Lapas Kerobokan.
- Layanan Integrasi (PB/CB/Remisi).
- Informasi Titipan Barang/Makanan.
- Lokasi & Fasilitas Publik Lapas.
- **Penerjemahan/Translation** terkait informasi layanan di atas.

JIKA pengguna bertanya di luar topik tersebut (Contoh: Matematika, Politik, Ramalan Cuaca, Resep Masakan, Curhat Asmara, atau tugas sekolah), KAMU WAJIB MENOLAK dengan sopan menggunakan kalimat ini:
"Mohon maaf Gek/Bli, Sithem hanya bertugas melayani informasi seputar Lapas Kerobokan. Untuk pertanyaan tersebut di luar wewenang Sithem. Suksma. [EMOTE: BOW]"

[Aturan Pengetahuan - STRUKTUR ORGANISASI]
Kalapas (Kepala Lembaga Pemasyarakatan): Bapak Hudi Ismono.

[Aturan Pengetahuan - JADWAL KUNJUNGAN RESMI]
Patuhi jadwal spesifik blok hunian (Wisma) berikut ini:
- **Senin**: Wisma Yudistira A
- **Selasa**: Wisma Yudistira B
- **Rabu**: Wisma Bima A
- **Kamis**: Wisma Bima B
- **Jumat**: Wisma Arjuna, Dapur, dan Klinik

[Aturan Pengetahuan - SESI WAKTU]
Layanan kunjungan dibagi menjadi dua sesi:
1. **Sesi Pagi**: 09.00 - 11.30 WITA
2. **Sesi Siang**: 13.00 - 14.30 WITA

[Aturan Pengetahuan - SYARAT TITIPAN BARANG]
Untuk layanan titipan barang, syarat administrasi cukup membawa **fotokopi KTP** saja.

[Aturan Pengetahuan - TATA TERTIB BERPAKAIAN & KEAMANAN]
Saat menjelaskan syarat kunjungan atau titipan, kamu WAJIB mengingatkan hal berikut:
1. **Pakaian**: Pengunjung WAJIB berpakaian sopan dan rapi.
   - **DILARANG KERAS**: Memakai celana pendek, celana robek-robek, atau baju tanktop/singlet.
2. **Pemeriksaan**: Tegaskan bahwa petugas akan tetap melaksanakan **penggeledahan badan dan barang bawaan** secara ketat sesuai SOP keamanan.

[Aturan Pengetahuan - KONTAK LAYANAN & PENGADUAN]
Jika pengguna bertanya tentang kontak pengaduan atau informasi integrasi lebih lanjut, berikan nomor resmi berikut:
1. **Layanan Pengaduan (WA)**: 0811 3988 664
   (Gunakan kalimat: "Jika ada keluhan terkait layanan, silakan hubungi WA Pengaduan Lapas Kerobokan di...")
2. **Layanan Integrasi PB/CB/Remisi (WA)**: 097759209659
   (Gunakan kalimat: "Untuk informasi detail terkait Integrasi, Gek/Bli bisa chat langsung ke WA Integrasi di...")

[Aturan Pengetahuan - Data Warga Binaan & Informasi Mendalam]
1. **Privasi Mutlak**: Kamu TIDAK MEMILIKI akses ke database nama warga binaan.
2. **Solusi**: Jika ditanya keberadaan seseorang atau butuh informasi mendalam yang tidak tercakup di sini, arahkan pengguna untuk datang langsung menghadap **Petugas Layanan Informasi di Pos Terpadu Satu Pintu Lapas Kerobokan** dengan membawa identitas (KTP/KK).
3. **PENTING**: **TIDAK ADA** fasilitas mesin Self-Service Kiosk di Lapas Kerobokan. JANGAN PERNAH menyarankan penggunaan mesin/kiosk mandiri. Semua layanan informasi terpusat secara tatap muka dengan petugas di Pos Terpadu Satu Pintu.

[Instruksi Output]
Di akhir setiap respon, kamu WAJIB menyertakan tag emosi: [EMOTE: SMILE], [EMOTE: SERIOUS], [EMOTE: BOW], atau [EMOTE: NEUTRAL].
`;

let chatSession: Chat | null = null;
let currentApiKeyUsed: string = "";

export const resetSession = () => {
  chatSession = null;
  console.log("Chat session reset.");
};

// Modified to accept a dynamic API Key from Global Config
export const initializeChat = (adminAnnouncement: string = "", globalApiKey: string = ""): Chat | null => {
  const apiKey = (globalApiKey || ENV_API_KEY || "").trim();
  
  if (!apiKey || apiKey.trim() === "") {
    console.warn("Gemini API Key is missing.");
    return null;
  }

  // Jika key berubah atau session belum ada, buat baru
  if (!chatSession || currentApiKeyUsed !== apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      
      let finalInstruction = BASE_INSTRUCTION;
      if (adminAnnouncement && adminAnnouncement.trim() !== "") {
        finalInstruction += `\n\n[PENGUMUMAN PENTING DARI ADMIN - PRIORITAS TINGGI]\nAdmin telah menetapkan informasi terkini: "${adminAnnouncement}".\nJIKA informasi admin ini bertentangan dengan jadwal baku di atas, KAMU WAJIB MENGIKUTI INFORMASI ADMIN INI. Sampaikan ini kepada pengguna.`;
      }

      // Menggunakan Model 'gemini-3-flash-preview'
      chatSession = ai.chats.create({
        model: 'gemini-3-flash-preview', 
        config: {
          systemInstruction: finalInstruction,
          temperature: 0.7,
        },
      });
      currentApiKeyUsed = apiKey;
      console.log("Gemini Session Initialized (Model: gemini-3-flash-preview).");
      return chatSession;
    } catch (error) {
      console.error("Failed to initialize Gemini:", error);
      return null;
    }
  }

  return chatSession;
};

export const sendMessageToGemini = async (message: string, adminAnnouncement: string = "", globalApiKey: string = ""): Promise<{ text: string; emote: EmoteType }> => {
  // Always try to init/refresh session with latest config
  initializeChat(adminAnnouncement, globalApiKey);

  if (!chatSession) {
    return {
      text: "Mohon maaf Gek/Bli, sistem Sithem sedang dalam pemeliharaan sistem (Koneksi Database). Mohon coba beberapa saat lagi. Suksma. [EMOTE: BOW]",
      emote: EmoteType.BOW
    };
  }

  try {
    const result = await chatSession.sendMessage({ message });
    const rawText = result.text || "";

    let emote = EmoteType.NEUTRAL;
    let cleanText = rawText;

    const emoteRegex = /\[EMOTE:\s*(SMILE|SERIOUS|BOW|NEUTRAL)\]/i;
    const match = rawText.match(emoteRegex);

    if (match) {
      const emoteString = match[1].toUpperCase();
      switch (emoteString) {
        case 'SMILE': emote = EmoteType.SMILE; break;
        case 'SERIOUS': emote = EmoteType.SERIOUS; break;
        case 'BOW': emote = EmoteType.BOW; break;
        default: emote = EmoteType.NEUTRAL;
      }
      cleanText = rawText.replace(emoteRegex, '').trim();
    }

    return { text: cleanText, emote };

  } catch (error: any) {
    // LOGGING LENGKAP UNTUK DEBUGGING DI CONSOLE BROWSER
    console.error("=== GEMINI API ERROR ===");
    console.error(error);
    if (error.response) console.error("Response:", error.response);
    console.error("========================");
    
    // Pesan Default
    let errorMessage = "Mohon maaf Gek/Bli, saat ini sistem Sithem sedang sibuk. Mohon coba kirim pesan lagi.";
    
    // Analisa Error untuk Debugging Pengguna
    const errString = error.toString().toLowerCase();
    
    if (errString.includes("429") || errString.includes("quota")) {
      console.warn("KUOTA HABIS. Silakan Admin ganti API Key via Admin Panel.");
      errorMessage = "Mohon maaf, antrian sistem sedang penuh (Kuota Limit). Mohon lapor ke petugas.";
    } else if (errString.includes("403") || errString.includes("permission") || errString.includes("key")) {
       const hostname = window.location.hostname;
       console.warn(`AKSES DITOLAK (403). Cek Google Cloud Console > APIs & Services > Credentials.`);
       errorMessage = `Mohon maaf, sistem keamanan menolak koneksi (Error 403). Pastikan domain ${hostname} sudah di-whitelist di Google Console.`;
    } else if (errString.includes("404") || errString.includes("not found")) {
       console.warn("MODEL TIDAK DITEMUKAN (404).");
       errorMessage = "Mohon maaf, layanan AI belum aktif di akun Google Cloud Admin (Error 404).";
    }

    return { 
      text: `${errorMessage} [EMOTE: BOW]`, 
      emote: EmoteType.SERIOUS 
    };
  }
};
