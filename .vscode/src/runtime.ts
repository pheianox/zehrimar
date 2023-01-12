import { scrollConsoleBottom } from './App'
import { createSignal } from 'solid-js'
import WORKER_PATH from './runtime.worker?url'
import TypeScript from 'typescript'

export enum Language {
  TypeScript = "typescript",
  JavaScript = "javascript"
}

const [output, setOutput] = createSignal({ 
  items: [] as (string | Error)[], 
  echoCount: 0, 
  errorCount: 0 
}, { equals: false })

const [isStopped, setStopped] = createSignal(true)

let worker = null as unknown as Worker

function init() {
  setStopped(false)
  worker = new Worker(WORKER_PATH, { type: 'module' })
  worker.addEventListener('message', event => {
    setOutput(output => {
      output.echoCount++
      output.items.push(event.data)
      scrollConsoleBottom()
      return output
    })
  })
  worker.addEventListener('error', event => {
    setOutput(output => {
      output.errorCount++
      output.items.push(new Error(event.message))
      scrollConsoleBottom()
      return output
    })
  })
}

function exec(code: string, language: Language) {
  stop()
  init()
  if (language === Language.TypeScript) {
    code = TypeScript.transpile(code)
  }
  worker.postMessage({ code })
}

function stop() {
  worker?.terminate()
  setStopped(true)
}

function resetOutput() {
  setOutput(output => {
    output.echoCount = 0
    output.errorCount = 0
    output.items = []
    scrollConsoleBottom()
    return output
  })
}

export default { exec, stop, output, resetOutput, isStopped  }