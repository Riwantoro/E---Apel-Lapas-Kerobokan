import React, { useEffect, useMemo, useState } from 'react';
import wbpData from './data/wbp.json';

const LOGO_URL = "https://res.cloudinary.com/dim98gun7/image/upload/v1769353691/Logo_Kementrian_Imigrasi_dan_Pemasyarakatan__2024_1_ihjxaz.png";

type Room = { name: string; names: string[] };

type Wisma = { name: string; rooms: Room[] };

type Activity = {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  wisma?: string;
  room?: string;
  targetName?: string;
  detail?: string;
};

type BukuApelEntry = {
  id: string;
  date: string;
  wisma: string;
  room: string;
  keluar: number;
  masuk: number;
  keterangan: string;
  regu: string;
  createdAt: string;
};

type P2URecord = {
  id: string;
  originWisma: string;
  originRoom: string;
  purpose: string;
  keluarAt: string;
  masukAt: string;
  targetWisma: string;
  targetRoom: string;
  jumlahKeluar: number;
  jumlahMasuk: number;
  kode: string;
  officer: string;
};

const REGU_OPTIONS = ['Regu I', 'Regu II', 'Regu III', 'Regu IV'];
const ROLE_OPTIONS = ['Regu I', 'Regu II', 'Regu III', 'Regu IV', 'P2U', 'KPLP', 'Kalapas'];

const fallbackWisma: Wisma[] = [
  {
    name: 'Yudistira',
    rooms: [
      { name: 'A7', names: ['I Gede Putra', 'Wayan Adi', 'Kadek Surya'] },
      { name: 'A4', names: ['Komang Sujana', 'Made Arta'] },
      { name: 'A1', names: ['Putu Wira', 'Gede Satria'] },
    ],
  },
  {
    name: 'Bima',
    rooms: [
      { name: 'B3', names: ['Wayan Gita', 'Made Darma'] },
      { name: 'B5', names: ['Ketut Yasa', 'Gede Yudhi', 'Putu Raka'] },
    ],
  },
  {
    name: 'Arjuna',
    rooms: [
      { name: 'C2', names: ['Made Jaya', 'Nyoman Eka'] },
      { name: 'C7', names: ['I Komang Riko'] },
    ],
  },
  {
    name: 'Nakula',
    rooms: [
      { name: 'D1', names: ['Putu Yoga', 'Kadek Rama'] },
      { name: 'D4', names: ['Wayan Suka'] },
    ],
  },
];

const parseDateKey = (key: string) => {
  const [day, month, year] = key.split('_').map((value) => Number(value));
  if (!day || !month || !year) return 0;
  return new Date(year, month - 1, day).getTime();
};

const normalizeWismaName = (value: string) => {
  let name = value.trim();
  if (/^wisma\\s+/i.test(name)) {
    name = name.replace(/^wisma\\s+/i, '');
  }
  return name
    .toLowerCase()
    .replace(/\\b\\w/g, (char) => char.toUpperCase());
};

const buildWismaFromWbp = (data: unknown): Wisma[] => {
  if (!data || typeof data !== 'object') return [];
  const entries = Object.entries(data as Record<string, unknown>);
  if (entries.length === 0) return [];

  const latestKey = entries
    .map(([key]) => key)
    .sort((a, b) => parseDateKey(b) - parseDateKey(a))[0];

  const rows = (data as Record<string, unknown>)[latestKey];
  if (!Array.isArray(rows)) return [];

  const wismaMap = new Map<string, Map<string, Set<string>>>();

  rows.forEach((row) => {
    if (!row || typeof row !== 'object') return;
    const record = row as Record<string, unknown>;
    const nameValue = typeof record.nama === 'string' ? record.nama.trim() : '';
    const wismaValue = typeof record.wisma === 'string' ? record.wisma.trim() : '';

    if (!nameValue || !wismaValue || nameValue.toLowerCase() === 'nama') return;

    const [rawWisma, ...roomParts] = wismaValue.split(' - ');
    const roomName = roomParts.join(' - ').trim();
    if (!rawWisma || !roomName) return;

    const wismaName = normalizeWismaName(rawWisma);
    if (!wismaMap.has(wismaName)) {
      wismaMap.set(wismaName, new Map());
    }
    const roomMap = wismaMap.get(wismaName)!;
    if (!roomMap.has(roomName)) {
      roomMap.set(roomName, new Set());
    }
    roomMap.get(roomName)!.add(nameValue);
  });

  return Array.from(wismaMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([wismaName, roomMap]) => ({
      name: wismaName,
      rooms: Array.from(roomMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([roomName, namesSet]) => ({
          name: roomName,
          names: Array.from(namesSet.values()).sort((a, b) => a.localeCompare(b)),
        })),
    }));
};

const initialWisma = (() => {
  const fromWbp = buildWismaFromWbp(wbpData);
  return fromWbp.length > 0 ? fromWbp : fallbackWisma;
})();

const formatTimestamp = (value?: Date) =>
  (value ?? new Date()).toLocaleString('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const STORAGE_KEY = 'lapas-buku-apel-state-v1';

type PersistedState = {
  wismaData: Wisma[];
  activities: Activity[];
  bukuApel: BukuApelEntry[];
  p2uRecords: P2URecord[];
  roomGrid: Record<string, RoomGridRow>;
  lantaiByWisma: Record<string, string>;
};

type RoomGridRow = {
  pagi: string;
  keluarPagi: string;
  masukPagi: string;
  siang: string;
  keluarSiang: string;
  masukSiang: string;
  sore: string;
  malam: string;
  ket: string;
  petugas: string;
};

const emptyGridRow = (): RoomGridRow => ({
  pagi: '',
  keluarPagi: '',
  masukPagi: '',
  siang: '',
  keluarSiang: '',
  masukSiang: '',
  sore: '',
  malam: '',
  ket: '',
  petugas: '',
});

const App: React.FC = () => {
  const [role, setRole] = useState<string>('Regu I');
  const [activeTab, setActiveTab] = useState<'kamar' | 'apel' | 'p2u' | 'rekap'>('kamar');
  const [wismaData, setWismaData] = useState<Wisma[]>(initialWisma);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [bukuApel, setBukuApel] = useState<BukuApelEntry[]>([]);
  const [p2uRecords, setP2uRecords] = useState<P2URecord[]>([]);
  const [roomGrid, setRoomGrid] = useState<Record<string, RoomGridRow>>({});
  const [lantaiByWisma, setLantaiByWisma] = useState<Record<string, string>>({});

  const [selectedWisma, setSelectedWisma] = useState(initialWisma[0].name);
  const [selectedRoom, setSelectedRoom] = useState(initialWisma[0].rooms[0].name);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [editName, setEditName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [moveTarget, setMoveTarget] = useState<string>('');

  const [apelDate, setApelDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [apelWisma, setApelWisma] = useState(initialWisma[0].name);
  const [apelRoom, setApelRoom] = useState(initialWisma[0].rooms[0].name);
  const [apelKeluar, setApelKeluar] = useState(0);
  const [apelMasuk, setApelMasuk] = useState(0);
  const [apelKode, setApelKode] = useState('');

  const [apelFilterWisma, setApelFilterWisma] = useState('Semua');
  const [apelFilterRoom, setApelFilterRoom] = useState('Semua');
  const [apelFilterDate, setApelFilterDate] = useState('');
  const [apelFilterRegu, setApelFilterRegu] = useState('Semua');

  const [p2uPurpose, setP2UPurpose] = useState('RS');
  const [p2uKeluarAt, setP2UKeluarAt] = useState('');
  const [p2uMasukAt, setP2UMasukAt] = useState('');
  const [p2uOriginWisma, setP2UOriginWisma] = useState(initialWisma[0].name);
  const [p2uOriginRoom, setP2UOriginRoom] = useState(initialWisma[0].rooms[0].name);
  const [p2uTargetWisma, setP2UTargetWisma] = useState(initialWisma[0].name);
  const [p2uTargetRoom, setP2UTargetRoom] = useState(initialWisma[0].rooms[0].name);
  const [p2uJumlahKeluar, setP2UJumlahKeluar] = useState(0);
  const [p2uJumlahMasuk, setP2UJumlahMasuk] = useState(0);
  const [p2uKode, setP2UKode] = useState('');

  const [activityFilter, setActivityFilter] = useState('Semua');

  const isReadOnly = role === 'KPLP' || role === 'Kalapas';
  const isRegu = REGU_OPTIONS.includes(role);
  const isP2U = role === 'P2U';

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as PersistedState;
      if (parsed.wismaData) setWismaData(parsed.wismaData);
      if (parsed.activities) setActivities(parsed.activities);
      if (parsed.bukuApel) setBukuApel(parsed.bukuApel);
      if (parsed.p2uRecords) setP2uRecords(parsed.p2uRecords);
      if (parsed.roomGrid) setRoomGrid(parsed.roomGrid);
      if (parsed.lantaiByWisma) setLantaiByWisma(parsed.lantaiByWisma);
    } catch (error) {
      console.error('Gagal memuat data lokal', error);
    }
  }, []);

  useEffect(() => {
    const payload: PersistedState = {
      wismaData,
      activities,
      bukuApel,
      p2uRecords,
      roomGrid,
      lantaiByWisma,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [wismaData, activities, bukuApel, p2uRecords, roomGrid, lantaiByWisma]);

  const allRooms = useMemo(() => {
    return wismaData.flatMap((wisma) =>
      wisma.rooms.map((room) => ({
        wisma: wisma.name,
        room: room.name,
        key: `${wisma.name} - ${room.name}`,
        names: room.names,
      }))
    );
  }, [wismaData]);

  const getRoomKey = (wisma: string, room: string) => `${wisma}||${room}`;

  const getGridRow = (wisma: string, room: string) => {
    const key = getRoomKey(wisma, room);
    return roomGrid[key] ?? emptyGridRow();
  };

  const updateGridRow = (wisma: string, room: string, field: keyof RoomGridRow, value: string) => {
    const key = getRoomKey(wisma, room);
    setRoomGrid((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? emptyGridRow()),
        [field]: value,
      },
    }));
  };

  const currentRoom = useMemo(() => {
    const wisma = wismaData.find((item) => item.name === selectedWisma);
    return wisma?.rooms.find((room) => room.name === selectedRoom);
  }, [wismaData, selectedWisma, selectedRoom]);

  const apelRoomData = useMemo(() => {
    const wisma = wismaData.find((item) => item.name === apelWisma);
    return wisma?.rooms.find((room) => room.name === apelRoom);
  }, [wismaData, apelWisma, apelRoom]);

  const logActivity = (entry: Omit<Activity, 'id' | 'timestamp'>) => {
    const newActivity: Activity = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: formatTimestamp(),
      ...entry,
    };
    setActivities((prev) => [newActivity, ...prev]);
  };

  const updateRoomNames = (
    wismaName: string,
    roomName: string,
    updater: (names: string[]) => string[]
  ) => {
    setWismaData((prev) =>
      prev.map((wisma) => {
        if (wisma.name !== wismaName) return wisma;
        return {
          ...wisma,
          rooms: wisma.rooms.map((room) => {
            if (room.name !== roomName) return room;
            return { ...room, names: updater(room.names) };
          }),
        };
      })
    );
  };

  const handleAddName = () => {
    if (!newName.trim() || !currentRoom) return;
    updateRoomNames(selectedWisma, selectedRoom, (names) => [...names, newName.trim()]);
    logActivity({
      action: 'Tambah Nama',
      actor: role,
      wisma: selectedWisma,
      room: selectedRoom,
      targetName: newName.trim(),
      detail: 'Nama ditambahkan ke kamar',
    });
    setNewName('');
  };

  const handleEditName = (oldName: string) => {
    if (!editValue.trim()) return;
    updateRoomNames(selectedWisma, selectedRoom, (names) =>
      names.map((item) => (item === oldName ? editValue.trim() : item))
    );
    logActivity({
      action: 'Edit Nama',
      actor: role,
      wisma: selectedWisma,
      room: selectedRoom,
      targetName: oldName,
      detail: `Diubah menjadi ${editValue.trim()}`,
    });
    setEditName(null);
    setEditValue('');
  };

  const handleDeleteName = (name: string) => {
    updateRoomNames(selectedWisma, selectedRoom, (names) => names.filter((item) => item !== name));
    logActivity({
      action: 'Hapus Nama',
      actor: role,
      wisma: selectedWisma,
      room: selectedRoom,
      targetName: name,
      detail: 'Nama dihapus dari kamar',
    });
  };

  const handleMoveName = (name: string) => {
    if (!moveTarget) return;
    const [targetWisma, targetRoom] = moveTarget.split('||');
    if (!targetWisma || !targetRoom) return;

    updateRoomNames(selectedWisma, selectedRoom, (names) => names.filter((item) => item !== name));
    updateRoomNames(targetWisma, targetRoom, (names) => [...names, name]);

    logActivity({
      action: 'Pindah Kamar',
      actor: role,
      wisma: selectedWisma,
      room: selectedRoom,
      targetName: name,
      detail: `Dipindahkan ke ${targetWisma} - ${targetRoom}`,
    });

    setMoveTarget('');
  };

  const handleSubmitApel = () => {
    if (!apelRoomData) return;
    const entry: BukuApelEntry = {
      id: `${Date.now()}-${Math.random()}`,
      date: apelDate,
      wisma: apelWisma,
      room: apelRoom,
      keluar: apelKeluar,
      masuk: apelMasuk,
      keterangan: apelKode.trim(),
      regu: role,
      createdAt: formatTimestamp(),
    };
    setBukuApel((prev) => [entry, ...prev]);

    logActivity({
      action: 'Input Buku Apel',
      actor: role,
      wisma: apelWisma,
      room: apelRoom,
      detail: `Keluar ${apelKeluar}, Masuk ${apelMasuk}`,
    });

    setApelKeluar(0);
    setApelMasuk(0);
    setApelKode('');
  };

  const handleSubmitP2U = () => {
    const record: P2URecord = {
      id: `${Date.now()}-${Math.random()}`,
      originWisma: p2uOriginWisma,
      originRoom: p2uOriginRoom,
      purpose: p2uPurpose,
      keluarAt: p2uKeluarAt,
      masukAt: p2uMasukAt,
      targetWisma: p2uTargetWisma,
      targetRoom: p2uTargetRoom,
      jumlahKeluar: p2uJumlahKeluar,
      jumlahMasuk: p2uJumlahMasuk,
      kode: p2uKode.trim(),
      officer: 'Petugas P2U',
    };

    setP2uRecords((prev) => [record, ...prev]);

    logActivity({
      action: 'P2U - Keluar/Masuk',
      actor: 'Petugas P2U',
      wisma: p2uOriginWisma,
      room: p2uOriginRoom,
      detail: `Keluar ${p2uJumlahKeluar}, Masuk ${p2uJumlahMasuk}`,
    });

    setP2UPurpose('RS');
    setP2UKeluarAt('');
    setP2UMasukAt('');
    setP2UOriginWisma(p2uOriginWisma);
    setP2UOriginRoom(p2uOriginRoom);
    setP2UTargetWisma(p2uOriginWisma);
    setP2UTargetRoom(p2uOriginRoom);
    setP2UJumlahKeluar(0);
    setP2UJumlahMasuk(0);
    setP2UKode('');
  };

  const filteredApel = bukuApel.filter((entry) => {
    if (apelFilterWisma !== 'Semua' && entry.wisma !== apelFilterWisma) return false;
    if (apelFilterRoom !== 'Semua') {
      const [filterWisma, filterRoom] = apelFilterRoom.split('||');
      if (entry.wisma !== filterWisma || entry.room !== filterRoom) return false;
    }
    if (apelFilterDate && entry.date !== apelFilterDate) return false;
    if (apelFilterRegu !== 'Semua' && entry.regu !== apelFilterRegu) return false;
    return true;
  });

  const filteredActivities = activities.filter((activity) => {
    if (activityFilter === 'Semua') return true;
    return activity.action === activityFilter;
  });

  const summaryCounts = useMemo(() => {
    return wismaData.map((wisma) => {
      const total = wisma.rooms.reduce((acc, room) => acc + room.names.length, 0);
      return { name: wisma.name, total };
    });
  }, [wismaData]);

  const tabs = [
    { id: 'kamar', label: 'Manajemen Kamar', enabled: isRegu || isReadOnly },
    { id: 'apel', label: 'Buku Apel', enabled: isRegu || isReadOnly },
    { id: 'p2u', label: 'P2U', enabled: isP2U || isReadOnly },
    { id: 'rekap', label: 'Rekap & Riwayat', enabled: true },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 rounded-xl p-2 border border-white/20">
              <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-amber-200">Lapas Kelas IIA Kerobokan</p>
              <h1 className="text-2xl font-semibold">Buku Apel Petugas Lapas Digital</h1>
              <p className="text-sm text-slate-200">Manajemen nama warga binaan per kamar, buku apel harian, dan P2U.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-3">
              <label className="text-xs uppercase tracking-wider text-slate-200">Peran Akses</label>
              <select
                className="mt-1 w-full bg-transparent border border-white/20 rounded-md px-2 py-1 text-sm"
                value={role}
                onChange={(event) => {
                  const newRole = event.target.value;
                  setRole(newRole);
                  if (REGU_OPTIONS.includes(newRole)) {
                    setActiveTab('kamar');
                  } else if (newRole === 'P2U') {
                    setActiveTab('p2u');
                  } else {
                    setActiveTab('rekap');
                  }
                }}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option} value={option} className="text-slate-900">
                    {option}
                  </option>
                ))}
              </select>
              <p className="text-[11px] mt-2 text-slate-300">Hak akses otomatis disesuaikan.</p>
            </div>
            <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-3">
              <label className="text-xs uppercase tracking-wider text-slate-200">Status Input</label>
              <p className="text-sm font-semibold">{isReadOnly ? 'Read Only' : 'Aktif'}</p>
              <p className="text-[11px] mt-2 text-slate-300">
                {isReadOnly ? 'Akses baca penuh untuk monitoring.' : 'Bisa input dan update data.'}
              </p>
            </div>
            <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-3 no-print">
              <label className="text-xs uppercase tracking-wider text-slate-200">Ekspor</label>
              <button
                type="button"
                onClick={() => window.print()}
                className="mt-2 w-full rounded-md bg-amber-400 text-slate-900 text-sm font-semibold px-3 py-1.5"
              >
                Cetak PDF
              </button>
              <p className="text-[11px] mt-2 text-slate-300">Gunakan Print/Save as PDF.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-wrap gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => tab.enabled && setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm border transition ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : tab.enabled
                  ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  : 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
              }`}
              disabled={!tab.enabled}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'kamar' && (
          <section className="mt-6 space-y-6">
            {wismaData.map((wisma) => (
              <div key={wisma.name} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Buku Apel Harian</p>
                    <h2 className="text-lg font-semibold text-slate-800">
                      {wisma.name.toUpperCase()}
                      {lantaiByWisma[wisma.name] ? ` (LANTAI ${lantaiByWisma[wisma.name]})` : ''}
                    </h2>
                    <p className="text-xs text-slate-500">Input angka sesuai kondisi harian.</p>
                  </div>
                  <div className="text-xs text-slate-500">
                    Tanggal: <span className="font-semibold">{formatTimestamp().split(',')[0]}</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 no-print">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Lantai</label>
                  <input
                    type="number"
                    min={0}
                    value={lantaiByWisma[wisma.name] ?? ''}
                    onChange={(event) =>
                      setLantaiByWisma((prev) => ({
                        ...prev,
                        [wisma.name]: event.target.value,
                      }))
                    }
                    className="w-20 px-2 py-1 border border-slate-200 rounded-md text-xs"
                    placeholder="1"
                  />
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-[1100px] w-full text-[12px] border border-slate-200">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th rowSpan={2} className="border border-slate-200 px-2 py-2 text-center">Kmr</th>
                        <th colSpan={1} className="border border-slate-200 px-2 py-2 text-center">Isi</th>
                        <th colSpan={2} className="border border-slate-200 px-2 py-2 text-center">Perb</th>
                        <th colSpan={1} className="border border-slate-200 px-2 py-2 text-center">Isi</th>
                        <th colSpan={2} className="border border-slate-200 px-2 py-2 text-center">Perb</th>
                        <th colSpan={1} className="border border-slate-200 px-2 py-2 text-center">Isi</th>
                        <th colSpan={1} className="border border-slate-200 px-2 py-2 text-center">Isi</th>
                        <th rowSpan={2} className="border border-slate-200 px-2 py-2 text-center">Ket</th>
                        <th rowSpan={2} className="border border-slate-200 px-2 py-2 text-center">Petugas</th>
                        <th rowSpan={2} className="border border-slate-200 px-2 py-2 text-center">Simpan</th>
                      </tr>
                      <tr>
                        <th className="border border-slate-200 px-2 py-1 text-center">Pagi</th>
                        <th className="border border-slate-200 px-2 py-1 text-center">Klr</th>
                        <th className="border border-slate-200 px-2 py-1 text-center">Msk</th>
                        <th className="border border-slate-200 px-2 py-1 text-center">Siang</th>
                        <th className="border border-slate-200 px-2 py-1 text-center">Klr</th>
                        <th className="border border-slate-200 px-2 py-1 text-center">Msk</th>
                        <th className="border border-slate-200 px-2 py-1 text-center">Sore</th>
                        <th className="border border-slate-200 px-2 py-1 text-center">Mlm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wisma.rooms.map((room) => {
                        const row = getGridRow(wisma.name, room.name);
                        return (
                          <tr key={room.name} className="even:bg-slate-50">
                            <td className="border border-slate-200 px-2 py-1 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedWisma(wisma.name);
                                  setSelectedRoom(room.name);
                                  setIsRoomModalOpen(true);
                                }}
                                className="text-slate-700 font-semibold underline decoration-dotted underline-offset-4"
                              >
                                {room.name}
                              </button>
                            </td>
                            {([
                              ['pagi', row.pagi],
                              ['keluarPagi', row.keluarPagi],
                              ['masukPagi', row.masukPagi],
                              ['siang', row.siang],
                              ['keluarSiang', row.keluarSiang],
                              ['masukSiang', row.masukSiang],
                              ['sore', row.sore],
                              ['malam', row.malam],
                              ['ket', row.ket],
                            ] as Array<[keyof RoomGridRow, string]>).map(([field, value]) => (
                              <td key={field} className="border border-slate-200 px-1 py-1 text-center">
                                <input
                                  type={field === 'ket' ? 'text' : 'number'}
                                  min={field === 'ket' ? undefined : 0}
                                  value={value}
                                  onChange={(event) => updateGridRow(wisma.name, room.name, field, event.target.value)}
                                  placeholder={field === 'pagi' ? String(room.names.length) : ''}
                                  className={`bg-transparent focus:outline-none ${field === 'ket' ? 'w-32 text-left px-2' : 'w-16 text-center'}`}
                                  disabled={isReadOnly}
                                />
                              </td>
                            ))}
                            <td className="border border-slate-200 px-1 py-1 text-center">
                              <input
                                type="text"
                                value={row.petugas}
                                onChange={(event) =>
                                  updateGridRow(wisma.name, room.name, 'petugas', event.target.value)
                                }
                                placeholder="Nama petugas"
                                className="w-32 bg-transparent text-left px-2 focus:outline-none"
                                disabled={isReadOnly}
                              />
                            </td>
                            <td className="border border-slate-200 px-2 py-1 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  logActivity({
                                    action: 'Update Buku Apel Harian',
                                    actor: row.petugas || role,
                                    wisma: wisma.name,
                                    room: room.name,
                                    detail: 'Input angka disimpan',
                                  })
                                }
                                className="px-2 py-1 text-[11px] rounded-md bg-slate-900 text-white disabled:opacity-50"
                                disabled={isReadOnly}
                              >
                                Simpan
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>
        )}

        {activeTab === 'apel' && (
          <section className="mt-6 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-slate-500">Tanggal</label>
                  <input
                    type="date"
                    value={apelDate}
                    onChange={(event) => setApelDate(event.target.value)}
                    className="mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-slate-500">Wisma</label>
                  <select
                    value={apelWisma}
                    onChange={(event) => {
                      const value = event.target.value;
                      setApelWisma(value);
                      const wisma = wismaData.find((item) => item.name === value);
                      if (wisma) setApelRoom(wisma.rooms[0]?.name ?? '');
                    }}
                    className="mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    disabled={isReadOnly}
                  >
                    {wismaData.map((item) => (
                      <option key={item.name} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-slate-500">Kamar</label>
                  <select
                    value={apelRoom}
                    onChange={(event) => setApelRoom(event.target.value)}
                    className="mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    disabled={isReadOnly}
                  >
                    {wismaData
                      .find((item) => item.name === apelWisma)
                      ?.rooms.map((room) => (
                        <option key={room.name} value={room.name}>
                          {room.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-slate-500">Jumlah Warga Binaan</label>
                  <p className="mt-2 text-lg font-semibold">{apelRoomData?.names.length ?? 0} orang</p>
                </div>
                <div className="flex gap-3">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-slate-500">Keluar</label>
                    <input
                      type="number"
                      min={0}
                      value={apelKeluar}
                      onChange={(event) => setApelKeluar(Number(event.target.value))}
                      className="mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm w-20"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-slate-500">Masuk</label>
                    <input
                      type="number"
                      min={0}
                      value={apelMasuk}
                      onChange={(event) => setApelMasuk(Number(event.target.value))}
                      className="mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm w-20"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs uppercase tracking-wider text-slate-500">Keterangan (Singkat)</label>
                  <input
                    type="text"
                    value={apelKode}
                    onChange={(event) => setApelKode(event.target.value)}
                    placeholder="Contoh: Sidang / Luar"
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-slate-500">Regu Pengamanan</label>
                  <p className="mt-2 font-semibold">{role}</p>
                </div>
                <div>
                  <button
                    onClick={handleSubmitApel}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm"
                    disabled={isReadOnly}
                  >
                    Simpan Apel
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <h2 className="text-lg font-semibold">Rekap Buku Apel</h2>
                <div className="flex flex-wrap gap-3">
                  <select
                    value={apelFilterWisma}
                    onChange={(event) => setApelFilterWisma(event.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="Semua">Semua Wisma</option>
                    {wismaData.map((item) => (
                      <option key={item.name} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={apelFilterRoom}
                    onChange={(event) => setApelFilterRoom(event.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="Semua">Semua Kamar</option>
                    {allRooms.map((room) => (
                      <option key={room.key} value={`${room.wisma}||${room.room}`}>
                        {room.key}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={apelFilterDate}
                    onChange={(event) => setApelFilterDate(event.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <select
                    value={apelFilterRegu}
                    onChange={(event) => setApelFilterRegu(event.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="Semua">Semua Regu</option>
                    {REGU_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="py-2">Tanggal</th>
                      <th className="py-2">Wisma</th>
                      <th className="py-2">Kamar</th>
                      <th className="py-2">Jumlah WB</th>
                      <th className="py-2">Keluar</th>
                      <th className="py-2">Masuk</th>
                      <th className="py-2">Jumlah Akhir</th>
                      <th className="py-2">Kode/Ket</th>
                      <th className="py-2">Regu</th>
                      <th className="py-2">Waktu Input</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApel.map((entry) => {
                      const roomData = wismaData
                        .find((item) => item.name === entry.wisma)
                        ?.rooms.find((room) => room.name === entry.room);
                      const count = roomData?.names.length ?? 0;
                      const total = count - entry.keluar + entry.masuk;
                      return (
                        <tr key={entry.id} className="border-b last:border-b-0">
                          <td className="py-3">{entry.date}</td>
                          <td className="py-3">{entry.wisma}</td>
                          <td className="py-3">{entry.room}</td>
                          <td className="py-3 font-semibold">{count}</td>
                          <td className="py-3">{entry.keluar}</td>
                          <td className="py-3">{entry.masuk}</td>
                          <td className="py-3 font-semibold">{total}</td>
                          <td className="py-3">{entry.keterangan || '-'}</td>
                          <td className="py-3">{entry.regu}</td>
                          <td className="py-3">{entry.createdAt}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'p2u' && (
          <section className="mt-6 grid lg:grid-cols-[1.1fr,0.9fr] gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Formulir P2U</h2>
              <p className="text-sm text-slate-500">Pencatatan keluar-masuk warga binaan melalui pintu P2U.</p>

              <div className="mt-6 grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-slate-500">Wisma Asal</label>
                  <select
                    value={p2uOriginWisma}
                    onChange={(event) => {
                      const value = event.target.value;
                      setP2UOriginWisma(value);
                      const wisma = wismaData.find((item) => item.name === value);
                      if (wisma) {
                        setP2UOriginRoom(wisma.rooms[0]?.name ?? '');
                        setP2UTargetWisma(value);
                        setP2UTargetRoom(wisma.rooms[0]?.name ?? '');
                      }
                    }}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    disabled={isReadOnly}
                  >
                    {wismaData.map((item) => (
                      <option key={item.name} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-slate-500">Kamar Asal</label>
                  <select
                    value={p2uOriginRoom}
                    onChange={(event) => setP2UOriginRoom(event.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    disabled={isReadOnly}
                  >
                    {wismaData
                      .find((item) => item.name === p2uOriginWisma)
                      ?.rooms.map((room) => (
                        <option key={room.name} value={room.name}>
                          {room.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-slate-500">Tujuan Keluar</label>
                  <select
                    value={p2uPurpose}
                    onChange={(event) => setP2UPurpose(event.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    disabled={isReadOnly}
                  >
                    {['RS', 'Sidang', 'Bersih-bersih', 'Lainnya'].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-slate-500">Tanggal & Jam Keluar</label>
                  <input
                    type="datetime-local"
                    value={p2uKeluarAt}
                    onChange={(event) => setP2UKeluarAt(event.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-slate-500">Tanggal & Jam Masuk</label>
                  <input
                    type="datetime-local"
                    value={p2uMasukAt}
                    onChange={(event) => setP2UMasukAt(event.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-slate-500">Jumlah Keluar</label>
                  <input
                    type="number"
                    min={0}
                    value={p2uJumlahKeluar}
                    onChange={(event) => setP2UJumlahKeluar(Number(event.target.value))}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-slate-500">Kamar Tujuan Setelah Masuk</label>
                  <select
                    value={`${p2uTargetWisma}||${p2uTargetRoom}`}
                    onChange={(event) => {
                      const [wisma, room] = event.target.value.split('||');
                      setP2UTargetWisma(wisma);
                      setP2UTargetRoom(room);
                    }}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    disabled={isReadOnly}
                  >
                    {allRooms.map((room) => (
                      <option key={room.key} value={`${room.wisma}||${room.room}`}>
                        {room.key}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-slate-500">Jumlah Masuk</label>
                  <input
                    type="number"
                    min={0}
                    value={p2uJumlahMasuk}
                    onChange={(event) => setP2UJumlahMasuk(Number(event.target.value))}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-slate-500">Keterangan (Singkat)</label>
                  <input
                    type="text"
                    value={p2uKode}
                    onChange={(event) => setP2UKode(event.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">Petugas P2U</p>
                  <p className="font-semibold">Petugas P2U</p>
                </div>
                <button
                  onClick={handleSubmitP2U}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm"
                  disabled={isReadOnly}
                >
                  Simpan Pencatatan
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Riwayat P2U Terbaru</h3>
              <div className="mt-4 space-y-4">
                {p2uRecords.slice(0, 6).map((record) => (
                  <div key={record.id} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-800">
                        {record.originWisma} - {record.originRoom}
                      </p>
                      <span className="text-xs px-2 py-1 bg-slate-100 rounded-full">{record.purpose}</span>
                    </div>
                    <p className="text-sm text-slate-500">Tujuan: {record.targetWisma} - {record.targetRoom}</p>
                    <p className="text-xs text-slate-400">Keluar: {record.keluarAt || '-'} | Masuk: {record.masukAt || '-'}</p>
                    <p className="text-xs text-slate-500">
                      Jumlah Keluar: {record.jumlahKeluar} | Jumlah Masuk: {record.jumlahMasuk}
                    </p>
                    {record.kode && <p className="text-xs text-slate-500">Kode: {record.kode}</p>}
                  </div>
                ))}
                {p2uRecords.length === 0 && (
                  <p className="text-sm text-slate-500">Belum ada pencatatan P2U.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'rekap' && (
          <section className="mt-6 space-y-6">
            <div className="grid md:grid-cols-4 gap-4">
              {summaryCounts.map((item) => (
                <div key={item.name} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-wider text-slate-500">Wisma {item.name}</p>
                  <p className="mt-2 text-2xl font-semibold">{item.total}</p>
                  <p className="text-sm text-slate-500">Jumlah nama warga binaan</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <h2 className="text-lg font-semibold">Riwayat Aktivitas</h2>
                <select
                  value={activityFilter}
                  onChange={(event) => setActivityFilter(event.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="Semua">Semua Aktivitas</option>
                  {['Tambah Nama', 'Edit Nama', 'Hapus Nama', 'Pindah Kamar', 'Input Buku Apel', 'P2U - Pindah Kamar', 'P2U - Keluar/Masuk'].map(
                    (option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="py-2">Waktu</th>
                      <th className="py-2">Aktivitas</th>
                      <th className="py-2">Petugas</th>
                      <th className="py-2">Wisma/Kamar</th>
                      <th className="py-2">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActivities.map((activity) => (
                      <tr key={activity.id} className="border-b last:border-b-0">
                        <td className="py-3">{activity.timestamp}</td>
                        <td className="py-3 font-semibold text-slate-700">{activity.action}</td>
                        <td className="py-3">{activity.actor}</td>
                        <td className="py-3">
                          {activity.wisma && activity.room ? `${activity.wisma} - ${activity.room}` : '-'}
                        </td>
                        <td className="py-3">{activity.detail || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Rekap Jumlah per Kamar</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="py-2">Wisma</th>
                      <th className="py-2">Kamar</th>
                      <th className="py-2">Jumlah Nama</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wismaData.flatMap((wisma) =>
                      wisma.rooms.map((room) => (
                        <tr key={`${wisma.name}-${room.name}`} className="border-b last:border-b-0">
                          <td className="py-3">{wisma.name}</td>
                          <td className="py-3">{room.name}</td>
                          <td className="py-3 font-semibold">{room.names.length}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>

      {isRoomModalOpen && currentRoom && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200">
            <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">Detail Kamar</p>
                <h3 className="text-lg font-semibold text-slate-800">
                  {selectedWisma} - {selectedRoom}
                </h3>
                <p className="text-sm text-slate-500">Jumlah nama: {currentRoom.names.length}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRoomModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                Tutup
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    placeholder="Tambah nama warga binaan"
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-64"
                    disabled={isReadOnly}
                  />
                  <button
                    onClick={handleAddName}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm disabled:opacity-50"
                    disabled={isReadOnly}
                  >
                    Tambah
                  </button>
                </div>
                <div className="text-xs text-slate-500">
                  CRUD hanya tersedia pada halaman ini.
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="py-2">Nama</th>
                      <th className="py-2">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRoom.names.map((name) => (
                      <tr key={name} className="border-b last:border-b-0">
                        <td className="py-3">
                          {editName === name ? (
                            <input
                              value={editValue}
                              onChange={(event) => setEditValue(event.target.value)}
                              className="px-2 py-1 border border-slate-200 rounded-md text-sm"
                            />
                          ) : (
                            <span className="font-medium text-slate-700">{name}</span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2">
                            {editName === name ? (
                              <button
                                onClick={() => handleEditName(name)}
                                className="px-3 py-1 rounded-md bg-emerald-600 text-white text-xs"
                                disabled={isReadOnly}
                              >
                                Simpan
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditName(name);
                                  setEditValue(name);
                                }}
                                className="px-3 py-1 rounded-md bg-slate-100 text-slate-600 text-xs"
                                disabled={isReadOnly}
                              >
                                Edit
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteName(name)}
                              className="px-3 py-1 rounded-md bg-rose-500 text-white text-xs"
                              disabled={isReadOnly}
                            >
                              Hapus
                            </button>
                            <select
                              value={moveTarget}
                              onChange={(event) => setMoveTarget(event.target.value)}
                              className="px-2 py-1 border border-slate-200 rounded-md text-xs"
                              disabled={isReadOnly}
                            >
                              <option value="">Pilih kamar tujuan</option>
                              {allRooms
                                .filter((room) => room.key !== `${selectedWisma} - ${selectedRoom}`)
                                .map((room) => (
                                  <option key={room.key} value={`${room.wisma}||${room.room}`}>
                                    {room.key}
                                  </option>
                                ))}
                            </select>
                            <button
                              onClick={() => handleMoveName(name)}
                              className="px-3 py-1 rounded-md bg-indigo-600 text-white text-xs"
                              disabled={isReadOnly || !moveTarget}
                            >
                              Pindah
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
