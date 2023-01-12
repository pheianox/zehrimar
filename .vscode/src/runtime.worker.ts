// @ts-ignore
self.addEventListener('message', event => {
  const { code } = event.data
  new Function(code)()
})

console.log = function customLogger(...args: any[]) {
  let log = ''

  for (let i = 0; i < args.length; i++) {
    log += formatValue(args[i])
    if (i > 0 && i < args.length - 1) {
      log += ' '
    }
  }
  
  self.postMessage(log)
}

function formatValue(log: any) : string {
  switch (typeof log) {
    case "bigint":
      log = log.toString() + 'n'
      // must fall down
    case "number": 
    case "boolean": 
      return log + ''
    case "string": 
      return '"' + log + '"'
    case "undefined":
      return "undefined"
    case "symbol":
      return "<symbol>"
    case 'function':
      return log.name ? 'func ' + log.name + '()' : 'anon func ()'
  }
  
  if (Array.isArray(log)) {
    return `[ ${log.map(x => formatValue(x)).join(', ')} ]`
  }

  if (log === null) return "null"

  switch(log.constructor.name) {
    case 'Promise': 
      return '<Promise>'
    case 'Object': 
      return formatObject(log, 2, undefined, 2)
    default: 
      return `${log.constructor.name} ${formatObject(log, 2, undefined, 2)}`
  }
}

function formatObject(value: any, depth: number, replacer?: (this: any, key: string, value: any) => any, space?: string | number, onGetObjID?: (val: object) => string): string {
  depth = isNaN(+depth) ? 1 : depth;
  var recursMap = new WeakMap();
  function _build(val: any, depth: number, o?: any, a?: boolean, r?: boolean) {
      return !val || typeof val != 'object' ? val
          : (r = recursMap.has(val),
              recursMap.set(val, true),
              a = Array.isArray(val),
              r ? (o = onGetObjID && onGetObjID(val) || null) : JSON.stringify(val, function (k, v) { if (a || depth > 0) { if (replacer) v = replacer(k, v); if (!k) return (a = Array.isArray(v), val = v); !o && (o = a ? [] : {}); o[k] = _build(v, a ? depth : depth - 1); } }),
              o === void 0 ? (a?[]:{}) : o);
  }
  return JSON.stringify(_build(value, depth), null, space);
}