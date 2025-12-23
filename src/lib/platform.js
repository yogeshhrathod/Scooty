export const isMac = (() => {
    if (typeof navigator !== 'undefined') {
        return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    }
    if (typeof process !== 'undefined') {
        return process.platform === 'darwin';
    }
    return false;
})();

export const isElectron = typeof window !== 'undefined' && 'electron' in window;
