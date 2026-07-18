// Operator Information Area for TN5250. Stays on the page below the
// terminal canvas, showing connection / keyboard / input mode / msg
// light / alarm / model / cursor.
//
// Every cell is one short ASCII string - no emoji - so the OIA bar
// keeps a constant line-height. Emoji glyphs (e.g. 🔒) have a taller
// intrinsic line-height than ASCII letters in most fonts, and when
// the OIA bar grows the .terminal-stage above it shrinks, which
// resizes the canvas and produces the "canvas pulsing" effect you
// see during fast state changes.

export class Oia {
    /** @param {object} els  pre-resolved DOM nodes */
    constructor (els) {
        this.conn   = els.conn;
        this.sys    = els.sys;
        this.lock   = els.lock;
        this.insert = els.insert;
        this.alarm  = els.alarm;
        this.msg    = els.msg;
        this.model  = els.model;
        this.cursor = els.cursor;

        this.alarmTimer = null;
        this.setConnection('disconnected');
        this.setLocked(true);
        this.setInsert(false);
        this.setMessageLight(false);
    }

    setConnection (state) {
        if (!this.conn) return;
        this.conn.className = `oia-cell oia-conn ${state}`;
        const glyph = state === 'connected' ? '●'
                    : state === 'connecting' ? '◐'
                    : state === 'error' ? '✕' : '○';
        this.conn.textContent = glyph;
    }

    setSystem (label) {
        if (this.sys) this.sys.textContent = label || 'SYS';
    }

    setLocked (locked) {
        if (!this.lock) return;
        this.lock.classList.toggle('locked',   locked);
        this.lock.classList.toggle('unlocked', !locked);
        // 'X-f' = "system input inhibit" (5250 OIA convention),
        // matches what tn3270 shows. ASCII keeps the line-height stable.
        this.lock.textContent = locked ? 'X-f' : '▢';
        if (this.sys) this.sys.classList.toggle('locked', locked);
    }

    setMessageLight (on) {
        if (this.msg) this.msg.textContent = on ? 'MW' : '·';
    }

    setInsert (on) {
        if (!this.insert) return;
        this.insert.classList.toggle('on', on);
        this.insert.textContent = on ? '⟪I⟫' : '·';
    }

    setModel (text) {
        if (this.model) this.model.textContent = text || '-';
    }

    setCursor (row, col) {
        if (this.cursor)
            this.cursor.textContent =
                `R ${String(row).padStart(2, '0')} C ${String(col).padStart(3, '0')}`;
    }

    flashAlarm () {
        if (!this.alarm) return;
        this.alarm.textContent = '♪';
        this.alarm.classList.remove('flash');
        // Force reflow so the animation re-triggers each call.
        void this.alarm.offsetWidth;
        this.alarm.classList.add('flash');
        clearTimeout(this.alarmTimer);
        this.alarmTimer = setTimeout(() => {
            this.alarm.classList.remove('flash');
            this.alarm.textContent = '·';
        }, 1200);
    }
}
