// What a JSContext lacks that the emitted client reads: fetch and localStorage. Same text for both hosts.
globalThis.localStorage = globalThis.localStorage || {
  getItem(k) { return Object.prototype.hasOwnProperty.call(this, k) ? this[k] : null; },
  setItem(k, v) { this[k] = String(v); },
  removeItem(k) { delete this[k]; }
};
if (typeof globalThis.__nativeFetch === 'function') {
  globalThis.fetch = function (url, init) {
    init = init || {};
    return new Promise(function (resolve, reject) {
      __nativeFetch(init.method || 'GET', String(url), init.headers || {}, init.body === undefined ? null : init.body, function (status, text) {
        if (status === 0) reject(new TypeError('Failed to fetch'));
        else resolve({ status: status, ok: status >= 200 && status < 300, text: function () { return Promise.resolve(text); } });
      });
    });
  };
}
