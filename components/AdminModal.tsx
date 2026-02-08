import React, { useState, useEffect } from 'react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAnnouncement: string;
  currentApiKey: string;
  onSave: (announcement: string, apiKey: string) => void;
}

const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose, currentAnnouncement, currentApiKey, onSave }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [text, setText] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  // Load existing data when modal opens
  useEffect(() => {
    if (isOpen) {
      setText(currentAnnouncement);
      setApiKey(currentApiKey);
    }
  }, [isOpen, currentAnnouncement, currentApiKey]);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const adminPassword = (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined) ?? "";
    if (!adminPassword) {
      setError('Admin password belum diset di environment.');
      return;
    }
    if (password === adminPassword) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Password salah!');
    }
  };

  const handleSave = () => {
    onSave(text, apiKey.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center flex-shrink-0">
          <h2 className="font-bold text-lg">Admin Panel (Database Pusat)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {!isAuthenticated ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <p className="text-sm text-gray-600">Masukkan password admin untuk mengubah konfigurasi GLOBAL yang berlaku untuk semua pengunjung.</p>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Password..."
                />
                {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition">
                Masuk
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Section 1: Announcement */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                   <div className="w-1 h-4 bg-yellow-500 rounded-full"></div>
                   <label className="block text-xs font-bold text-gray-700 uppercase">Pengumuman / Jadwal (Global)</label>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-2">
                  <p className="text-[10px] text-yellow-800">
                    Semua HP pengunjung yang sedang membuka aplikasi akan langsung melihat pesan ini (Realtime).
                  </p>
                </div>
                <textarea 
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 h-24 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Contoh: Layanan hari ini TUTUP..."
                />
              </div>

              <hr className="border-gray-100" />

              {/* Section 2: API Key Configuration */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                   <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                   <label className="block text-xs font-bold text-gray-700 uppercase">Ganti API Key AI (Global)</label>
                </div>
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-2">
                  <p className="text-[10px] font-bold text-blue-800">
                    Efek Global ke Semua User
                  </p>
                  <p className="text-[10px] text-blue-700 mt-1">
                    Jika kuota habis, ganti key di sini. Key akan disimpan di Database Pusat dan semua user otomatis menggunakan key baru ini.
                  </p>
                </div>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Paste API Key Baru..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setText(''); onSave('', apiKey); onClose(); }} className="flex-1 border border-red-200 text-red-600 py-2 rounded-lg font-bold hover:bg-red-50 transition text-sm">
                  Hapus Pengumuman
                </button>
                <button onClick={handleSave} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 transition text-sm flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                   </svg>
                  Simpan ke Pusat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminModal;
