/* @refresh reload */
import RUNTIME_PATH from './runtime?url'

import { Component, createSignal, For, onMount, Setter } from "solid-js"
import { TbAlertOctagon, TbClearAll, TbMaximize, TbMoon, TbSun } from 'solid-icons/tb'
import { createStore, SetStoreFunction } from 'solid-js/store'
import { render } from 'solid-js/web';

import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import TypescriptWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import * as Monaco from "monaco-editor";

import TypeScript from 'typescript'
import FileSaver from 'file-saver'
import SplitJS from 'split.js'

import './index.css';

enum ScriptLanguage {
  TypeScript = "typescript",
  JavaScript = "javascript"
}

type Config = typeof defaultConfig
type Output = typeof defaultOutput


Monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true)
Monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true)

const editorDiagnosticsOptions = {
  noSemanticValidation: false,
  noSyntaxValidation: false
}

Monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(editorDiagnosticsOptions)
Monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions(editorDiagnosticsOptions)

self.MonacoEnvironment = {
  getWorker(_: any, label: string) {
    if (label === 'typescript' || label === 'javascript') {
      return new TypescriptWorker();
    }
    return new EditorWorker();
  }
}

const FONT_SIZE_MIN = 10
const FONT_SIZE_MAX = 50
const FONT_SIZE_STP = 5

const defaultConfig = {
  fontSize: 30,
  isDarkMode: false,
  scriptLanguage: ScriptLanguage.TypeScript,
  isConsoleAutoClean: false,
}

const defaultOutput = {
  items: [] as (string | Error)[],
  errorCount: 0,
  echoeCount: 0
}

const editorDefaultConfig: Monaco.editor.IStandaloneEditorConstructionOptions = {
  fontFamily: 'Space Mono',
  fontWeight: 'regular',
  fontLigatures: true,
  lineHeight: 1.5,
  tabSize: 2,
  glyphMargin: false,
  insertSpaces: true,
  automaticLayout: true,
  renderWhitespace: 'none',
  detectIndentation: false,
  minimap: { enabled: false },
  padding: { top: 30, bottom: 30 },
  acceptSuggestionOnEnter: 'off',
}

const splitDefaultConfig: SplitJS.Options = {
  gutterSize: 15,
  sizes: [70, 30],
}

const [config, setConfig_] = createStore(loadConfig())
const [output, setOutput_] = createSignal(defaultOutput, { equals: false })

const [isCodeSaved, setCodeSaved] = createSignal(true)
const [cursorPosition, setCursorPosition] = createSignal([0, 0])
const [isRuntimeStopped, setRuntimeStopped] = createSignal(true) 

let model = null as unknown as Monaco.editor.IModel
let editor = null as unknown as Monaco.editor.IStandaloneCodeEditor
let runtime = null as unknown as Worker

let consoleElement = null as unknown as HTMLDivElement
let leftPaneElement = null as unknown as HTMLDivElement
let rightPaneElement = null as unknown as HTMLDivElement

let savedCodeCopy =  getCodeFromUrl()


/* @ts-ignore */
const setOutput: Setter<Output> = (...args) => {
  /* @ts-ignore */
  setOutput_(...args)
  // on output change
  scrollConsole()
}

function resetOutput() {
  setOutput(output => {
    output.errorCount = 0
    output.echoeCount = 0
    output.items = []
    return output
  })
}



/* @ts-ignore */
const setConfig: SetStoreFunction<Config> = (...args) => {
  // @ts-ignore
  setConfig_(...args)
  // on config change
  saveConfig(config)
}

function loadConfig() {
  const storageItem = window.localStorage.getItem('settings')
  if (storageItem) {
    const maybeConfig = JSON.parse(storageItem)
    if (checkConfig(maybeConfig)) {
      return maybeConfig as Config
    }
  }
  return defaultConfig
}

function saveConfig(config: Config) {
  window.localStorage.setItem('settings', JSON.stringify(config))
}

function checkConfig(object: object) {
  for (const prop in defaultConfig) {
    if (Object.hasOwn(object, prop)) continue
    return false
  }
  return true
}



function initRuntime() {
  runtime = new Worker(RUNTIME_PATH, { type: 'module' })
  runtime.addEventListener('message', onRuntimeMessage)
  runtime.addEventListener('error', onRuntimeError)
  setRuntimeStopped(false)
}

function startRuntime(code: string) {
  stopRuntime()
  initRuntime()
  if (config.scriptLanguage === ScriptLanguage.TypeScript) {
    code = TypeScript.transpile(code)
  }
  runtime.postMessage({ code })
}

function stopRuntime() {
  runtime?.terminate()
  setRuntimeStopped(true)
}

function onRuntimeMessage(event: MessageEvent) {
  setOutput(output => {
    output.items.push(event.data)
    output.echoeCount++
    return output
  })
}

function onRuntimeError(event: ErrorEvent) {
  setOutput(output => {
    output.items.push(new Error(event.message))
    output.errorCount++
    return output
  })
}



function initEditor() {
  model = Monaco.editor.createModel(getCodeFromUrl(), config.scriptLanguage)

  editor = Monaco.editor.create(leftPaneElement, {
    ...editorDefaultConfig,
    fontSize: config.fontSize,
    language: config.scriptLanguage,
    theme: resolveEditorTheme(config.isDarkMode),
    model,
  })

  Monaco.editor.addKeybindingRules([
    {
      keybinding: Monaco.KeyMod.CtrlCmd | Monaco.KeyCode.KeyS,
      command: null,
    },
    {
      keybinding: Monaco.KeyMod.CtrlCmd | Monaco.KeyCode.Enter,
      command: null,
    },
    {
      keybinding: Monaco.KeyMod.CtrlCmd | Monaco.KeyCode.Backslash,
      command: null,
    },
  ])

  editor.onDidChangeCursorPosition(onEditorCursorPositionChange)
  editor.onDidChangeModelContent(onEditorModelContentChange)
  editor.onMouseLeave(save)
}

function onEditorCursorPositionChange(event: Monaco.editor.ICursorPositionChangedEvent) {
  setCursorPosition([
    event.position.lineNumber,
    event.position.column,
  ])
}

function onEditorModelContentChange(event: Monaco.editor.IModelContentChangedEvent) {
  setCodeSaved(getEditorCode() === savedCodeCopy)
}

function resolveEditorTheme(isDark: boolean) {
  return isDark ? 'vs-dark' : 'vs'
}

function increaseEditorFontSize(){
  setConfig("fontSize", fontSize => {
    fontSize = Math.min(fontSize + FONT_SIZE_STP, FONT_SIZE_MAX) 
    editor.updateOptions({ fontSize })
    return fontSize
  })
}

function decreaseEditorFontSize() {
  setConfig("fontSize", fontSize => {
    fontSize = Math.max(fontSize - FONT_SIZE_STP, FONT_SIZE_MIN) 
    editor.updateOptions({ fontSize  })
    return fontSize
  })
}

function changeEditorTheme(isDark: boolean) {
  editor.updateOptions({ theme: resolveEditorTheme(isDark) })
}

function changeEditorLanguage(language: ScriptLanguage) {
  Monaco.editor.setModelLanguage(model, language)
}

function getEditorCode() {
  return editor.getValue()
}



function scrollConsole() {
  consoleElement.scrollTop = consoleElement.scrollHeight
}

function exportConsole() {
  const data = output().items.map(output => output instanceof Error ? output.message : output)
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json'})
  FileSaver.saveAs(blob, 'output.json')
}

function toggleConsoleAutoClean() {
  setConfig("isConsoleAutoClean", isConsoleAutoClean => !isConsoleAutoClean)
}

function resolveInterfaceTheme(isDark: boolean) {
  return isDark ? 'dark' : 'light'
}

function changeInterfaceTheme(isDark: boolean) {
  document.documentElement.dataset.theme = resolveInterfaceTheme(isDark)
}

function getCodeFromUrl() {
  return atob(location.hash.slice(1))
}

function setCodeToUrl(code: string) {
  window.location.hash = btoa(code)
}

function handleKeyboard(event: KeyboardEvent) {
  if (event.ctrlKey) {
    switch (event.key) {
      case 'Enter': 
        run(); 
        event.preventDefault()
        event.stopPropagation()
        break
      case 's': 
        save(); 
        event.preventDefault()
        event.stopPropagation()
        break
      case '\\': 
        kill(); 
        event.preventDefault()
        event.stopPropagation()
        break
      case '=': 
        increaseEditorFontSize() 
        event.preventDefault()
        event.stopPropagation()
        break
      case '-': 
        decreaseEditorFontSize()
        event.preventDefault()
        event.stopPropagation()
        break
    }
  }
}

function toggleDarkMode() {
  setConfig("isDarkMode", isDarkMode => {
    isDarkMode = !isDarkMode
    changeEditorTheme(isDarkMode)
    changeInterfaceTheme(isDarkMode)
    return isDarkMode
  })
}

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
  }
}

function changeScriptLanguage(language: ScriptLanguage) {
  changeEditorLanguage(language)
  setConfig("scriptLanguage", language)
}

function initSplitter() {
  SplitJS([leftPaneElement, rightPaneElement], splitDefaultConfig)
}


function init() {
  changeInterfaceTheme(config.isDarkMode)
  initSplitter()
  initEditor()
  document.addEventListener('keydown', handleKeyboard)
  window.addEventListener('beforeunload', save)
}

function run() {
  if (config.isConsoleAutoClean) {
    resetOutput()
  }
  const code = save()
  startRuntime(code)
}

function kill() {
  stopRuntime()
}

function save() {
  const code = getEditorCode()
  setCodeToUrl(code)
  savedCodeCopy = code
  setCodeSaved(true)
  return code
}


const Navbar: Component = () => (
  <div class="flex-initial bg-base-200 p-3 gap-3 flex justify-between">
    <a href="https://github.com/pheianox/zehrimar" target="_blank" class="btn btn-ghost">
      zehrimar
    </a>
    <div class="flex-1" />
    <button title="Run code (Ctrl + Enter)" aria-label="run" class="btn btn-ghost" onclick={run}>
      run
    </button>
    <button title="Force stop execution (Ctrl + \)" aria-label="kill" class="btn btn-ghost text-error disabled:bg-transparent disabled:text-error disabled:opacity-30" disabled={isRuntimeStopped()} onclick={kill}>
      kill
    </button>
    <select class="select select-ghost bg-transparent" onchange={event => changeScriptLanguage(event.currentTarget.value as ScriptLanguage)}>
      <option disabled>Language</option>
      <For each={Object.entries(ScriptLanguage)}>
        {([key, value]) => (
          <option value={value} selected={value === config.scriptLanguage}>{key}</option>
        )}
      </For>
    </select>
    <p class="capitalize btn btn-ghost  pointer-events-none">
      latest
    </p>
    <div class="flex-1" />
    <label title="Theme" class="btn btn-ghost swap swap-rotate">
      <input type="checkbox" checked={config.isDarkMode} onchange={toggleDarkMode}/>
      <TbSun class="swap-on w-5 h-5"/>
      <TbMoon class="swap-off w-5 h-5"/>
    </label>
    <button title="Maximize/minimize" aria-label="fullscreen" class="btn btn-ghost" onclick={toggleFullScreen}>
      <TbMaximize class="w-5 h-5"/>
    </button>
  </div>
)

const Footer: Component = () => (
  <div class="flex-initial p-3 flex gap-3 bg-base-200 cursor-default select-none">
    <span>Ln {cursorPosition()[0]}</span>
    <span>Col {cursorPosition()[1]}</span>
    <span>{config.fontSize}px {editorDefaultConfig.fontFamily}</span>
    <span>[{isCodeSaved() ? 'saved' : 'not saved'}]</span>
    
    <div class="flex-1" />  

    <div title="Log count" class="flex gap-2 items-center">
      <TbClearAll size="20" /> 
      {output().echoeCount}
    </div>
    <div title="Error count" class="text-error flex gap-2 items-center">
      <TbAlertOctagon size="20" /> 
      {output().errorCount}
    </div>
  </div>
)

const Console: Component = () => (
  <div ref={rightPaneElement} class="flex flex-col">
    <div class="py-3 pl-1 pr-3 flex gap-3 justify-between">
      <button title="Clear logs" aria-label="clear" class="btn btn-ghost btn-sm gap-2" onclick={resetOutput}>
        clear
      </button>
      <button title="Clear logs on every run" aria-label="auto clear" class="btn btn-ghost btn-sm no-animation" onclick={toggleConsoleAutoClean}>
        auto clear 
        ({config.isConsoleAutoClean ? 'on' : 'off'})
      </button>
      <div class="flex-1" />
      <button title="Exoport logs as JSON" aria-label="export" class="btn btn-ghost btn-sm" onclick={exportConsole}>
        export
      </button>
    </div>
    <div ref={consoleElement} class="pl-3 py-4 flex-1 gap-4 flex flex-col text-xl leading-relaxed scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-base-100 hover:scrollbar-thumb-accent-focus overflow-y-scroll">
      <For each={output().items} fallback={<div class="w-full h-full grid place-items-center select-none"><div>Console is empty</div></div>}>
        {output => output instanceof Error 
          ? <pre class="text-error">{output.message}</pre>
          : <pre>{output}</pre>
        }
      </For>
    </div>
  </div>
)

const Application: Component = () => {
  onMount(init)
  return (
    <>
      <Navbar />
      <div class="flex-auto min-h-0 flex">
        <div ref={leftPaneElement} />
        <Console />
      </div>
      <Footer />
    </>
  )
}


render(() => <Application />, document.body);
