import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bunker Online',
  description: 'The multiplayer social deduction game — survive the apocalypse together',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-slate-100 antialiased">
        {/* Global nav bar */}
        <header className="border-b border-slate-800 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 group">
              <span className="text-2xl">☢️</span>
              <span className="text-lg font-black tracking-tight text-white group-hover:text-amber-400 transition-colors">
                BUNKER
                <span className="text-amber-500"> ONLINE</span>
              </span>
            </a>
            <span className="text-xs text-slate-500 font-mono">SURVIVAL PROTOCOL v1.0</span>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
