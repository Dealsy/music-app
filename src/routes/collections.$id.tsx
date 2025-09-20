import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/collections/$id')({
  component: CollectionDetail,
})

function CollectionDetail() {
  const qc = useQueryClient()
  const params = Route.useParams()

  const itemsQ = useQuery({
    queryKey: ['collection-items', params.id],
    queryFn: async () =>
      fetch(`/api/collections/${params.id}/items`).then((r) => r.json()),
  })

  return (
    <div className="p-6 grid gap-3">
      <h1 className="text-2xl font-semibold">Collection</h1>
      <div className="grid gap-2">
        {itemsQ.data?.map?.((i: any) => (
          <div
            key={i._id}
            className="p-3 border rounded flex items-center justify-between"
          >
            <div>
              <div className="font-medium">{i.trackId}</div>
              <div className="text-sm opacity-80">{i.trackUri}</div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await fetch(`/api/collections/${params.id}/items`, {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ itemId: i._id }),
                })
                qc.invalidateQueries({
                  queryKey: ['collection-items', params.id],
                })
              }}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
