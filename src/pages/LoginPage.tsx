import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'Email atau kata sandi salah' : error.message)
      return
    }
    navigate('/app/dashboard')
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
          <h1 className="font-display text-2xl font-bold mb-2">Selamat Datang</h1>
          <p className="text-sm text-neutral-500 mb-6">Masuk untuk mengakses dashboard lembaga Anda</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="nama@pondok.com" />
            </div>
            <div>
              <label className="label">Kata Sandi</label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
          <p className="text-center text-sm text-neutral-500 mt-6">
            Belum punya akun? <Link to="/signup" className="text-primary-600 font-semibold hover:underline">Daftar pondok baru</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
