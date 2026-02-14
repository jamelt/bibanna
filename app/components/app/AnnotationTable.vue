<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { AnnotationType } from '~/shared/types'
import { ANNOTATION_TYPE_LABELS } from '~/shared/types'

interface AnnotationRow {
  id: string
  entryId: string
  content: string
  annotationType: string
  createdAt: string | Date
  updatedAt: string | Date
  entryTitle: string
  entryAuthors: any[]
  entryYear: number | null
  entryType: string
}

const props = withDefaults(
  defineProps<{
    data: AnnotationRow[]
    loading?: boolean
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }>(),
  {
    loading: false,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  },
)

const emit = defineEmits<{
  'update:sortBy': [field: string]
  'update:sortOrder': [order: 'asc' | 'desc']
  edit: [annotation: AnnotationRow]
}>()

const router = useRouter()

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UIcon = resolveComponent('UIcon')

const typeColorMap: Record<string, string> = {
  descriptive: 'info',
  evaluative: 'warning',
  reflective: 'success',
  summary: 'neutral',
  critical: 'error',
  custom: 'neutral',
}

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

function truncateContent(content: string, maxLength = 120) {
  const stripped = content
    .replace(/[#*_~`>\-[\]()]/g, '')
    .replace(/\n+/g, ' ')
    .trim()
  if (stripped.length <= maxLength) return stripped
  return stripped.slice(0, maxLength).trim() + '...'
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

function navigateToEntry(entryId: string) {
  router.push(`/app/library/${entryId}`)
}

const columns = computed<TableColumn<AnnotationRow>[]>(() => [
  {
    accessorKey: 'entryTitle',
    header: () => sortHeader('Source', 'entryTitle'),
    cell: ({ row }) => {
      const a = row.original
      return h('div', { class: 'min-w-0' }, [
        h(
          'p',
          {
            class:
              'font-medium text-gray-900 dark:text-white truncate max-w-xs cursor-pointer hover:text-primary-600 dark:hover:text-primary-400',
            title: a.entryTitle,
            onClick: (e: Event) => {
              e.stopPropagation()
              navigateToEntry(a.entryId)
            },
          },
          a.entryTitle,
        ),
        h(
          'p',
          {
            class: 'text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs mt-0.5',
          },
          `${formatAuthors(a.entryAuthors)}${a.entryYear ? ` · ${a.entryYear}` : ''}`,
        ),
      ])
    },
    meta: {
      class: {
        td: 'max-w-xs',
      },
    },
  },
  {
    id: 'content',
    header: 'Annotation',
    cell: ({ row }) => {
      return h(
        'span',
        {
          class: 'text-sm text-gray-600 dark:text-gray-400 line-clamp-2 max-w-md',
          title: row.original.content
            .replace(/[#*_~`>\-[\]()]/g, '')
            .replace(/\n+/g, ' ')
            .trim(),
        },
        truncateContent(row.original.content),
      )
    },
  },
  {
    accessorKey: 'annotationType',
    header: () => sortHeader('Type', 'annotationType'),
    cell: ({ row }) => {
      const type = row.original.annotationType
      return h(
        UBadge,
        {
          color: typeColorMap[type] || 'neutral',
          variant: 'subtle',
          size: 'xs',
          class: 'whitespace-nowrap',
        },
        () => ANNOTATION_TYPE_LABELS[type as AnnotationType] || type,
      )
    },
  },
  {
    id: 'entryYear',
    header: () => sortHeader('Year', 'entryYear'),
    cell: ({ row }) => {
      const year = row.original.entryYear
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
  },
  {
    id: 'updatedAt',
    header: () => sortHeader('Updated', 'updatedAt'),
    cell: ({ row }) => {
      return h(
        'span',
        {
          class: 'text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap',
        },
        formatDate(row.original.updatedAt),
      )
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      return h(UButton, {
        icon: 'i-heroicons-pencil',
        variant: 'ghost',
        color: 'neutral',
        size: 'xs',
        class: 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
        'aria-label': 'Edit annotation',
        onClick: (e: Event) => {
          e.stopPropagation()
          emit('edit', row.original)
        },
      })
    },
    meta: {
      class: {
        th: 'w-10',
        td: 'w-10',
      },
    },
  },
])

function handleRowSelect(row: any) {
  const annotation = row?.original ?? row
  if (annotation?.entryId) {
    navigateToEntry(annotation.entryId)
  }
}
</script>

<template>
  <UTable
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
          name="i-heroicons-pencil-square"
          class="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600"
        />
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">No annotations found</p>
      </div>
    </template>
  </UTable>
</template>
