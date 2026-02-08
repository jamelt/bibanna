<script setup lang="ts">
import type { VeritasFactor } from '~/shared/types'

interface Props {
  entryId: string
}

const props = defineProps<Props>()

const { data: score, pending, refresh } = await useFetch(`/api/entries/${props.entryId}/veritas`, {
  lazy: true,
})

const isRefreshing = ref(false)
const showOverrideModal = ref(false)
const overrideScore = ref(50)
const overrideReason = ref('')

const sortedFactors = computed(() => {
  if (!score.value?.factors) return []
  return [...score.value.factors].sort((a, b) => b.weight - a.weight)
})

function getScoreColor(value: number): string {
  if (value >= 90) return 'emerald'
  if (value >= 75) return 'blue'
  if (value >= 60) return 'yellow'
  if (value >= 40) return 'orange'
  return 'red'
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

async function handleRefresh() {
  isRefreshing.value = true
  try {
    await $fetch(`/api/entries/${props.entryId}/veritas`, {
      method: 'POST',
      body: { action: 'refresh' },
    })
    await refresh()
  }
  finally {
    isRefreshing.value = false
  }
}

async function handleOverride() {
  try {
    await $fetch(`/api/entries/${props.entryId}/veritas`, {
      method: 'POST',
      body: {
        action: 'override',
        overrideScore: overrideScore.value,
        overrideReason: overrideReason.value,
      },
    })
    showOverrideModal.value = false
    overrideReason.value = ''
    await refresh()
  }
  catch (error) {
    console.error('Override failed:', error)
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Veritas Score
        </h3>
        <VeritasVeritasScoreBadge
          v-if="score"
          :score="score.overallScore"
          size="lg"
        />
      </div>
    </template>

    <!-- Loading state -->
    <div v-if="pending" class="flex justify-center py-8">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <!-- Score details -->
    <div v-else-if="score" class="space-y-6">
      <!-- Overall progress -->
      <div>
        <div class="flex justify-between text-sm mb-2">
          <span class="text-gray-600 dark:text-gray-400">Overall Credibility</span>
          <span class="font-medium text-gray-900 dark:text-white">{{ score.overallScore }}/100</span>
        </div>
        <UProgress :value="score.overallScore" :color="getScoreColor(score.overallScore)" />
      </div>

      <!-- Confidence -->
      <div class="flex items-center gap-2 text-sm">
        <span class="text-gray-500">Confidence:</span>
        <span class="font-medium">{{ Math.round(score.confidence * 100) }}%</span>
        <span class="text-gray-400">({{ score.dataSources?.length || 0 }} data sources)</span>
      </div>

      <!-- User override notice -->
      <UAlert
        v-if="score.userOverride"
        color="blue"
        icon="i-heroicons-information-circle"
      >
        <template #title>
          Score overridden to {{ score.userOverride }}
        </template>
        <template #description>
          <p v-if="score.userOverrideReason">{{ score.userOverrideReason }}</p>
          <p v-else>You have manually set this score.</p>
        </template>
      </UAlert>

      <!-- Factor breakdown -->
      <div class="space-y-4">
        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Score Breakdown
        </h4>

        <div
          v-for="factor in sortedFactors"
          :key="factor.name"
          class="space-y-1"
        >
          <div class="flex justify-between text-sm">
            <span class="text-gray-700 dark:text-gray-300">{{ factor.name }}</span>
            <span class="text-gray-500">{{ Math.round(factor.weight * 100) }}% weight</span>
          </div>
          <div class="flex items-center gap-3">
            <UProgress
              :value="factor.score"
              :color="getScoreColor(factor.score)"
              size="sm"
              class="flex-1"
            />
            <span class="text-sm font-medium w-8 text-right">{{ factor.score }}</span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ factor.evidence }}
            <span v-if="factor.source" class="text-gray-400"> ({{ factor.source }})</span>
          </p>
        </div>
      </div>

      <!-- Data sources -->
      <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
        <p class="text-xs text-gray-400">
          Data from: {{ score.dataSources?.join(', ') || 'Manual entry only' }}
          <br />
          Calculated: {{ formatDate(score.calculatedAt) }}
        </p>
      </div>
    </div>

    <!-- Calculate prompt for no score -->
    <div v-else class="text-center py-8">
      <UIcon name="i-heroicons-shield-check" class="w-12 h-12 mx-auto text-gray-300" />
      <p class="mt-2 text-gray-500">No credibility score yet</p>
      <UButton
        color="primary"
        variant="soft"
        class="mt-4"
        :loading="isRefreshing"
        @click="handleRefresh"
      >
        Calculate Score
      </UButton>
    </div>

    <template #footer>
      <div class="flex justify-between items-center">
        <UButton
          variant="ghost"
          size="sm"
          icon="i-heroicons-arrow-path"
          :loading="isRefreshing"
          @click="handleRefresh"
        >
          Recalculate
        </UButton>
        <UButton
          variant="ghost"
          size="sm"
          icon="i-heroicons-pencil"
          @click="showOverrideModal = true"
        >
          Override Score
        </UButton>
      </div>
    </template>
  </UCard>

  <!-- Override Modal -->
  <UModal v-model:open="showOverrideModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">Override Veritas Score</h3>
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-heroicons-x-mark"
              @click="showOverrideModal = false"
            />
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-sm text-gray-500">
            Override the automatically calculated score if you have additional information about this source's credibility.
          </p>

          <UFormGroup label="New Score (0-100)">
            <div class="flex items-center gap-4">
              <URange v-model="overrideScore" :min="0" :max="100" class="flex-1" />
              <span class="w-12 text-right font-medium">{{ overrideScore }}</span>
            </div>
          </UFormGroup>

          <UFormGroup label="Reason (optional)">
            <UTextarea
              v-model="overrideReason"
              placeholder="Why are you overriding this score?"
              :rows="3"
            />
          </UFormGroup>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton variant="outline" color="neutral" @click="showOverrideModal = false">
              Cancel
            </UButton>
            <UButton color="primary" @click="handleOverride">
              Save Override
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
