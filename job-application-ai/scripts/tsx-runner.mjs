import os from 'node:os';
import Module from 'node:module';

const originalUserInfo = os.userInfo.bind(os);
const safeOs = new Proxy(os, {
  get(target, property, receiver) {
    if (property === 'userInfo') {
      return (...args) => {
        try {
          return originalUserInfo(...args);
        } catch {
          return {
            username: process.env.USERNAME || 'user',
            homedir: process.env.USERPROFILE || process.env.HOME || process.cwd(),
            shell: process.env.SHELL || '',
            uid: 0,
            gid: 0,
          };
        }
      };
    }

    return Reflect.get(target, property, receiver);
  },
});

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'node:os' || request === 'os') {
    return safeOs;
  }

  return originalLoad.call(this, request, parent, isMain);
};

await import('tsx/cli');
