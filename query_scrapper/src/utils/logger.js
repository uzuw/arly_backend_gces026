const prefix = () => new Date().toLocaleTimeString();

export default {
  info: (msg) => console.log(`${prefix()} [INFO] ${msg}`),
  warn: (msg) => console.warn(`${prefix()} [WARN] ${msg}`),
  error: (msg) => console.error(`${prefix()} [ERROR] ${msg}`),
};
