// @ts-ignore
console = {
  debug: customLogger,
  dir: customLogger,
  dirxml: customLogger,
  error: customLogger,
  group: customLogger,
  info: customLogger,
  log: customLogger,
  trace: customLogger,
  warn: customLogger,
  groupCollapsed: customLogger,
  assert: throwNotSupported.bind(null, 'console.assert'),
  clear: throwNotSupported.bind(null, 'console.clear'),
  count: throwNotSupported.bind(null, 'console.count'),
  countReset: throwNotSupported.bind(null, 'console.countReset'),
  table: throwNotSupported.bind(null, 'console.table'),
  time: throwNotSupported.bind(null, 'console.time'),
  timeEnd: throwNotSupported.bind(null, 'console.timeEnd'),
  timeLog: throwNotSupported.bind(null, 'console.timeLog'),
  timeStamp: throwNotSupported.bind(null, 'console.timeStamp'),
  groupEnd: throwNotSupported.bind(null, 'console.groupEnd'),
}

self.addEventListener('message', messageHandler)


function throwNotSupported(method: string) {
  throw new Error(`${method} is not supported`)
}

function messageHandler(event: MessageEvent) {
  const { code } = event.data
  new Function(code)()
}

function customLogger(...args: any[]) {
  let log = ''

  for (let i = 0; i < args.length; i++) {
    log += valueFormatter(args[i])
    if (i < args.length - 1) {
      log += ' '
    }
  }
  
  self.postMessage(log)
}

function valueFormatter(log: any) : string {
  switch (typeof log) {
    case "bigint":
      log = log.toString() + 'n'
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
    return `[ ${log.map(x => valueFormatter(x)).join(', ')} ]`
  }

  if (log === null) return "null"

  switch(log.constructor.name) {
    case 'Promise': 
      return '<Promise>'
    case 'Object': 
      return objectFormatter(log, 2, undefined, 2)
    default: 
      return `${log.constructor.name} ${objectFormatter(log, 2, undefined, 2)}`
  }
}

function objectFormatter(value: any, depth: number, replacer?: (this: any, key: string, value: any) => any, space?: string | number, onGetObjID?: (val: object) => string): string {
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