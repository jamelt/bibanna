import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('https://api.semanticscholar.org/graph/v1/paper/search', ({ request }) => {
    const url = new URL(request.url)
    const query = url.searchParams.get('query')

    return HttpResponse.json({
      total: 1,
      data: [
        {
          paperId: 'mock-paper-id',
          title: query || 'Mock Paper',
          year: 2024,
          citationCount: 42,
          influentialCitationCount: 5,
          authors: [{ authorId: '123', name: 'John Doe', hIndex: 25 }],
          venue: 'Mock Journal',
          isOpenAccess: true,
        },
      ],
    })
  }),

  http.get('https://api.semanticscholar.org/graph/v1/paper/:paperId', ({ params }) => {
    return HttpResponse.json({
      paperId: params.paperId,
      title: 'Mock Paper Details',
      year: 2024,
      citationCount: 42,
      influentialCitationCount: 5,
      authors: [{ authorId: '123', name: 'John Doe', hIndex: 25 }],
      venue: 'Mock Journal',
      isOpenAccess: true,
      publicationTypes: ['JournalArticle'],
    })
  }),

  http.get('https://api.openalex.org/works', ({ request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')

    return HttpResponse.json({
      results: [
        {
          id: 'https://openalex.org/W123',
          title: search || 'Mock OpenAlex Work',
          publication_year: 2024,
          cited_by_count: 42,
          is_retracted: false,
          authorships: [
            {
              author: { id: 'A123', display_name: 'John Doe' },
              institutions: [{ id: 'I123', display_name: 'Mock University', type: 'education' }],
            },
          ],
          primary_location: {
            source: {
              id: 'S123',
              display_name: 'Mock Journal',
              type: 'journal',
              is_in_doaj: true,
            },
          },
        },
      ],
    })
  }),

  http.get('https://api.crossref.org/works/:doi', ({ params }) => {
    return HttpResponse.json({
      status: 'ok',
      message: {
        DOI: params.doi,
        title: ['Mock CrossRef Title'],
        author: [{ given: 'John', family: 'Doe' }],
        publisher: 'Mock Publisher',
        'published-print': {
          'date-parts': [[2024, 1, 1]],
        },
        type: 'journal-article',
        'container-title': ['Mock Journal'],
        volume: '10',
        issue: '1',
        page: '1-10',
      },
    })
  }),

  http.post('https://api.openai.com/v1/chat/completions', async ({ request }) => {
    const body = (await request.json()) as { messages: Array<{ content: string }> }
    const lastMessage = body.messages?.[body.messages.length - 1]?.content || ''

    return HttpResponse.json({
      id: 'mock-completion-id',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4o',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: `Mock response to: ${lastMessage.substring(0, 50)}...`,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    })
  }),

  http.post('https://api.openai.com/v1/embeddings', async () => {
    const mockEmbedding = new Array(1536).fill(0).map(() => Math.random() - 0.5)

    return HttpResponse.json({
      object: 'list',
      data: [
        {
          object: 'embedding',
          embedding: mockEmbedding,
          index: 0,
        },
      ],
      model: 'text-embedding-3-small',
      usage: {
        prompt_tokens: 10,
        total_tokens: 10,
      },
    })
  }),

  http.post('https://api.openai.com/v1/audio/transcriptions', async () => {
    return HttpResponse.json({
      text: 'Mock transcription of audio content',
    })
  }),

  http.post('https://api.stripe.com/v1/checkout/sessions', async () => {
    return HttpResponse.json({
      id: 'mock_session_id',
      url: 'https://checkout.stripe.com/mock',
      mode: 'subscription',
    })
  }),

  http.get('https://api.stripe.com/v1/subscriptions/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      status: 'active',
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      items: {
        data: [
          {
            price: {
              id: 'price_mock',
              product: 'prod_mock',
            },
          },
        ],
      },
    })
  }),
]

export const errorHandlers = [
  http.get('https://api.semanticscholar.org/graph/v1/paper/search', () => {
    return HttpResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }),

  http.get('https://api.openalex.org/works', () => {
    return HttpResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }),

  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({ error: { message: 'API quota exceeded' } }, { status: 429 })
  }),
]
