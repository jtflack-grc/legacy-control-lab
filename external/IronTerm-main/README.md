# IronTerm

Browser-side IBM 3270 terminal, plus a 5250 client for IBM i / AS/400
(beta). No backend, no server-side code, no runtime build step - just
static files served over HTTP. The datastreams and TN3270E / TN5250E
telnet negotiation are implemented in plain JavaScript modules running
in the page; the page connects to the host through any websockify-style
TCP↔WebSocket relay.

## Quick start

You need three things: this repo, a static HTTP server, and a
WebSocket-to-TCP bridge that forwards binary frames to your host.

### 1. Serve the static files

```sh
cd public
python3 -m http.server 8080
# → open http://localhost:8080/
```

The index page lets you pick the protocol - **1** opens the TN3270
client (`/tn3270/`), **2** opens the TN5250 client (`/tn5250/`). Any
static server works; nothing in the project requires a build step.

### 2. Run a TCP↔WebSocket bridge

[websockify](https://github.com/novnc/websockify) is the simplest
option. To expose a Hercules MVS turnkey listening on `localhost:3270`
(for TN3270):

```sh
websockify 0.0.0.0:6080 localhost:3270
```

Or to point the TN5250 client at the public IBM i at pub400.com:

```sh
websockify 0.0.0.0:6080 pub400.com:23
```

For multi-target routing, websockify also supports a token file or you
can put an nginx in front. The terminal sends `binary` as the WebSocket
subprotocol; websockify accepts it by default.

**Or skip running your own bridge** - two public test instances are
already up:

```
wss://tk5.bencz.cc:6080        (Hercules MVS 3.8j Turnkey 5 - for TN3270)
wss://pub400.bencz.cc:6080     (pub400.com IBM i - for TN5250)
```

The MVS image is from [tk5-hercules](https://github.com/bencz/tk5-hercules);
the IBM i side relays to [pub400.com](https://pub400.com), where you
can register a free user profile. Drop the URL into the bridge field
and connect - no setup needed. TLS is terminated at the bridge, so the
page works fine when served over HTTPS. For testing only; don't use
real credentials.

### 3. Configure the page

In the toolbar, set the bridge URL - for example one of:

```
ws://localhost:6080/                            (single backend)
wss://tk5.bencz.cc:6080/                        (public test server)
wss://relay.example.com/tcp?port={port}         ({port} is substituted)
```

Pick the model (3278-2 default), press **Connect**, and the OIA at the
bottom turns green.

# Screenshots

## tn3270

<img width="1920" height="966" alt="image" src="https://github.com/user-attachments/assets/f5d7d630-b739-4a8e-8a0e-f2e2e8c9944b" />

---

<img width="1512" height="863" alt="image" src="https://github.com/user-attachments/assets/f8589863-12e0-454e-91a8-f8cc3b22954b" />

---

<img width="1512" height="864" alt="image" src="https://github.com/user-attachments/assets/46ca4c96-560d-44f5-976c-05218657eed5" />

## tn5250

<img width="1512" height="865" alt="image" src="https://github.com/user-attachments/assets/e5a7b892-4df0-4f20-8ce3-f0362250a2cc" />

---

<img width="1512" height="868" alt="image" src="https://github.com/user-attachments/assets/92d890ff-6012-4d58-9897-6217dbc5312d" />

---

<img width="1512" height="865" alt="image" src="https://github.com/user-attachments/assets/ba2b32a0-356b-4d81-92c2-ffda4d34e249" />

---

<img width="1511" height="866" alt="image" src="https://github.com/user-attachments/assets/1f2cda9e-8d4c-4f36-b3c8-f75ae12c34c4" />


## What works

**Telnet / TN3270E (RFC 2355):**

- BINARY, EOR, TERMINAL-TYPE option negotiation (RFC 1041)
- TN3270E DEVICE-TYPE / FUNCTIONS subnegotiation
  (BIND-IMAGE, RESPONSES, SYSREQ)
- 5-byte data-stream header on inbound and outbound records
- Outbound sequence numbers are unique and monotonically increasing
  (RFC 2355 §3.2)
- Dispatch by data-type - only `3270-DATA` is fed to the parser;
  `BIND-IMAGE` / `UNBIND` / `NVT-DATA` / `SSCP-LU-DATA` are accepted
  and ignored.
- ALWAYS-RESPONSE / ERROR-RESPONSE handled correctly:
  positive `RESPONSE` on success, negative `RESPONSE` (with sense byte)
  when the parser rejects a record, both echoing the host's seq.
- IAC NOP keepalive after 120 s idle.

**3270 datastream:**

- Commands: `W`, `EW`, `EWA`, `EAU`, `WSF`, `RB`, `RM`, `RMA`
  (both EBCDIC- and CCW-encoded forms accepted)
- Orders: `SBA`, `SF`, `SFE`, `SA`, `MF`, `IC`, `PT`, `RA`, `EUA`, `GE`
- WCC bits: `RESET-MDT`, `RESTORE-KEYBOARD`, `SOUND-ALARM`,
  `RESET-PARTITION`, `START-PRINTER`
- 12-bit and 14-bit buffer addresses (auto-detected on input,
  always 12-bit on output)
- Cyclic field model - fields that wrap around the end of the buffer
- Field MDT tracking; modified-field replies use `f.start + 1`
- Validation attributes (mandatory-fill / mandatory-entry) - terminal
  refuses the AID and parks the cursor on the offending field, just
  like a physical 3278.
- Set Reply Mode SF (0x09) is honoured - Read Buffer responses adapt
  to field / extended-field / character mode with the requested
  attribute list.

**Query Reply (sent in response to Read Partition Query):**

Summary, Usable Area, Character Sets, Color, Highlight, Reply Modes,
Implicit Partition.

**File transfer - IND$FILE:**

- **Download** (host → browser): user types `IND$FILE GET dataset` on
  TSO/CMS; the terminal collects the WSF data records (rectype 0x47,
  subtype 0x04), acknowledges each with the running buffer number,
  and on CLOSE triggers a browser download with the dataset name.
- **Upload** (browser → host): click **Upload…** in the toolbar,
  pick a local file, then run `IND$FILE PUT dataset` on TSO. The
  queued bytes are streamed back in 2 KB chunks in response to the
  host's 0x46 0x11 requests, terminated with an EOF error record.
- Works for both `FT:DATA` (binary/ASCII files) and `FT:MSG` (host
  status messages, surfaced as a flash status).
- Compressed mode (`IND$FILE GET ... COMP`) is detected and refused
  with a clear message - use the default uncompressed transfer.

**Models supported (3270):**

| Model | Rows × Cols | TerminalType      |
|-------|-------------|-------------------|
| 2     | 24 × 80     | `IBM-3278-2-E`    |
| 3     | 32 × 80     | `IBM-3278-3-E`    |
| 4     | 43 × 80     | `IBM-3278-4-E`    |
| 5     | 27 × 132    | `IBM-3278-5-E`    |

**UI:**

- Canvas-rendered display with extended color (3279-class palette),
  highlighting (underscore, reverse video, intensify)
- OIA status bar - connection LED, keyboard lock, insert mode, alarm
  flash, terminal type, cursor R/C
- Insert-mode toggle (Insert key) with overflow alarm
- Mouse selection, copy / paste / select-all (⌘/Ctrl+C/V/A)
- Rule cross-hair (toggle in toolbar)
- NVT overlay for ASCII banners before BINARY is negotiated
- Connection profiles persisted in `localStorage`


## TN5250 (beta)

The 5250 client lives under `/tn5250/` and shares the toolbar, OIA,
canvas renderer, profile store, and EBCDIC tables with the 3270 side -
only the wire protocol and the datastream parser are separate.

It's tagged **beta** because it has had a lot less mileage on real
hardware than the 3270 side. Signon, WTD, input fields and AID keys
work against pub400 and IBM i 7.x; ENPTUI is wired up but not all
primitives have been exercised end-to-end. Expect rough edges - please
file issues with a screenshot and the host you hit them on.

**Telnet / TN5250E (RFC 1205, RFC 4777):**

- BINARY, EOR, TERMINAL-TYPE, NEW-ENVIRON negotiation
- NEW-ENVIRON variables: `DEVNAME`, `KBDTYPE`, `CODEPAGE`, `CHARSET`,
  and the bypass-signon set (`IBMRSEED`, `USER`, `IBMSUBSPWD`)
- 10-byte GDS record header on inbound and outbound records
- GDS opcodes: NO-OP, INVITE, OUTPUT-ONLY, PUT-GET, SAVE/RESTORE-SCREEN,
  READ-IMMEDIATE, MESSAGE-LIGHT on/off
- ATTN / SYSREQ flags surfaced through the OIA

**5250 datastream:**

- Commands: `WTD`, `WEC`, `WECW` (write error code to window),
  `CLEAR-UNIT`, `CLEAR-UNIT-ALT`, `CLEAR-FORMAT-TABLE`,
  `READ-INPUT-FIELDS`, `READ-MDT-FIELDS`, `READ-MDT-IMMEDIATE-ALT`,
  `READ-SCREEN-IMMEDIATE`, `READ-SCREEN-TO-PRINT`,
  `WRITE-STRUCTURED-FIELD`, `SAVE-SCREEN`, `RESTORE-SCREEN`, `ROLL`
- Orders: `SOH`, `RA`, `EA`, `ESC`, `TD`, `SBA`, `WEA`, `IC`, `MC`,
  `WTDSF`, `SF`
- Basic attribute table (0x20-0x3F) - color, reverse, underline,
  blink, column separator, non-display
- Field Format Word - bypass, dup, MDT, auto-enter, FER, monocase,
  mandatory, right-adjust / zero-fill
- AID keys: Enter, Clear, Help, PF1-24, Roll Up / Down / Left / Right,
  Print, Attn, SysReq
- Bypass-signon: optional `USER` / password fields in the toolbar
  short-circuit the standard signon panel (RFC 4777 §5)

**ENPTUI (partial):**

- WDSF (Write to Display Structured Field) decoder
- Primitives: Window, ScrollBar, Selection Field
- Not yet covered: menu bars, choice presentation with cursor
  progression, the full set of WDSF minor structures

**Models supported (5250):**

| Model       | Rows × Cols | Notes                  |
|-------------|-------------|------------------------|
| `5251-11`   | 24 × 80     | mono                   |
| `5291-1`    | 24 × 80     | mono                   |
| `5292-2`    | 24 × 80     | color, ENPTUI (default)|
| `3196-A1`   | 24 × 80     | mono                   |
| `3179-2`    | 24 × 80     | color                  |
| `3180-2`    | 27 × 132    | mono                   |
| `3477-FC`   | 27 × 132    | color                  |
| `3477-FG`   | 27 × 132    | mono                   |


## Encoding

Two EBCDIC code pages ship today, switchable from the toolbar dropdown
and persisted per connection profile:

- **CP037** - US English EBCDIC. Default. Used by classic z/OS, Hercules
  turnkey, pub400 (IBM i), and most legacy mainframe shops.
- **CP1047** - Latin-1 Open Systems EBCDIC. The line-feed byte sits at
  0x15 instead of 0x25, plus a few special-character swaps (`¢`/`[`,
  `!`/`]`, `¬`/`^`, etc.). Used by USS / z/OS Unix and many modern
  hosts that interoperate with ASCII tooling.

Switching mid-session re-renders existing cells through the new table
immediately, no reconnect needed. Adding another code page is a 10-line
change - drop its delta map into `DELTAS` in `src/proto/Ebcdic.js`.


## Browser compatibility

Targets evergreen browsers (Chrome / Edge / Firefox / Safari). Uses
ES modules, private class fields (`#name`), `Uint8Array`, Web
Audio (for the alarm beep) and `localStorage` (for profiles).
No transpilation, no bundler.

For `wss://` with a self-signed certificate you have to visit
`https://<bridge-host>:<port>/` once and accept the cert; the browser
won't surface a TLS prompt during a WebSocket handshake.


## What's not implemented

This is the realistic gap list. Nothing here blocks day-to-day TSO /
CICS use on the 3270 side, or basic IBM i signon + green-screen use on
the 5250 side.

- **Other EBCDIC code pages** (CP500, CP297, CP285, …) - straightforward
  to add (delta maps in `Ebcdic.js`); CP037 + CP1047 ship today
- **DBCS / SO/SI** (Asian double-byte)
- **5250 printer sessions** - only display devices for now
- **5250 ENPTUI - full set** - Window / ScrollBar / Selection Field
  primitives are decoded, but menu bars and the long tail of WDSF
  minor structures aren't wired through yet
