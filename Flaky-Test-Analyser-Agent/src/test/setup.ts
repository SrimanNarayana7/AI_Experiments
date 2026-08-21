import '@testing-library/jest-dom';

/**
 * jsdom's File implementation predates the File.text() API.
 * Polyfill it so upload validation works in tests.
 */
if (typeof File !== 'undefined' && typeof File.prototype.text !== 'function') {
  Object.defineProperty(File.prototype, 'text', {
    value: function text(): Promise<string> {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.readAsText(this);
      });
    },
    configurable: true,
    writable: true,
  });
}
