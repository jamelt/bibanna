<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const route = useRoute()

const {
  tier,
  subscription,
  limits,
  products,
  isFree,
  isPaid,
  isCanceled,
  periodEnd,
  pending,
  startCheckout,
  openPortal,
  refresh,
} = useSubscription()

const billingInterval = ref<'month' | 'year'>('month')
const isCheckoutLoading = ref(false)
const checkoutTier = ref<'light' | 'pro' | null>(null)

const showSuccessToast = computed(() => route.query.success === 'true')
const showCanceledToast = computed(() => route.query.canceled === 'true')

onMounted(() => {
  if (showSuccessToast.value || showCanceledToast.value) {
    refresh()
    const router = useRouter()
    router.replace({ query: {} })
  }
})

const tiers = computed(() => {
  if (!products.value) return []

  return [
    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for getting started',
      priceMonthly: 0,
      priceYearly: 0,
      features: [
        '50 entries',
        '3 projects',
        'BibTeX export',
        'Basic search',
        '10 metadata enrichments/month',
      ],
      limitations: [
        'No PDF/Excel export',
        'No custom citation styles',
        'No collaboration',
        'No AI features',
      ],
      current: tier.value === 'free',
    },
    {
      id: 'light',
      name: products.value.light.name,
      description: products.value.light.description,
      priceMonthly: products.value.light.priceMonthly,
      priceYearly: products.value.light.priceYearly,
      features: [
        '500 entries',
        '15 projects',
        'PDF, Excel, BibTeX export',
        '3 custom citation styles',
        '100 metadata enrichments/month',
        '3 collaborators per project',
        'Basic mind maps',
        '5 AI annotations/month',
        '10 min voice transcription/month',
      ],
      current: tier.value === 'light',
    },
    {
      id: 'pro',
      name: products.value.pro.name,
      description: products.value.pro.description,
      priceMonthly: products.value.pro.priceMonthly,
      priceYearly: products.value.pro.priceYearly,
      features: [
        'Unlimited entries',
        'Unlimited projects',
        'All export formats',
        'Unlimited citation styles',
        'Unlimited metadata enrichment',
        'Unlimited collaborators',
        'Full mind maps with graph queries',
        'Semantic search',
        'Veritas Score credibility ratings',
        '50 AI annotations/month',
        '60 min voice transcription/month',
        'Research Companion AI assistant',
        'Multimodal AI (images/PDFs)',
        'Priority support',
      ],
      current: tier.value === 'pro',
      highlighted: true,
    },
  ]
})

function getPrice(tierData: (typeof tiers.value)[0]) {
  return billingInterval.value === 'month' ? tierData.priceMonthly : tierData.priceYearly
}

function formatPrice(price: number) {
  return price === 0 ? 'Free' : `$${price}`
}

async function handleUpgrade(targetTier: 'light' | 'pro') {
  isCheckoutLoading.value = true
  checkoutTier.value = targetTier

  try {
    await startCheckout(targetTier, billingInterval.value)
  }
  catch (error) {
    console.error('Checkout failed:', error)
  }
  finally {
    isCheckoutLoading.value = false
    checkoutTier.value = null
  }
}

async function handleManageBilling() {
  try {
    await openPortal()
  }
  catch (error: any) {
    console.error('Portal failed:', error)
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Success/Cancel Messages -->
    <UAlert
      v-if="showSuccessToast"
      color="green"
      icon="i-heroicons-check-circle"
      title="Subscription activated!"
      description="Thank you for subscribing. Your new features are now available."
    />

    <UAlert
      v-if="showCanceledToast"
      color="yellow"
      icon="i-heroicons-information-circle"
      title="Checkout canceled"
      description="Your checkout was canceled. No charges were made."
    />

    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Subscription
      </h1>
      <p class="text-gray-500 dark:text-gray-400">
        Manage your subscription and billing
      </p>
    </div>

    <!-- Current Plan Card -->
    <UCard v-if="isPaid && subscription">
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-gray-900 dark:text-white">
            Current Plan
          </h2>
          <UBadge
            :color="subscription.status === 'active' ? 'green' : 'yellow'"
          >
            {{ subscription.status }}
          </UBadge>
        </div>
      </template>

      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-lg font-medium text-gray-900 dark:text-white">
              {{ tier === 'light' ? 'Bibanna Light' : 'Bibanna Pro' }}
            </p>
            <p v-if="periodEnd" class="text-sm text-gray-500">
              {{ isCanceled ? 'Ends' : 'Renews' }} on {{ periodEnd.toLocaleDateString() }}
            </p>
          </div>
          <UButton
            variant="outline"
            color="gray"
            @click="handleManageBilling"
          >
            Manage Billing
          </UButton>
        </div>

        <UAlert
          v-if="isCanceled"
          color="yellow"
          icon="i-heroicons-exclamation-triangle"
          title="Subscription ending"
          :description="`Your subscription will end on ${periodEnd?.toLocaleDateString()}. Click 'Manage Billing' to reactivate.`"
        />
      </div>
    </UCard>

    <!-- Usage Stats -->
    <UCard v-if="limits">
      <template #header>
        <h2 class="font-semibold text-gray-900 dark:text-white">
          Your Limits
        </h2>
      </template>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p class="text-sm text-gray-500">Entries</p>
          <p class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ limits.entries === Infinity ? 'Unlimited' : limits.entries }}
          </p>
        </div>
        <div>
          <p class="text-sm text-gray-500">Projects</p>
          <p class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ limits.projects === Infinity ? 'Unlimited' : limits.projects }}
          </p>
        </div>
        <div>
          <p class="text-sm text-gray-500">Collaborators</p>
          <p class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ limits.collaboratorsPerProject === Infinity ? 'Unlimited' : limits.collaboratorsPerProject || 'None' }}
          </p>
        </div>
        <div>
          <p class="text-sm text-gray-500">AI Annotations</p>
          <p class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ limits.aiAnnotationsPerMonth }}/month
          </p>
        </div>
      </div>
    </UCard>

    <!-- Billing Interval Toggle -->
    <div class="flex justify-center">
      <UButtonGroup>
        <UButton
          :variant="billingInterval === 'month' ? 'solid' : 'outline'"
          :color="billingInterval === 'month' ? 'primary' : 'gray'"
          @click="billingInterval = 'month'"
        >
          Monthly
        </UButton>
        <UButton
          :variant="billingInterval === 'year' ? 'solid' : 'outline'"
          :color="billingInterval === 'year' ? 'primary' : 'gray'"
          @click="billingInterval = 'year'"
        >
          Yearly
          <UBadge color="green" variant="subtle" size="xs" class="ml-2">
            Save 17%
          </UBadge>
        </UButton>
      </UButtonGroup>
    </div>

    <!-- Plans Grid -->
    <div v-if="!pending" class="grid md:grid-cols-3 gap-6">
      <UCard
        v-for="tierData in tiers"
        :key="tierData.id"
        :ui="{
          base: tierData.highlighted ? 'ring-2 ring-primary-500' : '',
          body: { padding: 'p-6' },
        }"
      >
        <div v-if="tierData.highlighted" class="absolute -top-3 left-1/2 -translate-x-1/2">
          <UBadge color="primary" variant="solid">
            Most Popular
          </UBadge>
        </div>

        <div class="space-y-4">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ tierData.name }}
            </h3>
            <p class="text-sm text-gray-500 mt-1">
              {{ tierData.description }}
            </p>
          </div>

          <div>
            <span class="text-3xl font-bold text-gray-900 dark:text-white">
              {{ formatPrice(getPrice(tierData)) }}
            </span>
            <span v-if="getPrice(tierData) > 0" class="text-gray-500">
              /{{ billingInterval }}
            </span>
          </div>

          <ul class="space-y-2">
            <li
              v-for="feature in tierData.features"
              :key="feature"
              class="flex items-start gap-2 text-sm"
            >
              <UIcon name="i-heroicons-check" class="w-5 h-5 text-green-500 flex-shrink-0" />
              <span class="text-gray-600 dark:text-gray-300">{{ feature }}</span>
            </li>
            <li
              v-for="limitation in tierData.limitations || []"
              :key="limitation"
              class="flex items-start gap-2 text-sm"
            >
              <UIcon name="i-heroicons-x-mark" class="w-5 h-5 text-gray-400 flex-shrink-0" />
              <span class="text-gray-400">{{ limitation }}</span>
            </li>
          </ul>

          <UButton
            v-if="tierData.current"
            block
            variant="outline"
            color="gray"
            disabled
          >
            Current Plan
          </UButton>
          <UButton
            v-else-if="tierData.id === 'free'"
            block
            variant="outline"
            color="gray"
            disabled
          >
            {{ isPaid ? 'Downgrade via Billing' : 'Current Plan' }}
          </UButton>
          <UButton
            v-else
            block
            :color="tierData.highlighted ? 'primary' : 'gray'"
            :variant="tierData.highlighted ? 'solid' : 'outline'"
            :loading="isCheckoutLoading && checkoutTier === tierData.id"
            @click="handleUpgrade(tierData.id as 'light' | 'pro')"
          >
            {{ isPaid ? 'Change Plan' : 'Start Free Trial' }}
          </UButton>
        </div>
      </UCard>
    </div>

    <!-- Loading State -->
    <div v-else class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <!-- FAQ -->
    <UCard>
      <template #header>
        <h2 class="font-semibold text-gray-900 dark:text-white">
          Frequently Asked Questions
        </h2>
      </template>

      <UAccordion
        :items="[
          {
            label: 'Can I cancel my subscription?',
            content: 'Yes, you can cancel anytime. Your subscription will remain active until the end of your billing period.',
          },
          {
            label: 'What happens to my data if I downgrade?',
            content: 'Your data is never deleted. However, you may lose access to certain features and any content exceeding the new tier limits will be read-only.',
          },
          {
            label: 'Do you offer refunds?',
            content: 'We offer a full refund within 7 days of your first subscription. Contact support for assistance.',
          },
          {
            label: 'Can I switch between monthly and yearly billing?',
            content: 'Yes, you can switch anytime through the Manage Billing portal. Changes take effect at the next billing cycle.',
          },
        ]"
      />
    </UCard>
  </div>
</template>
