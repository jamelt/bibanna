<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const { hasFeature } = useSubscription()
const { defaultCitationStyle, setDefaultCitationStyle } = useUserPreferences()

const { data: styles, refresh } = await useFetch('/api/citation/styles')

const selectedStyleId = ref(defaultCitationStyle.value)
const showBuilder = ref(false)
const showMobilePreview = ref(false)
const isCreating = ref(false)
const isSavingDefault = ref(false)

const isSelectedDefault = computed(() => selectedStyleId.value === defaultCitationStyle.value)

async function handleSetDefault() {
  isSavingDefault.value = true
  try {
    await setDefaultCitationStyle(selectedStyleId.value)
  }
  catch (error: any) {
    console.error('Failed to set default style:', error)
  }
  finally {
    isSavingDefault.value = false
  }
}

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
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
        class="self-start sm:self-auto shrink-0"
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
        <CitationStylePicker v-model="selectedStyleId" :default-style-id="defaultCitationStyle" />

        <template #footer>
          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <UButton
                v-if="!isSelectedDefault"
                variant="soft"
                color="primary"
                size="sm"
                icon="i-heroicons-star"
                :loading="isSavingDefault"
                @click="handleSetDefault"
              >
                Set as Default
              </UButton>
              <span v-else class="inline-flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400">
                <UIcon name="i-heroicons-star-solid" class="w-4 h-4" />
                Default Style
              </span>
            </div>
            <UButton
              class="lg:hidden w-full"
              variant="soft"
              color="primary"
              icon="i-heroicons-eye"
              @click="showMobilePreview = true"
            >
              Preview Selected Style
            </UButton>
          </div>
        </template>
      </UCard>

      <!-- Preview (desktop only) -->
      <div class="hidden lg:block">
        <CitationPreview :style-id="selectedStyleId" />
      </div>
    </div>

    <!-- Preview (mobile slide-over) -->
    <USlideover v-model:open="showMobilePreview" class="lg:hidden">
      <template #content="{ close }">
        <div class="p-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Citation Preview
            </h3>
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-heroicons-x-mark"
              @click="close"
            />
          </div>
          <CitationPreview :style-id="selectedStyleId" />
        </div>
      </template>
    </USlideover>

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
    <UModal v-model:open="showBuilder" :ui="{ content: 'sm:max-w-3xl' }">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                Create Citation Style
              </h2>
              <UButton
                variant="ghost"
                color="neutral"
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
      </template>
    </UModal>
  </div>
</template>
