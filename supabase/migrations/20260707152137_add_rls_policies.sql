/*
# Add RLS Policies for All Core Tables

## Overview
Adds 4 CRUD policies (SELECT/INSERT/UPDATE/DELETE) to every table created in
the `create_core_tables` migration. All policies are scoped to authenticated
users and enforce pondok-level tenant isolation.

## Security Model
- Every policy checks pondok membership via:
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = <table>.pondok_id)
- profiles table: users can read all profiles in their pondok, but only
  insert/update/delete their own profile row.
- pondok table: users can read/update/delete their own pondok. INSERT is open
  (needed for setup wizard to create a new pondok before a profile exists).
- asrama_santri: scoped through the parent asrama's pondok_id.

## Policy Pattern
4 policies per table, TO authenticated, with ownership predicate.
*/

-- ============ PONDOK ============
DROP POLICY IF EXISTS "select_own_pondok" ON pondok;
CREATE POLICY "select_own_pondok" ON pondok FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = pondok.id)
  );
DROP POLICY IF EXISTS "insert_pondok" ON pondok;
CREATE POLICY "insert_pondok" ON pondok FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_pondok" ON pondok;
CREATE POLICY "update_own_pondok" ON pondok FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = pondok.id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = pondok.id)
  );
DROP POLICY IF EXISTS "delete_own_pondok" ON pondok;
CREATE POLICY "delete_own_pondok" ON pondok FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = pondok.id)
  );

-- ============ PROFILES ============
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = profiles.pondok_id)
  );
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (id = auth.uid());

-- ============ KELAS ============
DROP POLICY IF EXISTS "select_own_kelas" ON kelas;
CREATE POLICY "select_own_kelas" ON kelas FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = kelas.pondok_id)
  );
DROP POLICY IF EXISTS "insert_own_kelas" ON kelas;
CREATE POLICY "insert_own_kelas" ON kelas FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = kelas.pondok_id)
  );
DROP POLICY IF EXISTS "update_own_kelas" ON kelas;
CREATE POLICY "update_own_kelas" ON kelas FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = kelas.pondok_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = kelas.pondok_id)
  );
DROP POLICY IF EXISTS "delete_own_kelas" ON kelas;
CREATE POLICY "delete_own_kelas" ON kelas FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = kelas.pondok_id)
  );

-- ============ SANTRI ============
DROP POLICY IF EXISTS "select_own_santri" ON santri;
CREATE POLICY "select_own_santri" ON santri FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = santri.pondok_id)
  );
DROP POLICY IF EXISTS "insert_own_santri" ON santri;
CREATE POLICY "insert_own_santri" ON santri FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = santri.pondok_id)
  );
DROP POLICY IF EXISTS "update_own_santri" ON santri;
CREATE POLICY "update_own_santri" ON santri FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = santri.pondok_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = santri.pondok_id)
  );
DROP POLICY IF EXISTS "delete_own_santri" ON santri;
CREATE POLICY "delete_own_santri" ON santri FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = santri.pondok_id)
  );

-- ============ GURU ============
DROP POLICY IF EXISTS "select_own_guru" ON guru;
CREATE POLICY "select_own_guru" ON guru FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = guru.pondok_id)
  );
DROP POLICY IF EXISTS "insert_own_guru" ON guru;
CREATE POLICY "insert_own_guru" ON guru FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = guru.pondok_id)
  );
DROP POLICY IF EXISTS "update_own_guru" ON guru;
CREATE POLICY "update_own_guru" ON guru FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = guru.pondok_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = guru.pondok_id)
  );
DROP POLICY IF EXISTS "delete_own_guru" ON guru;
CREATE POLICY "delete_own_guru" ON guru FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = guru.pondok_id)
  );

-- ============ SUBJECTS ============
DROP POLICY IF EXISTS "select_own_subjects" ON subjects;
CREATE POLICY "select_own_subjects" ON subjects FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = subjects.pondok_id)
  );
DROP POLICY IF EXISTS "insert_own_subjects" ON subjects;
CREATE POLICY "insert_own_subjects" ON subjects FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = subjects.pondok_id)
  );
DROP POLICY IF EXISTS "update_own_subjects" ON subjects;
CREATE POLICY "update_own_subjects" ON subjects FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = subjects.pondok_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = subjects.pondok_id)
  );
DROP POLICY IF EXISTS "delete_own_subjects" ON subjects;
CREATE POLICY "delete_own_subjects" ON subjects FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = subjects.pondok_id)
  );

-- ============ JADWAL ============
DROP POLICY IF EXISTS "select_own_jadwal" ON jadwal;
CREATE POLICY "select_own_jadwal" ON jadwal FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = jadwal.pondok_id)
  );
DROP POLICY IF EXISTS "insert_own_jadwal" ON jadwal;
CREATE POLICY "insert_own_jadwal" ON jadwal FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = jadwal.pondok_id)
  );
DROP POLICY IF EXISTS "update_own_jadwal" ON jadwal;
CREATE POLICY "update_own_jadwal" ON jadwal FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = jadwal.pondok_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = jadwal.pondok_id)
  );
DROP POLICY IF EXISTS "delete_own_jadwal" ON jadwal;
CREATE POLICY "delete_own_jadwal" ON jadwal FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = jadwal.pondok_id)
  );

-- ============ ABSENSI ============
DROP POLICY IF EXISTS "select_own_absensi" ON absensi;
CREATE POLICY "select_own_absensi" ON absensi FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = absensi.pondok_id)
  );
DROP POLICY IF EXISTS "insert_own_absensi" ON absensi;
CREATE POLICY "insert_own_absensi" ON absensi FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = absensi.pondok_id)
  );
DROP POLICY IF EXISTS "update_own_absensi" ON absensi;
CREATE POLICY "update_own_absensi" ON absensi FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = absensi.pondok_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = absensi.pondok_id)
  );
DROP POLICY IF EXISTS "delete_own_absensi" ON absensi;
CREATE POLICY "delete_own_absensi" ON absensi FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = absensi.pondok_id)
  );

-- ============ NILAI ============
DROP POLICY IF EXISTS "select_own_nilai" ON nilai;
CREATE POLICY "select_own_nilai" ON nilai FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = nilai.pondok_id)
  );
DROP POLICY IF EXISTS "insert_own_nilai" ON nilai;
CREATE POLICY "insert_own_nilai" ON nilai FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = nilai.pondok_id)
  );
DROP POLICY IF EXISTS "update_own_nilai" ON nilai;
CREATE POLICY "update_own_nilai" ON nilai FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = nilai.pondok_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = nilai.pondok_id)
  );
DROP POLICY IF EXISTS "delete_own_nilai" ON nilai;
CREATE POLICY "delete_own_nilai" ON nilai FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = nilai.pondok_id)
  );

-- ============ ASRAMA ============
DROP POLICY IF EXISTS "select_own_asrama" ON asrama;
CREATE POLICY "select_own_asrama" ON asrama FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = asrama.pondok_id)
  );
DROP POLICY IF EXISTS "insert_own_asrama" ON asrama;
CREATE POLICY "insert_own_asrama" ON asrama FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = asrama.pondok_id)
  );
DROP POLICY IF EXISTS "update_own_asrama" ON asrama;
CREATE POLICY "update_own_asrama" ON asrama FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = asrama.pondok_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = asrama.pondok_id)
  );
DROP POLICY IF EXISTS "delete_own_asrama" ON asrama;
CREATE POLICY "delete_own_asrama" ON asrama FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = asrama.pondok_id)
  );

-- ============ ASRAMA_SANTRI ============
DROP POLICY IF EXISTS "select_own_asrama_santri" ON asrama_santri;
CREATE POLICY "select_own_asrama_santri" ON asrama_santri FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM asrama a JOIN profiles p ON p.pondok_id = a.pondok_id
      WHERE a.id = asrama_santri.asrama_id AND p.id = auth.uid())
  );
DROP POLICY IF EXISTS "insert_own_asrama_santri" ON asrama_santri;
CREATE POLICY "insert_own_asrama_santri" ON asrama_santri FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM asrama a JOIN profiles p ON p.pondok_id = a.pondok_id
      WHERE a.id = asrama_santri.asrama_id AND p.id = auth.uid())
  );
DROP POLICY IF EXISTS "update_own_asrama_santri" ON asrama_santri;
CREATE POLICY "update_own_asrama_santri" ON asrama_santri FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM asrama a JOIN profiles p ON p.pondok_id = a.pondok_id
      WHERE a.id = asrama_santri.asrama_id AND p.id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM asrama a JOIN profiles p ON p.pondok_id = a.pondok_id
      WHERE a.id = asrama_santri.asrama_id AND p.id = auth.uid())
  );
DROP POLICY IF EXISTS "delete_own_asrama_santri" ON asrama_santri;
CREATE POLICY "delete_own_asrama_santri" ON asrama_santri FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM asrama a JOIN profiles p ON p.pondok_id = a.pondok_id
      WHERE a.id = asrama_santri.asrama_id AND p.id = auth.uid())
  );

-- ============ TAHFIDZ ============
DROP POLICY IF EXISTS "select_own_tahfidz" ON tahfidz;
CREATE POLICY "select_own_tahfidz" ON tahfidz FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = tahfidz.pondok_id)
  );
DROP POLICY IF EXISTS "insert_own_tahfidz" ON tahfidz;
CREATE POLICY "insert_own_tahfidz" ON tahfidz FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = tahfidz.pondok_id)
  );
DROP POLICY IF EXISTS "update_own_tahfidz" ON tahfidz;
CREATE POLICY "update_own_tahfidz" ON tahfidz FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = tahfidz.pondok_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = tahfidz.pondok_id)
  );
DROP POLICY IF EXISTS "delete_own_tahfidz" ON tahfidz;
CREATE POLICY "delete_own_tahfidz" ON tahfidz FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = tahfidz.pondok_id)
  );

-- ============ PERIZINAN ============
DROP POLICY IF EXISTS "select_own_perizinan" ON perizinan;
CREATE POLICY "select_own_perizinan" ON perizinan FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = perizinan.pondok_id)
  );
DROP POLICY IF EXISTS "insert_own_perizinan" ON perizinan;
CREATE POLICY "insert_own_perizinan" ON perizinan FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = perizinan.pondok_id)
  );
DROP POLICY IF EXISTS "update_own_perizinan" ON perizinan;
CREATE POLICY "update_own_perizinan" ON perizinan FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = perizinan.pondok_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = perizinan.pondok_id)
  );
DROP POLICY IF EXISTS "delete_own_perizinan" ON perizinan;
CREATE POLICY "delete_own_perizinan" ON perizinan FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = perizinan.pondok_id)
  );

-- ============ PAYMENTS ============
DROP POLICY IF EXISTS "select_own_payments" ON payments;
CREATE POLICY "select_own_payments" ON payments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = payments.pondok_id)
  );
DROP POLICY IF EXISTS "insert_own_payments" ON payments;
CREATE POLICY "insert_own_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = payments.pondok_id)
  );
DROP POLICY IF EXISTS "update_own_payments" ON payments;
CREATE POLICY "update_own_payments" ON payments FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = payments.pondok_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = payments.pondok_id)
  );
DROP POLICY IF EXISTS "delete_own_payments" ON payments;
CREATE POLICY "delete_own_payments" ON payments FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = payments.pondok_id)
  );

-- ============ INVENTARIS ============
DROP POLICY IF EXISTS "select_own_inventaris" ON inventaris;
CREATE POLICY "select_own_inventaris" ON inventaris FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = inventaris.pondok_id)
  );
DROP POLICY IF EXISTS "insert_own_inventaris" ON inventaris;
CREATE POLICY "insert_own_inventaris" ON inventaris FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = inventaris.pondok_id)
  );
DROP POLICY IF EXISTS "update_own_inventaris" ON inventaris;
CREATE POLICY "update_own_inventaris" ON inventaris FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = inventaris.pondok_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = inventaris.pondok_id)
  );
DROP POLICY IF EXISTS "delete_own_inventaris" ON inventaris;
CREATE POLICY "delete_own_inventaris" ON inventaris FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = inventaris.pondok_id)
  );

-- ============ SURAT ============
DROP POLICY IF EXISTS "select_own_surat" ON surat;
CREATE POLICY "select_own_surat" ON surat FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = surat.pondok_id)
  );
DROP POLICY IF EXISTS "insert_own_surat" ON surat;
CREATE POLICY "insert_own_surat" ON surat FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = surat.pondok_id)
  );
DROP POLICY IF EXISTS "update_own_surat" ON surat;
CREATE POLICY "update_own_surat" ON surat FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = surat.pondok_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = surat.pondok_id)
  );
DROP POLICY IF EXISTS "delete_own_surat" ON surat;
CREATE POLICY "delete_own_surat" ON surat FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = surat.pondok_id)
  );

-- ============ ANNOUNCEMENTS ============
DROP POLICY IF EXISTS "select_own_announcements" ON announcements;
CREATE POLICY "select_own_announcements" ON announcements FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = announcements.pondok_id)
  );
DROP POLICY IF EXISTS "insert_own_announcements" ON announcements;
CREATE POLICY "insert_own_announcements" ON announcements FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = announcements.pondok_id)
  );
DROP POLICY IF EXISTS "update_own_announcements" ON announcements;
CREATE POLICY "update_own_announcements" ON announcements FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = announcements.pondok_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = announcements.pondok_id)
  );
DROP POLICY IF EXISTS "delete_own_announcements" ON announcements;
CREATE POLICY "delete_own_announcements" ON announcements FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.pondok_id = announcements.pondok_id)
  );
