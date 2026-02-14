<script setup lang="ts">
import { getTier, getDisplayPrice, type SubscriptionTier } from '~/shared/subscriptions'

const props = defineProps<{
  feature: string
  requiredTier: SubscriptionTier
  inline?: boolean
}>()

const { tier, hasFeature, startCheckout } = useSubscription()

const isVisible = computed(() => !hasFeature(props.feature))

const isLoading = ref(false)

async function handleUpgrade() {
  isLoading.value = true
  try {
    await startCheckout(props.requiredTier)
  } finally {
    isLoading.value = false
  }
}

const plan = computed(() => getTier(props.requiredTier))
const price = computed(() => getDisplayPrice(props.requiredTier, 'monthly'))
</script>

<template>
  <div v-if="isVisible">
    <!-- Inline version -->
    <div v-if="inline" class="flex items-center gap-2 text-sm text-gray-500">
      <UIcon name="i-heroicons-lock-closed" class="w-4 h-4" />
      <span>Requires {{ plan.name }}</span>
      <UButton
        size="xs"
        :color="plan.ui.color"
        variant="link"
        :loading="isLoading"
        @click="handleUpgrade"
      >
        Upgrade
      </UButton>
    </div>

    <!-- Full card version -->
    <UCard v-else :ui="{ body: { padding: 'p-4' } }">
      <div class="flex items-start gap-4">
        <div
          class="shrink-0 w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center"
        >
          <UIcon name="i-heroicons-lock-closed" class="w-5 h-5 text-primary-500" />
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="font-medium text-gray-900 dark:text-white">Upgrade to {{ plan.name }}</h3>
          <p class="text-sm text-gray-500 mt-1">
            <slot>This feature is available on the {{ plan.name }} plan.</slot>
          </p>
          <div class="flex items-center gap-3 mt-3">
            <UButton :color="plan.ui.color" size="sm" :loading="isLoading" @click="handleUpgrade">
              Upgrade for {{ price }}/month
            </UButton>
            <NuxtLink to="/app/subscription" class="text-sm text-gray-500 hover:text-gray-700">
              Compare plans
            </NuxtLink>
          </div>
        </div>
      </div>
    </UCard>
  </div>

  <!-- Feature is available, render slot -->
  <slot v-else name="content" />
</template>
