<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const { user } = useAuth()
const toast = useToast()

const isSubmitting = ref(false)

const form = reactive({
  name: '',
  email: '',
})

watch(
  user,
  (u) => {
    if (u) {
      form.name = (u as any).name || ''
      form.email = (u as any).email || ''
    }
  },
  { immediate: true },
)

async function handleSubmit() {
  isSubmitting.value = true

  try {
    await $fetch('/api/auth/profile', {
      method: 'PUT',
      body: {
        name: form.name,
      },
    })

    toast.add({
      title: 'Profile updated',
      color: 'success',
    })
  } catch (e: any) {
    toast.add({
      title: 'Failed to update profile',
      description: e.data?.message || 'An error occurred',
      color: 'error',
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-2 text-sm text-gray-500">
      <NuxtLink to="/app/settings" class="hover:text-gray-700 dark:hover:text-gray-300">
        Settings
      </NuxtLink>
      <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
      <span class="text-gray-900 dark:text-white">Profile</span>
    </nav>

    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
      <p class="mt-1 text-gray-500">Manage your account information</p>
    </div>

    <UCard class="max-w-2xl">
      <form class="space-y-6" @submit.prevent="handleSubmit">
        <UFormField label="Name">
          <UInput v-model="form.name" placeholder="Your name" />
        </UFormField>

        <UFormField label="Email">
          <UInput
            v-model="form.email"
            type="email"
            disabled
            :ui="{ base: 'cursor-not-allowed opacity-60' }"
          />
          <template #hint>
            <span class="text-xs text-gray-400"> Email cannot be changed </span>
          </template>
        </UFormField>

        <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
          <UButton type="submit" color="primary" :loading="isSubmitting"> Save Changes </UButton>
        </div>
      </form>
    </UCard>

    <!-- Danger Zone -->
    <UCard class="max-w-2xl border-red-200 dark:border-red-900">
      <template #header>
        <h3 class="text-lg font-medium text-red-600 dark:text-red-400">Danger Zone</h3>
      </template>

      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-900 dark:text-white">Delete Account</p>
            <p class="text-sm text-gray-500">
              Permanently delete your account and all associated data
            </p>
          </div>
          <UButton color="error" variant="outline" disabled> Delete Account </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>
