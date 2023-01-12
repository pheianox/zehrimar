import SplitJS from 'split.js'

function init(leftElement: HTMLDivElement, rightElement: HTMLDivElement) {
  SplitJS([leftElement, rightElement], {
    gutterSize: 15,
    sizes: [70, 30],
  })
}

export default { init }