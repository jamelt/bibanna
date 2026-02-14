<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { ENTRY_TYPE_LABELS } from '~/shared/types'
import type { Entry, Tag } from '~/shared/types'

type EntryRow = Entry & {
  annotationCount?: number
}

const props = withDefaults(
  defineProps<{
    data: EntryRow[]
    loading?: boolean
    selectable?: boolean
    showProjectColumn?: boolean
    projectId?: string
    tags?: Tag[]
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }>(),
  {
    loading: false,
    selectable: true,
    showProjectColumn: false,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
)

const emit = defineEmits<{
  'update:selectedIds': [ids: string[]]
  'update:sortBy': [field: string]
  'update:sortOrder': [order: 'asc' | 'desc']
  'remove-from-project': [entryId: string]
  'tag-click': [tagId: string]
  refresh: []
}>()

const router = useRouter()
const toast = useToast()

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UIcon = resolveComponent('UIcon')
const UCheckbox = resolveComponent('UCheckbox')
const AppEntryTagCell = resolveComponent('AppEntryTagCell')

const rowSelection = ref<Record<string, boolean>>({})

const selectedIds = computed(() => {
  return props.data.filter((_, index) => rowSelection.value[index]).map((entry) => entry.id)
})

watch(selectedIds, (ids) => {
  emit('update:selectedIds', ids)
})

function formatAuthors(authors: any[] | null) {
  if (!authors || authors.length === 0) return 'Unknown'
  if (authors.length === 1) {
    return `${authors[0].lastName}, ${authors[0].firstName}`
  }
  if (authors.length === 2) {
    return `${authors[0].lastName} & ${authors[1].lastName}`
  }
  return `${authors[0].lastName} et al.`
}

function formatDate(date: Date | string) {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function handleSort(field: string) {
  if (props.sortBy === field) {
    emit('update:sortOrder', props.sortOrder === 'asc' ? 'desc' : 'asc')
  } else {
    emit('update:sortBy', field)
    emit('update:sortOrder', 'asc')
  }
}

function sortHeader(label: string, field: string) {
  const isActive = props.sortBy === field
  const icon = isActive
    ? props.sortOrder === 'asc'
      ? 'i-heroicons-chevron-up'
      : 'i-heroicons-chevron-down'
    : 'i-heroicons-chevron-up-down'

  return h(
    'button',
    {
      class:
        'flex items-center gap-1 text-left font-medium hover:text-gray-900 dark:hover:text-white transition-colors',
      onClick: () => handleSort(field),
    },
    [
      label,
      h(UIcon, {
        name: icon,
        class: `w-3.5 h-3.5 ${isActive ? 'text-primary-500' : 'text-gray-400'}`,
      }),
    ],
  )
}

async function toggleFavorite(entry: EntryRow) {
  try {
    await $fetch(`/api/entries/${entry.id}`, {
      method: 'PUT',
      body: { isFavorite: !entry.isFavorite },
    })
    emit('refresh')
  } catch {
    toast.add({
      title: 'Failed to update entry',
      color: 'error',
    })
  }
}

function navigateToEntry(entryId: string) {
  router.push(`/app/library/${entryId}`)
}

function getRowActions(entry: EntryRow) {
  const items: any[][] = [
    [
      {
        label: 'View Details',
        icon: 'i-heroicons-eye',
        onSelect: () => navigateToEntry(entry.id),
      },
    ],
  ]

  if (props.projectId) {
    items.push([
      {
        label: 'Remove from Project',
        icon: 'i-heroicons-x-mark',
        onSelect: () => emit('remove-from-project', entry.id),
      },
    ])
  }

  items.push([
    {
      label: 'Delete',
      icon: 'i-heroicons-trash',
      color: 'error',
      onSelect: async () => {
        try {
          await $fetch(`/api/entries/${entry.id}`, { method: 'DELETE' })
          toast.add({ title: 'Entry deleted', color: 'success' })
          emit('refresh')
        } catch {
          toast.add({ title: 'Failed to delete', color: 'error' })
        }
      },
    },
  ])

  return items
}

const columns = computed(() => {
  const cols: TableColumn<EntryRow>[] = []

  if (props.selectable) {
    cols.push({
      id: 'select',
      header: ({ table }) =>
        h(UCheckbox, {
          modelValue: table.getIsSomePageRowsSelected()
            ? 'indeterminate'
            : table.getIsAllPageRowsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
            table.toggleAllPageRowsSelected(!!value),
          'aria-label': 'Select all',
        }),
      cell: ({ row }) =>
        h(UCheckbox, {
          modelValue: row.getIsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
          'aria-label': 'Select row',
          onClick: (e: Event) => e.stopPropagation(),
        }),
      meta: {
        class: {
          th: 'w-10',
          td: 'w-10',
        },
      },
    })
  }

  cols.push({
    id: 'favorite',
    header: '',
    cell: ({ row }) => {
      const entry = row.original
      return h(UButton, {
        icon: entry.isFavorite ? 'i-heroicons-star-solid' : 'i-heroicons-star',
        variant: 'ghost',
        color: 'neutral',
        size: 'xs',
        class: entry.isFavorite ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-400',
        'aria-label': entry.isFavorite ? 'Unfavorite' : 'Favorite',
        onClick: (e: Event) => {
          e.stopPropagation()
          toggleFavorite(entry)
        },
      })
    },
    meta: {
      class: {
        th: 'w-10',
        td: 'w-10',
      },
    },
  })

  cols.push({
    accessorKey: 'title',
    header: () => sortHeader('Title', 'title'),
    cell: ({ row }) => {
      const entry = row.original
      return h('div', { class: 'min-w-0' }, [
        h(
          'p',
          {
            class:
              'font-medium text-gray-900 dark:text-white truncate max-w-xs cursor-pointer hover:text-primary-600 dark:hover:text-primary-400',
            title: entry.title,
            onClick: (e: Event) => {
              e.stopPropagation()
              navigateToEntry(entry.id)
            },
          },
          entry.title,
        ),
      ])
    },
    meta: {
      class: {
        td: 'max-w-xs',
      },
    },
  })

  cols.push({
    id: 'authors',
    header: () => sortHeader('Authors', 'author'),
    cell: ({ row }) => {
      return h(
        'span',
        {
          class: 'text-sm text-gray-600 dark:text-gray-400 truncate block max-w-[200px]',
          title: formatAuthors(row.original.authors ?? []),
        },
        formatAuthors(row.original.authors ?? []),
      )
    },
  })

  cols.push({
    accessorKey: 'year',
    header: () => sortHeader('Year', 'year'),
    cell: ({ row }) => {
      const year = row.original.year
      return h(
        'span',
        {
          class: 'text-sm text-gray-600 dark:text-gray-400 tabular-nums',
        },
        year ? String(year) : 'n.d.',
      )
    },
    meta: {
      class: {
        th: 'w-20',
        td: 'w-20',
      },
    },
  })

  cols.push({
    accessorKey: 'entryType',
    header: 'Type',
    cell: ({ row }) => {
      const label = ENTRY_TYPE_LABELS[row.original.entryType as keyof typeof ENTRY_TYPE_LABELS]
      return h(
        UBadge,
        {
          variant: 'subtle',
          size: 'xs',
          class: 'whitespace-nowrap',
        },
        () => label || row.original.entryType,
      )
    },
  })

  cols.push({
    id: 'tags',
    header: 'Tags',
    cell: ({ row }) => {
      return h(AppEntryTagCell, {
        entryId: row.original.id,
        entryTags: row.original.tags ?? [],
        'onTag-click': (tagId: string) => emit('tag-click', tagId),
        onUpdated: () => emit('refresh'),
      })
    },
  })

  if (props.showProjectColumn) {
    cols.push({
      id: 'projects',
      header: 'Projects',
      cell: ({ row }) => {
        const entryProjects = row.original.projects ?? []
        if (entryProjects.length === 0) {
          return h('span', { class: 'text-xs text-gray-400' }, '—')
        }
        const visible = entryProjects.slice(0, 2)
        const overflow = entryProjects.length - 2

        const children = visible.map((project) =>
          h(
            'span',
            {
              key: project.id,
              class:
                'inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
            },
            project.name,
          ),
        )

        if (overflow > 0) {
          children.push(h('span', { class: 'text-xs text-gray-400' }, `+${overflow}`))
        }

        return h('div', { class: 'flex items-center gap-1 flex-wrap' }, children)
      },
    })
  }

  cols.push({
    id: 'annotations',
    header: '',
    cell: ({ row }) => {
      const count = row.original.annotationCount ?? 0
      if (count === 0) return null
      return h('div', { class: 'flex items-center gap-1 text-sm text-gray-400' }, [
        h(UIcon, { name: 'i-heroicons-pencil-square', class: 'w-3.5 h-3.5' }),
        h('span', { class: 'tabular-nums' }, String(count)),
      ])
    },
    meta: {
      class: {
        th: 'w-16',
        td: 'w-16',
      },
    },
  })

  cols.push({
    id: 'createdAt',
    header: () => sortHeader('Added', 'createdAt'),
    cell: ({ row }) => {
      return h(
        'span',
        {
          class: 'text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap',
        },
        formatDate(row.original.createdAt),
      )
    },
  })

  cols.push({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      return h(
        UDropdownMenu,
        {
          content: { align: 'end' },
          items: getRowActions(row.original),
          'aria-label': 'Row actions',
        },
        () =>
          h(UButton, {
            icon: 'i-heroicons-ellipsis-vertical',
            color: 'neutral',
            variant: 'ghost',
            size: 'xs',
            'aria-label': 'Actions',
            onClick: (e: Event) => e.stopPropagation(),
          }),
      )
    },
    meta: {
      class: {
        th: 'w-10',
        td: 'w-10 text-right',
      },
    },
  })

  return cols
})

function handleRowSelect(row: any) {
  const entry = row?.original ?? row
  if (entry?.id) {
    navigateToEntry(entry.id)
  }
}
</script>

<template>
  <UTable
    v-model:row-selection="rowSelection"
    :data="data"
    :columns="columns"
    :loading="loading"
    sticky
    class="w-full"
    :ui="{
      root: 'min-w-full',
      tr: 'group/row hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors',
      td: 'py-2.5 px-3 text-sm',
      th: 'py-2.5 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
    }"
    @select="handleRowSelect"
  >
    <template #empty>
      <div class="text-center py-8">
        <UIcon
          name="i-heroicons-book-open"
          class="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600"
        />
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">No entries found</p>
      </div>
    </template>
  </UTable>
</template>
