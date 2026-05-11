export default function SetupPage() {
  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-6"
         style={{ background: 'linear-gradient(135deg,#FDFBF4 0%,#F5EED5 50%,#EDE4C2 100%)' }}>
      <div className="bg-white rounded-3xl p-10 max-w-xl w-full border border-[#EDE8DC]"
           style={{ boxShadow: '0 20px 60px rgba(180,150,60,0.18)' }}>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
               style={{ background: 'linear-gradient(135deg,#F0D98C,#C9A84C)' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-[#2C2A25]">Finance Dashboard</h1>
          <p className="text-sm text-[#A89E8C] mt-1">One-time setup — takes about 2 minutes</p>
        </div>

        <div className="flex flex-col gap-5">
          <Step number="1" title="Create a free Supabase project">
            <p className="text-sm text-[#6B6355]">
              Go to{' '}
              <a href="https://supabase.com" target="_blank" rel="noreferrer"
                 className="text-[#9C7A2E] font-semibold underline">supabase.com</a>
              {' '}→ New Project → choose a name → wait ~1 min.
            </p>
          </Step>

          <Step number="2" title="Run the database setup SQL">
            <p className="text-sm text-[#6B6355] mb-2">
              In your Supabase project → <strong>SQL Editor</strong> → paste and run:
            </p>
            <CodeBlock>SUPABASE_SETUP.sql</CodeBlock>
            <p className="text-xs text-[#A89E8C] mt-2">
              This creates your tables, security rules, and your login account automatically.
            </p>
          </Step>

          <Step number="3" title="Add your credentials to .env">
            <p className="text-sm text-[#6B6355] mb-2">
              Supabase → <strong>Project Settings → API</strong> → copy into <code className="bg-[#FAF3DC] px-1.5 py-0.5 rounded text-xs text-[#9C7A2E]">.env</code>:
            </p>
            <CodeBlock>{`VITE_SUPABASE_URL=https://xxxx.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJ...`}</CodeBlock>
          </Step>

          <Step number="4" title="Restart and sign in">
            <CodeBlock>npm run dev</CodeBlock>
            <div className="mt-3 bg-[#FAF3DC] rounded-xl border border-[#F0D98C] px-4 py-3">
              <p className="text-xs font-bold text-[#9C7A2E] mb-1">Your login credentials:</p>
              <p className="text-sm text-[#2C2A25]">📧 Email: <strong>jeeva@finance.app</strong></p>
              <p className="text-sm text-[#2C2A25]">🔑 Password: <strong>JEEVA123</strong></p>
            </div>
          </Step>
        </div>

        <div className="mt-8 p-4 bg-[#FAF3DC] rounded-xl border border-[#F0D98C] text-center">
          <p className="text-xs text-[#9C7A2E] font-medium">
            🔒 All your financial data is stored privately in <strong>your own</strong> Supabase database.
          </p>
        </div>
      </div>
    </div>
  )
}

function Step({ number, title, children }) {
  return (
    <div className="flex gap-4">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white mt-0.5"
           style={{ background: 'linear-gradient(135deg,#C9A84C,#9C7A2E)' }}>
        {number}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-[#2C2A25] mb-1.5">{title}</h3>
        {children}
      </div>
    </div>
  )
}

function CodeBlock({ children }) {
  return (
    <pre className="bg-[#2C2A25] text-[#F0D98C] rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
      {children}
    </pre>
  )
}
