<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const { loggedIn, fetch: fetchSession } = useUserSession()

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const error = ref('')

watch(
  loggedIn,
  async (value) => {
    if (value) {
      await navigateTo('/app', { external: true })
    }
  },
  { immediate: true },
)

async function handleSignup() {
  error.value = ''

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }

  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters'
    return
  }

  isLoading.value = true

  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        name: name.value,
        email: email.value,
        password: password.value,
      },
    })
    await fetchSession()
    await navigateTo('/app', { external: true })
  } catch (e: any) {
    error.value = e.data?.message || 'Failed to create account'
  } finally {
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
          <span class="text-2xl font-bold text-gray-900 dark:text-white">AnnoBib</span>
        </NuxtLink>
        <h1 class="mt-6 text-2xl font-bold text-gray-900 dark:text-white">Create your account</h1>
        <p class="mt-2 text-gray-600 dark:text-gray-400">
          Already have an account?
          <NuxtLink to="/login" class="text-primary-500 hover:text-primary-600"> Sign in </NuxtLink>
        </p>
      </div>

      <UCard>
        <form class="space-y-4" @submit.prevent="handleSignup">
          <UAlert
            v-if="error"
            color="error"
            icon="i-heroicons-exclamation-triangle"
            :title="error"
          />

          <UFormField label="Name">
            <UInput v-model="name" placeholder="Your name" required autofocus class="w-full" />
          </UFormField>

          <UFormField label="Email">
            <UInput
              v-model="email"
              type="email"
              placeholder="you@example.com"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField label="Password">
            <UInput
              v-model="password"
              type="password"
              placeholder="At least 8 characters"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField label="Confirm Password">
            <UInput
              v-model="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              required
              class="w-full"
            />
          </UFormField>

          <UButton type="submit" color="primary" block :loading="isLoading">
            Create Account
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
            icon="i-simple-icons-apple"
            variant="outline"
            color="neutral"
            block
            @click="handleOAuthLogin('apple')"
          >
            Apple
          </UButton>
          <UButton
            icon="i-simple-icons-facebook"
            variant="outline"
            color="neutral"
            block
            @click="handleOAuthLogin('facebook')"
          >
            Facebook
          </UButton>
          <UButton
            icon="i-simple-icons-microsoft"
            variant="outline"
            color="neutral"
            block
            @click="handleOAuthLogin('microsoft')"
          >
            Microsoft
          </UButton>
        </div>

        <p class="mt-6 text-xs text-center text-gray-500 dark:text-gray-400">
          By creating an account, you agree to our
          <NuxtLink to="/terms" class="text-primary-500 hover:underline">Terms of Service</NuxtLink>
          and
          <NuxtLink to="/privacy" class="text-primary-500 hover:underline">Privacy Policy</NuxtLink
          >.
        </p>
      </UCard>
    </div>
  </div>
</template>
