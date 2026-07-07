/*
# Create Core Tables for SIM KBM Platform (Part 1: Tables only)

## Overview
Multi-tenant ERP schema for Islamic boarding schools. Each pondok = one tenant.
Tables created first; RLS policies added in a separate migration to avoid
forward-reference issues.

## New Tables (17 total)
1. pondok — tenant (institution)
2. profiles — user profiles (1:1 with auth.users)
3. kelas — classes
4. santri — students
5. guru — teachers/staff
6. subjects — academic subjects
7. jadwal — schedules
8. absensi — attendance
9. nilai — grades
10. asrama — dormitories
11. asrama_santri — dormitory assignments
12. tahfidz — Quran memorization tracking
13. perizinan — permission requests
14. payments — finance
15. inventaris — inventory
16. surat — letters
17. announcements — announcements

## Security
RLS enabled on all tables. Policies added in part 2 migration.
*/

-- ============ PONDOK ============
CREATE TABLE IF NOT EXISTS pondok (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'pondok' CHECK (type IN ('pondok','madrasah','tpq','sekolah','yayasan')),
  logo_url text,
  address text,
  phone text,
  email text,
  modules jsonb NOT NULL DEFAULT '["akademik","administrasi","pondok"]'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE pondok ENABLE ROW LEVEL SECURITY;

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  pondok_id uuid REFERENCES pondok(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'guru' CHECK (role IN ('super_admin','admin_pondok','kepala_madrasah','guru','musyrif','bendahara','santri','wali_santri')),
  phone text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============ KELAS ============
CREATE TABLE IF NOT EXISTS kelas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pondok_id uuid NOT NULL REFERENCES pondok(id) ON DELETE CASCADE,
  name text NOT NULL,
  level text,
  homeroom_teacher_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE kelas ENABLE ROW LEVEL SECURITY;

-- ============ SANTRI ============
CREATE TABLE IF NOT EXISTS santri (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pondok_id uuid NOT NULL REFERENCES pondok(id) ON DELETE CASCADE,
  nis text,
  full_name text NOT NULL,
  gender text CHECK (gender IN ('L','P')),
  birth_date date,
  address text,
  phone text,
  parent_name text,
  parent_phone text,
  kelas_id uuid REFERENCES kelas(id) ON DELETE SET NULL,
  wali_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  enrollment_date date DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif','lulus','cuti','keluar')),
  photo_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE santri ENABLE ROW LEVEL SECURITY;

-- ============ GURU ============
CREATE TABLE IF NOT EXISTS guru (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pondok_id uuid NOT NULL REFERENCES pondok(id) ON DELETE CASCADE,
  nip text,
  full_name text NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  phone text,
  subject text,
  status text NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif','nonaktif')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE guru ENABLE ROW LEVEL SECURITY;

-- ============ SUBJECTS ============
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pondok_id uuid NOT NULL REFERENCES pondok(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  kelas_id uuid REFERENCES kelas(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES guru(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- ============ JADWAL ============
CREATE TABLE IF NOT EXISTS jadwal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pondok_id uuid NOT NULL REFERENCES pondok(id) ON DELETE CASCADE,
  kelas_id uuid NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  day text NOT NULL CHECK (day IN ('senin','selasa','rabu','kamis','jumat','sabtu','ahad')),
  start_time time NOT NULL,
  end_time time NOT NULL,
  room text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE jadwal ENABLE ROW LEVEL SECURITY;

-- ============ ABSENSI ============
CREATE TABLE IF NOT EXISTS absensi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pondok_id uuid NOT NULL REFERENCES pondok(id) ON DELETE CASCADE,
  kelas_id uuid REFERENCES kelas(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  santri_id uuid NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'hadir' CHECK (status IN ('hadir','sakit','izin','alpha')),
  notes text,
  recorded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE absensi ENABLE ROW LEVEL SECURITY;

-- ============ NILAI ============
CREATE TABLE IF NOT EXISTS nilai (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pondok_id uuid NOT NULL REFERENCES pondok(id) ON DELETE CASCADE,
  santri_id uuid NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  kelas_id uuid REFERENCES kelas(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'tugas' CHECK (type IN ('tugas','uts','uas','quiz')),
  score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 100,
  date date DEFAULT CURRENT_DATE,
  recorded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE nilai ENABLE ROW LEVEL SECURITY;

-- ============ ASRAMA ============
CREATE TABLE IF NOT EXISTS asrama (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pondok_id uuid NOT NULL REFERENCES pondok(id) ON DELETE CASCADE,
  name text NOT NULL,
  building text,
  capacity int DEFAULT 0,
  mushrif_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE asrama ENABLE ROW LEVEL SECURITY;

-- ============ ASRAMA_SANTRI ============
CREATE TABLE IF NOT EXISTS asrama_santri (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asrama_id uuid NOT NULL REFERENCES asrama(id) ON DELETE CASCADE,
  santri_id uuid NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  room_number text,
  bed_number text,
  date_assigned date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE asrama_santri ENABLE ROW LEVEL SECURITY;

-- ============ TAHFIDZ ============
CREATE TABLE IF NOT EXISTS tahfidz (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pondok_id uuid NOT NULL REFERENCES pondok(id) ON DELETE CASCADE,
  santri_id uuid NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  surah text NOT NULL,
  ayat_start int,
  ayat_end int,
  juz int,
  status text NOT NULL DEFAULT 'hafalan' CHECK (status IN ('hafalan','murajaah','setoran')),
  date date DEFAULT CURRENT_DATE,
  notes text,
  musyrif_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE tahfidz ENABLE ROW LEVEL SECURITY;

-- ============ PERIZINAN ============
CREATE TABLE IF NOT EXISTS perizinan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pondok_id uuid NOT NULL REFERENCES pondok(id) ON DELETE CASCADE,
  santri_id uuid NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'pulang' CHECK (type IN ('pulang','sakit','acara','lainnya')),
  start_date date NOT NULL,
  end_date date,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE perizinan ENABLE ROW LEVEL SECURITY;

-- ============ PAYMENTS ============
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pondok_id uuid NOT NULL REFERENCES pondok(id) ON DELETE CASCADE,
  santri_id uuid NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'spp' CHECK (category IN ('spp','daftar','seragam','kitab','lainnya')),
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'belum_bayar' CHECK (status IN ('lunas','cicilan','belum_bayar')),
  due_date date,
  paid_date date,
  method text,
  notes text,
  recorded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- ============ INVENTARIS ============
CREATE TABLE IF NOT EXISTS inventaris (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pondok_id uuid NOT NULL REFERENCES pondok(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  quantity int NOT NULL DEFAULT 1,
  unit text DEFAULT 'unit',
  condition text DEFAULT 'baik' CHECK (condition IN ('baik','rusak_ringan','rusak_berat')),
  location text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE inventaris ENABLE ROW LEVEL SECURITY;

-- ============ SURAT ============
CREATE TABLE IF NOT EXISTS surat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pondok_id uuid NOT NULL REFERENCES pondok(id) ON DELETE CASCADE,
  number text,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'keluar' CHECK (type IN ('masuk','keluar')),
  recipient text,
  date date DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE surat ENABLE ROW LEVEL SECURITY;

-- ============ ANNOUNCEMENTS ============
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pondok_id uuid NOT NULL REFERENCES pondok(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'umum',
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all','guru','santri','wali','musyrif')),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_santri_pondok ON santri(pondok_id);
CREATE INDEX IF NOT EXISTS idx_santri_kelas ON santri(kelas_id);
CREATE INDEX IF NOT EXISTS idx_absensi_pondok_date ON absensi(pondok_id, date);
CREATE INDEX IF NOT EXISTS idx_absensi_santri ON absensi(santri_id);
CREATE INDEX IF NOT EXISTS idx_nilai_santri ON nilai(santri_id);
CREATE INDEX IF NOT EXISTS idx_nilai_subject ON nilai(subject_id);
CREATE INDEX IF NOT EXISTS idx_payments_pondok ON payments(pondok_id);
CREATE INDEX IF NOT EXISTS idx_payments_santri ON payments(santri_id);
CREATE INDEX IF NOT EXISTS idx_jadwal_kelas_day ON jadwal(kelas_id, day);
CREATE INDEX IF NOT EXISTS idx_perizinan_pondok ON perizinan(pondok_id);
CREATE INDEX IF NOT EXISTS idx_announcements_pondok ON announcements(pondok_id);
CREATE INDEX IF NOT EXISTS idx_profiles_pondok ON profiles(pondok_id);
CREATE INDEX IF NOT EXISTS idx_tahfidz_santri ON tahfidz(santri_id);
