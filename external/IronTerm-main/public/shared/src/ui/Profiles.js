// Persists named connection profiles in localStorage.
//
// A profile is just a snapshot of the toolbar inputs. We expose them
// through a <select> next to the bridge URL so users can store host
// presets and switch between sandboxes (pub400, Hercules, corporate)
// without retyping every time.
//
// The storage key is supplied by the caller so the TN3270 and TN5250
// clients keep their profile lists in separate namespaces and can't
// trample each other's saved hosts.

export class Profiles {
    /**
     * @param {object} els
     * @param {HTMLSelectElement} els.select
     * @param {HTMLButtonElement} els.saveBtn
     * @param {HTMLButtonElement} els.deleteBtn
     * @param {object} fields  { bridge, host, port, model } - input/select elements
     * @param {object} [options]
     * @param {string} [options.storageKey] localStorage key (default: 'ironterm.tn3270.profiles')
     */
    constructor (els, fields, options = {}) {
        this.select    = els.select;
        this.saveBtn   = els.saveBtn;
        this.deleteBtn = els.deleteBtn;
        this.fields    = fields;
        this.storageKey = options.storageKey || 'ironterm.tn3270.profiles';

        this.list = this.#readAll();
        this.#refreshSelect();

        this.select.addEventListener('change', () => this.#applySelected());
        this.saveBtn.addEventListener('click',  () => this.#promptSave());
        this.deleteBtn.addEventListener('click',() => this.#deleteSelected());
    }

    #readAll () {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    #writeAll (list) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(list));
        } catch { /* quota / private mode - silently ignore */ }
    }

    #refreshSelect () {
        const cur = this.select.value;
        this.select.innerHTML = '';
        const blank = document.createElement('option');
        blank.value = '';
        blank.textContent = this.list.length === 0 ? '(no profiles)' : '- pick a profile -';
        this.select.appendChild(blank);
        for (const p of this.list) {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.textContent = p.name;
            this.select.appendChild(opt);
        }
        if (cur && this.list.some(p => p.name === cur))
            this.select.value = cur;
        this.deleteBtn.disabled = this.list.length === 0;
    }

    #applySelected () {
        const name = this.select.value;
        if (!name) return;
        const p = this.list.find(x => x.name === name);
        if (!p) return;
        // Tolerant of profiles saved with a different field shape - older
        // versions persisted a "host" field that we no longer surface.
        for (const key of Object.keys(this.fields)) {
            const el = this.fields[key];
            if (!el) continue;
            const v = p[key];
            if (v == null) continue;
            el.value = String(v);
        }
        if (this.fields.model)
            this.fields.model.dispatchEvent(new Event('change'));
    }

    #promptSave () {
        const suggested = (this.fields.port?.value || 'profile').trim();
        const name = window.prompt('Profile name', suggested);
        if (!name) return;
        const profile = { name: name.trim() };
        for (const key of Object.keys(this.fields)) {
            const el = this.fields[key];
            if (el) profile[key] = el.value;
        }
        const existing = this.list.findIndex(p => p.name === profile.name);
        if (existing >= 0) {
            if (!window.confirm(`Replace existing profile "${profile.name}"?`)) return;
            this.list[existing] = profile;
        } else {
            this.list.push(profile);
        }
        this.#writeAll(this.list);
        this.#refreshSelect();
        this.select.value = profile.name;
    }

    #deleteSelected () {
        const name = this.select.value;
        if (!name) return;
        if (!window.confirm(`Delete profile "${name}"?`)) return;
        this.list = this.list.filter(p => p.name !== name);
        this.#writeAll(this.list);
        this.#refreshSelect();
    }
}
