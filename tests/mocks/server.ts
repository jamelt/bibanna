import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)

export function setupMswServer() {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'warn' })
  })

  afterEach(() => {
    server.resetHandlers()
  })

  afterAll(() => {
    server.close()
  })
}
