import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-950 via-primary-900 to-primary-800 text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-primary-950/70 border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary-500 flex items-center justify-center font-display font-bold text-lg">K</div>
            <span className="font-display font-bold text-lg">SIM KBM Platform</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost text-white/90 hover:bg-white/10">Masuk</Link>
            <Link to="/signup" className="btn bg-accent-400 text-primary-950 hover:bg-accent-300 font-semibold">Daftar</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-primary-400 blur-3xl" />
          <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-accent-400 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-primary-100 mb-6">
              <span className="h-2 w-2 rounded-full bg-accent-400 animate-pulse" />
              Platform ERP untuk Pendidikan Islam
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              Membangun Masa Depan Digital Pondok Pesantren
            </h1>
            <p className="text-lg text-primary-100/80 leading-relaxed mb-8 max-w-2xl">
              Satu platform untuk seluruh aktivitas lembaga. Akademik, administrasi, dan pondok
              saling terhubung dalam satu ekosistem digital yang aman dan mudah digunakan.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/signup" className="btn bg-accent-400 text-primary-950 hover:bg-accent-300 px-6 py-3 text-base font-bold">
                Mulai Sekarang
              </Link>
              <Link to="/login" className="btn bg-white/10 text-white hover:bg-white/20 border border-white/20 px-6 py-3 text-base">
                Sudah Punya Akun
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/10 bg-primary-950/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { num: '1.500+', label: 'Santri per Pondok' },
              { num: '8+', label: 'Modul Terpadu' },
              { num: '7', label: 'Peran Pengguna' },
              { num: 'PWA', label: 'Android, iOS, Desktop' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-3xl lg:text-4xl font-extrabold text-accent-400">{s.num}</div>
                <div className="text-sm text-primary-200/70 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-center mb-4">Satu Platform, Seluruh Aktivitas</h2>
          <p className="text-center text-primary-200/70 mb-12 max-w-2xl mx-auto">
            Semua data saling terhubung. Ketika seorang santri masuk ke sistem, seluruh modul langsung mengenalinya.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: 'M4 6h16M4 12h16M4 18h7', title: 'Akademik', desc: 'Nilai, jadwal, dan absensi terintegrasi dalam satu sistem.' },
              { icon: 'M3 10h18M3 14h18M7 6h10M7 18h10', title: 'Administrasi', desc: 'Keuangan, inventaris, dan surat menyurat terkelola rapi.' },
              { icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l7-3 7 3z', title: 'Pondok', desc: 'Asrama, tahfidz, dan perizinan santri dalam satu tempat.' },
              { icon: 'M9 17v-6h6v6M9 11V7a3 3 0 016 0v4M5 21h14a2 2 0 002-2v-7H3v7a2 2 0 002 2z', title: 'Keamanan Multi-Tenant', desc: 'Setiap pondok hanya melihat datanya sendiri, tidak saling bercampur.' },
              { icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z', title: 'PWA', desc: 'Install di Android, iPhone, Windows, Mac. Bekerja offline.' },
              { icon: 'M13 10V3L4 14h7v7l9-11h-7z', title: 'Dashboard Real-Time', desc: 'Pimpinan melihat kondisi lembaga secara langsung.' },
            ].map((m) => (
              <div key={m.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/10 hover:-translate-y-1">
                <div className="h-12 w-12 rounded-xl bg-primary-500/20 flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={m.icon} />
                  </svg>
                </div>
                <h3 className="font-display font-bold text-lg mb-2">{m.title}</h3>
                <p className="text-sm text-primary-200/70 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="py-20 bg-primary-950/50 border-y border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-center mb-12">Untuk Setiap Peran</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { role: 'Super Admin', desc: 'Mengelola seluruh platform' },
              { role: 'Guru', desc: 'Mengisi absensi, nilai, dan jadwal' },
              { role: 'Bendahara', desc: 'Mengelola pembayaran dan keuangan' },
              { role: 'Santri & Wali', desc: 'Melihat jadwal, nilai, dan pengumuman' },
            ].map((r) => (
              <div key={r.role} className="rounded-2xl bg-white/5 p-6 text-center">
                <div className="mx-auto h-14 w-14 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mb-4">
                  <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="font-display font-bold mb-1">{r.role}</h3>
                <p className="text-sm text-primary-200/70">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="font-display text-3xl lg:text-4xl font-extrabold mb-4">
            Siap Membangun Ekosistem Digital Lembaga Anda?
          </h2>
          <p className="text-primary-200/70 mb-8 max-w-2xl mx-auto">
            Proses yang biasanya memerlukan waktu berjam-jam dapat diselesaikan hanya dalam beberapa menit.
          </p>
          <Link to="/signup" className="btn bg-accent-400 text-primary-950 hover:bg-accent-300 px-8 py-3.5 text-base font-bold">
            Buat Akun Pondok
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-primary-300/50">
          SIM KBM Platform &copy; {new Date().getFullYear()} — Ekosistem Digital Pendidikan Islam
        </div>
      </footer>
    </div>
  )
}
