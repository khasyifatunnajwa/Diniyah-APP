export type Role =
  | 'super_admin'
  | 'admin_pondok'
  | 'kepala_madrasah'
  | 'guru'
  | 'musyrif'
  | 'bendahara'
  | 'santri'
  | 'wali_santri'

export type PondokType = 'pondok' | 'madrasah' | 'tpq' | 'sekolah' | 'yayasan'

export interface Pondok {
  id: string
  name: string
  type: PondokType
  logo_url: string | null
  address: string | null
  phone: string | null
  email: string | null
  modules: string[]
  created_at: string
}

export interface Profile {
  id: string
  pondok_id: string | null
  full_name: string
  role: Role
  phone: string | null
  avatar_url: string | null
  created_at: string
}

export interface Kelas {
  id: string
  pondok_id: string
  name: string
  level: string | null
  homeroom_teacher_id: string | null
  created_at: string
}

export interface Santri {
  id: string
  pondok_id: string
  nis: string | null
  full_name: string
  gender: 'L' | 'P' | null
  birth_date: string | null
  address: string | null
  phone: string | null
  parent_name: string | null
  parent_phone: string | null
  kelas_id: string | null
  wali_user_id: string | null
  enrollment_date: string | null
  status: 'aktif' | 'lulus' | 'cuti' | 'keluar'
  photo_url: string | null
  created_at: string
}

export interface Guru {
  id: string
  pondok_id: string
  nip: string | null
  full_name: string
  user_id: string | null
  phone: string | null
  subject: string | null
  status: 'aktif' | 'nonaktif'
  created_at: string
}

export interface Subject {
  id: string
  pondok_id: string
  name: string
  code: string | null
  kelas_id: string | null
  teacher_id: string | null
  created_at: string
}

export interface Jadwal {
  id: string
  pondok_id: string
  kelas_id: string
  subject_id: string | null
  day: string
  start_time: string
  end_time: string
  room: string | null
  created_at: string
}

export interface Absensi {
  id: string
  pondok_id: string
  kelas_id: string | null
  subject_id: string | null
  santri_id: string
  date: string
  status: 'hadir' | 'sakit' | 'izin' | 'alpha'
  notes: string | null
  recorded_by: string | null
  created_at: string
}

export interface Nilai {
  id: string
  pondok_id: string
  santri_id: string
  subject_id: string | null
  kelas_id: string | null
  type: 'tugas' | 'uts' | 'uas' | 'quiz'
  score: number
  max_score: number
  date: string
  recorded_by: string | null
  created_at: string
}

export interface Asrama {
  id: string
  pondok_id: string
  name: string
  building: string | null
  capacity: number
  mushrif_id: string | null
  created_at: string
}

export interface AsramaSantri {
  id: string
  asrama_id: string
  santri_id: string
  room_number: string | null
  bed_number: string | null
  date_assigned: string
  created_at: string
}

export interface Tahfidz {
  id: string
  pondok_id: string
  santri_id: string
  surah: string
  ayat_start: number | null
  ayat_end: number | null
  juz: number | null
  status: 'hafalan' | 'murajaah' | 'setoran'
  date: string
  notes: string | null
  musyrif_id: string | null
  created_at: string
}

export interface Perizinan {
  id: string
  pondok_id: string
  santri_id: string
  type: 'pulang' | 'sakit' | 'acara' | 'lainnya'
  start_date: string
  end_date: string | null
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  approved_by: string | null
  created_at: string
}

export interface Payment {
  id: string
  pondok_id: string
  santri_id: string
  category: 'spp' | 'daftar' | 'seragam' | 'kitab' | 'lainnya'
  amount: number
  status: 'lunas' | 'cicilan' | 'belum_bayar'
  due_date: string | null
  paid_date: string | null
  method: string | null
  notes: string | null
  recorded_by: string | null
  created_at: string
}

export interface Inventaris {
  id: string
  pondok_id: string
  name: string
  category: string | null
  quantity: number
  unit: string
  condition: 'baik' | 'rusak_ringan' | 'rusak_berat'
  location: string | null
  notes: string | null
  created_at: string
}

export interface Surat {
  id: string
  pondok_id: string
  number: string | null
  title: string
  type: 'masuk' | 'keluar'
  recipient: string | null
  date: string
  notes: string | null
  created_at: string
}

export interface Announcement {
  id: string
  pondok_id: string
  title: string
  content: string
  category: string | null
  audience: 'all' | 'guru' | 'santri' | 'wali' | 'musyrif'
  created_by: string | null
  created_at: string
}
