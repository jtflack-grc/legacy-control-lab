// Operator Information Area - the bottom status bar a real 3270 has.
// Each glyph is a single indicator so the user can scan state at a
// glance: connection, keyboard lock, insert mode, alarm flash,
// negotiated terminal type, cursor position.

export class Oia {
    /** @param {object} els  pre-resolved DOM nodes */
    constructor (els) {
        this.conn   = els.conn;
        this.sys    = els.sys;
        this.lock   = els.lock;
        this.insert = els.insert;
        this.alarm  = els.alarm;
        this.xfer   = els.xfer;
        this.model  = els.model;
        this.cursor = els.cursor;

        this.alarmTimer = null;
        this.xferTimer = null;
        this.setConnection('disconnected');
        this.setLocked(true);
        this.setInsert(false);
        this.setTransfer('idle');
    }

    setConnection (state) {
        // state: 'disconnected' | 'connecting' | 'connected' | 'error'
        this.conn.className = `oia-cell oia-conn ${state}`;
        const glyph = state === 'connected' ? '●'
                    : state === 'connecting' ? '◐'
                    : state === 'error' ? '✕' : '○';
        this.conn.textContent = glyph;
    }

    setLocked (locked) {
        this.lock.classList.toggle('locked',   locked);
        this.lock.classList.toggle('unlocked', !locked);
        this.lock.textContent = locked ? 'X-f' : '▢';
        this.sys.classList.toggle('locked', locked);
    }

    setInsert (on) {
        this.insert.classList.toggle('on', on);
        this.insert.textContent = on ? '⟪I⟫' : '·';
    }

    setModel (text) {
        this.model.textContent = text || '-';
    }

    setCursor (row, col) {
        this.cursor.textContent = `R ${String(row).padStart(2, '0')} C ${String(col).padStart(3, '0')}`;
    }

    /** Transfer indicator: 'idle' | 'queued' | 'active' | 'done'. */
    setTransfer (state, label = null) {
        if (!this.xfer) return;
        this.xfer.classList.remove('queued', 'active', 'done');
        if (state !== 'idle') this.xfer.classList.add(state);
        const glyphs = { idle: '·', queued: '⇢', active: '⇄', done: '✓' };
        this.xfer.textContent = label ?? glyphs[state] ?? '·';
        clearTimeout(this.xferTimer);
        if (state === 'done')
            this.xferTimer = setTimeout(() => this.setTransfer('idle'), 3000);
    }

    flashAlarm () {
        this.alarm.textContent = '♪';
        this.alarm.classList.remove('flash');
        // Force reflow so the animation re-triggers each time.
        void this.alarm.offsetWidth;
        this.alarm.classList.add('flash');
        clearTimeout(this.alarmTimer);
        this.alarmTimer = setTimeout(() => {
            this.alarm.classList.remove('flash');
            this.alarm.textContent = '·';
        }, 1200);
    }
}
