import { SidebarTrigger } from '@/components/ui/sidebar'
import { useEffect, useState } from 'react'
import { Switch } from '@/components/ui/switch'

export default function Header() {
  const [presentation, setPresentation] = useState(false)
  useEffect(() => {
    const saved = localStorage.getItem('presentation') === 'true'
    setPresentation(saved)
    document.body.dataset.presentation = saved ? 'true' : 'false'
  }, [])
  useEffect(() => {
    localStorage.setItem('presentation', presentation ? 'true' : 'false')
    document.body.dataset.presentation = presentation ? 'true' : 'false'
  }, [presentation])
  return (
    <header className="p-2 flex gap-2 bg-background border-gray-700 border-b text-black justify-between items-center">
      <SidebarTrigger />
      <div className="flex items-center gap-2">
        <span className="text-xs">Presentation</span>
        <Switch checked={presentation} onCheckedChange={setPresentation} />
      </div>
    </header>
  )
}
