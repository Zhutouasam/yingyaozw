import { useEffect, useRef } from 'react'

const guards = new Set()
export function confirmNavigation() {
  return (
    ![...guards].some((check) => check()) ||
    window.confirm('有尚未保存的修改，离开后这些修改会丢失。确定离开吗？')
  )
}
export default function useUnsavedChanges(dirty) {
  const current = useRef(dirty)
  current.current = dirty
  useEffect(() => {
    const check = () => current.current
    const beforeUnload = (event) => {
      if (check()) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    guards.add(check)
    window.addEventListener('beforeunload', beforeUnload)
    return () => {
      guards.delete(check)
      window.removeEventListener('beforeunload', beforeUnload)
    }
  }, [])
}
