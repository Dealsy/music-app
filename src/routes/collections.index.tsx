import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useForm } from '@tanstack/react-form'

export const Route = createFileRoute('/collections/')({
  component: CollectionsPage,
})

function CollectionsPage() {
  const qc = useQueryClient()
  const listQ = useQuery({
    queryKey: ['collections-list'],
    queryFn: async () => fetch('/api/collections').then((r) => r.json()),
  })

  const createMut = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Create failed')
      return res.json()
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['collections-list'] }),
  })

  const form = useForm({
    defaultValues: { name: '' },
    onSubmit: ({ value, formApi }) => {
      createMut.mutate(value.name)
      formApi.reset()
    },
  })

  return (
    <div className="p-6 grid gap-4">
      <h1 className="text-2xl font-semibold">Collections</h1>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <form.Field
          name="name"
          children={(field) => (
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="New collection name"
              className="w-64"
            />
          )}
        />
        <Button type="submit">Create</Button>
      </form>

      <div className="grid gap-2">
        {listQ.data?.map?.((c: any) => (
          <div
            key={c._id}
            className="p-3 border rounded flex items-center justify-between"
          >
            <a className="underline" href={`/collections/${c._id}`}>
              {c.name}
            </a>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await fetch(`/api/collections/${c._id}`, { method: 'DELETE' })
                qc.invalidateQueries({ queryKey: ['collections-list'] })
              }}
            >
              Delete
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
