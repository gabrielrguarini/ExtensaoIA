import { SimulatedEngine } from './simulated-engine';

const engine = new SimulatedEngine((event) => {
  globalThis.postMessage(event);
});
globalThis.addEventListener('message', (event: MessageEvent<unknown>) => {
  engine.receive(event.data);
});
globalThis.postMessage({ type: 'ready', simulated: true });
