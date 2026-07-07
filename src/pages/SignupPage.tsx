import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function SignupPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter')
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    if (data.user) {
      navigate('/setup')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-950 to-primary-800 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary-500 flex items-center justify-center font-display font-bold text-2xl text-white">K</div>
            <span className="font-display font-bold text-xl text-white">SIM KBM Platform</span>
          </Link>
        </div>
        <div className="card p-8 animate-fade-in">
          <h1 className="font-display text-2xl font-bold mb-2">Daftar Akun Baru</h1>
          <p className="text-sm text-neutral-500 mb-6">Buat akun admin untuk pondok atau lembaga Anda</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nama Lengkap</label>
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Nama Anda" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="nama@pondok.com" />
            </div>
            <div>
              <label className="label">Kata Sandi</label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Minimal 6 karakter" />
            </div>
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Memproses...' : 'Daftar'}
            </button>
          </form>
          <p className="text-center text-sm text-neutral-500 mt-6">
            Sudah punya akun? <Link to="/login" className="text-primary-600 font-semibold hover:underline">Masuk di sini</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
