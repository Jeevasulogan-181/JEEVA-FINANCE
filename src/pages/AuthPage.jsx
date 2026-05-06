import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function AuthPage() {
  const [email,   setEmail]   = useState('')
  const [pass,    setPass]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const { signIn } = useAuth()
  const navigate   = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, pass)
      navigate('/')
    } catch (err) {
      setError(friendlyError(err.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-screen flex items-center justify-center"
         style={{ background: 'linear-gradient(135deg,#FDFBF4 0%,#F5EED5 50%,#EDE4C2 100%)' }}>
      <div className="bg-white rounded-3xl p-11 w-[400px] border border-[#EDE8DC]"
           style={{ boxShadow: '0 20px 60px rgba(180,150,60,0.18)' }}>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
               style={{ background: 'linear-gradient(135deg,#F0D98C,#C9A84C)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h2 className="font-display text-xl font-bold text-[#2C2A25]">Finance Dashboard</h2>
          <p className="text-xs text-[#A89E8C] mt-1">Sign in to access your dashboard</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#6B6355] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
              required
              className="w-full px-4 py-3 border-[1.5px] border-[#EDE8DC] rounded-xl text-sm outline-none bg-[#FAFAF8] focus:border-[#C9A84C] focus:bg-white transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6B6355] mb-1">Password</label>
            <input
              type="password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              className="w-full px-4 py-3 border-[1.5px] border-[#EDE8DC] rounded-xl text-sm outline-none bg-[#FAFAF8] focus:border-[#C9A84C] focus:bg-white transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all hover:-translate-y-px disabled:opacity-60 disabled:translate-y-0 mt-1"
            style={{ background: 'linear-gradient(135deg,#C9A84C,#9C7A2E)' }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-[11px] text-[#A89E8C] mt-6">
          Your data is stored privately in your own Supabase database.
        </p>
      </div>
    </div>
  )
}

function friendlyError(msg = '') {
  const m = msg.toLowerCase()
  if (m.includes('invalid login') || m.includes('invalid email or password'))
    return 'Incorrect email or password.'
  if (m.includes('email not confirmed'))
    return 'Please confirm your email first — check your inbox.'
  if (m.includes('too many requests') || m.includes('rate limit'))
    return 'Too many attempts. Please wait a minute and try again.'
  return msg
}
