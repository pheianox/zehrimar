import monaco from "./monaco"
import splitter from "./splitter"
import runtime, { Language } from "./runtime"
import { saveAs } from 'file-saver'
import { createStore  } from "solid-js/store"
import { Component, createSignal, For, onMount } from "solid-js"
import { TbAlertOctagon, TbClearAll, TbMaximize, TbMoon, TbSun } from 'solid-icons/tb'

const elements = {
  leftPane: null as unknown as HTMLDivElement,
  rightPane: null as unknown as HTMLDivElement,
  editorParent: null as unknown as HTMLDivElement,
  outputsParent: null as unknown as HTMLDivElement,
}

const defualtSettings = {
  language: Language.TypeScript,
  isConsoleAutoclear: false,
  isDarkMode: false,
  fontSize: 30
}

let savedCode = ''
const [settings, setSettings_] = createStore(loadSettings())
// @ts-ignore
const setSettings: typeof setSettings_ = (...args) => {
  // @ts-ignore
  setSettings_(...args)
  localStorage.setItem('settings', JSON.stringify(settings))
}

const [isSaved, setSaved] = createSignal(true)

function loadSettings() {
  const settingsStringified = localStorage.getItem('settings')
  if (settingsStringified) {
    const settingsObject = JSON.parse(settingsStringified)
    if (isSettingsValid(settingsObject)) {
      return settingsObject as typeof defualtSettings
    }
  }
  return defualtSettings
}

function isSettingsValid(object: object) {
  for (const key in defualtSettings) {
    if (!Object.hasOwn(object, key)) {
      return false
    }
  }
  return true
}

function init() {
  splitter.init(elements.leftPane, elements.rightPane)
  document.addEventListener('keydown', handleKeydown)
  monaco.init(elements.editorParent, settings.language, atob(location.hash.slice(1)), settings.fontSize, settings.isDarkMode, updateSaved)
  document.documentElement.dataset.theme =  getTheme(settings.isDarkMode)
}

function getTheme(isDark: boolean) {
  return isDark ? 'dark' : 'light'
}

function run() {
  if (settings.isConsoleAutoclear) runtime.resetOutput()
  runtime.exec(save(), settings.language)
}

function kill() {
  runtime.stop()
}

function save() {
  const code = monaco.getCode()
  window.location.hash = btoa(code)
  savedCode = code
  updateSaved(code)
  return code
}

function updateSaved(code: string) {
  setSaved(() => code === savedCode)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.ctrlKey) {
    switch (event.key) {
      case 'r': run(); 
        event.preventDefault()
        event.stopPropagation()
        break
      case 's': save(); 
        event.preventDefault()
        event.stopPropagation()
        break
      case 'k': kill(); 
        event.preventDefault()
        event.stopPropagation()
        break
      case '=': zoomIn(); break
      case '-': zoomOut(); break
    }
  }
}

function toggleDarkMode() {
  setSettings("isDarkMode", value => {
    const isDark = !value
    document.documentElement.dataset.theme = getTheme(isDark)
    monaco.changeTheme(isDark)
    return isDark
  })
}

export function scrollConsoleBottom() {
  elements.outputsParent.scrollTop = elements.outputsParent.scrollHeight
}

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
  }
}

function toggleConsoleAutoclear() {
  setSettings("isConsoleAutoclear", value => !value)
}

function exportConsole() {
  const data = runtime.output().items.map(output => output instanceof Error ? output.message : output)
  saveAs(new Blob([JSON.stringify(data)], { type: 'application/json'}), 'output.json')
}

function changeLanguage(language: Language) {
  monaco.changeLanguage(language)
  setSettings("language", language)
}

function zoomIn() {
  setSettings('fontSize', fontSize => monaco.increaseFontSize(fontSize))
}

function zoomOut() {
  setSettings('fontSize', fontSize => monaco.decreaseFontSize(fontSize))
}

const Navbar: Component = () => {
  return (
    <div class="flex-initial bg-base-200 p-2 flex justify-between">
      <a href="https://github.com/pheianox/zehrimar" target="_blank" class="btn btn-ghost">
        Playground
      </a>
      <div class="flex-1" />
      <button aria-label="run" class="btn btn-ghost" onclick={run}>
        run
      </button>
      <button aria-label="kill" class="btn btn-ghost text-error disabled:bg-transparent disabled:text-error disabled:opacity-30" disabled={runtime.isStopped()} onclick={kill}>
        kill
      </button>
      <select class="select select-ghost bg-transparent" onchange={event => changeLanguage(event.currentTarget.value as Language)}>
        <option disabled>Language</option>
        <For each={Object.entries(Language)}>
          {([key, value]) => (
            <option value={value} selected={value === settings.language}>{key}</option>
          )}
        </For>
      </select>
      <p class="capitalize btn btn-ghost  pointer-events-none">
        latest
      </p>
      <div class="flex-1" />
      <label class="btn btn-ghost swap swap-rotate">
        <input type="checkbox" checked={settings.isDarkMode} onchange={toggleDarkMode}/>
        <TbSun class="swap-on w-5 h-5"/>
        <TbMoon class="swap-off w-5 h-5"/>
      </label>
      <button aria-label="fullscreen" class="btn btn-ghost" onclick={toggleFullScreen}>
        <TbMaximize class="w-5 h-5"/>
      </button>
    </div>
  )
}

const Footer: Component = () => {
  return (
    <div class="flex-initial p-2 flex gap-2 bg-base-200">
      <span>Ln {monaco.cursorPosition().line}</span>
      <span>Col {monaco.cursorPosition().column}</span>
      <span>{settings.fontSize}px</span>
      <span>[{isSaved() ? 'saved' : 'unsaved'}]</span>
      <div class="flex-1" />  
      <div class="flex gap-2 items-center">
        <TbClearAll size="20" /> {runtime.output().echoCount}
      </div>
      <div class="text-error flex gap-2 items-center">
        <TbAlertOctagon size="20" /> {runtime.output().errorCount}
      </div>
    </div>
  )
}

const Editor: Component = () => {
  return (
    <div class="w-full h-full" ref={elements.editorParent}  />
  )
}

const Console: Component = () => {
  return (
    <div class="w-full h-full flex flex-col">
      <div class="py-3 pl-1 pr-3 flex gap-2 justify-between">
        <button aria-label="clear" class="btn btn-ghost btn-sm gap-2" onclick={runtime.resetOutput}>
          clear
        </button>
        <button aria-label="auto clear" class="btn btn-ghost btn-sm no-animation" onclick={toggleConsoleAutoclear}>
          auto clear 
          ({settings.isConsoleAutoclear ? 'on' : 'off'})
        </button>
        <div class="flex-1" />
        <button aria-label="export" class="btn btn-ghost btn-sm" onclick={exportConsole}>
          export
        </button>
      </div>
      <div ref={elements.outputsParent} class="pl-3 py-4 flex-1 gap-4 flex flex-col text-xl leading-relaxed scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-base-100 hover:scrollbar-thumb-accent-focus overflow-y-scroll">
        <For each={runtime.output().items} fallback={<div class="w-full h-full grid place-items-center"><div>Console is empty</div></div>}>
          {output => output instanceof Error 
            ? <pre class="text-error">{output.message}</pre>
            : <pre>{output}</pre>
          }
        </For>
      </div>
    </div>
  )
}



const App: Component = () => {
  onMount(init)
  return (
    <>
      <Navbar />
      <div class="flex-auto min-h-0 flex">
        <div ref={elements.leftPane}><Editor /></div>
        <div ref={elements.rightPane}><Console /></div>
      </div>
      <Footer />
    </>
  );
};

export default App
