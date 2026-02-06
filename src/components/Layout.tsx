import { NavLink, Outlet } from 'react-router-dom'
import { Home, BookOpen, ClipboardCheck, Bookmark, User } from 'lucide-react'

const navItems = [
  { to: '/', icon: Home, label: '首页', emoji: '🏠' },
  { to: '/learn', icon: BookOpen, label: '学习', emoji: '📚' },
  { to: '/quiz', icon: ClipboardCheck, label: '测验', emoji: '🎮' },
  { to: '/notebook', icon: Bookmark, label: '单词本', emoji: '📓' },
  { to: '/profile', icon: User, label: '我的', emoji: '👤' }
]

export function Layout() {
  return (
    <div className="flex flex-col min-h-screen min-h-dvh">
      <main className="flex-1 overflow-y-auto pb-20 safe-area-top">
        <Outlet />
      </main>

      {/* 怪奇物语风格底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0a0a] to-[#1a1a1a] border-t border-red-900/30 safe-area-bottom">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-4 py-2 transition-all duration-300 ${
                  isActive
                    ? 'text-[var(--color-neon-red)] scale-110'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`relative ${isActive ? 'drop-shadow-[0_0_8px_var(--color-neon-red)]' : ''}`}>
                    <Icon size={22} />
                    {isActive && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--color-neon-red)] rounded-full animate-pulse" />
                    )}
                  </div>
                  <span className={`text-xs ${isActive ? 'font-medium' : ''}`}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
