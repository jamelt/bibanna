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

const selectedStyleName = computed(() => {
  const style = styles.value?.defaultStyles?.find((s: any) => s.id === selectedStyleId.value)
    || styles.value?.customStyles?.find((s: any) => s.id === selectedStyleId.value)
  return style?.shortName || style?.name || selectedStyleId.value
})

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
  <div class="space-y-4">
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Citation Styles
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Choose from 20+ built-in styles or create your own
        </p>
      </div>
      <UButton
        v-if="hasFeature('customCitationStyles')"
        color="primary"
        icon="i-heroicons-plus"
        size="sm"
        class="self-start sm:self-auto shrink-0"
        @click="showBuilder = true"
      >
        Create Custom Style
      </UButton>
    </div>

    <!-- Master-detail layout (desktop) -->
    <div class="hidden lg:block rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900" style="height: calc(100vh - 220px); min-height: 500px;">
      <div class="flex h-full">
        <!-- Left: Style list sidebar -->
        <div class="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0 bg-gray-50/50 dark:bg-gray-800/30">
          <CitationStylePicker
            v-model="selectedStyleId"
            :default-style-id="defaultCitationStyle"
          />

          <!-- Actions footer -->
          <div class="p-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <UButton
              v-if="!isSelectedDefault"
              variant="soft"
              color="primary"
              size="xs"
              icon="i-heroicons-star"
              :loading="isSavingDefault"
              block
              @click="handleSetDefault"
            >
              Set as Default
            </UButton>
            <span v-else class="inline-flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 px-1">
              <UIcon name="i-heroicons-star-solid" class="w-3.5 h-3.5" />
              Default Style
            </span>
          </div>
        </div>

        <!-- Right: Preview panel -->
        <div class="flex flex-col flex-1 min-w-0 bg-gray-100 dark:bg-gray-950/50">
          <CitationPreview :style-id="selectedStyleId" />
        </div>
      </div>
    </div>

    <!-- Mobile layout -->
    <div class="lg:hidden rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900" style="height: calc(100vh - 260px); min-height: 400px;">
      <div class="flex flex-col h-full">
        <CitationStylePicker
          v-model="selectedStyleId"
          :default-style-id="defaultCitationStyle"
        />

        <!-- Mobile actions -->
        <div class="p-3 border-t border-gray-200 dark:border-gray-700 shrink-0 space-y-2">
          <UButton
            variant="soft"
            color="primary"
            size="sm"
            icon="i-heroicons-eye"
            block
            @click="showMobilePreview = true"
          >
            Preview {{ selectedStyleName }}
          </UButton>
          <div class="flex items-center gap-2">
            <UButton
              v-if="!isSelectedDefault"
              variant="outline"
              color="primary"
              size="xs"
              icon="i-heroicons-star"
              :loading="isSavingDefault"
              block
              @click="handleSetDefault"
            >
              Set as Default
            </UButton>
            <span v-else class="inline-flex items-center justify-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 w-full py-1">
              <UIcon name="i-heroicons-star-solid" class="w-3.5 h-3.5" />
              Default Style
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile preview slide-over -->
    <USlideover v-model:open="showMobilePreview" class="lg:hidden">
      <template #content="{ close }">
        <div class="flex flex-col h-full">
          <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">
              {{ selectedStyleName }}
            </h3>
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-heroicons-x-mark"
              size="sm"
              @click="close"
            />
          </div>
          <div class="flex-1 overflow-hidden">
            <CitationPreview :style-id="selectedStyleId" />
          </div>
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
