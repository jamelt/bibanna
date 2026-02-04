<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const route = useRoute()
const { loggedIn } = useUserSession()

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const error = ref('')

const redirectTo = computed(() => (route.query.redirect as string) || '/app')

watch(loggedIn, (value) => {
  if (value) {
    navigateTo(redirectTo.value)
  }
}, { immediate: true })

async function handleLogin() {
  error.value = ''
  isLoading.value = true

  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })
    await navigateTo(redirectTo.value)
  }
  catch (e: any) {
    error.value = e.data?.message || 'Invalid email or password'
  }
  finally {
    isLoading.value = false
  }
}

async function handleOAuthLogin(provider: string) {
  await navigateTo(`/api/auth/${provider}`, { external: true })
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <NuxtLink to="/" class="inline-flex items-center gap-2">
          <UIcon name="i-heroicons-book-open" class="w-10 h-10 text-primary-500" />
          <span class="text-2xl font-bold text-gray-900 dark:text-white">Bibanna</span>
        </NuxtLink>
        <h1 class="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
          Sign in to your account
        </h1>
        <p class="mt-2 text-gray-600 dark:text-gray-400">
          Or
          <NuxtLink to="/signup" class="text-primary-500 hover:text-primary-600">
            create a new account
          </NuxtLink>
        </p>
      </div>

      <UCard>
        <form class="space-y-4" @submit.prevent="handleLogin">
          <UAlert
            v-if="error"
            color="error"
            icon="i-heroicons-exclamation-triangle"
            :title="error"
          />

          <UFormField label="Email">
            <UInput
              v-model="email"
              type="email"
              placeholder="you@example.com"
              required
              autofocus
            />
          </UFormField>

          <UFormField label="Password">
            <UInput
              v-model="password"
              type="password"
              placeholder="Enter your password"
              required
            />
          </UFormField>

          <div class="flex items-center justify-between">
            <UCheckbox label="Remember me" />
            <NuxtLink to="/forgot-password" class="text-sm text-primary-500 hover:text-primary-600">
              Forgot password?
            </NuxtLink>
          </div>

          <UButton
            type="submit"
            color="primary"
            block
            :loading="isLoading"
          >
            Sign in
          </UButton>
        </form>

        <USeparator label="or continue with" class="my-6" />

        <div class="space-y-3">
          <UButton
            icon="i-simple-icons-google"
            variant="outline"
            color="neutral"
            block
            @click="handleOAuthLogin('google')"
          >
            Google
          </UButton>
          <UButton
            icon="i-simple-icons-github"
            variant="outline"
            color="neutral"
            block
            @click="handleOAuthLogin('github')"
          >
            GitHub
          </UButton>
        </div>
      </UCard>
    </div>
  </div>
</template>
