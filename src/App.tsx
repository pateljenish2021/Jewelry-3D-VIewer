import { useEffect, useState } from 'react'
import './App.css'
import CombinedPage from './pages/CombinedPage'
import CustomizerPage from './pages/CustomizerPage'
import RingViewerPage from './pages/RingViewerPage'

const parsePathRoute = (path: string) => {
  const cleaned = path.split('?')[0]
  return cleaned || '/combined'
}

function App() {
  const [path, setPath] = useState(() => parsePathRoute(window.location.pathname))

  useEffect(() => {
    if (window.location.pathname === '/' || window.location.pathname === '') {
      window.history.replaceState(null, '', '/combined')
    }

    const handler = () => setPath(parsePathRoute(window.location.pathname))
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  switch (path) {
    case '/ring-viewer':
      return <RingViewerPage />
    case '/customizer':
      return <CustomizerPage />
    case '/combined':
    default:
      return <CombinedPage />
  }
}

export default App
