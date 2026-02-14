<script setup lang="ts">
import { getAllPlansForDisplay } from '~/shared/subscriptions'

definePageMeta({
  layout: 'app',
  middleware: 'admin',
})

const { data: flagsData, pending } = useFetch('/api/admin/feature-flags')

const allPlans = getAllPlansForDisplay()

function flagNames() {
  if (!flagsData.value) return []
  return Object.keys(flagsData.value.flags)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Feature Flags</h1>
      <UBadge
        :color="flagsData?.unleashConfigured ? 'success' : 'warning'"
        variant="subtle"
        size="sm"
      >
        {{ flagsData?.unleashConfigured ? 'Unleash Connected' : 'Using Defaults' }}
      </UBadge>
    </div>

    <p class="text-sm text-gray-500 dark:text-gray-400">
      View all feature flags and their state across subscription tiers.
      {{
        flagsData?.unleashConfigured
          ? 'Flags are managed via Unleash.'
          : 'Unleash is not configured. Showing hardcoded defaults.'
      }}
    </p>

    <UCard>
      <div v-if="pending" class="space-y-3">
        <USkeleton v-for="i in 10" :key="i" class="h-10 rounded" />
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr
              class="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700"
            >
              <th class="pb-3 font-medium">Flag Name</th>
              <th class="pb-3 font-medium text-center">Default</th>
              <th v-for="plan in allPlans" :key="plan.id" class="pb-3 font-medium text-center">
                <span :class="plan.ui.textClass">{{ plan.name }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="name in flagNames()"
              :key="name"
              class="border-b border-gray-100 dark:border-gray-800/50"
            >
              <td class="py-3">
                <code class="text-sm text-gray-700 dark:text-gray-300">{{ name }}</code>
              </td>
              <td class="py-3 text-center">
                <UIcon
                  :name="
                    flagsData?.flags[name] ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'
                  "
                  class="w-5 h-5"
                  :class="
                    flagsData?.flags[name] ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'
                  "
                />
              </td>
              <td v-for="plan in allPlans" :key="plan.id" class="py-3 text-center">
                <UIcon
                  :name="
                    flagsData?.flagsByTier[plan.id]?.[name]
                      ? 'i-heroicons-check-circle'
                      : 'i-heroicons-x-circle'
                  "
                  class="w-5 h-5"
                  :class="
                    flagsData?.flagsByTier[plan.id]?.[name]
                      ? 'text-green-500'
                      : 'text-gray-300 dark:text-gray-600'
                  "
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">Legend</h2>
      </template>
      <div class="flex gap-6 text-sm">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-green-500" />
          <span class="text-gray-500 dark:text-gray-400">Enabled</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-x-circle" class="w-5 h-5 text-gray-300 dark:text-gray-600" />
          <span class="text-gray-500 dark:text-gray-400">Disabled</span>
        </div>
      </div>
    </UCard>
  </div>
</template>
