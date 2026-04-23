import { useState, useEffect, useCallback } from 'react'
import { fetchAll, fetchSettings } from '../lib/db'

export function useRecords(user) {
  const [records,  setRecords]  = useState([])
  const [settings, setSettings] = useState({ limit: 10000, due_day: 15, email: '' })
  const [loading,  setLoading]  = useState(true)

  const reload = useCallback(async () => {
    if (!user) return
    try {
      const [recs, cfg] = await Promise.all([fetchAll(), fetchSettings()])
      setRecords(recs)
      setSettings(cfg)
    } catch (e) {
      console.error('reload error', e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { reload() }, [reload])

  return { records, settings, setSettings, reload, loading }
}
