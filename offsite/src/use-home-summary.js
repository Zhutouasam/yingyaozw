import { useCallback, useEffect, useRef, useState } from 'react'

export default function useHomeSummary() {
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true)
  const active = useRef(null),
    mounted = useRef(false)
  const refresh = useCallback(async () => {
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    const timeout = setTimeout(() => controller.abort(), 10000)
    setLoading(true)
    try {
      const response = await fetch('/api/home', { cache: 'no-store', signal: controller.signal })
      if (!response.ok) throw new Error()
      const result = await response.json()
      if (mounted.current && active.current === controller) {
        setData(result)
        setError('')
      }
    } catch {
      if (mounted.current && active.current === controller) setError('信息暂时未能更新，请重试。')
    } finally {
      clearTimeout(timeout)
      if (mounted.current && active.current === controller) setLoading(false)
    }
  }, [])
  useEffect(() => {
    mounted.current = true
    refresh()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    const onStorage = (event) => {
      if (event.key === 'yingyao-catalog-updated') refresh()
    }
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      mounted.current = false
      active.current?.abort()
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [refresh])
  return { data, error, loading, refresh }
}
