// Opt-in debug logger. Production runs are silent on `log`; turn
// scopes on from DevTools by setting `localStorage['ironterm.debug']`
// to a space-separated list of scope names (or `*` for all).
//
// Example:
//     localStorage['ironterm.debug'] = 'tn5250.terminal tn5250.parser';
//     localStorage['ironterm.debug'] = '*';   // everything
//
// `warn` and `error` are always live - they signal real problems and
// should reach the console regardless of opt-in state.

const ENABLED = (() => {
    try {
        const raw = localStorage.getItem('ironterm.debug') || '';
        return new Set(raw.split(/\s+/).filter(Boolean));
    } catch {
        return new Set();
    }
})();

function isOn (scope) {
    return ENABLED.has('*') || ENABLED.has(scope);
}

export function debugFor (scope) {
    const tag = `[${scope}]`;
    const on = isOn(scope);
    return {
        log:   on ? console.log.bind(console, tag) : () => {},
        warn:  console.warn.bind(console, tag),
        error: console.error.bind(console, tag),
    };
}
