import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Learn } from './pages/Learn'
import { Quiz } from './pages/Quiz'
import { Notebook } from './pages/Notebook'
import { Profile } from './pages/Profile'
import { unlockAudio } from './lib/tts'

function App() {
  // 解锁iOS音频（需要用户交互）
  useEffect(() => {
    const handleInteraction = () => {
      unlockAudio()
      // 只需要解锁一次
      document.removeEventListener('touchstart', handleInteraction)
      document.removeEventListener('click', handleInteraction)
    }

    document.addEventListener('touchstart', handleInteraction, { once: true })
    document.addEventListener('click', handleInteraction, { once: true })

    return () => {
      document.removeEventListener('touchstart', handleInteraction)
      document.removeEventListener('click', handleInteraction)
    }
  }, [])
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="learn" element={<Learn />} />
          <Route path="quiz" element={<Quiz />} />
          <Route path="notebook" element={<Notebook />} />
          <Route path="profile" element={<Profile />} />
          <Route path="auth/callback" element={<AuthCallback />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

// Handle OAuth callback
function AuthCallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>登录中...</p>
    </div>
  )
}

export default App
