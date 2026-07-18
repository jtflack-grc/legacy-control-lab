// Bootstrap for the TN5250 page: wires toolbar controls to the Terminal
// orchestrator, builds the WebSocket URL, and persists profiles in
// localStorage under a 5250-specific key.

import { Terminal } from './Terminal.js';
import { Profiles } from '../../shared/src/ui/Profiles.js';
import { aidFromName, Models } from './proto/Constants.js';

function buildWsUrl (raw, port) {
    const trimmed = raw.trim();
    if (!trimmed) return null;
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
    const devnameEl   = $('devname');
    const userEl      = $('user');
    const passwordEl  = $('password');
    const connectBtn  = $('connect');
    const disconnectBtn = $('disconnect');

    const oiaEls = {
        conn:   $('oiaConn'),
        sys:    $('oiaSys'),
        lock:   $('oiaLock'),
        insert: $('oiaInsert'),
        alarm:  $('oiaAlarm'),
        msg:    $('oiaMsg'),
        model:  $('oiaModel'),
        cursor: $('oiaCursor'),
    };
    const nvtEl = $('nvt');

    const terminal = new Terminal({ canvas, statusEl, oiaEls, nvtEl,
                                     codePage: codePageEl.value,
                                     modelKey: modelEl.value });
    window.terminal = terminal;

    new Profiles(
        { select: $('profiles'), saveBtn: $('profileSave'), deleteBtn: $('profileDelete') },
        { bridge: bridgeEl, port: portEl, model: modelEl, codePage: codePageEl,
          devname: devnameEl, user: userEl },
        { storageKey: 'ironterm.tn5250.profiles' },
    );

    modelEl.addEventListener('change', () => {
        terminal.setModel(modelEl.value);
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
        terminal.setModel(modelEl.value);
        // Build the env-options payload for NEW-ENVIRON.
        const envOptions = {
            devName:  devnameEl.value.trim() || 'IRONTERM',
            kbdType:  'USB',
            codePage: codePageEl.value === 'CP1141' ? '1141'
                      : codePageEl.value === 'CP500'  ? '500'
                      : '037',
            charset:  '697',
        };
        if (userEl.value.trim())     envOptions.user     = userEl.value.trim().toUpperCase();
        if (passwordEl.value)        envOptions.password = passwordEl.value;
        terminal.setEnvOptions(envOptions);

        terminal.connect({ url });
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
    });

    disconnectBtn.addEventListener('click', async () => {
        await terminal.disconnect();
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
    });

    document.querySelectorAll('.aid-bar button').forEach(btn => {
        btn.addEventListener('click', () => {
            const code = aidFromName(btn.dataset.aid);
            if (code !== null) terminal.sendAid(code);
        });
    });

    // Populate model select from the Models table so we stay in sync.
    void Models;
}

if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', main);
else
    main();
