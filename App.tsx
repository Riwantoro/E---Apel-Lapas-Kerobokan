import React, { useEffect, useMemo, useRef, useState } from 'react';
import wbpData from './data/wbp.json';

const LOGO_URL = "https://res.cloudinary.com/dim98gun7/image/upload/v1769353691/Logo_Kementrian_Imigrasi_dan_Pemasyarakatan__2024_1_ihjxaz.png";

type Room = { name: string; names: string[] };

type Wisma = { name: string; rooms: Room[] };

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
  ketCount: string;
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
  ketCount: '',
});

const fallbackWisma: Wisma[] = [
  {
    name: 'Yudistira',
    rooms: [
      { name: 'A1', names: ['Putu Wira', 'Gede Satria'] },
      { name: 'A4', names: ['Komang Sujana', 'Made Arta'] },
      { name: 'A7', names: ['I Gede Putra', 'Wayan Adi', 'Kadek Surya'] },
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
  if (/^wisma\s+/i.test(name)) {
    name = name.replace(/^wisma\s+/i, '');
  }
  return name
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

const ensureRoom = (data: Wisma[], wismaName: string, roomName: string): Wisma[] => {
  return data.map((wisma) => {
    if (wisma.name.toLowerCase() !== wismaName.toLowerCase()) return wisma;
    const exists = wisma.rooms.some((room) => room.name === roomName);
    if (exists) return wisma;
    return { ...wisma, rooms: [...wisma.rooms, { name: roomName, names: [] }] };
  });
};

const STORAGE_KEY = 'lapas-buku-apel-state-v2';

type PersistedState = {
  wismaData: Wisma[];
  roomGrid: Record<string, RoomGridRow>;
  petugasNama: string;
  catatanApel: string;
  reguPagiSiang: string;
  reguMalam: string;
  savedShifts: {
    pagi: boolean;
    siang: boolean;
    malam: boolean;
  };
  reportLocked: boolean;
};

const formatDate = () =>
  new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const formatDateLong = () =>
  new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const parseRoomOrder = (value: string) => {
  const match = value.match(/^([A-Za-z]+)(\d+)/);
  if (!match) return { prefix: value, number: Number.MAX_SAFE_INTEGER };
  return { prefix: match[1].toUpperCase(), number: Number(match[2]) };
};

const compareRoom = (a: Room, b: Room) => {
  const parsedA = parseRoomOrder(a.name);
  const parsedB = parseRoomOrder(b.name);
  if (parsedA.prefix === parsedB.prefix) {
    if (parsedA.number !== parsedB.number) return parsedA.number - parsedB.number;
  }
  return a.name.localeCompare(b.name);
};

const App: React.FC = () => {
  const [wismaData, setWismaData] = useState<Wisma[]>(ensureRoom(initialWisma, 'Arjuna', 'F1'));
  const [roomGrid, setRoomGrid] = useState<Record<string, RoomGridRow>>({});
  const [summaryText, setSummaryText] = useState('');
  const [dalamLapasCount, setDalamLapasCount] = useState('');
  const [luarLapasCount, setLuarLapasCount] = useState('');
  const [petugasNama, setPetugasNama] = useState('');
  const [catatanApel, setCatatanApel] = useState('');
  const [reguPagiSiang, setReguPagiSiang] = useState('');
  const [reguMalam, setReguMalam] = useState('');
  const [savedShifts, setSavedShifts] = useState({ pagi: false, siang: false, malam: false });
  const [reportLocked, setReportLocked] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');

  const [selectedWisma, setSelectedWisma] = useState(initialWisma[0].name);
  const [selectedRoom, setSelectedRoom] = useState(initialWisma[0].rooms[0].name);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [editName, setEditName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [moveTarget, setMoveTarget] = useState<string>('');
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as PersistedState;
      if (parsed.wismaData) setWismaData(ensureRoom(parsed.wismaData, 'Arjuna', 'F1'));
      if (parsed.roomGrid) setRoomGrid(parsed.roomGrid);
      if (parsed.petugasNama) setPetugasNama(parsed.petugasNama);
      if (parsed.catatanApel) setCatatanApel(parsed.catatanApel);
      if (parsed.reguPagiSiang) setReguPagiSiang(parsed.reguPagiSiang);
      if (parsed.reguMalam) setReguMalam(parsed.reguMalam);
      if (parsed.savedShifts) setSavedShifts(parsed.savedShifts);
      if (typeof parsed.reportLocked === 'boolean') setReportLocked(parsed.reportLocked);
    } catch (error) {
      console.error('Gagal memuat data lokal', error);
    }
  }, []);

  useEffect(() => {
    const payload: PersistedState = {
      wismaData,
      roomGrid,
      petugasNama,
      catatanApel,
      reguPagiSiang,
      reguMalam,
      savedShifts,
      reportLocked,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [
    wismaData,
    roomGrid,
    petugasNama,
    catatanApel,
    reguPagiSiang,
    reguMalam,
    savedShifts,
    reportLocked,
  ]);

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

  const currentRoom = useMemo(() => {
    const wisma = wismaData.find((item) => item.name === selectedWisma);
    return wisma?.rooms.find((room) => room.name === selectedRoom);
  }, [wismaData, selectedWisma, selectedRoom]);

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

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const playNotify = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gainNode.gain.value = 0.15;
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.2);
      oscillator.onended = () => ctx.close();
    } catch {
      // ignore audio errors
    }
  };

  const getRoomCount = (wismaName: string, roomName: string, field: keyof RoomGridRow) => {
    const row = getGridRow(wismaName, roomName);
    const raw = row[field];
    if (raw !== '' && !Number.isNaN(Number(raw))) return Number(raw);
    const wisma = wismaData.find((item) => item.name === wismaName);
    const room = wisma?.rooms.find((item) => item.name === roomName);
    return room?.names.length ?? 0;
  };

  const wismaTotals = useMemo(() => {
    const map = new Map<string, number>();
    wismaData.forEach((wisma) => {
      const total = wisma.rooms.reduce((acc, room) => acc + getRoomCount(wisma.name, room.name, 'sore'), 0);
      map.set(wisma.name.toLowerCase(), total);
    });
    return map;
  }, [wismaData, roomGrid]);

  const totalSiang = useMemo(() => {
    return wismaData.reduce((acc, wisma) => {
      return (
        acc +
        wisma.rooms.reduce((sum, room) => sum + getRoomCount(wisma.name, room.name, 'siang'), 0)
      );
    }, 0);
  }, [wismaData, roomGrid]);

  const totalSore = useMemo(() => {
    return wismaData.reduce((acc, wisma) => {
      return (
        acc +
        wisma.rooms.reduce((sum, room) => sum + getRoomCount(wisma.name, room.name, 'sore'), 0)
      );
    }, 0);
  }, [wismaData, roomGrid]);

  const ketTotals = useMemo(() => {
    const totals = {
      Baru: 0,
      Bebas: 0,
      RS: 0,
      Berobat: 0,
      Sidang: 0,
      'Kerja Luar': 0,
      Lainnya: 0,
    };
    Object.values(roomGrid).forEach((row) => {
      const key = row.ket as keyof typeof totals;
      const count = Number(row.ketCount || 0);
      if (key && totals[key] !== undefined) {
        totals[key] += Number.isNaN(count) ? 0 : count;
      }
    });
    return totals;
  }, [roomGrid]);

  const lookupWisma = (label: string) => {
    const key = label.toLowerCase();
    const value = wismaTotals.get(key);
    return value !== undefined ? `${value} ORANG` : '- ORANG';
  };

  const isNightShift = useMemo(() => new Date().getHours() >= 18, []);

  const currentShift = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 18) return 'malam';
    if (hour >= 12) return 'siang';
    return 'pagi';
  }, []);

  const shiftOrder: Record<'pagi' | 'siang' | 'malam', number> = { pagi: 0, siang: 1, malam: 2 };

  const fieldShift = (field: keyof RoomGridRow): 'pagi' | 'siang' | 'malam' | 'bebas' => {
    if (field === 'ket' || field === 'ketCount') return 'bebas';
    if (field === 'pagi' || field === 'keluarPagi' || field === 'masukPagi') return 'pagi';
    if (field === 'siang' || field === 'keluarSiang' || field === 'masukSiang' || field === 'sore') return 'siang';
    return 'malam';
  };

  const generateSummary = () => {
    const dateText = formatDateLong().toUpperCase();
    const labelWidth = 24;
    const numberWidth = 6;
    const bulletLabel = (label: string) => `•  ${label.padEnd(labelWidth)}: `;
    const valueText = (value: string | number) =>
      String(value).padStart(numberWidth) + ' ORANG';
    const reportLabel = (label: string) => `•  ${label.padEnd(labelWidth)}: `;
    const detailLabel = (label: string) => `  ${label.padEnd(labelWidth)}: `;

    const lines = [
      `SELAMAT SORE, IJIN MELAPORKAN HASIL APEL SORE WBP ( ${dateText} )`,
      '',
      `REGU APEL PAGI/SIANG/SORE : ${reguPagiSiang || '-'}`,
      `REGU APEL MALAM           : ${reguMalam || '-'}`,
      '',
      bulletLabel('WISMA YUDISTIRA') + lookupWisma('yudistira'),
      bulletLabel('WISMA BIMA') + lookupWisma('bima'),
      bulletLabel('ARJUNA') + lookupWisma('arjuna'),
      bulletLabel('NAKULA') + lookupWisma('nakula'),
      bulletLabel('POLIKLINIK') + lookupWisma('poliklinik'),
      bulletLabel('DAPUR') + lookupWisma('dapur'),
      '',
      reportLabel('ISI LAPAS  ( SIANG )') + valueText(totalSiang),
      reportLabel('ISI LAPAS ( SORE )') + valueText(totalSore),
      'KETERANGAN :',
      detailLabel('BARU') + valueText(ketTotals.Baru || '-'),
      detailLabel('BEBAS') + valueText(ketTotals.Bebas || '-'),
      '',
      reportLabel('ISI DALAM LAPAS') + valueText(dalamLapasCount || '-'),
      reportLabel('DI LUAR LAPAS') + valueText(luarLapasCount || '-'),
      'KETERANGAN:',
      reportLabel('RS') + valueText(ketTotals.RS || '-'),
      reportLabel('BEROBAT') + valueText(ketTotals.Berobat || '-'),
      reportLabel('SIDANG') + valueText(ketTotals.Sidang || '-'),
      reportLabel('KERJA LUAR') + valueText(ketTotals['Kerja Luar'] || '-'),
      reportLabel('LAINNYA') + valueText(ketTotals.Lainnya || '-'),
    ];
    if (catatanApel.trim()) {
      lines.push('');
      lines.push('CATATAN KEGIATAN:');
      lines.push(catatanApel.trim());
    }
    setSummaryText(lines.join('\n'));
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
    setNewName('');
  };

  const handleEditName = (oldName: string) => {
    if (!editValue.trim()) return;
    updateRoomNames(selectedWisma, selectedRoom, (names) =>
      names.map((item) => (item === oldName ? editValue.trim() : item))
    );
    setEditName(null);
    setEditValue('');
  };

  const handleDeleteName = (name: string) => {
    updateRoomNames(selectedWisma, selectedRoom, (names) => names.filter((item) => item !== name));
  };

  const handleMoveName = (name: string) => {
    if (!moveTarget) return;
    const [targetWisma, targetRoom] = moveTarget.split('||');
    if (!targetWisma || !targetRoom) return;

    updateRoomNames(selectedWisma, selectedRoom, (names) => names.filter((item) => item !== name));
    updateRoomNames(targetWisma, targetRoom, (names) => [...names, name]);

    setMoveTarget('');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white no-print">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 rounded-xl p-2 border border-white/20">
              <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-amber-200">Lapas Kelas IIA Kerobokan</p>
              <h1 className="text-2xl font-semibold">Buku Apel Harian</h1>
              <p className="text-sm text-slate-200">Tanggal: {formatDate()}</p>
            </div>
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

      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {toastMessage}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {wismaData.map((wisma) => (
          <div
            key={wisma.name}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm print-wisma"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400 no-print">Buku Apel</p>
                <h2 className="text-lg font-semibold text-slate-800 print-wisma-title">
                  {wisma.name.toUpperCase()}
                </h2>
              </div>
              <div className="text-xs text-slate-500 print-wisma-date">Tanggal: {formatDate()}</div>
            </div>

            <div className="mt-4 overflow-x-auto print-table-wrap">
              <table className="min-w-[1100px] w-full text-[12px] border border-slate-200 print-table">
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
                  {wisma.rooms.sort(compareRoom).map((room) => {
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
                            {(() => {
                              const shift = fieldShift(field);
                              const isFree = shift === 'bebas';
                              const isSaved = !isFree && savedShifts[shift];
                              const isPast = !isFree && shiftOrder[shift] < shiftOrder[currentShift];
                              const isLocked = isPast || isSaved;
                              const baseClass =
                                field === 'ket' ? 'w-32 text-left px-2' : 'w-16 text-center';
                              const stateClass = isSaved
                                ? 'bg-blue-100 text-blue-900'
                                : isPast
                                ? 'bg-slate-100 text-slate-400'
                                : 'bg-transparent';
                              if (field === 'ket') {
                                return (
                                  <div className="flex items-center gap-1">
                                    <select
                                      value={value}
                                      onChange={(event) =>
                                        updateGridRow(wisma.name, room.name, field, event.target.value)
                                      }
                                      className={`focus:outline-none ${baseClass} ${stateClass}`}
                                    >
                                      <option value="">Pilih</option>
                                      <option value="Baru">Baru</option>
                                      <option value="Bebas">Bebas</option>
                                      <option value="RS">RS</option>
                                      <option value="Berobat">Berobat</option>
                                      <option value="Sidang">Sidang</option>
                                      <option value="Kerja Luar">Kerja Luar</option>
                                      <option value="Lainnya">Lainnya</option>
                                    </select>
                                    <input
                                      type="number"
                                      min={0}
                                      value={row.ketCount}
                                      onChange={(event) =>
                                        updateGridRow(wisma.name, room.name, 'ketCount', event.target.value)
                                      }
                                      placeholder="Jml"
                                      className="w-12 text-center bg-transparent focus:outline-none"
                                    />
                                  </div>
                                );
                              }
                              return (
                                <input
                                  type="number"
                                  min={0}
                                  value={value}
                                  onChange={(event) =>
                                    updateGridRow(wisma.name, room.name, field, event.target.value)
                                  }
                                  placeholder={field === 'pagi' ? String(room.names.length) : ''}
                                  className={`focus:outline-none ${baseClass} ${stateClass}`}
                                  disabled={isLocked}
                                />
                              );
                            })()}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm" ref={reportRef}>
          <h2 className="text-lg font-semibold text-slate-800">Laporan Apel</h2>
          <p className="text-sm text-slate-500">Klik generate untuk membuat laporan otomatis.</p>

          <div className="mt-4 grid md:grid-cols-4 gap-3">
            <input
              type="text"
              value={`Baru: ${ketTotals.Baru}`}
              readOnly
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-rose-600"
            />
            <input
              type="text"
              value={`Bebas: ${ketTotals.Bebas}`}
              readOnly
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-rose-600"
            />
            <input
              type="number"
              min={0}
              value={dalamLapasCount}
              onChange={(event) => setDalamLapasCount(event.target.value)}
              placeholder="Isi Dalam Lapas"
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              disabled={reportLocked}
            />
            <input
              type="number"
              min={0}
              value={luarLapasCount}
              onChange={(event) => setLuarLapasCount(event.target.value)}
              placeholder="Di Luar Lapas"
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              disabled={reportLocked}
            />
            <input
              type="text"
              value={`RS: ${ketTotals.RS}`}
              readOnly
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-rose-600"
            />
            <input
              type="text"
              value={`Berobat: ${ketTotals.Berobat}`}
              readOnly
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-rose-600"
            />
            <input
              type="text"
              value={`Sidang: ${ketTotals.Sidang}`}
              readOnly
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-rose-600"
            />
            <input
              type="text"
              value={`Kerja Luar: ${ketTotals['Kerja Luar']}`}
              readOnly
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-rose-600"
            />
            <input
              type="text"
              value={`Lainnya: ${ketTotals.Lainnya}`}
              readOnly
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-rose-600"
            />
          </div>

          <div className="mt-4 grid md:grid-cols-2 gap-3">
            <select
              value={reguPagiSiang}
              onChange={(event) => setReguPagiSiang(event.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              disabled={isNightShift || reportLocked}
            >
              <option value="">Regu Apel Pagi/Siang/Sore</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
            <select
              value={reguMalam}
              onChange={(event) => setReguMalam(event.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              disabled={!isNightShift || reportLocked}
            >
              <option value="">Regu Apel Malam</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {isNightShift
              ? 'Setelah pukul 18.00, hanya Regu Apel Malam yang bisa diubah.'
              : 'Sebelum pukul 18.00, Regu Apel Pagi/Siang/Sore yang bisa diubah.'}
          </p>

          <div className="mt-3 grid md:grid-cols-[1fr,1fr] gap-3">
            <input
              type="text"
              value={petugasNama}
              onChange={(event) => setPetugasNama(event.target.value)}
              placeholder="Nama petugas pengisi buku apel"
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              disabled={reportLocked}
            />
            <button
              type="button"
              onClick={() => {
                generateSummary();
                setSavedShifts((prev) => ({ ...prev, [currentShift]: true }));
                setReportLocked(true);
                reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                playNotify();
                showToast('Terima kasih, laporan sudah disimpan.');
              }}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm"
              disabled={reportLocked}
            >
              Simpan
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Shift aktif: {currentShift.toUpperCase()}. Kolom shift yang sudah disimpan akan terkunci (biru).
          </p>

          <div className="mt-4 grid md:grid-cols-[1fr,auto] gap-3 items-center">
            <input
              type="password"
              value={unlockPassword}
              onChange={(event) => {
                setUnlockPassword(event.target.value);
                if (unlockError) setUnlockError('');
              }}
              placeholder="Password buka kunci"
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
            <button
              type="button"
              onClick={() => {
                if (unlockPassword === 'azwarganteng') {
                  setSavedShifts({ pagi: false, siang: false, malam: false });
                  setReportLocked(false);
                  setUnlockPassword('');
                  setUnlockError('');
                  playNotify();
                  showToast('Terima kasih, kunci sudah dibuka.');
                } else {
                  setUnlockError('Password salah.');
                  playNotify();
                }
              }}
              className="px-4 py-2 rounded-lg bg-rose-500 text-white text-sm"
            >
              Buka Kunci
            </button>
          </div>
          {unlockError && <p className="text-xs text-rose-500 mt-1">{unlockError}</p>}

          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                generateSummary();
                playNotify();
                showToast('Terima kasih, laporan berhasil dibuat.');
              }}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm"
            >
              Generate Laporan
            </button>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(summaryText);
                playNotify();
                showToast('Terima kasih, teks laporan berhasil disalin.');
              }}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm"
            >
              Salin Teks
            </button>
          </div>

          <div className="mt-4">
            <label className="text-xs uppercase tracking-wider text-slate-500">Catatan Kegiatan Apel (Opsional)</label>
            <textarea
              value={catatanApel}
              onChange={(event) => setCatatanApel(event.target.value)}
              rows={3}
              className="mt-2 w-full border border-slate-200 rounded-lg p-3 text-sm"
              placeholder="Contoh: Terjadi perkelahian kecil di blok ... / Deteksi dini ..."
              disabled={reportLocked}
            />
          </div>

          <textarea
            value={summaryText}
            readOnly
            rows={14}
            className="mt-4 w-full border border-slate-200 rounded-lg p-3 text-sm font-mono text-slate-700 leading-tight"
            placeholder="Hasil laporan akan muncul di sini."
          />

          <div className="mt-8 text-sm text-slate-700 print-footer">
            <p>Kerobokan, {formatDate()}</p>
            <p className="mt-3">Diperiksa oleh</p>
            <p>Ka. KPLP</p>
            <div className="mt-10">
              <p className="font-semibold">Putu Arya Subhawa</p>
              <p>NIP. 198610112006041001</p>
            </div>
          </div>
        </div>
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
                  />
                  <button
                    onClick={handleAddName}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm"
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
                              >
                                Edit
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteName(name)}
                              className="px-3 py-1 rounded-md bg-rose-500 text-white text-xs"
                            >
                              Hapus
                            </button>
                            <select
                              value={moveTarget}
                              onChange={(event) => setMoveTarget(event.target.value)}
                              className="px-2 py-1 border border-slate-200 rounded-md text-xs"
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
                              disabled={!moveTarget}
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
