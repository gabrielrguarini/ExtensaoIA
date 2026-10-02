/* global fetch, WebSocket, setTimeout, clearTimeout */
/** Observa também os Workers do offscreen, que eventos de página não cobrem. */
export async function observeBenchmarkNetwork(port, record) {
  const endpoint = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const socket = new WebSocket(endpoint.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let sequence = 0,
    workers = 0,
    requests = 0;
  const pending = new Map(),
    observed = new Set(),
    errors = [],
    consoleEvents = [];
  function command(sessionId, method, params = {}) {
    const id = ++sequence;
    const result = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error('Auditoria CDP timeout: ' + method));
      }, 10000);
      pending.set(id, { resolve, reject, timer });
    });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return result;
  }
  socket.addEventListener('message', (event) => {
    const value = JSON.parse(event.data);
    if (pending.has(value.id)) {
      const p = pending.get(value.id);
      clearTimeout(p.timer);
      pending.delete(value.id);
      value.error ? p.reject(new Error(value.error.message)) : p.resolve(value.result);
    }
    if (value.method === 'Network.requestWillBeSent') {
      const request = value.params.request,
        url = new URL(request.url);
      requests++;
      void record({
        origin: url.origin === 'null' ? url.protocol + '//' + url.host : url.origin,
        path: url.pathname,
        method: request.method,
        hasPostData: Boolean(request.hasPostData),
      });
    }
    if (value.method === 'Runtime.consoleAPICalled')
      consoleEvents.push({ type: value.params.type, arguments: value.params.args.length });
    if (value.method === 'Target.targetCreated' || value.method === 'Target.targetInfoChanged') {
      const info = value.params.targetInfo;
      if (info.url.endsWith('/offscreen.html') && !observed.has(info.targetId)) {
        observed.add(info.targetId);
        void command(undefined, 'Target.autoAttachRelated', {
          targetId: info.targetId,
          waitForDebuggerOnStart: true,
        }).catch((e) => errors.push(String(e)));
      }
    }
    if (value.method === 'Target.attachedToTarget') {
      const sessionId = value.params.sessionId;
      void (async () => {
        try {
          await command(sessionId, 'Network.enable');
          await command(sessionId, 'Runtime.enable');
          if (value.params.targetInfo.type === 'worker') workers++;
        } catch (error) {
          errors.push(String(error));
        } finally {
          await command(sessionId, 'Runtime.runIfWaitingForDebugger').catch((e) =>
            errors.push(String(e)),
          );
        }
      })();
    }
  });
  await command(undefined, 'Target.setDiscoverTargets', { discover: true });
  return {
    close() {
      for (const p of pending.values()) clearTimeout(p.timer);
      socket.close();
      return { workers, requests, errors, consoleEvents };
    },
  };
}
