import { useState, useEffect } from 'react'
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { apiClient } from './services/api'
import { I18nProvider } from './i18n/I18nContext'
import Navigation from './components/Navigation'
import ErrorBoundary from './components/ErrorBoundary'
import Home from './pages/Home'
import RouteSelection from './pages/Routes'
import Session from './pages/Session'

function App() {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await apiClient.get('/health')
        setIsConnected(true)
        console.log('✅ Backend connected:', response.data)
      } catch (err) {
        setIsConnected(false)
        console.error('❌ Backend offline:', err.message)
      }
    }

    checkBackend()
    const interval = setInterval(checkBackend, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <ErrorBoundary>
      <I18nProvider>
        <BrowserRouter>
          <div className="app">
            <Navigation isConnected={isConnected} />
            <main className="app-main">
              <RouterRoutes>
                <Route path="/" element={<Home />} />
                <Route path="/routes" element={<RouteSelection />} />
                <Route path="/session/:sessionId" element={<Session />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </RouterRoutes>
            </main>
          </div>
        </BrowserRouter>
      </I18nProvider>
    </ErrorBoundary>
  )
}

export default App
