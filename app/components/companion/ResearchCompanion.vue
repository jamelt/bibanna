<script setup lang="ts">
interface Props {
  projectId: string
}

const props = defineProps<Props>()

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Array<{
    sourceId: string
    sourceType: string
    title?: string
    excerpt: string
  }>
  confidence?: number
  followUpQuestions?: string[]
  createdAt: Date
}

const conversationId = ref<string | null>(null)
const messages = ref<Message[]>([])
const inputMessage = ref('')
const isLoading = ref(false)
const selectedMode = ref<'general' | 'fact-check' | 'brainstorm' | 'synthesize' | 'gap-analysis'>(
  'general',
)
const showCitations = ref<string | null>(null)

const messagesContainer = ref<HTMLElement | null>(null)

const { data: persona, pending: personaLoading } = await useFetch(
  `/api/companion/${props.projectId}/persona`,
  { lazy: true },
)

const { data: conversations, refresh: refreshConversations } = await useFetch(
  `/api/companion/${props.projectId}/conversations`,
  { lazy: true },
)

const modes = [
  {
    value: 'general',
    label: 'General',
    icon: 'i-heroicons-chat-bubble-left-right',
    description: 'General research assistance',
  },
  {
    value: 'fact-check',
    label: 'Fact Check',
    icon: 'i-heroicons-shield-check',
    description: 'Verify claims against sources',
  },
  {
    value: 'brainstorm',
    label: 'Brainstorm',
    icon: 'i-heroicons-light-bulb',
    description: 'Generate ideas and connections',
  },
  {
    value: 'synthesize',
    label: 'Synthesize',
    icon: 'i-heroicons-puzzle-piece',
    description: 'Combine insights from sources',
  },
  {
    value: 'gap-analysis',
    label: 'Gap Analysis',
    icon: 'i-heroicons-magnifying-glass-plus',
    description: 'Identify research gaps',
  },
]

async function sendMessage() {
  if (!inputMessage.value.trim() || isLoading.value) return

  const userMessage: Message = {
    id: `temp-${Date.now()}`,
    role: 'user',
    content: inputMessage.value,
    createdAt: new Date(),
  }

  messages.value.push(userMessage)
  const messageText = inputMessage.value
  inputMessage.value = ''
  isLoading.value = true

  scrollToBottom()

  try {
    const response = await $fetch<{
      conversationId: string
      message: Message
    }>(`/api/companion/${props.projectId}/chat`, {
      method: 'POST',
      body: {
        message: messageText,
        conversationId: conversationId.value,
        mode: selectedMode.value,
      },
    })

    conversationId.value = response.conversationId
    messages.value.push(response.message)

    scrollToBottom()
  } catch (error: any) {
    console.error('Chat error:', error)
    messages.value.push({
      id: `error-${Date.now()}`,
      role: 'assistant',
      content: `I encountered an error: ${error.message || 'Please try again.'}`,
      createdAt: new Date(),
    })
  } finally {
    isLoading.value = false
  }
}

function askFollowUp(question: string) {
  inputMessage.value = question
  sendMessage()
}

function startNewConversation() {
  conversationId.value = null
  messages.value = []
  refreshConversations()
}

async function loadConversation(convId: string) {
  conversationId.value = convId
  messages.value = []
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

function toggleCitations(messageId: string) {
  showCitations.value = showCitations.value === messageId ? null : messageId
}
</script>

<template>
  <div class="flex h-full">
    <!-- Sidebar -->
    <div class="w-64 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <!-- Persona info -->
      <div class="p-4 border-b border-gray-200 dark:border-gray-700">
        <div v-if="personaLoading" class="animate-pulse space-y-2">
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        </div>
        <div v-else-if="persona">
          <h3 class="font-semibold text-gray-900 dark:text-white">
            {{ persona.name }}
          </h3>
          <p class="text-xs text-gray-500 mt-1">
            {{ persona.description }}
          </p>
        </div>
      </div>

      <!-- Mode selector -->
      <div class="p-4 border-b border-gray-200 dark:border-gray-700">
        <label class="text-xs font-medium text-gray-500 uppercase">Mode</label>
        <div class="mt-2 space-y-1">
          <button
            v-for="mode in modes"
            :key="mode.value"
            type="button"
            class="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left"
            :class="
              selectedMode === mode.value
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            "
            @click="selectedMode = mode.value"
          >
            <UIcon :name="mode.icon" class="w-4 h-4" />
            {{ mode.label }}
          </button>
        </div>
      </div>

      <!-- Conversations -->
      <div class="flex-1 overflow-y-auto">
        <div class="p-2">
          <UButton
            block
            variant="soft"
            size="sm"
            icon="i-heroicons-plus"
            @click="startNewConversation"
          >
            New Conversation
          </UButton>
        </div>
        <div class="px-2 space-y-1">
          <button
            v-for="conv in conversations"
            :key="conv.id"
            type="button"
            class="w-full text-left px-2 py-1.5 rounded text-sm truncate transition-colors"
            :class="
              conversationId === conv.id
                ? 'bg-gray-100 dark:bg-gray-800'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
            "
            @click="loadConversation(conv.id)"
          >
            {{ conv.title }}
          </button>
        </div>
      </div>

      <!-- Suggested questions -->
      <div
        v-if="persona?.suggestedQuestions?.length"
        class="p-4 border-t border-gray-200 dark:border-gray-700"
      >
        <label class="text-xs font-medium text-gray-500 uppercase">Suggested</label>
        <div class="mt-2 space-y-1">
          <button
            v-for="q in persona.suggestedQuestions.slice(0, 3)"
            :key="q"
            type="button"
            class="w-full text-left text-xs text-gray-600 dark:text-gray-400 hover:text-primary-600 truncate"
            @click="askFollowUp(q)"
          >
            {{ q }}
          </button>
        </div>
      </div>
    </div>

    <!-- Main chat area -->
    <div class="flex-1 flex flex-col">
      <!-- Messages -->
      <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
        <div
          v-if="messages.length === 0"
          class="flex flex-col items-center justify-center h-full text-center"
        >
          <UIcon name="i-heroicons-academic-cap" class="w-16 h-16 text-gray-300" />
          <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">Research Companion</h3>
          <p class="mt-2 text-gray-500 max-w-md">
            Ask questions about your sources, verify facts, brainstorm ideas, or identify research
            gaps.
          </p>
        </div>

        <div
          v-for="message in messages"
          :key="message.id"
          class="flex gap-3"
          :class="message.role === 'user' ? 'justify-end' : ''"
        >
          <div
            v-if="message.role === 'assistant'"
            class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0"
          >
            <UIcon name="i-heroicons-academic-cap" class="w-4 h-4 text-primary-600" />
          </div>

          <div
            class="max-w-2xl rounded-lg p-3"
            :class="
              message.role === 'user' ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-800'
            "
          >
            <div class="prose prose-sm dark:prose-invert max-w-none" v-html="message.content" />

            <!-- Citations -->
            <div
              v-if="message.citations?.length"
              class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
            >
              <button
                type="button"
                class="text-xs text-gray-500 flex items-center gap-1"
                @click="toggleCitations(message.id)"
              >
                <UIcon name="i-heroicons-document-text" class="w-3 h-3" />
                {{ message.citations.length }} source(s)
                <UIcon
                  :name="
                    showCitations === message.id
                      ? 'i-heroicons-chevron-up'
                      : 'i-heroicons-chevron-down'
                  "
                  class="w-3 h-3"
                />
              </button>
              <div v-if="showCitations === message.id" class="mt-2 space-y-2">
                <div
                  v-for="citation in message.citations"
                  :key="citation.sourceId"
                  class="text-xs p-2 bg-white dark:bg-gray-900 rounded"
                >
                  <p class="font-medium">{{ citation.title || 'Unknown source' }}</p>
                  <p class="text-gray-500 mt-1">{{ citation.excerpt }}</p>
                </div>
              </div>
            </div>

            <!-- Confidence -->
            <div
              v-if="message.confidence"
              class="mt-2 flex items-center gap-2 text-xs text-gray-500"
            >
              <span>Confidence:</span>
              <UProgress :model-value="message.confidence" size="xs" class="w-20" />
              <span>{{ message.confidence }}%</span>
            </div>

            <!-- Follow-up questions -->
            <div v-if="message.followUpQuestions?.length" class="mt-3 space-y-1">
              <p class="text-xs text-gray-500">Follow-up questions:</p>
              <button
                v-for="q in message.followUpQuestions"
                :key="q"
                type="button"
                class="block text-xs text-primary-600 hover:text-primary-700 text-left"
                @click="askFollowUp(q)"
              >
                → {{ q }}
              </button>
            </div>
          </div>

          <div
            v-if="message.role === 'user'"
            class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0"
          >
            <UIcon name="i-heroicons-user" class="w-4 h-4 text-gray-600" />
          </div>
        </div>

        <!-- Loading indicator -->
        <div v-if="isLoading" class="flex gap-3">
          <div
            class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center"
          >
            <UIcon name="i-heroicons-academic-cap" class="w-4 h-4 text-primary-600 animate-pulse" />
          </div>
          <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
            <div class="flex gap-1">
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div
                class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style="animation-delay: 0.1s"
              />
              <div
                class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style="animation-delay: 0.2s"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="p-4 border-t border-gray-200 dark:border-gray-700">
        <form class="flex gap-2" @submit.prevent="sendMessage">
          <UInput
            v-model="inputMessage"
            placeholder="Ask a question about your research..."
            class="flex-1"
            :disabled="isLoading"
          />
          <UButton
            type="submit"
            color="primary"
            icon="i-heroicons-paper-airplane"
            :loading="isLoading"
            :disabled="!inputMessage.trim()"
          />
        </form>
      </div>
    </div>
  </div>
</template>
