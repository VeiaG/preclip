import { createContext, useContext, useEffect, useState } from 'react'
import type { Job } from '../../../shared/types'

interface JobsContextValue {
  jobs: Job[]
}

const JobsContext = createContext<JobsContextValue>({ jobs: [] })

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([])

  useEffect(() => {
    window.api.getAllJobs().then(setJobs)

    const cleanupUpdated = window.api.onJobUpdated((updated) => {
      setJobs((prev) => {
        const idx = prev.findIndex((j) => j.id === updated.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = updated
          return next
        }
        return [updated, ...prev]
      })
    })

    const cleanupRemoved = window.api.onJobRemoved((id) => {
      setJobs((prev) => prev.filter((j) => j.id !== id))
    })

    return () => {
      cleanupUpdated()
      cleanupRemoved()
    }
  }, [])

  return <JobsContext.Provider value={{ jobs }}>{children}</JobsContext.Provider>
}

export function useJobs() {
  return useContext(JobsContext)
}
