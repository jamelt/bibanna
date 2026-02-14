declare module 'citeproc' {
  export class Engine {
    constructor(sys: any, style: string, lang?: string)
    makeBibliography(): [any, string[]]
    makeCitationCluster(citations: any[]): string
    processCitationCluster(citation: any, pre: any[], post: any[]): any
    updateItems(ids: string[]): void
  }
}

declare module 'pdf-parse' {
  interface PDFData {
    text: string
    numpages: number
    info: any
    metadata: any
    version: string
  }
  function pdfParse(buffer: Buffer): Promise<PDFData>
  export default pdfParse
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface Window {
  SpeechRecognition: new () => SpeechRecognition
  webkitSpeechRecognition: new () => SpeechRecognition
}

declare const SpeechRecognition: {
  prototype: SpeechRecognition
  new (): SpeechRecognition
}

declare let webkitSpeechRecognition: {
  prototype: SpeechRecognition
  new (): SpeechRecognition
}
