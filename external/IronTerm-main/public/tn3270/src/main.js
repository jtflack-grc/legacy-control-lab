// Bootstraps the page: wires the toolbar controls to the Terminal
// orchestrator, builds the WebSocket URL, hooks AID buttons, and
// loads/persists named connection profiles in localStorage.

import { Terminal } from './Terminal.js';
import { Profiles } from '../../shared/src/ui/Profiles.js';
import { aidFromName } from './proto/Constants.js';

function buildWsUrl (raw, port) {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    // Bridge URL is used as-is, with one substitution: any literal
    // "{port}" is replaced by the port field - lets a single relay route
    // to several backend services without retyping the whole URL.
    return trimmed.replaceAll('{port}', encodeURIComponent(port));
}

function main () {
    const $ = (id) => document.getElementById(id);

    const canvas      = $('terminal');
    const statusEl    = $('status');
    const portEl      = $('port');
    const bridgeEl    = $('bridge');
    const modelEl     = $('model');
    const codePageEl  = $('codePage');
    const connectBtn  = $('connect');
    const disconnectBtn = $('disconnect');
    const ruleToggleBtn = $('ruleToggle');

    const oiaEls = {
        conn:   $('oiaConn'),
        sys:    $('oiaSys'),
        lock:   $('oiaLock'),
        insert: $('oiaInsert'),
        alarm:  $('oiaAlarm'),
        xfer:   $('oiaXfer'),
        model:  $('oiaModel'),
        cursor: $('oiaCursor'),
    };
    const nvtEl = $('nvt');

    const terminal = new Terminal({ canvas, statusEl, oiaEls, nvtEl,
                                     codePage: codePageEl.value });
    // Expose for devtools so you can poke at `terminal.indFile`,
    // `terminal.screen`, etc. when debugging a flaky session.
    window.terminal = terminal;

    new Profiles(
        { select: $('profiles'), saveBtn: $('profileSave'), deleteBtn: $('profileDelete') },
        { bridge: bridgeEl, port: portEl, model: modelEl, codePage: codePageEl },
        { storageKey: 'ironterm.tn3270.profiles' },
    );

    modelEl.addEventListener('change', () => {
        terminal.setModel(parseInt(modelEl.value, 10));
    });
    codePageEl.addEventListener('change', () => {
        terminal.setCodePage(codePageEl.value);
    });

    connectBtn.addEventListener('click', () => {
        const url = buildWsUrl(bridgeEl.value, portEl.value);
        if (!url) {
            terminal.setStatus('error: bridge URL is required', 'error');
            return;
        }
        terminal.setModel(parseInt(modelEl.value, 10));
        terminal.connect({ url });
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
    });

    disconnectBtn.addEventListener('click', async () => {
        await terminal.disconnect();
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
    });

    ruleToggleBtn.addEventListener('click', () => {
        const on = !ruleToggleBtn.classList.contains('active');
        ruleToggleBtn.classList.toggle('active', on);
        terminal.renderer.setRuleEnabled(on);
    });

    document.getElementById('downloadBtn').addEventListener('click', () => {
        terminal.requestDownload();
    });
    document.getElementById('uploadBtn').addEventListener('click', () => {
        terminal.pickUploadFile();
    });

    document.querySelectorAll('.aid-bar button').forEach(btn => {
        btn.addEventListener('click', () => {
            const code = aidFromName(btn.dataset.aid);
            if (code !== null) terminal.sendAid(code);
        });
    });
}

if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', main);
else
    main();
