import "./monaco.worker"
import * as Monaco from "monaco-editor";
import { createSignal } from "solid-js";

Monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true)
Monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true)

const MIN_FONT_SIZE = 10
const MAX_FONT_SIZE = 50
const FONT_SIZE_STEP = 5

let model = null as unknown as Monaco.editor.IModel
let editor = null as unknown as Monaco.editor.IStandaloneCodeEditor

const [cursorPosition, setCursorPosition] = createSignal({ column: 0, line: 0 })

function init(element: HTMLDivElement, language: string, value: string, fontSize: number, isDark: boolean, onCodeChange: Function) {

  model = Monaco.editor.createModel(value, language)

  editor = Monaco.editor.create(element, { 
    fontFamily: 'Space Mono',
    fontWeight: 'regular',
    fontLigatures: true,
    lineHeight: 1.5,
    automaticLayout: true,
    glyphMargin: false,
    padding: { top: 30, bottom: 30 },
    minimap: { enabled: false },
    renderWhitespace: 'none',
    insertSpaces: true,
    detectIndentation: false,
    acceptSuggestionOnEnter: 'off',
    theme: getTheme(isDark),
    fontSize,
    tabSize: 2,
    language, 
    value, 
    model, 
  })

  editor.onDidChangeCursorPosition(event => {
    setCursorPosition({
      column: event.position.column, 
      line: event.position.lineNumber
    })
  })

  editor.onDidChangeModelContent(() => onCodeChange(getCode()))
}

function increaseFontSize(fontSize: number){
  fontSize = Math.min(fontSize + FONT_SIZE_STEP, MAX_FONT_SIZE) 
  editor.updateOptions({ fontSize })
  return fontSize
}

function decreaseFontSize(fontSize: number) {
  fontSize = Math.max(fontSize - FONT_SIZE_STEP, MIN_FONT_SIZE) 
  editor.updateOptions({ fontSize  })
  return fontSize
}
function changeTheme(isDark: boolean) {
  editor.updateOptions({ theme: getTheme(isDark) })
}

function changeLanguage(language: string) {
  Monaco.editor.setModelLanguage(model, language)
}

function getTheme(isDark: boolean) {
  return isDark ? 'vs-dark' : 'vs-light'
}

function getCode() {
  return editor.getValue()
}

export default { 
  init, 
  getCode,
  changeTheme, 
  changeLanguage,
  cursorPosition, 
  increaseFontSize, 
  decreaseFontSize, 
}