<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const features = [
  {
    icon: 'i-heroicons-book-open',
    title: 'Comprehensive Library',
    description: 'Track books, journals, articles, media, and any source type with flexible metadata.',
  },
  {
    icon: 'i-heroicons-pencil-square',
    title: 'Rich Annotations',
    description: 'Add descriptive, evaluative, and reflective annotations to your sources.',
  },
  {
    icon: 'i-heroicons-magnifying-glass',
    title: 'Powerful Search',
    description: 'Find anything instantly with full-text and semantic search capabilities.',
  },
  {
    icon: 'i-heroicons-document-text',
    title: 'Citation Styles',
    description: 'Generate citations in APA, MLA, Chicago, and hundreds of other styles.',
  },
  {
    icon: 'i-heroicons-shield-check',
    title: 'Veritas Score',
    description: 'Assess source credibility with AI-powered academic rigor analysis.',
  },
  {
    icon: 'i-heroicons-share',
    title: 'Mind Maps',
    description: 'Visualize connections between sources and discover research patterns.',
  },
]

const tiers = [
  {
    name: 'Free',
    price: '$0',
    description: 'Perfect for getting started',
    features: ['50 entries', '3 projects', 'BibTeX export', 'Basic search'],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Light',
    price: '$9',
    period: '/month',
    description: 'For active researchers',
    features: ['500 entries', '15 projects', 'PDF & Excel export', 'Custom citation styles', 'Collaboration'],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    description: 'For power users',
    features: ['Unlimited entries', 'Unlimited projects', 'All export formats', 'AI Research Companion', 'Semantic search', 'Mind maps', 'Priority support'],
    cta: 'Start Free Trial',
    highlighted: false,
  },
]
</script>

<template>
  <div>
    <!-- Navigation -->
    <header class="fixed top-0 inset-x-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <NuxtLink to="/" class="flex items-center gap-2">
            <UIcon name="i-heroicons-book-open" class="w-8 h-8 text-primary-500" />
            <span class="text-xl font-bold text-gray-900 dark:text-white">Bibanna</span>
          </NuxtLink>

          <nav class="hidden md:flex items-center gap-6">
            <NuxtLink to="#features" class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              Features
            </NuxtLink>
            <NuxtLink to="#pricing" class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              Pricing
            </NuxtLink>
            <NuxtLink to="/login" class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              Sign In
            </NuxtLink>
            <UButton to="/signup" color="primary">
              Get Started
            </UButton>
          </nav>

          <UButton
            icon="i-heroicons-bars-3"
            variant="ghost"
            color="neutral"
            class="md:hidden"
          />
        </div>
      </div>
    </header>

    <!-- Hero section -->
    <section class="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div class="max-w-4xl mx-auto text-center">
        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white tracking-tight">
          Your Research,
          <span class="text-primary-500">Brilliantly Organized</span>
        </h1>
        <p class="mt-6 text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          The modern bibliography manager for researchers, students, and professors.
          Track sources, annotate, cite, and discover connections in your research.
        </p>
        <div class="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <UButton to="/signup" size="xl" color="primary">
            Start Free
          </UButton>
          <UButton to="#features" size="xl" variant="outline" color="neutral">
            Learn More
          </UButton>
        </div>
      </div>
    </section>

    <!-- Features section -->
    <section id="features" class="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800/50">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-16">
          <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Everything You Need for Research
          </h2>
          <p class="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Simple for quick tasks, powerful for deep research.
          </p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <UCard
            v-for="feature in features"
            :key="feature.title"
            class="p-6"
          >
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <UIcon :name="feature.icon" class="w-6 h-6 text-primary-500" />
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ feature.title }}
                </h3>
                <p class="mt-2 text-gray-600 dark:text-gray-300">
                  {{ feature.description }}
                </p>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </section>

    <!-- Pricing section -->
    <section id="pricing" class="py-20 px-4 sm:px-6 lg:px-8">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-16">
          <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Simple, Transparent Pricing
          </h2>
          <p class="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Start free, upgrade when you need more.
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <UCard
            v-for="tier in tiers"
            :key="tier.name"
            :class="[tier.highlighted ? 'ring-2 ring-primary-500' : '', 'p-6']"
          >
            <div v-if="tier.highlighted" class="absolute -top-3 left-1/2 -translate-x-1/2">
              <UBadge color="primary" variant="solid">
                Most Popular
              </UBadge>
            </div>

            <div class="text-center">
              <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                {{ tier.name }}
              </h3>
              <div class="mt-4">
                <span class="text-4xl font-bold text-gray-900 dark:text-white">{{ tier.price }}</span>
                <span v-if="tier.period" class="text-gray-500 dark:text-gray-400">{{ tier.period }}</span>
              </div>
              <p class="mt-2 text-gray-600 dark:text-gray-300">
                {{ tier.description }}
              </p>
            </div>

            <ul class="mt-6 space-y-3">
              <li
                v-for="feature in tier.features"
                :key="feature"
                class="flex items-center gap-2 text-gray-600 dark:text-gray-300"
              >
                <UIcon name="i-heroicons-check" class="w-5 h-5 text-green-500 flex-shrink-0" />
                {{ feature }}
              </li>
            </ul>

            <UButton
              :color="tier.highlighted ? 'primary' : 'neutral'"
              :variant="tier.highlighted ? 'solid' : 'outline'"
              block
              class="mt-8"
            >
              {{ tier.cta }}
            </UButton>
          </UCard>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800">
      <div class="max-w-7xl mx-auto">
        <div class="flex flex-col md:flex-row justify-between items-center gap-4">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-book-open" class="w-6 h-6 text-primary-500" />
            <span class="font-semibold text-gray-900 dark:text-white">Bibanna</span>
          </div>
          <p class="text-gray-500 dark:text-gray-400 text-sm">
            &copy; {{ new Date().getFullYear() }} Bibanna. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>
