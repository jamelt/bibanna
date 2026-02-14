<script setup lang="ts">
interface Props {
  modelValue: boolean
  projectId: string
  projectName: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const { hasFeature } = useSubscription()

const { data: shares, refresh: refreshShares } = await useFetch(
  `/api/projects/${props.projectId}/shares`,
  { lazy: true },
)

const newShareEmail = ref('')
const newSharePermission = ref<'view' | 'comment' | 'edit'>('view')
const isSharing = ref(false)
const shareError = ref<string | null>(null)

const publicLinkPermission = ref<'view' | 'comment'>('view')
const publicLinkExpiry = ref<number | undefined>(undefined)
const isCreatingPublicLink = ref(false)

const publicShare = computed(() => shares.value?.find((s) => s.isPublic))
const userShares = computed(() => shares.value?.filter((s) => !s.isPublic) || [])

const publicLinkUrl = computed(() => {
  if (!publicShare.value?.publicToken) return null
  return `${window.location.origin}/shared/${publicShare.value.publicToken}`
})

const permissionOptions = [
  { value: 'view', label: 'View only', description: 'Can view entries and annotations' },
  { value: 'comment', label: 'Comment', description: 'Can view and add comments' },
  { value: 'edit', label: 'Edit', description: 'Can add, edit, and delete entries' },
]

const expiryOptions = [
  { value: undefined, label: 'Never expires' },
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
]

async function handleShareWithUser() {
  if (!newShareEmail.value.trim()) {
    shareError.value = 'Email is required'
    return
  }

  isSharing.value = true
  shareError.value = null

  try {
    await $fetch(`/api/projects/${props.projectId}/shares`, {
      method: 'POST',
      body: {
        type: 'user',
        email: newShareEmail.value,
        permission: newSharePermission.value,
      },
    })

    newShareEmail.value = ''
    await refreshShares()
  } catch (error: any) {
    shareError.value = error.data?.message || 'Failed to share project'
  } finally {
    isSharing.value = false
  }
}

async function handleCreatePublicLink() {
  isCreatingPublicLink.value = true

  try {
    await $fetch(`/api/projects/${props.projectId}/shares`, {
      method: 'POST',
      body: {
        type: 'public',
        permission: publicLinkPermission.value,
        expiresInDays: publicLinkExpiry.value,
      },
    })

    await refreshShares()
  } catch (error: any) {
    console.error('Failed to create public link:', error)
  } finally {
    isCreatingPublicLink.value = false
  }
}

async function handleRevokePublicLink() {
  if (
    !confirm(
      'Are you sure you want to revoke this public link? Anyone with this link will lose access.',
    )
  ) {
    return
  }

  try {
    await $fetch(`/api/projects/${props.projectId}/shares/public`, {
      method: 'DELETE',
    })

    await refreshShares()
  } catch (error) {
    console.error('Failed to revoke link:', error)
  }
}

async function handleRemoveShare(shareId: string) {
  if (!confirm("Are you sure you want to remove this user's access?")) {
    return
  }

  try {
    await $fetch(`/api/projects/${props.projectId}/shares/${shareId}`, {
      method: 'DELETE',
    })

    await refreshShares()
  } catch (error) {
    console.error('Failed to remove share:', error)
  }
}

async function copyPublicLink() {
  if (publicLinkUrl.value) {
    await navigator.clipboard.writeText(publicLinkUrl.value)
  }
}

function getPermissionLabel(permission: string): string {
  return permissionOptions.find((p) => p.value === permission)?.label || permission
}
</script>

<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'sm:max-w-lg' }">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Share Project</h2>
              <p class="text-sm text-gray-500">{{ projectName }}</p>
            </div>
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-heroicons-x-mark"
              @click="isOpen = false"
            />
          </div>
        </template>

        <div class="space-y-6">
          <!-- Upgrade prompt if not on Light+ -->
          <template v-if="!hasFeature('collaboration')">
            <AppUpgradePrompt feature="collaboration" required-tier="light">
              Share projects and collaborate with others by upgrading to Light or Pro.
            </AppUpgradePrompt>
          </template>

          <template v-else>
            <!-- Share with user -->
            <div>
              <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Share with people
              </h3>

              <div class="flex gap-2">
                <UInput
                  v-model="newShareEmail"
                  placeholder="Enter email address"
                  type="email"
                  class="flex-1"
                />
                <USelectMenu
                  v-model="newSharePermission"
                  :options="permissionOptions"
                  value-attribute="value"
                  option-attribute="label"
                  class="w-32"
                />
                <UButton color="primary" :loading="isSharing" @click="handleShareWithUser">
                  Share
                </UButton>
              </div>

              <UAlert
                v-if="shareError"
                color="red"
                variant="subtle"
                class="mt-2"
                :title="shareError"
              />
            </div>

            <!-- Current shares -->
            <div v-if="userShares.length > 0">
              <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                People with access
              </h3>

              <div class="space-y-2">
                <div
                  v-for="share in userShares"
                  :key="share.id"
                  class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
                    >
                      <UIcon name="i-heroicons-user" class="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-white">
                        {{ share.userName || share.userEmail }}
                      </p>
                      <p v-if="share.userName && share.userEmail" class="text-xs text-gray-500">
                        {{ share.userEmail }}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <UBadge variant="subtle" size="xs">
                      {{ getPermissionLabel(share.permission) }}
                    </UBadge>
                    <UButton
                      variant="ghost"
                      color="red"
                      size="xs"
                      icon="i-heroicons-trash"
                      @click="handleRemoveShare(share.id)"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Public link -->
            <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Public link</h3>

              <div v-if="publicShare" class="space-y-3">
                <div class="flex items-center gap-2">
                  <UInput :model-value="publicLinkUrl" readonly class="flex-1" />
                  <UButton variant="outline" icon="i-heroicons-clipboard" @click="copyPublicLink">
                    Copy
                  </UButton>
                </div>

                <div class="flex items-center justify-between text-sm">
                  <span class="text-gray-500">
                    {{ getPermissionLabel(publicShare.permission) }}
                    <span v-if="publicShare.expiresAt">
                      · Expires {{ new Date(publicShare.expiresAt).toLocaleDateString() }}
                    </span>
                  </span>
                  <UButton variant="link" color="red" size="xs" @click="handleRevokePublicLink">
                    Revoke link
                  </UButton>
                </div>
              </div>

              <div v-else class="space-y-3">
                <p class="text-sm text-gray-500">Anyone with the link can access this project</p>

                <div class="flex gap-2">
                  <USelectMenu
                    v-model="publicLinkPermission"
                    :options="permissionOptions.filter((p) => p.value !== 'edit')"
                    value-attribute="value"
                    option-attribute="label"
                    class="flex-1"
                  />
                  <USelectMenu
                    v-model="publicLinkExpiry"
                    :options="expiryOptions"
                    value-attribute="value"
                    option-attribute="label"
                    class="flex-1"
                  />
                </div>

                <UButton
                  variant="outline"
                  :loading="isCreatingPublicLink"
                  @click="handleCreatePublicLink"
                >
                  <UIcon name="i-heroicons-link" class="w-4 h-4 mr-1" />
                  Create public link
                </UButton>
              </div>
            </div>
          </template>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
