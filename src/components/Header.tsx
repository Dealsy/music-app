import { SidebarTrigger } from '@/components/ui/sidebar'
import { useEffect, useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { User2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'

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
    <header className="sticky top-0 z-40 p-2 flex gap-2 bg-background/80 backdrop-blur border-gray-700 border-b text-black justify-between items-center">
      <SidebarTrigger />
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs">Presentation</span>
          <Switch checked={presentation} onCheckedChange={setPresentation} />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Profile"
              className="text-white"
            >
              <Link to="/profile">
                <User2 className="size-5" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Profile</TooltipContent>
        </Tooltip>
        <Button asChild variant="outline" size="sm" className="text-white">
          <a href="/auth/logout">Logout</a>
        </Button>
      </div>
    </header>
  )
}
