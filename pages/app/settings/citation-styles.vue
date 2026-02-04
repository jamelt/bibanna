<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const { hasFeature } = useSubscription()

const { data: styles, refresh } = await useFetch('/api/citation/styles')

const selectedStyleId = ref('apa-7th')
const showBuilder = ref(false)
const isCreating = ref(false)

async function handleSaveStyle(cslXml: string, config: { name: string; description: string }) {
  isCreating.value = true

  try {
    await $fetch('/api/citation/styles', {
      method: 'POST',
      body: {
        name: config.name,
        description: config.description,
        cslXml,
        isPublic: false,
      },
    })

    showBuilder.value = false
    await refresh()
  }
  catch (error: any) {
    console.error('Failed to save style:', error)
  }
  finally {
    isCreating.value = false
  }
}

async function deleteStyle(styleId: string) {
  if (!confirm('Are you sure you want to delete this citation style?')) return

  try {
    await $fetch(`/api/citation/styles/${styleId}`, {
      method: 'DELETE',
    })
    await refresh()
  }
  catch (error) {
    console.error('Failed to delete style:', error)
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Citation Styles
        </h1>
        <p class="text-gray-500 dark:text-gray-400">
          Choose from 20+ built-in styles or create your own
        </p>
      </div>
      <UButton
        v-if="hasFeature('customCitationStyles')"
        color="primary"
        icon="i-heroicons-plus"
        @click="showBuilder = true"
      >
        Create Custom Style
      </UButton>
    </div>

    <div class="grid lg:grid-cols-2 gap-6">
      <!-- Style Picker -->
      <UCard>
        <template #header>
          <h2 class="font-semibold text-gray-900 dark:text-white">
            Available Styles
          </h2>
        </template>
        <CitationStylePicker v-model="selectedStyleId" />
      </UCard>

      <!-- Preview -->
      <CitationPreview :style-id="selectedStyleId" />
    </div>

    <!-- Custom Styles List -->
    <UCard v-if="styles?.customStyles?.length">
      <template #header>
        <h2 class="font-semibold text-gray-900 dark:text-white">
          My Custom Styles
        </h2>
      </template>

      <div class="divide-y divide-gray-200 dark:divide-gray-700">
        <div
          v-for="style in styles.customStyles"
          :key="style.id"
          class="py-3 flex items-center justify-between"
        >
          <div>
            <p class="font-medium text-gray-900 dark:text-white">
              {{ style.name }}
            </p>
            <p v-if="style.description" class="text-sm text-gray-500">
              {{ style.description }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <UBadge v-if="style.isPublic" color="green" variant="subtle">
              Public
            </UBadge>
            <UButton
              variant="ghost"
              size="sm"
              color="red"
              icon="i-heroicons-trash"
              @click="deleteStyle(style.id)"
            />
          </div>
        </div>
      </div>
    </UCard>

    <!-- Upgrade prompt -->
    <AppUpgradePrompt
      v-if="!hasFeature('customCitationStyles')"
      feature="customCitationStyles"
      required-tier="light"
    >
      Create custom citation styles that match your exact requirements with the Light plan.
    </AppUpgradePrompt>

    <!-- Style Builder Modal -->
    <UModal v-model="showBuilder" :ui="{ width: 'max-w-3xl' }">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              Create Citation Style
            </h2>
            <UButton
              variant="ghost"
              icon="i-heroicons-x-mark"
              @click="showBuilder = false"
            />
          </div>
        </template>

        <CitationStyleBuilder
          @save="handleSaveStyle"
          @cancel="showBuilder = false"
        />
      </UCard>
    </UModal>
  </div>
</template>
