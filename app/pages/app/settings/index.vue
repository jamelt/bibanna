<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const settingsSections = [
  {
    title: 'Citation Styles',
    description: 'Manage your citation styles and create custom formats',
    icon: 'i-heroicons-document-text',
    to: '/app/settings/citation-styles',
    color: '#4F46E5',
  },
  {
    title: 'Profile',
    description: 'Manage your account information and preferences',
    icon: 'i-heroicons-user',
    to: '/app/settings/profile',
    color: '#10B981',
  },
]
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
      <p class="mt-1 text-gray-500">Manage your account and application preferences</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <NuxtLink
        v-for="section in settingsSections"
        :key="section.to"
        :to="section.to"
        class="group"
      >
        <UCard
          :ui="{ body: { padding: 'p-4' } }"
          class="h-full transition-all hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700"
        >
          <div class="flex items-start gap-4">
            <div
              class="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
              :style="{ backgroundColor: section.color + '20' }"
            >
              <UIcon :name="section.icon" class="w-6 h-6" :style="{ color: section.color }" />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-medium text-gray-900 dark:text-white group-hover:text-primary-600">
                {{ section.title }}
              </h3>
              <p class="text-sm text-gray-500 mt-1">
                {{ section.description }}
              </p>
            </div>
            <UIcon
              name="i-heroicons-chevron-right"
              class="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors shrink-0 mt-1"
            />
          </div>
        </UCard>
      </NuxtLink>
    </div>
  </div>
</template>
