// Async Web Worker setup borrowed from
// https://github.com/dominique-mueller/create-react-app-typescript-web-worker-setup
import { expose } from 'comlink';
//TODO: Decide if it's OK not to have the following line. The guide recommends
//it, but it doesn't work right now.
//declare const self: DedicatedWorkerGlobalScope;
export default {} as typeof Worker & { new (): Worker };

export const api = {
  createMessage: (name: string): string => {
    return `Hello ${name}!`;
  },
};

expose(api);
