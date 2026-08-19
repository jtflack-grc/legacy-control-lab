const LANE_CHOICE_KEY = "lab.lane.choice";
const LANE_REMEMBER_KEY = "lab.lane.remember";
const SKILL_PATH_KEY = "lab.skill.path";
const LAUNCHER_INTRO_KEY = "lab.launcher.introduced";

const DEMO_STEP_KEY = "lab.demo.step";
const DEMO_PATH_KEY = "lab.demo.path";
const DEMO_ACTIVE_KEY = "lab.demo.active";
const DEMO_AUTO_SIGNOFF_SEC = 60;
const IONGRC_STEP_KEY = "lab.iongrc.step";
const IONGRC_PACK_KEY = "lab.iongrc.pack";
const IONGRC_ACTIVE_KEY = "lab.iongrc.active";
const AGENT_AUTHORITY_ACTIVE_KEY = "lab.agent-authority.active";
const AGENT_AUTHORITY_SCENARIO_KEY = "lab.agent-authority.scenario";
const PLAYBOOK_PATH_KEY = "lab.playbook.path";
const MISSION_NOTES_PREFIX = "lab.mission.notes.";

const SKILL_PATHS = {
  governance: {
    user: "AUDIT",
    missionId: "CLAIMS-001",
    campaignId: "IBM-I-ACCESS-GOVERNANCE",
    storageLane: "auditor",
    label: "Governance",
  },
  blueteam: {
    user: "AUDIT",
    missionId: "CLAIMS-005",
    campaignId: "RED-BLUE-DETECT-RESPOND",
    playbookPath: "blueteam",
    storageLane: "auditor",
    label: "Blue Team",
  },
  redteam: {
    user: "APCLERK",
    missionId: "CLAIMS-007",
    campaignId: "RED-TEAM-STANDALONE",
    playbookPath: "redteam",
    storageLane: "auditor",
    label: "Red Team",
  },
  operator: {
    user: "QSECOFR",
    missionId: "OPERATOR-SESSION",
    storageLane: "operator",
    label: "Operator",
  },
  demo: {
    user: "DEMO",
    storageLane: "auditor",
    label: "Five-Minute Demo",
  },
  iongrc: {
    user: "IONGRC",
    password: "IONGRC",
    storageLane: "auditor",
    label: "i on GRC practice desk",
  },
  agentauthority: {
    user: "QSECOFR",
    missionId: "AA-001",
    storageLane: "operator",
    label: "Agent Authority",
  },
};

const MISSION_IONGRC_PACK = {
  "CLAIMS-001": "offboarding",
  "CLAIMS-002": "offboarding",
  "CLAIMS-003": "clause-8",
  "CLAIMS-004": "clause-6",
  "CLAIMS-005": "blue-team",
  "CLAIMS-006": "offboarding",
  "CLAIMS-008": "soc2",
  "HOSPITAL-002": "clause-8",
};

const LANE_PROFILES = {
  auditor: { user: "AUDIT", password: "TRAIN", label: "Auditor Sandbox" },
  operator: { user: "QSECOFR", password: "TRAIN", label: "Security Officer Sandbox" },
};

let cachedLaneCredentials = null;
let cachedLabSessionToken = null;
let agentAuthorityOperatorReady = false;
let terminalFrameRef = null;
let demoAutoSignoffTimer = null;
let demoAutoSignoffTickTimer = null;
let demoAutoSignoffSecondsLeft = 0;
let demoSystemName = "CLAIMS400";
let previousCollectedKeys = [];
let cachedControls = null;
let cachedAttemptId = null;
let disciplineTracked = false;
let disciplineBadgeShown = false;
let coachSystemName = "CLAIMS400";
let coachUserName = "AUDIT";
let activeMissionId = "CLAIMS-001";
let pendingCampaignQuest = null;
let startNextMissionImpl = null;
let activeNotesMissionId = null;
let missionNotesBound = false;

function updateRestartMissionButton(panelLane, missionPhase) {
  const btn = el("restart-mission");
  if (!btn) return;
  const skillPath = readStoredSkillPath();
  const show =
    panelLane === "auditor" &&
    skillPath !== "demo" &&
    skillPath !== "iongrc" &&
    Boolean(activeMissionId) &&
    activeMissionId !== "OPERATOR-SESSION" &&
    missionPhase !== "complete" &&
    panelLane !== "disconnected";
  btn.hidden = !show;
}

function formatLaneCredentialPair(lane) {
  const fromCache = cachedLaneCredentials?.[lane];
  const fallback = LANE_PROFILES[lane];
  const user = fromCache?.user || fallback?.user;
  const password = fromCache?.password || fallback?.password;
  if (!user) return "";
  return `${user} / ${password ?? ""}`;
}

function mergeLaneCredential(profile, fallback) {
  if (!profile && !fallback) return undefined;
  return {
    user: profile?.user || fallback?.user || "",
    password: profile?.password || fallback?.password || "",
    ...(fallback?.label ? { label: fallback.label } : {}),
  };
}

function applyLaneCredentials(credentials) {
  if (!credentials?.auditor || !credentials?.operator) return;
  const defaults = {
    auditor: LANE_PROFILES.auditor,
    operator: LANE_PROFILES.operator,
    apclerk: { user: "APCLERK", password: "TRAIN" },
    demo: { user: "DEMO", password: "TRAIN" },
    iongrc: { user: SKILL_PATHS.iongrc.user, password: SKILL_PATHS.iongrc.password },
  };
  // Production /api/lab/config may omit passwords; keep baked-in training hints.
  cachedLaneCredentials = {
    auditor: mergeLaneCredential(credentials.auditor, defaults.auditor),
    operator: mergeLaneCredential(credentials.operator, defaults.operator),
    apclerk: mergeLaneCredential(credentials.apclerk, defaults.apclerk),
    demo: mergeLaneCredential(credentials.demo, defaults.demo),
    iongrc: mergeLaneCredential(credentials.iongrc, defaults.iongrc),
  };
  if (cachedLaneCredentials.auditor.password) {
    LANE_PROFILES.auditor.password = cachedLaneCredentials.auditor.password;
  }
  if (cachedLaneCredentials.operator.password) {
    LANE_PROFILES.operator.password = cachedLaneCredentials.operator.password;
  }

  if (el("pick-governance-creds")) {
    el("pick-governance-creds").textContent = formatLaneCredentialPair("auditor");
  }
  if (el("pick-blueteam-creds")) {
    el("pick-blueteam-creds").textContent = formatLaneCredentialPair("auditor");
  }
  if (el("pick-operator-creds")) {
    el("pick-operator-creds").textContent = formatLaneCredentialPair("operator");
  }
  if (el("pick-redteam-creds") && cachedLaneCredentials.apclerk) {
    el("pick-redteam-creds").textContent = formatProfileCredentialPair(cachedLaneCredentials.apclerk);
  }
  if (el("pick-demo-creds") && cachedLaneCredentials.demo) {
    el("pick-demo-creds").textContent = formatProfileCredentialPair(cachedLaneCredentials.demo);
  }
  if (el("pick-demo-intro-creds") && cachedLaneCredentials.demo) {
    el("pick-demo-intro-creds").textContent = formatProfileCredentialPair(cachedLaneCredentials.demo);
  }
  if (el("pick-iongrc-creds")) {
    el("pick-iongrc-creds").textContent = formatProfileCredentialPair(cachedLaneCredentials.iongrc);
  }
  if (el("iongrc-cred-user")) {
    el("iongrc-cred-user").textContent = cachedLaneCredentials.iongrc.user;
    el("iongrc-cred-password").textContent = cachedLaneCredentials.iongrc.password || "IONGRC";
  }
  renderDemoCredentials(cachedLaneCredentials);
  const diveNote = el("demo-dive-password-note");
  if (diveNote) {
    const profiles = [
      cachedLaneCredentials.auditor,
      cachedLaneCredentials.operator,
      cachedLaneCredentials.demo,
      cachedLaneCredentials.apclerk,
    ];
    const allDefault = profiles.every((profile) => profile.password === "TRAIN");
    diveNote.textContent = allDefault
      ? "TRAIN"
      : profiles.map((profile) => `${profile.password} (${profile.user})`).join(" / ");
  }

  applySessionSignOnHint(null, cachedLaneCredentials);
}

function formatProfileCredentialPair(profile) {
  if (!profile) return "";
  return `${profile.user} / ${profile.password}`;
}

function renderDemoCredentials(credentials) {
  const demo = credentials?.demo ?? cachedLaneCredentials?.demo;
  if (!demo) return;
  if (el("demo-cred-user")) el("demo-cred-user").textContent = demo.user;
  if (el("demo-cred-password")) el("demo-cred-password").textContent = demo.password;
  if (el("demo-path-label")) {
    el("demo-path-label").textContent = `Five-Minute Demo · ${demo.user} / ${demo.password}`;
  }
}

function renderDemoScreenGuide(guide) {
  const card = el("demo-screen-guide-card");
  const headline = el("demo-screen-headline");
  const list = el("demo-screen-bullets");
  if (!card || !headline || !list) return;
  if (!guide) {
    card.classList.remove("matched");
    headline.textContent = "Click inside the green screen when you are ready.";
    list.replaceChildren();
    return;
  }
  card.classList.toggle("matched", Boolean(guide.matched));
  headline.textContent = guide.headline ?? "";
  list.replaceChildren();
  for (const line of guide.bullets ?? []) {
    const item = document.createElement("li");
    item.textContent = line;
    list.append(item);
  }
}

function handleDemoStepAdvance(payload) {
  if (typeof payload.demoStepAdvance !== "number") return;
  const demoActive = sessionStorage.getItem(DEMO_ACTIVE_KEY) === "1";
  if (!demoActive) return;
  const path = sessionStorage.getItem(DEMO_PATH_KEY) ?? "product";
  const step = Number(sessionStorage.getItem(DEMO_STEP_KEY) ?? "0");
  const next = payload.demoStepAdvance;
  if (next <= step) return;
  sessionStorage.setItem(DEMO_STEP_KEY, String(next));
  loadJson(
    `/api/lab/demo?path=${encodeURIComponent(path)}&step=${next}&system=${encodeURIComponent(coachSystemName)}`,
  )
    .then((demoPayload) => renderDemoStep(demoPayload))
    .catch(() => {});
}

function renderDemoCoachPoll(payload) {
  renderDemoScreenGuide(payload.demoScreenGuide);
  renderDemoPanelState(payload);
  applyLaneCredentials(payload.signOnCredentials);
  updateRestartMissionButton("demo");
  handleDemoStepAdvance(payload);
}

function handleIongrcStepAdvance(_payload) {
  /* Linear pack steps removed — context is screen-driven. */
}

function renderIongrcScreenGuide(guide) {
  const card = el("iongrc-screen-headline")?.closest(".iongrc-screen-card");
  if (!guide) {
    el("iongrc-screen-headline").textContent = "Navigate menus or run a command — article excerpts follow the active screen.";
    fillList(el("iongrc-screen-bullets"), [], () => {});
    return;
  }
  el("iongrc-screen-headline").textContent = guide.headline ?? "";
  fillList(el("iongrc-screen-bullets"), guide.bullets ?? [], (node, line) => {
    node.textContent = line;
  });
  card?.classList.toggle("demo-screen-guide-active", Boolean(guide.matched));
}

function renderIongrcTrainingPaths(payload) {
  const container = el("iongrc-training-paths");
  const section = el("iongrc-training-section");
  if (!container) return;
  container.replaceChildren();
  const groups = payload.trainingGroups ?? [];
  if (!groups.length) {
    section?.setAttribute("hidden", "");
    return;
  }
  section?.removeAttribute("hidden");
  if (payload.gettingStarted && payload.featuredArticles?.length) {
    const featured = document.createElement("section");
    featured.className = "iongrc-training-group";
    const heading = document.createElement("h4");
    heading.textContent = "Featured starting points";
    featured.append(heading);
    const list = document.createElement("ul");
    list.className = "tips iongrc-featured-list";
    for (const row of payload.featuredArticles) {
      const item = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "link-quiet link-btn iongrc-article-pick";
      btn.textContent = row.title;
      btn.onclick = () =>
        loadIongrcContext({ articleId: row.id, screenId: payload.screenId }).catch(() => {});
      item.append(btn);
      const detail = document.createElement("span");
      detail.className = "iongrc-featured-detail";
      const badge = row.labStatusLabel ? `${row.labStatusLabel} · ` : "";
      detail.textContent =
        badge +
        (row.practiceHint ?? row.commandContexts?.[0]?.contextLine ?? row.hook ?? "");
      if (detail.textContent) item.append(document.createElement("br"), detail);
      if (row.url) {
        const ext = document.createElement("a");
        ext.className = "demo-article-link iongrc-inline-link";
        ext.href = row.url;
        ext.target = "_blank";
        ext.rel = "noopener noreferrer";
        ext.textContent = "LinkedIn";
        item.append(document.createTextNode(" · "));
        item.append(ext);
      }
      list.append(item);
    }
    featured.append(list);
    container.append(featured);
  }
  for (const group of groups) {
    const block = document.createElement("section");
    block.className = "iongrc-training-group";
    const heading = document.createElement("h4");
    heading.textContent = group.label;
    block.append(heading);
    if (group.pathIntro ?? group.description) {
      const desc = document.createElement("p");
      desc.className = "briefing iongrc-path-desc";
      desc.textContent = group.pathIntro ?? group.description;
      block.append(desc);
    }
    const list = document.createElement("ul");
    list.className = "tips iongrc-path-articles";
    for (const row of group.articles ?? []) {
      const item = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "link-quiet link-btn iongrc-article-pick";
      btn.textContent = row.title;
      btn.onclick = () =>
        loadIongrcContext({ articleId: row.id, screenId: payload.screenId }).catch(() => {});
      item.append(btn);
      const badge = row.labStatusLabel ? `[${row.labStatusLabel}] ` : "";
      const hint = row.commandContexts?.[0]?.contextLine ?? row.hook;
      if (badge || hint) {
        const detail = document.createElement("span");
        detail.className = "iongrc-path-article-detail";
        item.append(document.createElement("br"), detail);
        detail.textContent = `${badge}${hint ?? ""}`.trim();
      }
      list.append(item);
    }
    block.append(list);
    container.append(block);
  }
}

function iongrcCommandContexts(payload, primary) {
  if (primary?.commandContexts?.length) return primary.commandContexts;
  const legacy = payload.suggestedCommands ?? primary?.commands ?? [];
  if (legacy.length && typeof legacy[0] === "string") {
    return legacy.map((command) => ({ command, contextLine: command }));
  }
  return legacy;
}

function renderIongrcIbmReference(primary) {
  const section = el("iongrc-ibm-reference");
  const body = el("iongrc-ibm-reference-body");
  if (!section || !body) return;
  body.replaceChildren();
  const contexts = (primary?.commandContexts ?? []).filter((row) => row.ibmReference);
  const refs = contexts.length
    ? contexts.map((row) => row.ibmReference)
    : primary?.ibmReference
      ? [primary.ibmReference]
      : [];
  if (!refs.length) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  for (const ref of refs.slice(0, 3)) {
    const block = document.createElement("div");
    block.className = "iongrc-ibm-ref-block";
    const title = document.createElement("p");
    title.className = "mono iongrc-ibm-ref-command";
    title.textContent = ref.displayName ? `${ref.command} — ${ref.displayName}` : ref.command;
    block.append(title);
    const summary = document.createElement("p");
    summary.className = "briefing iongrc-ibm-ref-summary";
    summary.textContent = ref.summary;
    block.append(summary);
    if (ref.parameters?.length) {
      const params = document.createElement("ul");
      params.className = "tips iongrc-ibm-ref-params";
      for (const param of ref.parameters.slice(0, 4)) {
        const item = document.createElement("li");
        item.textContent = param.label ? `${param.name} (${param.label})` : param.name;
        params.append(item);
      }
      block.append(params);
    }
    if (ref.wrkOptions && Object.keys(ref.wrkOptions).length) {
      const opts = document.createElement("p");
      opts.className = "briefing iongrc-ibm-ref-options";
      const pairs = Object.entries(ref.wrkOptions)
        .slice(0, 4)
        .map(([opt, target]) => `option ${opt} → ${target}`);
      opts.textContent = `Subfile options: ${pairs.join(" · ")}.`;
      block.append(opts);
    }
    if (ref.examples?.length) {
      const ex = document.createElement("p");
      ex.className = "mono iongrc-ibm-ref-example";
      ex.textContent = ref.examples[0];
      block.append(ex);
    }
    const source = document.createElement("p");
    source.className = "iongrc-ibm-ref-source";
    source.textContent = `Source: ${ref.source}`;
    block.append(source);
    body.append(block);
  }
}

function renderIongrcMissionBridge(payload, primary) {
  const card = el("iongrc-mission-bridge");
  const bridge = payload.missionBridge ?? primary?.missionBridge;
  if (!card) return;
  if (!bridge || primary?.labStatus === "read-only") {
    card.hidden = true;
    return;
  }
  card.hidden = false;
  el("iongrc-mission-bridge-hint").textContent = bridge.hint;
  el("iongrc-mission-bridge-mission").textContent = `${bridge.signOn} → ${bridge.missionId} · ${bridge.label}`;
}

function renderIongrcGuidedPath(payload, primary) {
  const card = el("iongrc-guided-path");
  const guided = payload.guidedPath ?? primary?.guidedPath;
  if (!card) return;
  if (!guided?.steps?.length) {
    card.hidden = true;
    return;
  }
  card.hidden = false;
  el("iongrc-guided-path-title").textContent = guided.label;
  el("iongrc-guided-path-intro").textContent = guided.intro;
  const list = el("iongrc-guided-steps");
  if (!list) return;
  list.replaceChildren();
  for (const step of guided.steps) {
    const item = document.createElement("li");
    const title = document.createElement("strong");
    title.textContent = step.label;
    item.append(title);
    const cmd = document.createElement("p");
    cmd.className = "mono iongrc-guided-command";
    cmd.textContent = step.command;
    item.append(cmd);
    if (step.coach) {
      const coach = document.createElement("p");
      coach.className = "briefing iongrc-guided-coach";
      coach.textContent = step.coach;
      item.append(coach);
    }
    list.append(item);
  }
}

function renderIongrcContext(payload) {
  if (!payload) return;
  el("iongrc-path-intro").textContent = payload.pathIntro ?? "";
  el("iongrc-coverage-badge").textContent = payload.coverageBadge ?? "";
  const primary = payload.primaryArticle ?? payload.contextMatches?.[0];
  const labStatusEl = el("iongrc-lab-status");
  if (labStatusEl) {
    labStatusEl.textContent = primary?.labStatusLabel ? `Lab coverage: ${primary.labStatusLabel}` : "";
    labStatusEl.hidden = !primary?.labStatusLabel;
  }
  el("iongrc-pack-title").textContent = primary?.title ?? payload.packTitle ?? "i on GRC articles";
  const link = el("iongrc-article-link");
  if (link) {
    const url = primary?.url ?? payload.article?.url;
    if (url && url.startsWith("http")) {
      link.href = url;
      link.textContent = primary?.title ?? payload.article?.title ?? "Read on LinkedIn";
      link.hidden = false;
    } else {
      link.removeAttribute("href");
      link.hidden = true;
    }
  }
  const quotes = primary?.excerpts?.length ? primary.excerpts : payload.quotes ?? [];
  fillList(el("iongrc-quotes"), quotes, (node, line) => {
    node.textContent = line;
  });
  renderIongrcMissionBridge(payload, primary);
  renderIongrcGuidedPath(payload, primary);
  const commandContexts = iongrcCommandContexts(payload, primary);
  const commandNames = commandContexts.map((row) => row.command).filter(Boolean);
  el("iongrc-step-command").textContent =
    payload.lastCommand ??
    (commandNames.length ? commandNames.slice(0, 3).join(" · ") : "Type a command on ===> or use menu options.");
  const excerpts = el("iongrc-excerpts");
  if (excerpts) {
    excerpts.replaceChildren();
    for (const text of primary?.excerpts ?? []) {
      const p = document.createElement("p");
      p.className = "briefing iongrc-excerpt";
      p.textContent = text;
      excerpts.append(p);
    }
  }
  renderIongrcIbmReference(primary);
  const practiceHint = el("iongrc-practice-hint");
  if (practiceHint) {
    if (primary?.practiceHint) {
      practiceHint.textContent = primary.practiceHint;
      practiceHint.hidden = false;
    } else {
      practiceHint.textContent = "";
      practiceHint.hidden = true;
    }
  }
  const gap = el("iongrc-gap-callout");
  if (gap) {
    if (primary?.labStatus === "read-only") {
      gap.textContent =
        "Read-only essay — open the LinkedIn article. No green-screen mechanics in this lab path.";
      gap.hidden = false;
    } else if (primary && !primary.hasExcerpt && !primary.indexed) {
      gap.textContent = "Excerpt not included in this Community Edition release. Use the linked article for the full context.";
      gap.hidden = false;
    } else {
      gap.hidden = true;
    }
  }
  const exitEl = el("iongrc-exit-hint");
  if (exitEl) {
    exitEl.textContent = "F3 steps back toward the stock Main Menu.";
    exitEl.hidden = false;
  }
  renderIongrcScreenGuide(payload.screenGuide);
  renderIongrcTrainingPaths(payload);
  fillList(el("iongrc-watch-for"), commandContexts.slice(0, 6), (node, row) => {
    node.textContent = row.contextLine ?? row.command;
  });
  const outline = el("iongrc-outline");
  const select = el("iongrc-pack-select");
  const articleList = payload.articles ?? payload.contextMatches ?? [];
  if (outline) {
    outline.replaceChildren();
    for (const row of articleList) {
      const item = document.createElement("li");
      const badge = row.labStatusLabel ? ` · ${row.labStatusLabel}` : "";
      const label = document.createElement("button");
      label.type = "button";
      label.className = "link-quiet link-btn iongrc-outline-pick";
      label.textContent = `${row.title}${badge}`;
      label.onclick = () =>
        loadIongrcContext({ articleId: row.id, screenId: payload.screenId }).catch(() => {});
      item.classList.toggle("demo-outline-active", row.id === primary?.id);
      item.append(label);
      outline.append(item);
    }
  }
  if (select && articleList.length) {
    if (select.options.length !== articleList.length) {
      select.replaceChildren();
      for (const row of articleList) {
        const opt = document.createElement("option");
        opt.value = row.id;
        opt.textContent = row.title;
        select.append(opt);
      }
      select.onchange = () => {
        loadIongrcContext({ articleId: select.value, screenId: payload.screenId }).catch(() => {});
      };
    }
    if (primary?.id) select.value = primary.id;
  }
}

async function loadIongrcContext({ articleId, screenId, command } = {}) {
  const params = new URLSearchParams({ system: coachSystemName });
  if (articleId) params.set("article", articleId);
  if (screenId) params.set("screen", screenId);
  if (command) params.set("command", command);
  const payload = await loadJson(`/api/lab/iongrc?${params.toString()}`);
  renderIongrcContext(payload);
  if (payload.primaryArticle?.id) {
    sessionStorage.setItem(IONGRC_PACK_KEY, payload.primaryArticle.id);
  }
  return payload;
}

function startIongrcMode(articleId) {
  sessionStorage.setItem(IONGRC_ACTIVE_KEY, "1");
  sessionStorage.setItem(SKILL_PATH_KEY, "iongrc");
  sessionStorage.removeItem(DEMO_ACTIVE_KEY);
  if (el("iongrc-path-label") && cachedLaneCredentials?.iongrc) {
    el("iongrc-path-label").textContent = `i on GRC · ${formatProfileCredentialPair(cachedLaneCredentials.iongrc)} · stock Main Menu`;
  }
  setPanelMode("disconnected");
  loadIongrcContext(articleId ? { articleId } : {}).catch(() => undefined);
}

function stopIongrcMode() {
  sessionStorage.removeItem(IONGRC_ACTIVE_KEY);
  sessionStorage.removeItem(IONGRC_PACK_KEY);
  sessionStorage.removeItem(IONGRC_STEP_KEY);
}

function renderIongrcCoachPoll(payload) {
  const params = new URLSearchParams({ system: coachSystemName });
  if (payload.screenId) params.set("screen", payload.screenId);
  if (payload.lastCommand) params.set("command", payload.lastCommand);
  const focus = sessionStorage.getItem(IONGRC_PACK_KEY);
  if (focus) params.set("article", focus);
  loadJson(`/api/lab/iongrc?${params.toString()}`)
    .then((iongrcPayload) => {
      renderIongrcContext(iongrcPayload);
      renderIongrcScreenGuide(payload.iongrcScreenGuide ?? iongrcPayload.screenGuide);
    })
    .catch(() => {});
  applyLaneCredentials(payload.signOnCredentials);
  updateRestartMissionButton("iongrc");
}

function renderIongrcPointer(payload) {
  const card = el("iongrc-pointer-card");
  if (!card) return;
  const packId =
    payload.iongrcPackId ??
    (payload.missionProgress?.missionId
      ? MISSION_IONGRC_PACK[payload.missionProgress.missionId]
      : undefined);
  if (!packId && !payload.iongrcPointer) {
    card.hidden = true;
    return;
  }
  card.hidden = false;
  if (el("iongrc-pointer-text")) {
    el("iongrc-pointer-text").textContent =
      payload.iongrcPointer ??
      "Read and practice this topic in IONGRC — sign on IONGRC / IONGRC.";
  }
  const openBtn = el("iongrc-pointer-open");
  if (openBtn) {
    openBtn.onclick = () => {
      stopDemoMode();
      sessionStorage.setItem(SKILL_PATH_KEY, "iongrc");
      startIongrcMode(packId);
      setPanelMode("iongrc");
    };
  }
}

function cancelDemoAutoSignoff() {
  if (demoAutoSignoffTimer) {
    window.clearTimeout(demoAutoSignoffTimer);
    demoAutoSignoffTimer = null;
  }
  if (demoAutoSignoffTickTimer) {
    window.clearInterval(demoAutoSignoffTickTimer);
    demoAutoSignoffTickTimer = null;
  }
  demoAutoSignoffSecondsLeft = 0;
  const notice = el("demo-signoff-notice");
  if (notice) notice.hidden = true;
}

function updateDemoSignoffNotice() {
  const notice = el("demo-signoff-notice");
  if (!notice || demoAutoSignoffSecondsLeft <= 0) return;
  notice.hidden = false;
  const secs = demoAutoSignoffSecondsLeft;
  notice.textContent = `You'll be signed off automatically in ${secs} second${secs === 1 ? "" : "s"}. The coach panel will close and you'll return to the sign-on screen. Pick a path below to continue without waiting, or type SIGNOFF on ===> now.`;
}

async function waitTerminalUnlocked(term, maxTries = 40) {
  const screen = term?.screen;
  if (!screen) return false;
  for (let i = 0; i < maxTries; i++) {
    if (!screen.keyboardLocked) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return !screen.keyboardLocked;
}

function terminalCommandField(screen) {
  let best = null;
  for (const field of screen.fields) {
    if (field.bypass || field.length < 4) continue;
    const idx = field.start + 1;
    const row = Math.floor(idx / screen.cols) + 1;
    if (row >= 22 && (!best || field.length > best.length)) best = field;
  }
  return best;
}

function fillTerminalField(screen, field, value) {
  const text = value.padEnd(field.length, " ").slice(0, field.length);
  for (let i = 0; i < text.length; i++) {
    const idx = field.start + 1 + i;
    const ch = text[i];
    screen.cells[idx].byte = screen.ebcdic.fromCharCode(ch.charCodeAt(0));
    screen.cells[idx].glyph = ch;
  }
  field.modified = true;
}

async function submitTerminalSignoff(frame) {
  try {
    const term = frame?.contentWindow?.terminal;
    if (!term?.screen) return false;
    if (!(await waitTerminalUnlocked(term))) return false;
    const screen = term.screen;
    const field = terminalCommandField(screen);
    if (field) {
      fillTerminalField(screen, field, "SIGNOFF");
      screen.cursor = field.start + 1;
      term.draw?.();
      term.sendAid(0xf1);
    } else {
      term.type?.("SIGNOFF");
      term.sendAid(0xf1);
    }
    return true;
  } catch {
    return false;
  }
}

function scheduleDemoAutoSignoff(onComplete) {
  if (demoAutoSignoffTimer) return;
  demoAutoSignoffSecondsLeft = DEMO_AUTO_SIGNOFF_SEC;
  updateDemoSignoffNotice();
  demoAutoSignoffTickTimer = window.setInterval(() => {
    demoAutoSignoffSecondsLeft -= 1;
    if (demoAutoSignoffSecondsLeft > 0) {
      updateDemoSignoffNotice();
    }
  }, 1000);
  demoAutoSignoffTimer = window.setTimeout(async () => {
    cancelDemoAutoSignoff();
    await submitTerminalSignoff(terminalFrameRef);
    cachedLabSessionToken = null;
    stopDemoMode();
    onComplete?.();
    if (terminalFrameRef) scheduleTerminalFocus(terminalFrameRef);
  }, DEMO_AUTO_SIGNOFF_SEC * 1000);
}

function renderDemoPanelState(payload) {
  const panel = el("demo-panel");
  const stepIndex = Number(sessionStorage.getItem(DEMO_STEP_KEY) ?? "0");
  const stepCount = payload.stepCount ?? 14;
  const isLast = stepIndex >= stepCount - 1;
  const demoComplete = Boolean(payload.demoComplete);
  panel?.classList.toggle("demo-on-last-step", isLast);
  panel?.classList.toggle("demo-complete", demoComplete);
  const diveIn = el("demo-dive-in");
  if (diveIn) diveIn.hidden = !(isLast || demoComplete);
  const title = el("demo-next-steps-title");
  const lead = el("demo-next-steps-lead");
  if (title) {
    title.textContent = demoComplete
      ? "Demo complete. Pick your next path."
      : "Almost done. After SUBMITMSN, pick your next path.";
  }
  if (lead) {
    lead.textContent = demoComplete
      ? "You saw the evidence path without scoring. Pick a lane below, or wait for automatic sign-off."
      : "Run SUBMITMSN on the green screen to finish the demo. Then pick i on GRC practice or a scored mission below.";
  }
  if (demoComplete) {
    scheduleDemoAutoSignoff(() => setPanelMode("disconnected"));
  } else {
    cancelDemoAutoSignoff();
  }
  const demoNext = el("demo-next");
  if (demoNext) demoNext.hidden = isLast;
}

function appendDemoCredGrid(block, user, password) {
  block.className = "demo-command-block mono demo-cred-grid";
  const rows = [
    ["User", user],
    ["Password", password],
  ];
  for (const [label, value] of rows) {
    const labelEl = document.createElement("span");
    labelEl.className = "demo-cred-label";
    labelEl.textContent = label;
    const dotsEl = document.createElement("span");
    dotsEl.className = "demo-cred-dots";
    dotsEl.textContent = ". . . . . . . . . . . . . . . . . . . . :";
    const valueEl = document.createElement("span");
    valueEl.className = "demo-cred-value";
    valueEl.textContent = value;
    block.append(labelEl, dotsEl, valueEl);
  }
}

function renderDemoCommandBlock(step) {
  const block = el("demo-command-block");
  if (!block) return;
  block.replaceChildren();
  block.className = "demo-command-block";
  if (step.isSignOn) {
    const parts = (step.command ?? "").match(/User:\s*(\S+)\s+Password:\s*(\S+)/i);
    if (parts) {
      appendDemoCredGrid(block, parts[1], parts[2]);
      return;
    }
  }
  const cmd = document.createElement("p");
  cmd.className = "mono demo-command";
  cmd.textContent = step.command ?? "";
  block.append(cmd);
}

function resolveSignOnProfile(userName, creds) {
  const user = userName.trim().toUpperCase();
  if (user === creds.operator.user) return creds.operator;
  if (user === creds.demo?.user) return creds.demo;
  if (user === creds.iongrc?.user) return creds.iongrc ?? SKILL_PATHS.iongrc;
  if (user === creds.apclerk?.user) return creds.apclerk;
  return creds.auditor;
}

function defaultSignOnHint(creds) {
  const skillPath = readStoredSkillPath();
  if (skillPath === "agentauthority") {
    return `User ${creds.operator.user} / Password ${creds.operator.password} · Human review remains in Authority Desk`;
  }
  if (skillPath === "iongrc") {
    const iongrc = creds.iongrc ?? SKILL_PATHS.iongrc;
    return `User ${iongrc.user} / Password ${iongrc.password ?? "IONGRC"} · Model IBM-5292-2`;
  }
  if (skillPath === "demo" && creds.demo) {
    return `User ${creds.demo.user} / Password ${creds.demo.password} · Model IBM-5292-2`;
  }
  if (skillPath === "operator" && creds.operator) {
    return `User ${creds.operator.user} / Password ${creds.operator.password} · Model IBM-5292-2`;
  }
  return `User ${creds.auditor.user} / Password ${creds.auditor.password} · Model IBM-5292-2`;
}

function applySessionSignOnHint(userName, credentials) {
  const creds = credentials ?? cachedLaneCredentials;
  if (!creds) return;

  const operatorHint = `User ${creds.operator.user} / Password ${creds.operator.password} · Model IBM-5292-2`;

  if (!userName) {
    const hint = defaultSignOnHint(creds);
    if (el("signon-hint")) el("signon-hint").textContent = hint;
    if (el("operator-signon-hint")) el("operator-signon-hint").textContent = operatorHint;
    return;
  }

  const profile = resolveSignOnProfile(userName, creds);
  const hint = `User ${profile.user} / Password ${profile.password} · Model IBM-5292-2`;
  if (userName.trim().toUpperCase() === creds.operator.user) {
    if (el("operator-signon-hint")) el("operator-signon-hint").textContent = hint;
  } else if (el("signon-hint")) {
    el("signon-hint").textContent = hint;
  }
}

async function loadJson(url, options = {}) {
  const response = await labFetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json();
}

function labApiHeaders(extra = {}) {
  const headers = { ...extra };
  if (cachedLabSessionToken) {
    headers["X-Lab-Session-Token"] = cachedLabSessionToken;
  }
  return headers;
}

async function labFetch(url, options = {}) {
  const headers = labApiHeaders(options.headers ?? {});
  return fetch(url, { ...options, headers });
}

function cacheLabSessionToken(session) {
  if (session?.sessionToken) {
    cachedLabSessionToken = session.sessionToken;
  }
}

function appendWorkflowStep(item, step) {
  if (step.menu) {
    const menuSpan = document.createElement("span");
    menuSpan.className = "step-menu";
    menuSpan.textContent = `Menu ${step.menu}`;
    item.append(menuSpan, document.createTextNode(" — "));
  }
  const action = document.createElement("strong");
  action.textContent = step.action;
  item.append(action, document.createTextNode(`. ${step.detail}`));
}

function appendSubfileTip(node, row) {
  const screen = document.createElement("strong");
  screen.textContent = row.screen;
  node.append(screen, document.createTextNode(`: ${row.options}`));
}

function appendCommandStep(item, step) {
  const label = document.createElement("strong");
  label.textContent = step.label;
  const command = document.createElement("span");
  command.className = "step-command";
  command.textContent = step.command;
  item.append(label, command);
}

function appendCampaignMissionItem(item, mission) {
  const statusClass =
    mission.status === "complete"
      ? "mission-status-complete"
      : mission.status === "open"
        ? "mission-status-open"
        : "mission-status-locked";
  const score =
    mission.score != null ? ` · ${mission.score}/100` : mission.status === "locked" ? " · locked" : "";
  const idSpan = document.createElement("span");
  idSpan.className = statusClass;
  idSpan.textContent = mission.missionId;
  const titleSpan = document.createElement("span");
  titleSpan.textContent = `${mission.title}${score}`;
  item.append(idSpan, titleSpan);
}

function appendEvidenceListItem(item, row) {
  item.append(document.createTextNode(row.description));
  const pattern = row.commandPattern ?? row.pattern ?? "";
  if (pattern) {
    const patternSpan = document.createElement("span");
    patternSpan.className = "pattern";
    patternSpan.textContent = pattern;
    item.append(patternSpan);
  }
}

function appendDebriefBarRow(row, section) {
  const labelRow = document.createElement("div");
  labelRow.className = "debrief-bar-label";
  const labelSpan = document.createElement("span");
  labelSpan.textContent = `${section.label} (${section.weight}%)`;
  const scoreSpan = document.createElement("span");
  scoreSpan.textContent = String(section.score);
  labelRow.append(labelSpan, scoreSpan);

  const bar = document.createElement("div");
  bar.className = "debrief-bar";
  const fill = document.createElement("div");
  fill.className = "debrief-bar-fill";
  fill.style.width = `${section.score}%`;
  bar.append(fill);

  row.append(labelRow, bar);
}

function appendDemoOutlineItem(item, row, active) {
  if (active) {
    const phase = document.createElement("strong");
    phase.textContent = row.phase;
    item.append(phase, document.createTextNode(`: ${row.title}`));
  } else {
    item.textContent = `${row.phase}: ${row.title}`;
  }
}

function el(id) {
  return document.getElementById(id);
}

function fillList(container, items, renderItem) {
  if (!container) return;
  container.replaceChildren();
  for (const item of items ?? []) {
    const node = document.createElement("li");
    renderItem(node, item);
    container.append(node);
  }
}

function readStoredLane() {
  try {
    const lane = localStorage.getItem(LANE_CHOICE_KEY);
    if (lane === "auditor" || lane === "operator") return lane;
  } catch {
    /* private mode */
  }
  return null;
}

function readStoredSkillPath() {
  try {
    const sessionPath = sessionStorage.getItem(SKILL_PATH_KEY);
    if (sessionPath && SKILL_PATHS[sessionPath]) return sessionPath;
    const localPath = localStorage.getItem(SKILL_PATH_KEY);
    if (localPath && SKILL_PATHS[localPath]) return localPath;
  } catch {
    /* private mode */
  }
  if (isSkillPathRemembered()) {
    const legacyLane = readStoredLane();
    if (legacyLane === "operator") return "operator";
    if (legacyLane === "auditor") return "governance";
  }
  return null;
}

function isSkillPathRemembered() {
  try {
    const path = localStorage.getItem(SKILL_PATH_KEY);
    return localStorage.getItem(LANE_REMEMBER_KEY) === "1" && Boolean(path && SKILL_PATHS[path]);
  } catch {
    return false;
  }
}

function readLastRememberedSkillPath() {
  if (!isSkillPathRemembered()) return null;
  try {
    const path = localStorage.getItem(SKILL_PATH_KEY);
    if (path && SKILL_PATHS[path]) return path;
  } catch {
    /* private mode */
  }
  return null;
}

function reconcileStoredSkillPathChoice() {
  if (isSkillPathRemembered()) return;
  try {
    localStorage.removeItem(SKILL_PATH_KEY);
    localStorage.removeItem(LANE_CHOICE_KEY);
    localStorage.removeItem(LANE_REMEMBER_KEY);
  } catch {
    /* private mode */
  }
}

function resetSessionSkillPathState() {
  try {
    sessionStorage.removeItem(SKILL_PATH_KEY);
    sessionStorage.removeItem(DEMO_ACTIVE_KEY);
    sessionStorage.removeItem(DEMO_PATH_KEY);
    sessionStorage.removeItem(DEMO_STEP_KEY);
    sessionStorage.removeItem(PLAYBOOK_PATH_KEY);
    sessionStorage.removeItem(AGENT_AUTHORITY_ACTIVE_KEY);
  } catch {
    /* private mode */
  }
}

function storeSkillPath(skillPath, remember) {
  try {
    sessionStorage.setItem(SKILL_PATH_KEY, skillPath);
    if (remember) {
      localStorage.setItem(SKILL_PATH_KEY, skillPath);
    } else {
      localStorage.removeItem(SKILL_PATH_KEY);
    }
  } catch {
    /* private mode */
  }
}

function storeLaneChoice(lane, remember) {
  try {
    if (remember) {
      localStorage.setItem(LANE_CHOICE_KEY, lane);
      localStorage.setItem(LANE_REMEMBER_KEY, "1");
    } else {
      localStorage.removeItem(LANE_CHOICE_KEY);
      localStorage.removeItem(LANE_REMEMBER_KEY);
    }
  } catch {
    /* private mode */
  }
}

function expectedUserForLane(lane) {
  return LANE_PROFILES[lane]?.user ?? "AUDIT";
}

function expectedUserForSkillPath(skillPath) {
  return SKILL_PATHS[skillPath]?.user ?? expectedUserForLane("auditor");
}

function laneForSignedOnUser(userName) {
  const user = (userName ?? "").trim().toUpperCase();
  if (user === "QSECOFR") return "operator";
  if (user === "DEMO") return "demo";
  if (user === "IONGRC") return "iongrc";
  return "auditor";
}

function setPanelMode(mode) {
  const split = el("lab-split");
  const rail = el("coach-rail");
  const auditor = el("auditor-panel");
  const operator = el("operator-panel");
  const demo = el("demo-panel");
  const iongrc = el("iongrc-panel");
  const agentAuthority = el("agent-authority-panel");
  const badge = el("lane-badge");
  const demoActive = sessionStorage.getItem(DEMO_ACTIVE_KEY) === "1";
  const iongrcActive = sessionStorage.getItem(IONGRC_ACTIVE_KEY) === "1";
  const agentAuthorityActive = sessionStorage.getItem(AGENT_AUTHORITY_ACTIVE_KEY) === "1";
  const signedOn = mode === "auditor" || mode === "operator" || mode === "demo" || mode === "iongrc";

  if (split) {
    split.classList.toggle("coach-open", signedOn || demoActive || iongrcActive || agentAuthorityActive);
    split.classList.toggle("demo-coach-open", demoActive);
    split.classList.toggle("iongrc-coach-open", iongrcActive);
  }
  if (rail) rail.hidden = !(signedOn || demoActive || iongrcActive || agentAuthorityActive);
  if (demo) demo.hidden = !demoActive;
  if (iongrc) iongrc.hidden = !iongrcActive;
  if (agentAuthority) agentAuthority.hidden = !agentAuthorityActive;
  if (auditor) auditor.hidden = demoActive || iongrcActive || agentAuthorityActive || !(mode === "auditor" || mode === "demo");
  if (operator) operator.hidden = demoActive || iongrcActive || agentAuthorityActive || mode !== "operator";
  if (badge) {
    badge.hidden = !signedOn;
    const skillPath = readStoredSkillPath();
    const expectedUser = skillPath ? expectedUserForSkillPath(skillPath) : null;
    badge.textContent =
      mode === "operator"
        ? "QSECOFR"
        : mode === "demo"
          ? "DEMO"
          : mode === "iongrc"
            ? "IONGRC"
            : coachUserName && coachUserName !== "AUDIT"
              ? coachUserName
              : expectedUser ?? "AUDIT";
    badge.classList.toggle("operator", mode === "operator");
  }
}

const AA_STAGE_ORDER = ["OBSERVED", "REQUESTED", "HELD", "REVIEWED", "EXECUTED", "VERIFIED"];

function setAgentAuthorityActive(active) {
  if (active) sessionStorage.setItem(AGENT_AUTHORITY_ACTIVE_KEY, "1");
  else sessionStorage.removeItem(AGENT_AUTHORITY_ACTIVE_KEY);
}

async function loadAgentAuthorityWalkthrough() {
  if (sessionStorage.getItem(AGENT_AUTHORITY_ACTIVE_KEY) !== "1") return;
  const selected=sessionStorage.getItem(AGENT_AUTHORITY_SCENARIO_KEY);
  if (!selected) {await renderAgentAuthorityChooser();return;}
  showAgentAuthorityExperience(selected);
  if(selected!=="AA-001") {renderScenarioPack(await loadJson(`/api/agent-authority/scenarios/${selected}`));return;}
  const payload = await loadJson("/api/agent-authority/walkthrough");
  renderAgentAuthorityWalkthrough(payload);
}

async function renderAgentAuthorityChooser() {
  const payload=await loadJson("/api/agent-authority/scenarios");
  el("aa-scenario-chooser").hidden=false;el("aa-scenario-experience").hidden=true;
  el("aa-panel-kicker").textContent="Agent Authority Lab";el("aa-panel-title").textContent="Choose a scenario";
  const cards=el("aa-scenario-cards");cards.replaceChildren();
  for(const scenario of payload.scenarios??[]){
    const article=document.createElement("article");article.className="agent-scenario-card";
    const status=document.createElement("span");status.className="agent-scenario-status";status.textContent=String(scenario.status).replaceAll("_"," ");
    const id=document.createElement("span");id.className="agent-kicker mono";id.textContent=scenario.id;
    const title=document.createElement("h3");title.textContent=scenario.title;
    const situation=document.createElement("p");situation.textContent=scenario.situation;
    const concept=document.createElement("p");concept.className="agent-scenario-concept";concept.textContent=scenario.controlConcept;
    const button=document.createElement("button");button.type="button";button.className="lane-card";button.dataset.scenarioId=scenario.id;button.textContent=scenario.status==="not_started"?"Start scenario":"Open scenario";
    article.append(status,id,title,situation,concept,button);cards.append(article);
  }
}

function showAgentAuthorityExperience(id) {
  el("aa-scenario-chooser").hidden=true;el("aa-scenario-experience").hidden=false;
  el("aa-panel-kicker").textContent=`Guided scenario · ${id}`;
  if(id==="AA-001")el("aa-panel-title").textContent="The Message Says It's Approved";
  for(const node of document.querySelectorAll(".agent-relationship-card,.agent-story-card,.agent-message-card,.agent-action-card,.agent-handoff-card"))node.hidden=id!=="AA-001";
}

function selectAgentAuthorityScenario(id){sessionStorage.setItem(AGENT_AUTHORITY_SCENARIO_KEY,id);loadAgentAuthorityWalkthrough().catch(()=>undefined);}
function leaveAgentAuthorityScenario(){sessionStorage.removeItem(AGENT_AUTHORITY_SCENARIO_KEY);loadAgentAuthorityWalkthrough().catch(()=>undefined);}

function renderScenarioPack(payload){
  const scenario=payload.scenario;el("aa-panel-title").textContent=scenario.title;
  const strip=el("agent-authority-panel").querySelector(".agent-state-strip");strip.replaceChildren();
  for(const label of scenario.lifecycle){const item=document.createElement("li");item.textContent=label;strip.append(item);}
  const proposals=payload.proposals??[];const pending=proposals.find((p)=>p.status==="pending");const final=proposals.find((p)=>["consumed","denied","invalidated","expired"].includes(p.status));
  el("aa-request-summary").hidden=!proposals.length;el("aa-proposal-id").textContent=pending?.id??proposals[0]?.id??"—";el("aa-decision").textContent=final?.status??(pending?"Awaiting QSECOFR":"None");el("aa-current-authority").textContent=payload.currentAuthority??"No private authority";el("aa-executor").textContent=final?.executionStatus?"MCPAGENT":"Not executed";el("aa-action-hash").textContent=pending?.actionHash??proposals[0]?.actionHash??"Created with the request";
  const guidance=scenarioPackGuidance(payload);renderPackGuidance(guidance);
  const terminal=el("aa-terminal-check");terminal.hidden=!guidance.command;el("aa-terminal-explanation").textContent=guidance.expected;
  const commandNode=terminal.querySelector(".demo-command");if(commandNode)commandNode.textContent=guidance.command??"";
  const evidence=el("aa-evidence-card");evidence.hidden=!final&&scenario.id!=="AA-005"&&!(payload.observations??[]).length;
  const list=el("aa-evidence-list");list.replaceChildren();
  for(const observation of payload.observations??[]){const item=document.createElement("li");item.textContent=`${observation.summary} No human approval required. Receipt: ${observation.receiptId}`;list.append(item);}
  for(const proposal of proposals){const item=document.createElement("li");item.textContent=`Proposal ${proposal.id}: ${proposal.status}; action ${proposal.actionHash}`;list.append(item);}
  if(payload.denial){const item=document.createElement("li");item.textContent=`Boundary denial receipt: ${payload.denial.id}`;list.append(item);}
  const proofProposal=proposals.find((p)=>p.proof?.available);const proof=el("aa-proof-state");proof.textContent=proofProposal?.proof?.verified?"Proof verified. The exported record matches the protected decision and execution receipts.":"Proof is available after a proposal decision.";proof.classList.toggle("verified",Boolean(proofProposal?.proof?.verified));
  el("aa-download-proof").hidden=!proofProposal?.proof?.verified||!cachedLabSessionToken;
}

function scenarioPackGuidance(payload){
  const id=payload.scenario.id,p=payload.proposals??[],pending=p.find((x)=>x.status==="pending"),final=p.find((x)=>["consumed","denied","invalidated","expired"].includes(x.status));
  if(id==="AA-002"){
    const initial=p.find((x)=>x.action?.arguments?.authority==="*ALL"),narrow=p.find((x)=>x.action?.arguments?.authority==="*USE");
    if(!initial)return {step:1,total:8,title:"Submit the overbroad request",instruction:"The business need calls for limited payroll evidence access, but the deterministic agent is asking for *ALL.",expected:"A new pending request for AUDIT → PAYROLL/PAYMST → *ALL.",action:"Create *ALL request",kind:"scenario",scenarioAction:"create_initial_request"};
    if(initial.status==="pending")return approvalGuidance(2,8,"Confirm the exact overbroad action","The agent's requested authority is broader than the stated need. Inspect *ALL, then sign on as QSECOFR and deny it in Authority Desk.","The original proposal remains immutable and pending until the human decision.");
    if(initial.status==="denied"&&!narrow)return {step:5,total:8,title:"Submit a new narrower request",instruction:"The *ALL proposal remains denied. The agent must submit a genuinely new *USE request; the old request is never edited.",expected:"A different proposal ID and action hash for AUDIT → PAYROLL/PAYMST → *USE.",action:"Submit new *USE request",kind:"scenario",scenarioAction:"submit_narrower_request"};
    if(narrow?.status==="pending")return approvalGuidance(6,8,"Review the new least-privilege request","Compare the new proposal ID and action hash to the denied *ALL request, then decide in Authority Desk.","Only the new *USE request is eligible for this decision.");
    const over=initial.status==="consumed";return {step:8,total:8,title:over?"Debrief the overprivilege decision":"Confirm least privilege",instruction:over?"The control bound approval exactly, but the human approved more authority than the stated need required.":"Return to the terminal and inspect AUDIT's resulting private authority.",command:"DSPOBJAUT OBJ(PAYROLL/PAYMST)",expected:over?"Exact approval does not guarantee a good decision. Human-in-the-loop does not replace least-privilege judgment.":`AUDIT should show ${payload.currentAuthority??"no"} private authority.`,kind:"none"};
  }
  if(id==="AA-003"){
    if(!p.length)return {step:1,total:5,title:"Capture the starting state",instruction:"Create OLDVENDOR's governed *USE request. Agent Authority will bind it to the current PAYMST state.",expected:"A pending proposal with a protected precondition digest.",action:"Create governed request",kind:"scenario",scenarioAction:"create_initial_request"};
    if(pending&&payload.currentAuthority!=="*EXCLUDE")return {step:2,total:5,title:"Change the system before approval",instruction:"As QSECOFR, change ordinary CLAIMS400 state before reviewing the request. In the terminal, run:",command:"GRTOBJAUT OBJ(PAYROLL/PAYMST) USER(OLDVENDOR) AUT(*EXCLUDE)",expected:"OLDVENDOR's current private authority becomes *EXCLUDE, which differs from the proposal's recorded starting state.",kind:"none"};
    if(pending)return approvalGuidance(3,5,"Attempt the original approval","Open the unchanged pending request. Agent Authority will re-snapshot PAYMST inside the protected execution transaction.","The proposal should invalidate as stale; MCPAGENT must not execute *USE.");
    return {step:5,total:5,title:"Confirm the stale request did not win",instruction:"Return to the terminal and inspect the actual object authority.",command:"DSPOBJAUT OBJ(PAYROLL/PAYMST)",expected:"OLDVENDOR remains *EXCLUDE. The requested *USE action was invalidated before execution.",kind:"none"};
  }
  if(id==="AA-004"){
    if(!(payload.observations??[]).length)return {step:1,total:6,title:"Investigate autonomously",instruction:"Let the deterministic agent inspect BACKUPADM's profile, PAYMST authority and recent audit activity through the three existing read tools.",expected:"Three bounded observations and read receipts, with no proposals and no human approval.",action:"Run safe investigation",kind:"scenario",scenarioAction:"run_investigation"};
    if(!p.length)return {step:4,total:6,title:"Propose where consequences begin",instruction:"The reads established that BACKUPADM has stale *ALL access. Now the agent proposes narrowing it to *USE.",expected:"A sensitive-change proposal appears only for the mutation.",action:"Propose *ALL → *USE",kind:"scenario",scenarioAction:"create_mutation_request"};
    if(pending)return approvalGuidance(5,6,"Make the human decision","The investigation needed no approval. Changing BACKUPADM's authority does.","Authority Desk shows BACKUPADM → PAYROLL/PAYMST → *USE.");
    return {step:6,total:6,title:"Confirm proportional autonomy",instruction:"Inspect the underlying PAYMST authority after the decision.",command:"DSPOBJAUT OBJ(PAYROLL/PAYMST)",expected:final?.status==="consumed"?"BACKUPADM changed from *ALL to *USE and normal LCL evidence was recorded.":"The denial left BACKUPADM's *ALL authority unchanged.",kind:"none"};
  }
  if(id==="AA-005"){
    if(!payload.denial)return {step:1,total:3,title:"Attempt an out-of-bound request",instruction:"The deterministic agent will request AUDIT → CLAIMS400/CLAIMMST → *USE, outside its single delegated mutation target.",expected:"TARGET_NOT_ALLOWED, a denial receipt, and no proposal for Authority Desk.",action:"Attempt request",kind:"scenario",scenarioAction:"attempt_out_of_scope_request"};
    return {step:3,total:3,title:"Confirm the boundary held",instruction:"There is nothing for QSECOFR to approve. Inspect the real out-of-bound target in the terminal.",command:"DSPOBJAUT OBJ(CLAIMS400/CLAIMMST)",expected:"CLAIMMST is unchanged. Some actions are not approval questions; they are outside the agent's authority.",kind:"none"};
  }
  return {step:1,total:1,title:"Scenario unavailable",instruction:"Return to the chooser.",expected:"No state changed.",kind:"none"};
}

function approvalGuidance(step,total,title,instruction,expected){if(!agentAuthorityOperatorReady)return {step,total,title:"Become the human approver",instruction:"Sign on to the terminal as the separate human security officer.\n\nUser: QSECOFR\nPassword: TRAIN",expected:"The requesting agent cannot create this approval for itself.",kind:"none",readiness:"Authority Desk is not ready yet."};return {step,total,title,instruction,expected,action:"Review request in Authority Desk",kind:"desk"};}
function renderPackGuidance(g){el("aa-step-count").textContent=`Step ${g.step} of ${g.total}`;el("aa-step-title").textContent=g.title;el("aa-step-instruction").textContent=g.instruction;el("aa-step-expected").querySelector("span").textContent=g.expected;const command=el("aa-step-command");command.hidden=!g.command;command.textContent=g.command??"";const readiness=el("aa-step-readiness");readiness.hidden=!g.readiness;readiness.textContent=g.readiness??"";const action=el("aa-step-action");action.hidden=!g.action;action.textContent=g.action??"";action.dataset.action=g.kind??"";action.dataset.scenarioAction=g.scenarioAction??"";}

function renderAgentAuthorityWalkthrough(payload) {
  const proposal = payload.proposal;
  const stage = payload.stage ?? "OBSERVED";
  const stageIndex = AA_STAGE_ORDER.indexOf(stage);
  for (const item of document.querySelectorAll("[data-aa-stage]")) {
    const itemIndex = AA_STAGE_ORDER.indexOf(item.dataset.aaStage);
    item.classList.toggle("complete", itemIndex <= stageIndex);
    item.classList.toggle("current", itemIndex === stageIndex);
  }
  if (el("aa-message-text")) el("aa-message-text").textContent = payload.message?.text ?? "Operational message unavailable.";
  if (el("aa-status")) el("aa-status").textContent = displayAgentStage(payload);
  const narrative = agentNarrative(payload);
  if (el("aa-story-title")) el("aa-story-title").textContent = narrative.title;
  if (el("aa-story-copy")) el("aa-story-copy").textContent = narrative.copy;
  if (el("aa-request-summary")) el("aa-request-summary").hidden = !proposal;
  if (el("aa-handoff")) el("aa-handoff").hidden = !proposal || proposal.status !== "pending";
  if (el("aa-terminal-check")) el("aa-terminal-check").hidden = !proposal;
  if (el("aa-proposal-id")) el("aa-proposal-id").textContent = proposal?.id ?? "—";
  if (el("aa-decision")) el("aa-decision").textContent = humanDecisionLabel(payload);
  if (el("aa-current-authority")) el("aa-current-authority").textContent = payload.currentAuthority ?? "No private authority";
  if (el("aa-executor")) el("aa-executor").textContent = payload.executor ?? "Not executed";
  if (el("aa-action-hash")) el("aa-action-hash").textContent = proposal?.actionHash ?? "Created with the request";
  const terminalCopy = el("aa-terminal-explanation");
  if (terminalCopy) terminalCopy.textContent = payload.currentAuthority === "*USE"
    ? "CLAIMS400 now records APCLERK with *USE private authority. Confirm the shared-state result in the terminal."
    : "CLAIMS400 still has no APCLERK private authority on this object. Confirm the unchanged state in the terminal.";
  const evidenceCard = el("aa-evidence-card");
  if (evidenceCard) evidenceCard.hidden = !payload.proof?.available;
  const evidenceList = el("aa-evidence-list");
  if (evidenceList) {
    evidenceList.replaceChildren();
    const refs = Array.isArray(payload.evidence) ? payload.evidence : [];
    const labels = {runtime_state_change:"Authority state change",runtime_generated_audit:"CA-style generated audit entry",runtime_job_log_entry:"MCPAGENT runtime job log",evidence_tag:"Evidence tag"};
    for (const ref of refs) {
      const item = document.createElement("li");
      item.textContent = `${labels[ref.type] ?? ref.type}: ${ref.id}`;
      evidenceList.append(item);
    }
    for (const id of proposal?.receiptIds ?? []) {
      const item = document.createElement("li");item.textContent = `Agent Authority receipt: ${id}`;evidenceList.append(item);
    }
    if (!evidenceList.childElementCount) {
      const item = document.createElement("li");item.textContent = "Decision receipt recorded; no mutation evidence was created.";evidenceList.append(item);
    }
  }
  const proof = el("aa-proof-state");
  if (proof) {proof.textContent = payload.proof?.verified ? "Proof verified. The exported record matches the protected decision and execution receipts." : "Proof verification is not complete.";proof.classList.toggle("verified",Boolean(payload.proof?.verified));}
  if (el("aa-download-proof")) el("aa-download-proof").hidden = !payload.proof?.verified || !cachedLabSessionToken;
  renderAgentAuthorityGuidance(payload);
}

function agentConfirmationKey(kind, proposalId) {
  return `lab.agent-authority.${kind}.${proposalId}`;
}

function agentGuidance(payload) {
  const proposal = payload.proposal;
  if (!proposal) return {step:1,title:"Understand the message",instruction:"The agent found an operational message claiming payroll access was already approved. Read the message below. When you are ready, create the agent's governed request.",expected:"The message can influence a request, but it cannot grant authority.",action:"Create governed request",kind:"request"};
  const beforeConfirmed = sessionStorage.getItem(agentConfirmationKey("before-confirmed",proposal.id)) === "1";
  if (proposal.status === "pending" && !beforeConfirmed) return {step:2,title:"Confirm that nothing changed",instruction:"Agent Authority stopped the privilege change. Before a human decides anything, confirm that CLAIMS400 is still unchanged. In the terminal on the left, run:",command:"DSPOBJAUT OBJ(PAYROLL/PAYMST)",expected:"Find APCLERK. It should NOT have *USE private authority yet.",action:"Done — I confirmed it",kind:"confirm-before"};
  if (proposal.status === "pending" && !agentAuthorityOperatorReady) return {step:3,title:"Become the human approver",instruction:"Now sign on to the terminal as the human security officer.\n\nUser: QSECOFR\nPassword: TRAIN\n\nThis creates the separate human operator session Agent Authority requires. The requesting agent cannot create this approval for itself.",expected:"This step completes when LCL detects the exact live QSECOFR operator session.",readiness:"Authority Desk is not ready yet. Sign on as QSECOFR in the terminal."};
  if (proposal.status === "pending") return {step:4,title:"Review the request",instruction:"Authority Desk opens separately because approval is a human control boundary, not an agent function. Inspect APCLERK, PAYROLL/PAYMST, *USE and the exact action, then approve or deny.",expected:"Authority Desk will bind the human decision to this exact action hash.",action:"Review request in Authority Desk",kind:"desk"};
  const afterConfirmed = sessionStorage.getItem(agentConfirmationKey("after-confirmed",proposal.id)) === "1";
  if (!afterConfirmed) {
    const approved = proposal.status === "consumed";
    return {step:5,title:"Confirm the outcome in CLAIMS400",instruction:`Return to the LCL terminal and run the same command again.${approved ? " QSECOFR approved the action. MCPAGENT performed it." : ""}`,command:"DSPOBJAUT OBJ(PAYROLL/PAYMST)",expected:approved ? "APCLERK now has *USE private authority. Executed by: MCPAGENT." : "APCLERK should still have no *USE private authority because the request was denied or invalidated.",action:"Done — I confirmed the outcome",kind:"confirm-after"};
  }
  return {step:6,title:"Inspect the evidence",instruction:"The decision is finished. Now inspect what the system recorded: CLAIMS400 authority state, state-change evidence, CA-style audit entry, MCPAGENT job log, Agent Authority receipts and proof verification.",expected:payload.proof?.verified ? "Proof verified. The exported record matches the protected decision and execution receipts." : "The decision evidence is recorded; proof verification is pending.",action:payload.proof?.verified && cachedLabSessionToken ? "Download verified proof" : null,kind:"proof"};
}

function renderAgentAuthorityGuidance(payload) {
  const guide = agentGuidance(payload);
  el("aa-step-count").textContent = `Step ${guide.step} of 6`;
  el("aa-step-title").textContent = guide.title;
  el("aa-step-instruction").textContent = guide.instruction;
  const command=el("aa-step-command");command.hidden=!guide.command;command.textContent=guide.command??"";
  el("aa-step-expected").querySelector("span").textContent = guide.expected;
  const readiness = el("aa-step-readiness");
  readiness.hidden = !guide.readiness;
  readiness.textContent = guide.readiness ?? "";
  const action = el("aa-step-action");
  action.hidden = !guide.action;
  action.textContent = guide.action ?? "";
  action.dataset.action = guide.kind ?? "";
}

async function handleAgentGuidanceAction() {
  const action = el("aa-step-action")?.dataset.action;
  const selected=sessionStorage.getItem(AGENT_AUTHORITY_SCENARIO_KEY);
  if(action==="scenario"&&selected){const scenarioAction=el("aa-step-action").dataset.scenarioAction;const response=await fetch(`/api/agent-authority/scenarios/${selected}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:scenarioAction})});if(!response.ok)throw new Error("Scenario action failed");renderScenarioPack(await response.json());return;}
  if (action === "request") return startAgentAuthorityRequest();
  const payload = await loadJson("/api/agent-authority/walkthrough");
  const proposalId = payload.proposal?.id;
  if (action === "confirm-before" && proposalId) sessionStorage.setItem(agentConfirmationKey("before-confirmed",proposalId),"1");
  if (action === "confirm-after" && proposalId) sessionStorage.setItem(agentConfirmationKey("after-confirmed",proposalId),"1");
  if (action === "desk") {window.open("/lab/authority/","_blank","noopener");return;}
  if (action === "proof") return downloadAgentAuthorityProof();
  renderAgentAuthorityWalkthrough(payload);
}

function displayAgentStage(payload) {
  if (payload.proposal?.status === "denied") return "Denied · unchanged";
  if (payload.proposal?.status === "invalidated") return "Invalidated · unchanged";
  if (payload.proposal?.status === "consumed") return `${payload.proposal.executionStatus ?? "consumed"} · proof ${payload.proof?.verified ? "verified" : "pending"}`;
  if (payload.proposal?.status === "pending") return "Awaiting decision";
  return "Observed";
}

function humanDecisionLabel(payload) {
  if (!payload.proposal) return "None";
  if (payload.humanDecision === "approved") return `Approved by ${payload.approver ?? "operator"}`;
  if (payload.humanDecision === "denied") return `Denied by ${payload.approver ?? "operator"}`;
  return "Awaiting QSECOFR";
}

function agentNarrative(payload) {
  if (!payload.proposal) return {title:"The message is data. It is not permission.",copy:"The deterministic agent observed the isolated AA-001 message. It has not requested or changed authority yet."};
  if (payload.proposal.status === "pending") return {title:"The request is held for a human decision.",copy:"Server-owned policy classified this exact action as a privilege change. CLAIMS400 remains unchanged while QSECOFR reviews it."};
  if (payload.proposal.status === "denied") return {title:"The human denied the request.",copy:"No broker mutation occurred. CLAIMS400 remains unchanged, and the denial is preserved in an integrity-linked receipt and proof bundle."};
  if (payload.proposal.status === "invalidated") return {title:"The approved starting state no longer matched.",copy:"Agent Authority invalidated the request before mutation. The protected object state remains authoritative."};
  if (payload.proposal.status === "consumed") return {title:"MCPAGENT executed the exact approved change.",copy:"The ordinary LCL authority state changed once. CLAIMS400 produced state-change, CA-style audit and job-log evidence, and the proof verifier checked the portable bundle."};
  return {title:"The request was reviewed.",copy:"The persisted proposal records the human decision and resulting state."};
}

async function startAgentAuthorityRequest() {
  const button = el("aa-step-action");if (button) button.disabled = true;
  try {const response=await fetch("/api/agent-authority/walkthrough",{method:"POST"});if(!response.ok)throw new Error("Request could not be created");renderAgentAuthorityWalkthrough(await response.json());}
  finally {if(button)button.disabled=false;}
}

async function downloadAgentAuthorityProof() {
  const payload=await loadJson("/api/agent-authority/walkthrough");const proposalId=payload.proposal?.id;if(!proposalId||!cachedLabSessionToken)return;
  const response=await fetch(`/api/agent-authority/proposals/${encodeURIComponent(proposalId)}/proof`,{headers:{"X-Lab-Session-Token":cachedLabSessionToken}});if(!response.ok)return;
  const blob=await response.blob();const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download=`agent-authority-proof-${proposalId.replace(/[^A-Za-z0-9._-]/g,"_")}.json`;document.body.append(link);link.click();link.remove();URL.revokeObjectURL(link.href);
}

function renderMissionArticle(article, missionId) {
  const card = el("mission-article-card");
  if (!card) return;
  if (!article?.url) {
    card.hidden = true;
    return;
  }
  card.hidden = false;
  if (el("mission-article-hook")) {
    el("mission-article-hook").textContent =
      article.hook ?? `Lab mission ${missionId ?? ""} — run the commands from the article.`;
  }
  const link = el("mission-article-link");
  if (link) {
    link.href = article.url;
    link.textContent = article.title ?? "Read the article";
  }
}

function missionNotesKey(missionId) {
  return `${MISSION_NOTES_PREFIX}${missionId}`;
}

function bindMissionNotesOnce() {
  if (missionNotesBound) return;
  const notes = el("mission-notes");
  if (!notes) return;
  missionNotesBound = true;
  notes.addEventListener("input", () => {
    if (!activeNotesMissionId) return;
    try {
      localStorage.setItem(missionNotesKey(activeNotesMissionId), notes.value);
    } catch {
      /* private mode */
    }
  });
}

function loadMissionNotes(missionId) {
  bindMissionNotesOnce();
  activeNotesMissionId = missionId;
  const notes = el("mission-notes");
  if (!notes) return;
  try {
    notes.value = localStorage.getItem(missionNotesKey(missionId)) ?? "";
  } catch {
    notes.value = "";
  }
}

function renderMissionPackaging(packaging, evidenceSummary, missionPhase) {
  const skillPath = el("mission-skill-path");
  const meta = el("mission-meta");
  const stakesCard = el("mission-stakes-card");
  const stakes = el("mission-stakes");

  if (!packaging) {
    skillPath?.setAttribute("hidden", "");
    meta?.setAttribute("hidden", "");
    stakesCard?.setAttribute("hidden", "");
    return;
  }

  if (skillPath) {
    skillPath.removeAttribute("hidden");
    skillPath.textContent = packaging.skillPathLabel;
  }
  if (meta) {
    meta.removeAttribute("hidden");
    const required = evidenceSummary?.required ?? "—";
    meta.textContent = `${packaging.difficulty} · ${packaging.durationLabel} · ${required} required evidence items`;
  }
  if (stakesCard && stakes) {
    if (missionPhase === "complete") {
      stakesCard.setAttribute("hidden", "");
    } else {
      stakesCard.removeAttribute("hidden");
      stakes.textContent = packaging.stakes;
    }
  }
}

function renderCampaignDashboard(dashboard, missionPhase) {
  const card = el("campaign-dashboard-card");
  if (!card) return;
  if (!dashboard || missionPhase === "complete") {
    card.setAttribute("hidden", "");
    return;
  }
  card.removeAttribute("hidden");
  el("dashboard-skill-path").textContent = dashboard.skillPathLabel;
  el("dashboard-campaign-title").textContent = dashboard.campaignTitle;
  const pct = dashboard.total > 0 ? Math.round((dashboard.completed / dashboard.total) * 100) : 0;
  const fill = el("dashboard-progress-fill");
  const bar = el("dashboard-progress-bar");
  if (fill) fill.style.width = `${pct}%`;
  if (bar) bar.setAttribute("aria-valuenow", String(pct));
  el("dashboard-progress-stats").textContent = `${dashboard.completed} / ${dashboard.total} missions complete`;
  const hint = el("dashboard-next-hint");
  if (hint) {
    hint.textContent = dashboard.nextMissionId
      ? `Up next in campaign: ${dashboard.nextMissionTitle ?? dashboard.nextMissionId}`
      : dashboard.completed >= dashboard.total
        ? "Campaign complete — explore another skill path."
        : "Complete this mission to unlock the next.";
  }
}

function copySqlCommand(command, trigger) {
  const done = () => {
    if (trigger) {
      trigger.setAttribute("title", "Copied — paste on ===> line");
      setTimeout(() => trigger.removeAttribute("title"), 2000);
    }
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(command).then(done).catch(() => {});
  }
}

const AUDITOR_EVIDENCE_FOCUS_SCREENS = new Set([
  "WRKSQLSVC",
  "RUNSQL",
  "CMDSQL",
  "DSPSQLSVC",
  "DSPJRN",
  "DSPAUDJRNE",
  "DSPSECAUD",
  "HELP",
  "STRPDM",
  "WRKMBRPDM",
  "DSPPFM",
  "DSPPGMREF",
]);

const OPERATOR_EVIDENCE_FOCUS_SCREENS = new Set(["DSPEVDDIFF", "DSPPRVSSN"]);

const AUDITOR_FOCUS_UI = {
  card: "evidence-focus-card",
  categories: "evidence-focus-categories",
  headline: "evidence-focus-headline",
  screen: "evidence-focus-screen",
  stats: "evidence-focus-stats",
  contrastCheckbox: "evidence-contrast-checkbox",
  contrastLive: "evidence-contrast-live",
  lead: "evidence-focus-lead",
  article: "evidence-focus-article",
};

const OPERATOR_FOCUS_UI = {
  card: "operator-evidence-focus-card",
  categories: "operator-evidence-focus-categories",
  headline: "operator-evidence-focus-headline",
  screen: "operator-evidence-focus-screen",
  stats: "operator-evidence-focus-stats",
  contrastCheckbox: "operator-evidence-contrast-checkbox",
  contrastLive: "operator-evidence-contrast-live",
  lead: "operator-evidence-focus-lead",
  article: "operator-evidence-focus-article",
};

function renderEvidenceFocusItem(entry) {
  const row = document.createElement("div");
  row.className = "sql-evidence-row";

  const head = document.createElement("div");
  head.className = "sql-evidence-head";
  const theme = document.createElement("span");
  theme.className = "sql-evidence-theme mono";
  theme.textContent = entry.theme;
  const meta = document.createElement("span");
  meta.className = "sql-evidence-framework";
  meta.textContent =
    entry.meta ??
    [entry.serviceView, entry.framework].filter(Boolean).join(" · ");
  head.append(theme, meta);

  const proof = document.createElement("p");
  proof.className = "sql-evidence-proof";
  proof.textContent = entry.grcProof;

  row.append(head);
  if (entry.checkboxGap) {
    const gap = document.createElement("p");
    gap.className = "sql-evidence-gap";
    gap.textContent = entry.checkboxGap;
    row.append(gap);
  }
  row.append(proof);

  if (entry.sql) {
    const sql = document.createElement("code");
    sql.className = "sql-evidence-query mono";
    sql.textContent = entry.sql;
    row.append(sql);
  } else if (entry.command) {
    const cmd = document.createElement("code");
    cmd.className = "sql-evidence-query mono";
    cmd.textContent = entry.command;
    row.append(cmd);
  }

  const copyTarget = entry.runCommand ?? entry.command;
  if (copyTarget) {
    const actions = document.createElement("div");
    actions.className = "sql-evidence-actions";
    const runBtn = document.createElement("button");
    runBtn.type = "button";
    runBtn.className = "sql-evidence-run link-btn";
    runBtn.textContent = entry.runCommand ? "Copy RUNSQL" : "Copy command";
    runBtn.addEventListener("click", () => copySqlCommand(copyTarget, runBtn));
    actions.append(runBtn);
    if (entry.runCommand) {
      const count = document.createElement("span");
      count.className = "sql-evidence-count mono";
      const rowCount = entry.rowCount ?? 0;
      count.textContent =
        entry.message ?? `${rowCount} live row${rowCount === 1 ? "" : "s"}`;
      actions.append(count);
    }
    row.append(actions);
  }

  const columns = entry.columns ?? [];
  const rows = entry.rows ?? [];
  if (columns.length && rows.length) {
    const preview = document.createElement("div");
    preview.className = "sql-evidence-preview";
    const table = document.createElement("table");
    table.className = "sql-preview-table";
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    for (const col of columns) {
      const th = document.createElement("th");
      th.textContent = col;
      headerRow.append(th);
    }
    thead.append(headerRow);
    table.append(thead);
    const tbody = document.createElement("tbody");
    for (const previewRow of rows) {
      const tr = document.createElement("tr");
      for (const cell of previewRow) {
        const td = document.createElement("td");
        td.textContent = cell;
        tr.append(td);
      }
      tbody.append(tr);
    }
    table.append(tbody);
    preview.append(table);
    if (entry.truncated) {
      const more = document.createElement("p");
      more.className = "sql-preview-more note";
      more.textContent = "…more rows on RUNSQL (F7/F8)";
      preview.append(more);
    }
    row.append(preview);
  }

  return row;
}

function renderEvidenceFocusPanel(panel, ui, screenId) {
  const card = el(ui.card);
  const categories = el(ui.categories);
  if (!card || !categories) return;
  if (!panel?.categories?.length) {
    card.setAttribute("hidden", "");
    el(ui.screen)?.setAttribute("hidden", "");
    categories.replaceChildren();
    return;
  }
  card.removeAttribute("hidden");
  el(ui.headline).textContent = panel.headline;
  if (el(ui.stats)) {
    el(ui.stats).textContent = panel.statsLine ?? "";
    el(ui.stats).hidden = !panel.statsLine;
  }
  el(ui.contrastCheckbox).textContent = panel.contrast.checkbox;
  el(ui.contrastLive).textContent = panel.contrast.queryable;

  const screenLine = el(ui.screen);
  if (screenLine) {
    screenLine.textContent = `Screen: ${screenId ?? "—"}`;
    screenLine.hidden = false;
  }

  const lead = el(ui.lead);
  if (lead) {
    if (panel.lead) {
      lead.textContent = panel.lead;
      lead.hidden = false;
    } else {
      lead.textContent = "";
      lead.hidden = true;
    }
  }

  const article = el(ui.article);
  if (article && panel.article?.url) {
    article.hidden = false;
    article.href = panel.article.url;
    article.textContent = panel.article.title ?? "Read the article";
  } else {
    article?.setAttribute("hidden", "");
  }

  categories.replaceChildren();
  for (const category of panel.categories) {
    if (!category.items?.length) continue;
    const section = document.createElement("section");
    section.className = "sql-evidence-category";
    const heading = document.createElement("h4");
    heading.className = "sql-category-title";
    heading.textContent = `${category.label} (${category.items.length})`;
    const blurb = document.createElement("p");
    blurb.className = "sql-category-blurb";
    blurb.textContent = category.blurb;
    const list = document.createElement("div");
    list.className = "sql-evidence-list";
    for (const item of category.items) {
      list.append(renderEvidenceFocusItem(item));
    }
    section.append(heading, blurb, list);
    categories.append(section);
  }
}

function resolveEvidenceFocusPanel(payload) {
  return payload.evidenceFocus ?? payload.sqlEvidenceEngineering;
}

function renderAchievements(achievements) {
  const container = el("achievement-badges");
  if (!container) return;
  const earned = (achievements ?? []).filter((badge) => badge.earned);
  if (!earned.length) {
    container.setAttribute("hidden", "");
    container.replaceChildren();
    return;
  }
  container.removeAttribute("hidden");
  container.replaceChildren();
  for (const badge of achievements ?? []) {
    const chip = document.createElement("span");
    chip.className = `achievement-badge${badge.earned ? " earned" : ""}`;
    chip.textContent = badge.earned ? `✓ ${badge.label}` : badge.label;
    chip.hidden = !badge.earned;
    if (!badge.earned) continue;
    container.append(chip);
  }
}

function renderMission(payload) {
  el("system-label").textContent = payload.systemName;
  el("mission-title").textContent = payload.mission.title;
  el("mission-persona").textContent = payload.mission.persona
    ? `Persona: ${payload.mission.persona}`
    : "";
  el("mission-briefing").textContent = payload.mission.briefing;
  renderMissionPackaging(payload.packaging, payload.evidenceSummary);
  loadMissionNotes(payload.mission.id);
  renderMissionArticle(payload.mission.article, payload.mission.id);

  const steps = el("mission-steps");
  steps.replaceChildren();
  for (const step of payload.steps) {
    const item = document.createElement("li");
    appendWorkflowStep(item, step);
    steps.append(item);
  }

  renderEvidenceList(
    payload.evidence.map((row) => ({ ...row, key: row.key, collected: false })),
    undefined,
  );

  fillList(el("tips-keyboard"), payload.tips.keyboard, (node, tip) => {
    node.textContent = tip;
  });
  fillList(el("tips-subfile"), payload.tips.subfile, (node, row) => {
    appendSubfileTip(node, row);
  });
  fillList(el("tips-commands"), payload.tips.commands, (node, cmd) => {
    node.textContent = cmd;
  });

  const profile = LANE_PROFILES.auditor;
  applySessionSignOnHint(readStoredSkillPath() === "iongrc" ? "IONGRC" : profile.user, cachedLaneCredentials);
  refreshAuditorShellCredentials(payload);
}

function refreshOperatorShellCredentials(payload) {
  if (!payload?.tips?.signOn) return;
  LANE_PROFILES.operator.password = payload.tips.signOn.password;
  if (el("operator-signon-hint")) {
    el("operator-signon-hint").textContent =
      `User ${payload.tips.signOn.user} / Password ${payload.tips.signOn.password} · Model IBM-5292-2`;
  }
  if (el("pick-operator-creds")) {
    el("pick-operator-creds").textContent = formatLaneCredentialPair("operator");
  }
}

function renderOperatorShell(payload) {
  el("system-label").textContent = payload.systemName;
  el("operator-title").textContent = payload.title;
  el("operator-subtitle").textContent = payload.subtitle;
  el("operator-intro").textContent = payload.intro;

  const workflow = el("operator-workflow");
  workflow.replaceChildren();
  for (const step of payload.workflow) {
    const item = document.createElement("li");
    appendWorkflowStep(item, step);
    workflow.append(item);
  }

  fillList(el("operator-tips-keyboard"), payload.tips.keyboard, (node, tip) => {
    node.textContent = tip;
  });
  fillList(el("operator-tips-subfile"), payload.tips.subfile, (node, row) => {
    appendSubfileTip(node, row);
  });
  fillList(el("operator-tips-commands"), payload.tips.commands, (node, cmd) => {
    node.textContent = cmd;
  });

  refreshOperatorShellCredentials(payload);
}

function refreshAuditorShellCredentials(payload) {
  if (!payload?.tips?.signOn) return;
  LANE_PROFILES.auditor.password = payload.tips.signOn.password;
  const skillPath = readStoredSkillPath();
  if (skillPath === "iongrc" || skillPath === "demo") {
    applySessionSignOnHint(skillPath === "iongrc" ? "IONGRC" : "DEMO", cachedLaneCredentials);
    return;
  }
  if (el("signon-hint")) {
    el("signon-hint").textContent =
      `User ${payload.tips.signOn.user} / Password ${payload.tips.signOn.password} · Model IBM-5292-2`;
  }
}

function setInsightBlock(prefix, insight) {
  const block = el(`${prefix}-insight`) ?? el("context-insight");
  if (!insight) {
    block?.setAttribute("hidden", "");
    return;
  }
  block?.removeAttribute("hidden");
  const map = {
    "insight-looking-at": insight.lookingAt,
    "insight-why": insight.whyItMatters,
    "insight-proves": insight.whatItProves,
    "insight-not-proves": insight.whatItDoesNotProve,
    "insight-next": insight.suggestedNext,
  };
  for (const [id, text] of Object.entries(map)) {
    const node = el(id);
    if (node) node.textContent = text ?? "";
  }
}

function renderOperatorScreenGuide(payload) {
  const evidenceFocus = OPERATOR_EVIDENCE_FOCUS_SCREENS.has(payload.screenId);
  const panel = el("operator-panel");
  panel?.classList.toggle("evidence-focus-mode", evidenceFocus);

  if (evidenceFocus) {
    renderEvidenceFocusPanel(
      resolveEvidenceFocusPanel(payload),
      OPERATOR_FOCUS_UI,
      payload.screenId,
    );
    applyLaneCredentials(payload.signOnCredentials);
    return;
  }

  el("operator-context-article-card")?.setAttribute("hidden", "");
  const guide = payload.screenGuide;
  if (!guide) return;

  const commandSuffix = guide.ibmiCommand ? ` · ${guide.ibmiCommand}` : "";
  el("operator-screen-heading").textContent = guide.title;
  el("operator-screen-id").textContent = `Screen: ${payload.screenId ?? "—"}${commandSuffix}`;
  el("operator-screen-purpose").textContent = guide.purpose;
  fillList(el("operator-on-screen"), guide.onScreen, (node, line) => {
    node.textContent = line;
  });
  fillList(el("operator-what-to-do"), guide.whatToDo, (node, line) => {
    node.textContent = line;
  });
  fillList(el("operator-pf-keys"), guide.pfKeys, (node, line) => {
    node.textContent = line;
  });
  el("operator-realism").textContent = guide.realism;
  el("operator-grc-block")?.setAttribute("hidden", "");
  fillList(el("operator-related-cmds"), guide.relatedCommands, (node, cmd) => {
    node.textContent = cmd;
  });
  applyLaneCredentials(payload.signOnCredentials);
}

function buildWebsockifyUrl(port) {
  const host = window.location.hostname || "localhost";
  return `ws://${host}:${port}/`;
}

function resolvePlaybookPathParam() {
  const stored = sessionStorage.getItem(PLAYBOOK_PATH_KEY);
  if (stored === "blueteam" || stored === "redteam") return stored;
  const skillPath = readStoredSkillPath();
  const playbook = SKILL_PATHS[skillPath]?.playbookPath;
  return playbook === "blueteam" || playbook === "redteam" ? playbook : null;
}

function renderMissionPhaseStrip(phase, playbookGuide) {
  const strip = el("mission-phase-strip");
  if (!strip) return;
  if (!phase) {
    strip.hidden = true;
    return;
  }
  strip.hidden = false;

  const defaultOrder = ["collect", "document", "submit", "complete"];
  const customPhases = playbookGuide?.phases;
  const phaseLabels = customPhases?.length === 4 ? customPhases : null;
  const phaseKeys = defaultOrder;

  if (phaseLabels) {
    const connectors = strip.querySelectorAll(".phase-connector");
    const steps = strip.querySelectorAll(".phase-step");
    steps.forEach((step, index) => {
      if (phaseLabels[index]) step.textContent = phaseLabels[index];
    });
    connectors.forEach((node) => {
      node.hidden = false;
    });
  }

  const activeIndex = phaseKeys.indexOf(phase);
  for (const step of strip.querySelectorAll(".phase-step")) {
    const stepPhase = step.getAttribute("data-phase");
    const stepIndex = phaseKeys.indexOf(stepPhase ?? "");
    step.classList.toggle("active", stepPhase === phase);
    step.classList.toggle("done", stepIndex >= 0 && stepIndex < activeIndex);
  }
}

function renderPlaybookGuide(guide, missionPhase, missionProgression) {
  const card = el("playbook-guide-card");
  if (!card || !guide) {
    card?.setAttribute("hidden", "");
    return;
  }

  if (missionProgression?.nextStep) {
    card.setAttribute("hidden", "");
    return;
  }

  const showForPath = guide.path === "blueteam" || guide.path === "redteam";
  const showWhileActive = missionPhase && missionPhase !== "complete";
  if (!showForPath && !showWhileActive) {
    card.setAttribute("hidden", "");
    return;
  }

  card.removeAttribute("hidden");
  el("playbook-guide-title").textContent = guide.title;
  el("playbook-guide-subtitle").textContent = guide.subtitle;
  const list = el("playbook-start-steps");
  list.replaceChildren();
  for (const step of guide.startSteps ?? []) {
    const item = document.createElement("li");
    appendCommandStep(item, step);
    list.append(item);
  }
}

function renderProgressionSteps(listEl, steps) {
  if (!listEl) return;
  listEl.replaceChildren();
  for (const step of steps ?? []) {
    const item = document.createElement("li");
    appendCommandStep(item, step);
    listEl.append(item);
  }
}

function renderCampaignMissionList(listEl, missions) {
  if (!listEl) return;
  listEl.replaceChildren();
  for (const mission of missions ?? []) {
    const item = document.createElement("li");
    appendCampaignMissionItem(item, mission);
    listEl.append(item);
  }
}

function resetMissionClientState() {
  previousCollectedKeys = [];
  cachedAttemptId = null;
  disciplineTracked = false;
  disciplineBadgeShown = false;
  el("discipline-badge")?.setAttribute("hidden", "");
  el("campaign-quest-status")?.setAttribute("hidden", "");
}

function clearMissionGamificationPanels() {
  renderInvestigationLeads([]);
  renderSignalsFeed([]);
  renderAchievements([]);
  renderScoreDebrief(undefined);
  renderMissionPhaseStrip("collect");
  el("finding-composer")?.setAttribute("hidden", "");
  const findingForm = el("finding-form");
  findingForm?.reset();
  el("finding-quality")?.setAttribute("hidden", "");
  populateEvidenceRefSelect([]);
}

function bindQuestCta(button, quest) {
  if (!button) return;
  if (!quest || quest.campaignComplete) {
    button.hidden = true;
    return;
  }
  button.hidden = false;
  button.textContent = quest.ctaLabel;
  button.onclick = () => startNextMissionImpl?.(quest);
}

function renderCampaignQuest(quest, missionPhase) {
  const card = el("campaign-quest-card");
  if (!card) return;
  pendingCampaignQuest = quest ?? null;

  if (!quest) {
    card.setAttribute("hidden", "");
    return;
  }

  card.removeAttribute("hidden");
  el("campaign-quest-title").textContent = quest.campaignComplete
    ? `${quest.campaignTitle} — complete`
    : quest.campaignTitle;

  const pct =
    quest.totalCount > 0 ? Math.round((quest.completedCount / quest.totalCount) * 100) : 0;
  const fill = el("campaign-quest-fill");
  const bar = el("campaign-quest-bar");
  if (fill) fill.style.width = `${pct}%`;
  if (bar) {
    bar.setAttribute("aria-valuenow", String(pct));
    bar.setAttribute("aria-valuemax", "100");
  }
  el("campaign-quest-stats").textContent = `${quest.completedCount} / ${quest.totalCount} missions complete`;

  const nextTitle = el("campaign-quest-next-title");
  if (quest.campaignComplete) {
    nextTitle.textContent = "You finished every mission in this campaign. Pick another lane or replay from WRKCMPMSN.";
  } else {
    nextTitle.textContent = `Up next: ${quest.nextMissionTitle} (${quest.nextMissionId})`;
  }

  const profileHint = el("campaign-quest-profile-hint");
  if (profileHint) {
    if (quest.profileRequired) {
      profileHint.removeAttribute("hidden");
      profileHint.textContent = `Sign on as ${quest.profileRequired} in the green screen, then start the next mission.`;
    } else {
      profileHint.setAttribute("hidden", "");
    }
  }

  const cta = el("campaign-quest-cta");
  if (quest.campaignComplete) {
    cta.hidden = true;
  } else {
    bindQuestCta(cta, quest);
    if (missionPhase === "complete") {
      cta.classList.add("quest-cta-pulse");
    } else {
      cta.classList.remove("quest-cta-pulse");
    }
  }
}

function renderMissionProgression(progression, campaignQuest) {
  const card = el("mission-progression-card");
  if (!card) return;
  if (!progression?.nextStep) {
    card.hidden = true;
    return;
  }

  card.hidden = false;
  el("progression-summary").textContent = progression.nextStep.summary;

  const progressionCta = el("progression-cta");
  const orLabel = el("progression-or-label");
  if (campaignQuest && !campaignQuest.campaignComplete) {
    bindQuestCta(progressionCta, campaignQuest);
    orLabel?.removeAttribute("hidden");
  } else {
    progressionCta.hidden = true;
    orLabel?.setAttribute("hidden", "");
  }

  renderProgressionSteps(el("progression-steps"), progression.nextStep.steps);

  const block = el("progression-campaign-block");
  const track = progression.primaryCampaign;
  if (track?.missions?.length) {
    block?.removeAttribute("hidden");
    el("progression-campaign-title").textContent = `${track.title} (${track.completed}/${track.total})`;
    renderCampaignMissionList(el("progression-campaign-missions"), track.missions);
  } else {
    block?.setAttribute("hidden", "");
  }
}

function renderCampaignTracks(tracks) {
  const card = el("campaign-progress-card");
  const list = el("campaign-progress-list");
  if (!list) return;

  if (!tracks?.length) {
    card?.setAttribute("hidden", "");
    return;
  }

  card?.removeAttribute("hidden");
  list.replaceChildren();
  for (const track of tracks) {
    const item = document.createElement("li");
    const nextOpen = track.missions.find((mission) => mission.status === "open");
    const nextHint = nextOpen ? ` · next: ${nextOpen.missionId}` : track.campaignComplete ? " · complete" : "";
    item.textContent = `${track.title}: ${track.completed}/${track.total}${nextHint}`;
    list.append(item);
  }
}

async function collectEvidenceFromRail(requirementKey) {
  if (!cachedAttemptId || !requirementKey) return;
  const params = new URLSearchParams({
    system: coachSystemName,
    user: coachUserName,
  });
  const response = await labFetch(
    `/api/missions/${encodeURIComponent(cachedAttemptId)}/evidence?${params.toString()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requirementKey }),
    },
  );
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error ?? `HTTP ${response.status}`);
  }
  if (!result.alreadyCollected && result.requirementKey) {
    const key = result.requirementKey;
    if (!previousCollectedKeys.includes(key)) {
      previousCollectedKeys = [...previousCollectedKeys, key];
    }
  }
}

function renderEvidenceList(rows, readiness, options = {}) {
  const card = el("evidence-card");
  const evidence = el("evidence-list");
  const coverage = el("evidence-coverage");
  const fill = el("evidence-progress-fill");
  const bar = el("evidence-progress-bar");
  if (!evidence) return;

  if (rows?.length) {
    card?.removeAttribute("hidden");
  } else {
    card?.setAttribute("hidden", "");
    return;
  }

  evidence.replaceChildren();
  const requiredTotal = readiness?.requiredTotal ?? rows.filter((row) => !row.optional).length;
  const requiredCollected =
    readiness?.requiredCollected ??
    rows.filter((row) => !row.optional && row.collected).length;
  const percent =
    readiness?.requiredEvidencePercent ??
    (requiredTotal ? Math.round((requiredCollected / requiredTotal) * 100) : 100);

  if (coverage) {
    coverage.textContent = `${requiredCollected}/${requiredTotal} required · ${percent}%`;
  }
  if (fill) fill.style.width = `${percent}%`;
  if (bar) {
    bar.setAttribute("aria-valuenow", String(percent));
    bar.setAttribute("aria-valuetext", `${requiredCollected} of ${requiredTotal} required`);
  }

  const canCollectFromRail =
    options.missionPhase && options.missionPhase !== "complete" && Boolean(cachedAttemptId);

  for (const row of rows) {
    const item = document.createElement("li");
    if (row.optional) item.classList.add("optional");
    if (row.collected) item.classList.add("collected");
    if (row.collected && row.key && previousCollectedKeys.includes(row.key) === false) {
      const wasKnown = previousCollectedKeys.length > 0;
      if (wasKnown) item.classList.add("collected-new");
    }
    appendEvidenceListItem(item, row);
    if (canCollectFromRail && !row.collected && row.key) {
      item.classList.add("evidence-collectable");
      item.tabIndex = 0;
      item.setAttribute("role", "button");
      item.setAttribute("aria-label", `Capture evidence: ${row.description}`);
      const capture = () => {
        collectEvidenceFromRail(row.key).catch((err) => {
          const message = err instanceof Error ? err.message : "Unable to capture evidence.";
          item.setAttribute("title", message);
        });
      };
      item.addEventListener("click", capture);
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          capture();
        }
      });
    }
    evidence.append(item);
  }
}

function renderSignalsFeed(signals) {
  const card = el("signals-card");
  const list = el("signals-list");
  if (!list) return;
  if (!signals?.length) {
    card?.setAttribute("hidden", "");
    return;
  }
  card?.removeAttribute("hidden");
  list.replaceChildren();
  for (const signal of signals) {
    const item = document.createElement("li");
    item.className = `signal-${signal.kind ?? "event"}`;
    item.textContent = signal.message;
    list.append(item);
  }
}

function renderInvestigationLeads(leads) {
  const card = el("investigation-leads-card");
  const list = el("investigation-leads-list");
  if (!list) return;
  if (!leads?.length) {
    card?.setAttribute("hidden", "");
    return;
  }
  card?.removeAttribute("hidden");
  list.replaceChildren();
  for (const lead of leads) {
    const item = document.createElement("li");
    item.className = `lead-${lead.status}`;
    const statusLabel =
      lead.status === "addressed" ? "✓" : lead.status === "partial" ? "◐" : "○";
    item.textContent = `${statusLabel} ${lead.description}`;
    list.append(item);
  }
}

function renderScoreDebrief(debrief, progression) {
  const card = el("score-debrief-card");
  if (!card) return;
  if (!debrief) {
    card.hidden = true;
    return;
  }
  card.hidden = false;
  el("debrief-total").textContent = `Total score: ${debrief.totalScore}/100`;

  const strengthBlock = el("case-strength-block");
  const strengthFill = el("case-strength-fill");
  const strengthBar = el("case-strength-bar");
  if (strengthBlock && typeof debrief.caseStrengthPercent === "number") {
    strengthBlock.removeAttribute("hidden");
    const pct = debrief.caseStrengthPercent;
    if (strengthFill) strengthFill.style.width = `${pct}%`;
    if (strengthBar) strengthBar.setAttribute("aria-valuenow", String(pct));
    el("case-strength-percent").textContent = `${pct}%`;
    el("case-strength-label").textContent = debrief.caseStrengthLabel ?? "";
  } else {
    strengthBlock?.setAttribute("hidden", "");
  }

  const bars = el("debrief-bars");
  bars.replaceChildren();
  const sections = [
    { label: "Evidence coverage", score: debrief.evidenceScore, weight: 35 },
    { label: "Issue identification", score: debrief.issuesScore, weight: 30 },
    { label: "Control interpretation", score: debrief.interpretationScore, weight: 15 },
    { label: "Finding quality", score: debrief.findingQualityScore, weight: 20 },
  ];
  for (const section of sections) {
    const row = document.createElement("div");
    row.className = "debrief-bar-row";
    appendDebriefBarRow(row, section);
    bars.append(row);
  }
  const leadsList = el("debrief-leads-list");
  leadsList.replaceChildren();
  for (const lead of debrief.investigationLeads ?? []) {
    const item = document.createElement("li");
    item.className = `lead-${lead.status}`;
    item.textContent = `${lead.description} (${lead.status})`;
    leadsList.append(item);
  }
  const exportNote = el("debrief-export-note");
  if (exportNote) {
    const reportPath = progression?.reportPath;
    exportNote.textContent = reportPath
      ? `Report exported: ${reportPath}`
      : "Reports export to data/reports/ when you SUBMITMSN from the green screen.";
  }
}

function renderCampaignProgress(campaigns, tracks) {
  if (tracks?.length) {
    renderCampaignTracks(tracks);
    return;
  }
  const card = el("campaign-progress-card");
  const list = el("campaign-progress-list");
  if (!list) return;
  if (!campaigns?.length) {
    card?.setAttribute("hidden", "");
    return;
  }
  card?.removeAttribute("hidden");
  list.replaceChildren();
  for (const campaign of campaigns) {
    const item = document.createElement("li");
    item.textContent = `${campaign.title}: ${campaign.completed}/${campaign.total} complete`;
    list.append(item);
  }
}

async function ensureControlsLoaded() {
  if (cachedControls) return cachedControls;
  try {
    const payload = await loadJson("/api/controls");
    cachedControls = payload.controls ?? [];
  } catch {
    cachedControls = [];
  }
  return cachedControls;
}

function populateEvidenceRefSelect(rows) {
  const select = el("finding-evidence-refs");
  if (!select) return;
  const selected = [...select.selectedOptions].map((opt) => opt.value);
  select.replaceChildren();
  for (const row of rows ?? []) {
    if (!row.collected) continue;
    const option = document.createElement("option");
    option.value = row.key ?? row.description;
    option.textContent = row.description;
    if (selected.includes(option.value)) option.selected = true;
    select.append(option);
  }
}

async function populateControlSelect() {
  const select = el("finding-control");
  if (!select) return;
  const controls = await ensureControlsLoaded();
  const current = select.value;
  select.replaceChildren();
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = "— Select control —";
  select.append(blank);
  for (const control of controls) {
    const option = document.createElement("option");
    option.value = control.id;
    option.textContent = `${control.id} — ${control.title}`;
    select.append(option);
  }
  if (current) select.value = current;
}

async function refreshFindingQualityPreview(attemptId) {
  const qualityBlock = el("finding-quality");
  if (!attemptId || !qualityBlock) return;
  try {
    const preview = await loadJson(
      `/api/missions/${encodeURIComponent(attemptId)}/score-preview?system=${encodeURIComponent(coachSystemName)}`,
    );
    qualityBlock.hidden = false;
    const score = preview.findingQualityScore ?? 0;
    el("finding-quality-score").textContent = `${score}/100`;
    el("finding-quality-fill").style.width = `${score}%`;
  } catch {
    qualityBlock.hidden = true;
  }
}

function updateImpactCount() {
  const impact = el("finding-impact");
  const counter = el("finding-impact-count");
  if (!impact || !counter) return;
  const len = impact.value.trim().length;
  counter.textContent = `${len} / 15 min`;
  counter.classList.toggle("ready", len >= 15);
}

function focusFindingComposerCard() {
  const card = el("finding-composer");
  if (!card) return;
  card.removeAttribute("hidden");
  card.classList.add("focus-pulse");
  card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  window.setTimeout(() => card.classList.remove("focus-pulse"), 2500);
  el("finding-title")?.focus();
}

function initFindingComposer() {
  const form = el("finding-form");
  if (!form || form.dataset.bound === "1") return;
  form.dataset.bound = "1";

  el("finding-impact")?.addEventListener("input", () => {
    updateImpactCount();
    if (cachedAttemptId) refreshFindingQualityPreview(cachedAttemptId);
  });

  for (const field of ["finding-title", "finding-text", "finding-recommendation"]) {
    el(field)?.addEventListener("input", () => {
      if (cachedAttemptId) refreshFindingQualityPreview(cachedAttemptId);
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!cachedAttemptId) return;
    const status = el("finding-status");
    const refsSelect = el("finding-evidence-refs");
    const selectedRefs = [...(refsSelect?.selectedOptions ?? [])].map((opt) => opt.value);
    const freeRef = el("finding-evidence-free")?.value?.trim() ?? "";
    const evidenceRefs = [...selectedRefs, freeRef].filter(Boolean).join("; ");
    const body = {
      title: el("finding-title")?.value ?? "",
      severity: el("finding-severity")?.value ?? "MODERATE",
      evidenceRefs,
      controlMapping: el("finding-control")?.value ?? "",
      findingText: el("finding-text")?.value ?? "",
      decisionImpact: el("finding-impact")?.value ?? "",
      recommendation: el("finding-recommendation")?.value ?? "",
    };
    try {
      await labFetch(
        `/api/missions/${encodeURIComponent(cachedAttemptId)}/findings?system=${encodeURIComponent(coachSystemName)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      ).then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? res.statusText);
        }
        return res.json();
      });
      if (status) {
        status.hidden = false;
        status.textContent = "Finding saved.";
      }
      form.reset();
      updateImpactCount();
      refreshFindingQualityPreview(cachedAttemptId);
    } catch (error) {
      if (status) {
        status.hidden = false;
        status.textContent = error instanceof Error ? error.message : "Save failed.";
      }
    }
  });
}

function renderContextArticle(article, cardId, hookId, linkId) {
  const card = el(cardId);
  if (!card) return;
  if (!article?.url) {
    card.hidden = true;
    return;
  }
  card.hidden = false;
  if (el(hookId)) {
    el(hookId).textContent = article.hook ?? article.title ?? "";
  }
  const link = el(linkId);
  if (link) {
    link.href = article.url;
    link.textContent = article.title ?? "Read the article";
  }
}

function renderAuditorContext(payload) {
  const showroomMode = payload.lane === "demo" || payload.guidanceMode === "demo";
  const gamificationBlock = el("auditor-gamification-block");
  if (gamificationBlock) {
    gamificationBlock.hidden = showroomMode;
  }

  const evidenceFocus = AUDITOR_EVIDENCE_FOCUS_SCREENS.has(payload.screenId);
  const panel = el("auditor-panel");
  panel?.classList.toggle("evidence-focus-mode", evidenceFocus);

  if (evidenceFocus) {
    renderEvidenceFocusPanel(
      resolveEvidenceFocusPanel(payload),
      AUDITOR_FOCUS_UI,
      payload.screenId,
    );
    applyLaneCredentials(payload.signOnCredentials);
    return;
  }

  renderIongrcPointer(payload);

  const screen = el("context-screen");
  const hints = el("context-hints");
  if (screen) {
    screen.textContent = `Screen: ${payload.screenId ?? "—"}`;
  }
  setInsightBlock("context", payload.insight);
  if (hints) {
    fillList(hints, payload.hints, (node, hint) => {
      node.textContent = hint;
    });
  }

  if (showroomMode) {
    applyLaneCredentials(payload.signOnCredentials);
    return;
  }

  const expertMode = payload.guidanceMode === "expert";
  if (!expertMode) {
    renderMissionPhaseStrip(payload.missionPhase, payload.playbookGuide);
  } else {
    el("mission-phase-strip")?.setAttribute("hidden", "");
  }

  renderPlaybookGuide(payload.playbookGuide, payload.missionPhase, payload.missionProgression);
  renderCampaignQuest(payload.campaignQuest, payload.missionPhase);
  renderMissionProgression(payload.missionProgression, payload.campaignQuest);
  renderMissionPackaging(
    payload.missionPackaging,
    payload.missionProgress?.evidence
      ? {
          required: payload.missionProgress.evidence.filter((row) => !row.optional).length,
          optional: payload.missionProgress.evidence.filter((row) => row.optional).length,
        }
      : undefined,
    payload.missionPhase,
  );
  renderCampaignDashboard(payload.campaignDashboard, payload.missionPhase);
  renderAchievements(payload.achievements);
  renderEvidenceFocusPanel(resolveEvidenceFocusPanel(payload), AUDITOR_FOCUS_UI, payload.screenId);

  if (payload.missionProgress?.missionId) {
    loadMissionNotes(payload.missionProgress.missionId);
  }

  const evidenceRows = payload.missionProgress?.evidence ?? [];
  renderEvidenceList(evidenceRows, payload.readiness, { missionPhase: payload.missionPhase });
  if (!expertMode) {
    renderSignalsFeed(payload.signals);
  } else {
    el("signals-card")?.setAttribute("hidden", "");
  }
  renderInvestigationLeads(payload.investigationLeads);
  renderScoreDebrief(payload.submitDebrief, payload.missionProgression);
  renderCampaignProgress(payload.campaignProgress, payload.campaignTracks);

  if (payload.missionProgress?.attemptId) {
    cachedAttemptId = payload.missionProgress.attemptId;
    const composer = el("finding-composer");
    if (composer && payload.missionPhase !== "complete") {
      composer.removeAttribute("hidden");
      populateEvidenceRefSelect(evidenceRows);
      populateControlSelect();
      refreshFindingQualityPreview(cachedAttemptId);
    } else if (composer) {
      composer.setAttribute("hidden", "");
    }
  }

  if (payload.readiness) {
    if (!disciplineTracked && payload.readiness.findingCount > 0) {
      disciplineTracked = true;
      if (
        payload.readiness.requiredEvidenceComplete &&
        payload.readiness.requiredCollected === payload.readiness.requiredTotal
      ) {
        disciplineBadgeShown = true;
      }
    }
    const badge = el("discipline-badge");
    if (badge) {
      badge.hidden = !disciplineBadgeShown || Boolean(payload.achievements?.some((a) => a.earned));
    }
  }

  if (payload.focusFindingComposer) {
    focusFindingComposerCard();
  }

  handleDemoStepAdvance(payload);

  if (payload.missionProgress?.evidence) {
    const collectedNow = payload.missionProgress.evidence
      .filter((row) => row.collected)
      .map((row) => row.key);
    previousCollectedKeys = collectedNow;
  }

  applyLaneCredentials(payload.signOnCredentials);
  updateRestartMissionButton(
    payload.lane === "demo" ? "demo" : "auditor",
    payload.missionPhase,
  );
}

function renderDemoStep(payload) {
  const step = payload.step;
  renderDemoCredentials(payload.signOnCredentials ?? cachedLaneCredentials);
  el("demo-step-phase").textContent = step.phase ?? "";
  el("demo-step-meta").textContent = `Step ${payload.stepIndex + 1} of ${payload.stepCount}`;
  el("demo-step-title").textContent = step.title;
  el("demo-step-intro").textContent = step.intro ?? "";
  el("demo-narrative").textContent = step.narrative ?? "";
  el("demo-ibm-concept").textContent = step.ibmIConcept ?? "";
  el("demo-control-angle").textContent = step.controlAngle ?? "";
  el("demo-why-unique").textContent = step.whyUnique ?? "";
  renderDemoCommandBlock(step);
  const noteEl = el("demo-command-note");
  if (noteEl) {
    noteEl.textContent = step.commandNote ?? "";
    noteEl.hidden = !step.commandNote;
  }
  const exitEl = el("demo-exit-hint");
  if (exitEl) {
    if (step.exitHint) {
      exitEl.textContent = step.exitHint;
      exitEl.hidden = false;
    } else {
      exitEl.textContent = "";
      exitEl.hidden = true;
    }
  }
  renderDemoScreenGuide(payload.screenGuide);
  fillList(el("demo-watch-for"), step.watchFor, (node, line) => {
    node.textContent = line;
  });
  fillList(el("demo-tips"), step.tips, (node, line) => {
    node.textContent = line;
  });

  const articleCard = el("demo-article-card");
  if (articleCard) {
    const packId = step.labMission ? MISSION_IONGRC_PACK[step.labMission] : undefined;
    const hasArticle = Boolean(packId || step.articleUrl);
    articleCard.hidden = !hasArticle;
    if (hasArticle) {
      if (el("demo-article-hook")) {
        el("demo-article-hook").textContent = packId
          ? `Go deeper in IONGRC — practice the full article pack on the green screen.`
          : "This step maps to a published i on GRC article. The article is proof; this lab is the pudding.";
      }
      if (el("demo-article-mission")) {
        el("demo-article-mission").textContent = packId
          ? `IONGRC pack: ${packId}`
          : step.labMission
            ? `Lab mission: ${step.labMission}`
            : "";
        el("demo-article-mission").hidden = !(packId || step.labMission);
      }
      const link = el("demo-article-link");
      if (link) {
        if (packId) {
          link.href = "#";
          link.textContent = "Open in IONGRC practice desk";
          link.onclick = (event) => {
            event.preventDefault();
            stopDemoMode();
            sessionStorage.setItem(SKILL_PATH_KEY, "iongrc");
            startIongrcMode(packId);
            setPanelMode("iongrc");
          };
        } else {
          link.onclick = null;
          link.href = step.articleUrl;
          link.textContent = "Read the article";
        }
      }
      const frameworks = el("demo-framework-refs");
      if (frameworks) {
        frameworks.replaceChildren();
        for (const ref of step.frameworkRefs ?? []) {
          const item = document.createElement("li");
          item.textContent = ref;
          frameworks.append(item);
        }
      }
    }
  }

  const outline = el("demo-outline");
  if (outline) {
    outline.replaceChildren();
    for (const row of payload.steps ?? []) {
      const item = document.createElement("li");
      const active = row.index === payload.stepIndex;
      item.classList.toggle("demo-outline-active", active);
      appendDemoOutlineItem(item, row, active);
      outline.append(item);
    }
  }
  const card = document.querySelector(".demo-step-card");
  card?.classList.toggle("demo-signon-step", Boolean(step.isSignOn));

  renderDemoPanelState({
    stepCount: payload.stepCount,
    demoComplete: false,
  });
}

async function loadDemoStep(path, stepIndex, systemName = demoSystemName) {
  const payload = await loadJson(
    `/api/lab/demo?path=${encodeURIComponent(path)}&step=${encodeURIComponent(String(stepIndex))}&system=${encodeURIComponent(systemName)}`,
  );
  renderDemoStep(payload);
  sessionStorage.setItem(DEMO_PATH_KEY, path);
  sessionStorage.setItem(DEMO_STEP_KEY, String(stepIndex));
  return payload;
}

function startDemoMode() {
  stopIongrcMode();
  sessionStorage.setItem(DEMO_ACTIVE_KEY, "1");
  sessionStorage.setItem(DEMO_PATH_KEY, "product");
  sessionStorage.setItem(DEMO_STEP_KEY, "0");
  sessionStorage.removeItem(PLAYBOOK_PATH_KEY);
  el("demo-toggle").hidden = false;
  setPanelMode("disconnected");
  loadDemoStep("product", 0).catch(() => undefined);
}

function stopDemoMode() {
  cancelDemoAutoSignoff();
  sessionStorage.removeItem(DEMO_ACTIVE_KEY);
  sessionStorage.removeItem(DEMO_PATH_KEY);
  sessionStorage.removeItem(DEMO_STEP_KEY);
  el("demo-toggle").hidden = true;
  el("demo-dive-in")?.setAttribute("hidden", "");
  el("demo-next")?.removeAttribute("hidden");
  el("lab-split")?.classList.remove("demo-coach-open");
}

function focusTerminalFrame(frame) {
  if (!frame?.contentWindow) return;
  try {
    frame.focus({ preventScroll: true });
    frame.contentWindow.focus();
    const doc = frame.contentDocument;
    const canvas = doc?.getElementById("terminal");
    if (canvas) {
      canvas.setAttribute("tabindex", "0");
      canvas.focus({ preventScroll: true });
      return;
    }
    doc?.body?.setAttribute("tabindex", "-1");
    doc?.body?.focus({ preventScroll: true });
  } catch {
    /* cross-origin guard */
  }
}

function scheduleTerminalFocus(frame, delays = [0, 120, 400, 900]) {
  for (const delay of delays) {
    window.setTimeout(() => focusTerminalFrame(frame), delay);
  }
}

function installTerminalKeyboardForward(frame) {
  window.addEventListener(
    "keydown",
    (event) => {
      if (!frame?.contentWindow) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || target.isContentEditable) {
          return;
        }
      }
      if (event.ctrlKey || event.altKey || event.metaKey) return;

      let doc;
      try {
        doc = frame.contentDocument;
      } catch {
        return;
      }
      if (!doc) return;

      const active = doc.activeElement;
      const activeTag = active?.tagName;
      if (activeTag === "INPUT" || activeTag === "SELECT" || activeTag === "TEXTAREA") return;
      if (active?.id === "terminal") return;

      focusTerminalFrame(frame);
      doc.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: event.key,
          code: event.code,
          location: event.location,
          repeat: event.repeat,
          bubbles: true,
          cancelable: true,
        }),
      );
      event.preventDefault();
    },
    true,
  );
}

function buildTerminalUrl(config) {
  const port = config.websockifyPort ?? 6080;
  const params = new URLSearchParams({
    bridge: buildWebsockifyUrl(port),
    port: "23",
    model: config.terminalModel ?? "5292-2",
    embed: "1",
    autoconnect: "1",
  });
  return `/tn5250/?${params.toString()}`;
}

function highlightRememberedSkillPath(skillPathId) {
  for (const node of document.querySelectorAll("[data-skill-path]")) {
    node.classList.toggle("lane-card-remembered", node.getAttribute("data-skill-path") === skillPathId);
  }
}

function hasSeenLauncherIntro() {
  return localStorage.getItem(LAUNCHER_INTRO_KEY) === "1";
}

function markLauncherIntroduced() {
  localStorage.setItem(LAUNCHER_INTRO_KEY, "1");
}

function clearLauncherIntroduced() {
  localStorage.removeItem(LAUNCHER_INTRO_KEY);
}

function setLauncherStage(stage) {
  const intro = el("launcher-stage-intro");
  const paths = el("launcher-stage-paths");
  if (intro) intro.hidden = stage !== "intro";
  if (paths) paths.hidden = stage !== "paths";
  for (const node of document.querySelectorAll(".launcher-paths-only")) {
    node.hidden = stage !== "paths";
  }
}

function showLaneChooser(forceStage) {
  const chooser = el("lane-chooser");
  if (!chooser) return;
  const stage =
    forceStage ?? (hasSeenLauncherIntro() || isSkillPathRemembered() ? "paths" : "intro");
  setLauncherStage(stage);
  chooser.hidden = false;
  document.body.classList.add("welcome-open");
  window.scrollTo(0, 0);
  chooser.scrollTop = 0;
  const card = chooser.querySelector(".welcome-card");
  if (card) card.scrollTop = 0;
  highlightRememberedSkillPath(readLastRememberedSkillPath());
  if (!chooser.hasAttribute("tabindex")) {
    chooser.setAttribute("tabindex", "-1");
  }
  chooser.focus({ preventScroll: true });
}

function hideLaneChooser() {
  const chooser = el("lane-chooser");
  if (!chooser) return;
  chooser.hidden = true;
  document.body.classList.remove("welcome-open");
}

async function loadLab() {
  const frame = el("terminal-frame");
  terminalFrameRef = frame;
  let terminalConfig = { websockifyPort: 6080, terminalModel: "5292-2", systemName: "CLAIMS400" };
  let coachTimer;
  let activeLane = "disconnected";
  let preferredLane = readStoredLane();
  let auditorShellLoaded = false;
  let operatorShellLoaded = false;
  let terminalStarted = false;
  let coachPollGeneration = 0;

  async function loadAuditorShell(systemName, missionId) {
    const mission = await loadJson(
      `/api/missions/${encodeURIComponent(missionId)}?system=${encodeURIComponent(systemName)}`,
    );
    renderMission(mission);
    activeMissionId = missionId;
    auditorShellLoaded = true;
  }

  async function startNextMission(quest) {
    if (!quest || quest.campaignComplete) return;

    const buttons = [el("campaign-quest-cta"), el("progression-cta")].filter(Boolean);
    const status = el("campaign-quest-status");
    for (const button of buttons) button.disabled = true;
    if (status) {
      status.removeAttribute("hidden");
      status.textContent = "Starting mission…";
    }

    try {
      const response = await labFetch("/api/lab/start-mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: coachSystemName,
          user: coachUserName,
          missionId: quest.nextMissionId,
          campaignId: quest.campaignId,
        }),
      });
      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error ?? `HTTP ${response.status}`);
      }

      coachPollGeneration += 1;
      resetMissionClientState();
      clearMissionGamificationPanels();
      const targetSystem = result.systemName ?? coachSystemName;
      coachSystemName = targetSystem;
      activeMissionId = result.missionId;
      cachedAttemptId = result.attemptId ?? null;
      await loadAuditorShell(targetSystem, result.missionId);
      await refreshCoachContextNow();
      skillMissionBootstrapDone = true;

      el("campaign-quest-card")?.setAttribute("hidden", "");
      el("mission-progression-card").hidden = true;
      el("score-debrief-card").hidden = true;

      if (status) {
        status.textContent = result.message ?? `Mission ${result.missionId} started.`;
      }
    } catch (err) {
      if (status) {
        status.textContent = err instanceof Error ? err.message : "Unable to start mission.";
      }
    } finally {
      for (const button of buttons) button.disabled = false;
    }
  }

  startNextMissionImpl = startNextMission;

  async function restartCurrentMission() {
    if (!activeMissionId || activeMissionId === "OPERATOR-SESSION") return;
    const btn = el("restart-mission");
    if (btn) btn.disabled = true;
    try {
      const response = await labFetch("/api/lab/restart-mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: coachSystemName,
          user: coachUserName,
          missionId: activeMissionId,
        }),
      });
      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error ?? `HTTP ${response.status}`);
      }
      coachPollGeneration += 1;
      resetMissionClientState();
      clearMissionGamificationPanels();
      coachSystemName = result.systemName ?? coachSystemName;
      activeMissionId = result.missionId;
      cachedAttemptId = result.attemptId ?? null;
      await loadAuditorShell(coachSystemName, result.missionId);
      await refreshCoachContextNow();
      skillMissionBootstrapDone = true;
      el("campaign-quest-card")?.setAttribute("hidden", "");
      el("mission-progression-card").hidden = true;
      el("score-debrief-card").hidden = true;
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to restart mission.");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  el("restart-mission")?.addEventListener("click", () => {
    restartCurrentMission().catch(() => undefined);
  });

  async function loadOperatorShell(systemName) {
    const shell = await loadJson(
      `/api/lab/coach-shell?system=${encodeURIComponent(systemName)}&lane=operator`,
    );
    renderOperatorShell(shell);
    operatorShellLoaded = true;
  }

  async function preloadShellForLane(lane, systemName, missionId) {
    if (lane === "operator" && !operatorShellLoaded) {
      await loadOperatorShell(systemName);
    }
    if ((lane === "auditor" || lane === "demo") && !auditorShellLoaded) {
      await loadAuditorShell(systemName, missionId);
    }
  }

  async function ensureShellForLane(lane, systemName, missionId) {
    if (lane === "disconnected") {
      setPanelMode("disconnected");
      return;
    }

    setPanelMode(lane);

    try {
      if (lane === "operator") {
        if (!operatorShellLoaded) await loadOperatorShell(systemName);
      } else if (lane === "auditor" || lane === "demo") {
        if (!auditorShellLoaded) await loadAuditorShell(systemName, missionId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Coach panel failed to load.";
      if (lane === "auditor" || lane === "demo") {
        el("mission-title").textContent = "Coach panel unavailable";
        el("mission-briefing").textContent = message;
      } else {
        el("operator-title").textContent = "Coach panel unavailable";
        el("operator-intro").textContent = message;
      }
    }
  }

  function startTerminal() {
    if (terminalStarted) return;
    terminalStarted = true;
    frame.addEventListener(
      "load",
      () => {
        scheduleTerminalFocus(frame);
      },
      { once: false },
    );
    installTerminalKeyboardForward(frame);
    frame.src = buildTerminalUrl(terminalConfig);
  }

  function beginLane(lane, remember) {
    preferredLane = lane;
    storeLaneChoice(lane, remember);
    hideLaneChooser();
    scheduleTerminalFocus(frame);
    el("lane-switch").hidden = false;
    setPanelMode("disconnected");
    startTerminal();
    if (terminalConfig.systemName) {
      preloadShellForLane(lane, terminalConfig.systemName, terminalConfig.defaultMissionId).catch(
        () => undefined,
      );
    }
  }

  let skillMissionBootstrapDone = false;

  async function maybeBootstrapSkillMission(systemName, session) {
    if (skillMissionBootstrapDone || sessionStorage.getItem(DEMO_ACTIVE_KEY) === "1") return;
    const skillPath = readStoredSkillPath();
    const config = SKILL_PATHS[skillPath];
    if (!config?.missionId || config.missionId === "OPERATOR-SESSION") return;
    const signedUser = (session.userName ?? "").trim().toUpperCase();
    if (signedUser !== config.user) return;
    if (activeMissionId && activeMissionId !== config.missionId) {
      skillMissionBootstrapDone = true;
      return;
    }

    skillMissionBootstrapDone = true;
    try {
      const response = await labFetch("/api/lab/start-mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: systemName,
          user: signedUser,
          missionId: config.missionId,
          campaignId: config.campaignId,
        }),
      });
      const result = await response.json();
      if (result.ok) {
        activeMissionId = result.missionId;
        await loadAuditorShell(result.systemName ?? systemName, result.missionId);
      }
    } catch {
      skillMissionBootstrapDone = false;
    }
  }

  function diveIntoSkillPath(skillPathId) {
    stopDemoMode();
    stopIongrcMode();
    setAgentAuthorityActive(skillPathId === "agentauthority");
    const config = SKILL_PATHS[skillPathId];
    if (!config) return;
    markLauncherIntroduced();
    sessionStorage.setItem(SKILL_PATH_KEY, skillPathId);
    if (config.playbookPath) {
      sessionStorage.setItem(PLAYBOOK_PATH_KEY, config.playbookPath);
    } else {
      sessionStorage.removeItem(PLAYBOOK_PATH_KEY);
    }
    preferredLane = config.storageLane;
    activeMissionId = config.missionId ?? activeMissionId;
    skillMissionBootstrapDone = false;
    storeLaneChoice(config.storageLane, false);
    el("lane-switch").hidden = false;
    activeLane = "disconnected";
    el("demo-dive-in")?.setAttribute("hidden", "");
    if (skillPathId === "iongrc") {
      startIongrcMode();
      applySessionSignOnHint("IONGRC", cachedLaneCredentials);
    } else {
      setPanelMode("disconnected");
    }
    if (skillPathId === "agentauthority") loadAgentAuthorityWalkthrough().catch(() => undefined);
    startTerminal();
    if (skillPathId !== "demo" && skillPathId !== "iongrc") {
      preloadShellForLane(
        config.storageLane,
        terminalConfig.systemName,
        config.missionId ?? terminalConfig.defaultMissionId,
      ).catch(() => undefined);
    }
  }

  function beginSkillPath(skillPathId, remember) {
    const config = SKILL_PATHS[skillPathId];
    if (!config) return;
    markLauncherIntroduced();
    storeSkillPath(skillPathId, remember);
    if (config.playbookPath) {
      sessionStorage.setItem(PLAYBOOK_PATH_KEY, config.playbookPath);
    } else {
      sessionStorage.removeItem(PLAYBOOK_PATH_KEY);
    }
    preferredLane = config.storageLane;
    activeMissionId = config.missionId ?? terminalConfig.defaultMissionId ?? "CLAIMS-001";
    skillMissionBootstrapDone = false;
    storeLaneChoice(config.storageLane, remember);
    hideLaneChooser();
    scheduleTerminalFocus(frame);
    el("lane-switch").hidden = false;
    if (skillPathId === "demo") {
      setAgentAuthorityActive(false);
      startDemoMode();
      stopIongrcMode();
      setPanelMode("disconnected");
    } else if (skillPathId === "iongrc") {
      setAgentAuthorityActive(false);
      stopDemoMode();
      startIongrcMode();
      applySessionSignOnHint("IONGRC", cachedLaneCredentials);
      setPanelMode("disconnected");
    } else {
      setAgentAuthorityActive(skillPathId === "agentauthority");
      stopDemoMode();
      stopIongrcMode();
      setPanelMode("disconnected");
    }
    if (skillPathId === "agentauthority") loadAgentAuthorityWalkthrough().catch(() => undefined);
    startTerminal();
    if (terminalConfig.systemName && skillPathId !== "demo" && skillPathId !== "iongrc") {
      preloadShellForLane(
        config.storageLane,
        terminalConfig.systemName,
        config.missionId ?? terminalConfig.defaultMissionId,
      ).catch(() => undefined);
    }
  }

  function initDemoControls() {
    const demoToggle = el("demo-toggle");
    const demoNext = el("demo-next");
    const demoPrev = el("demo-prev");
    const demoReset = el("demo-reset");

    el("dive-iongrc")?.addEventListener("click", () => diveIntoSkillPath("iongrc"));
    el("dive-governance")?.addEventListener("click", () => diveIntoSkillPath("governance"));
    el("dive-blueteam")?.addEventListener("click", () => diveIntoSkillPath("blueteam"));
    el("dive-redteam")?.addEventListener("click", () => diveIntoSkillPath("redteam"));
    el("dive-operator")?.addEventListener("click", () => diveIntoSkillPath("operator"));

    demoToggle?.addEventListener("click", () => {
      sessionStorage.setItem(DEMO_ACTIVE_KEY, "1");
      const path = sessionStorage.getItem(DEMO_PATH_KEY) ?? "product";
      const step = Number(sessionStorage.getItem(DEMO_STEP_KEY) ?? "0");
      setPanelMode(activeLane);
      loadDemoStep(path, step).catch(() => undefined);
    });

    demoNext?.addEventListener("click", async () => {
      const path = sessionStorage.getItem(DEMO_PATH_KEY) ?? "product";
      const step = Number(sessionStorage.getItem(DEMO_STEP_KEY) ?? "0");
      await loadDemoStep(path, step + 1);
    });

    demoPrev?.addEventListener("click", async () => {
      const path = sessionStorage.getItem(DEMO_PATH_KEY) ?? "product";
      const step = Number(sessionStorage.getItem(DEMO_STEP_KEY) ?? "0");
      await loadDemoStep(path, Math.max(0, step - 1));
    });

    demoReset?.addEventListener("click", async () => {
      const path = sessionStorage.getItem(DEMO_PATH_KEY) ?? "product";
      await loadDemoStep(path, 0);
    });
  }

  function initLaneChooser(onReady) {
    const chooser = el("lane-chooser");
    const rememberBox = el("lane-remember");
    const switchBtn = el("lane-switch");

    const skillButtons = [
      ["pick-governance", "governance"],
      ["pick-blueteam", "blueteam"],
      ["pick-redteam", "redteam"],
      ["pick-operator", "operator"],
      ["pick-demo", "demo"],
      ["pick-demo-intro", "demo"],
      ["pick-iongrc", "iongrc"],
      ["pick-agent-authority", "agentauthority"],
    ];

    el("launcher-skip-intro")?.addEventListener("click", () => {
      markLauncherIntroduced();
      setLauncherStage("paths");
      highlightRememberedSkillPath(readLastRememberedSkillPath());
    });

    el("launcher-replay-intro")?.addEventListener("click", () => {
      setLauncherStage("intro");
    });

    if (!chooser || !el("pick-governance") || !el("pick-operator")) {
      onReady(preferredLane ?? "auditor");
      return;
    }

    for (const [id, skillPathId] of skillButtons) {
      el(id)?.addEventListener("click", () => {
        beginSkillPath(skillPathId, rememberBox?.checked ?? false);
        onReady(SKILL_PATHS[skillPathId].storageLane);
      });
    }

    switchBtn?.addEventListener("click", () => {
      if (rememberBox) {
        rememberBox.checked = isSkillPathRemembered();
      }
      showLaneChooser("paths");
    });

    reconcileStoredSkillPathChoice();
    resetSessionSkillPathState();
    if (rememberBox) {
      rememberBox.checked = isSkillPathRemembered();
    }
    const requestedPath = new URLSearchParams(window.location.search).get("path");
    if (requestedPath === "agentauthority" && terminalConfig.agentAuthorityEnabled) {
      beginSkillPath("agentauthority", false);
      onReady(SKILL_PATHS.agentauthority.storageLane);
      return;
    }
    showLaneChooser();
  }

  async function refreshCoachContextNow() {
    const generation = coachPollGeneration;
    const skillPath = readStoredSkillPath();
    const params = new URLSearchParams({
      system: coachSystemName,
      user: coachUserName,
    });
    if (skillPath) {
      params.set("skillPath", skillPath);
    }
    if (activeMissionId) {
      params.set("mission", activeMissionId);
    }
    const playbookPath = resolvePlaybookPathParam();
    if (playbookPath) {
      params.set("playbookPath", playbookPath);
    }
    const payload = await loadJson(`/api/lab/coach-context?${params.toString()}`);
    if (generation !== coachPollGeneration) return;
    if (payload.missionProgress?.attemptId) {
      cachedAttemptId = payload.missionProgress.attemptId;
    }
    renderAuditorContext(payload);
    updateRestartMissionButton("auditor", payload.missionPhase);
  }

  function startCoachPolling(systemName, missionId) {
    const poll = async () => {
      if (!preferredLane) return;
      const generation = coachPollGeneration;

      try {
        const skillPath = readStoredSkillPath();
        const coachUserHint = skillPath
          ? expectedUserForSkillPath(skillPath)
          : coachUserName || expectedUserForLane(preferredLane);
        const sessionParams = new URLSearchParams();
        if (coachSystemName || systemName) {
          sessionParams.set("system", coachSystemName || systemName);
        }
        if (coachUserHint) {
          sessionParams.set("user", coachUserHint);
        }
        const session = await loadJson(`/api/lab/session?${sessionParams.toString()}`);
        cacheLabSessionToken(session);
        if (skillPath === "agentauthority") {
          agentAuthorityOperatorReady = Boolean(session.connected && session.userName?.toUpperCase() === "QSECOFR" && session.lane === "operator");
        }

        if (!session.connected) {
          if (demoAutoSignoffTimer) {
            cancelDemoAutoSignoff();
            stopDemoMode();
          }
          if (activeLane !== "disconnected") {
            activeLane = "disconnected";
            setPanelMode("disconnected");
          }
          updateRestartMissionButton("disconnected");
          applySessionSignOnHint(
            skillPath ? expectedUserForSkillPath(skillPath) : null,
            cachedLaneCredentials,
          );
          return;
        }

        const activeSystem = session.systemName ?? coachSystemName ?? systemName;
        const panelLane = laneForSignedOnUser(session.userName);
        const coachUser =
          session.userName ?? (skillPath ? expectedUserForSkillPath(skillPath) : expectedUserForLane(preferredLane));

        if (panelLane !== activeLane) {
          activeLane = panelLane;
          const shellMission =
            activeMissionId ?? SKILL_PATHS[skillPath]?.missionId ?? missionId;
          await ensureShellForLane(panelLane, activeSystem, shellMission);
        } else if ((panelLane === "auditor" || panelLane === "demo" || panelLane === "iongrc") && !auditorShellLoaded) {
          await ensureShellForLane(panelLane === "iongrc" ? "auditor" : panelLane, activeSystem, activeMissionId);
        } else if (panelLane === "operator" && !operatorShellLoaded) {
          await ensureShellForLane(panelLane, activeSystem, missionId);
        } else {
          setPanelMode(panelLane);
        }

        const systemChanged = coachSystemName && coachSystemName !== activeSystem;
        coachSystemName = activeSystem;
        coachUserName = coachUser;

        if (
          systemChanged &&
          panelLane === "auditor" &&
          activeMissionId &&
          auditorShellLoaded
        ) {
          await loadAuditorShell(activeSystem, activeMissionId);
        }

        await maybeBootstrapSkillMission(activeSystem, session);

        const params = new URLSearchParams({
          system: activeSystem,
          user: coachUser,
        });
        if (skillPath) {
          params.set("skillPath", skillPath);
        }
        if (activeMissionId) {
          params.set("mission", activeMissionId);
        }
        if (previousCollectedKeys.length) {
          params.set("previousCollectedKeys", previousCollectedKeys.join(","));
        }
        const demoActive = sessionStorage.getItem(DEMO_ACTIVE_KEY) === "1";
        const playbookPath = resolvePlaybookPathParam();
        if (playbookPath) {
          params.set("playbookPath", playbookPath);
        }
        if (demoActive) {
          params.set("demoPath", sessionStorage.getItem(DEMO_PATH_KEY) ?? "product");
          params.set("demoStep", sessionStorage.getItem(DEMO_STEP_KEY) ?? "0");
        }
        const iongrcActive = sessionStorage.getItem(IONGRC_ACTIVE_KEY) === "1";
        if (iongrcActive) {
          params.set("iongrcPack", sessionStorage.getItem(IONGRC_PACK_KEY) ?? "offboarding");
          params.set("iongrcStep", sessionStorage.getItem(IONGRC_STEP_KEY) ?? "0");
        }
        const payload = await loadJson(`/api/lab/coach-context?${params.toString()}`);
        if (generation !== coachPollGeneration) return;
        applySessionSignOnHint(coachUser, payload.signOnCredentials);

        const payloadMissionId = payload.missionProgress?.missionId;
        const skillEntryMission = SKILL_PATHS[skillPath]?.missionId;
        const regressToSkillEntry =
          payloadMissionId === skillEntryMission &&
          activeMissionId &&
          activeMissionId !== skillEntryMission;
        if (
          panelLane === "auditor" &&
          payloadMissionId &&
          payloadMissionId !== activeMissionId &&
          payload.missionPhase !== "complete" &&
          !regressToSkillEntry
        ) {
          activeMissionId = payloadMissionId;
          await loadAuditorShell(activeSystem, payloadMissionId);
        }

        if (panelLane === "operator") {
          updateRestartMissionButton("operator");
          renderOperatorScreenGuide(payload);
        } else if (panelLane === "demo" || payload.lane === "demo") {
          renderDemoCoachPoll(payload);
        } else if (panelLane === "iongrc" || payload.lane === "iongrc") {
          if (sessionStorage.getItem(IONGRC_ACTIVE_KEY) !== "1") {
            sessionStorage.setItem(IONGRC_ACTIVE_KEY, "1");
          }
          renderIongrcCoachPoll(payload);
        } else {
          renderAuditorContext(payload);
        }
        if (skillPath === "agentauthority") await loadAgentAuthorityWalkthrough();
      } catch {
        /* terminal may not be signed on yet */
      }
    };
    poll();
    return window.setInterval(poll, 2000);
  }

  function initNarrowBanner() {
    const banner = el("narrow-screen-banner");
    const update = () => {
      if (!banner) return;
      if (window.innerWidth < 960) banner.removeAttribute("hidden");
      else banner.setAttribute("hidden", "");
    };
    update();
    window.addEventListener("resize", update);
  }

  async function initHealthPill() {
    const pill = el("health-pill");
    if (!pill) return;
    const refresh = async () => {
      try {
        const health = await loadJson("/api/health");
        pill.removeAttribute("hidden");
        pill.textContent = `${health.system ?? "CLAIMS400"} · catalog ${health.catalogVersion ?? "—"}`;
        pill.classList.toggle("health-ok", Boolean(health.ok));
        pill.classList.toggle("health-bad", !health.ok);
      } catch {
        pill.setAttribute("hidden", "");
      }
    };
    refresh();
    window.setInterval(refresh, 30000);
  }

  el("setup-hint")?.addEventListener("click", () => {
    window.open("/docs/troubleshooting.md", "_blank", "noopener");
  });

  try {
    const config = await loadJson("/api/lab/config");
    terminalConfig = { ...config, defaultMissionId: config.defaultMissionId ?? "CLAIMS-001" };
    activeMissionId = terminalConfig.defaultMissionId ?? "CLAIMS-001";
    demoSystemName = terminalConfig.systemName ?? "CLAIMS400";
    if (config.tagline && el("launcher-tagline")) {
      el("launcher-tagline").textContent = config.tagline;
    }
    if (config.appSubtitle && el("launcher-subtitle")) {
      el("launcher-subtitle").textContent = config.appSubtitle;
    }
    applyLaneCredentials(config.laneCredentials);
    if (el("agent-authority-entry")) el("agent-authority-entry").hidden = !config.agentAuthorityEnabled;
    if (!config.agentAuthorityEnabled && readStoredSkillPath() === "agentauthority") {
      sessionStorage.removeItem(SKILL_PATH_KEY);setAgentAuthorityActive(false);
    }
    initNarrowBanner();
    initHealthPill();
    initFindingComposer();
    setPanelMode("disconnected");
    initDemoControls();
    el("aa-step-action")?.addEventListener("click",()=>handleAgentGuidanceAction().catch(()=>undefined));
    el("aa-scenario-cards")?.addEventListener("click",(event)=>{const button=event.target.closest?.("button[data-scenario-id]");if(button)selectAgentAuthorityScenario(button.dataset.scenarioId);});
    el("aa-back-to-scenarios")?.addEventListener("click",leaveAgentAuthorityScenario);
    el("aa-download-proof")?.addEventListener("click",()=>downloadAgentAuthorityProof().catch(()=>undefined));

    initLaneChooser((lane) => {
      preferredLane = lane;
      coachTimer = startCoachPolling(config.systemName, config.defaultMissionId);
    });
  } catch (err) {
    el("mission-title").textContent = "Coach panel unavailable";
    el("mission-briefing").textContent =
      err instanceof Error ? err.message : "Failed to load mission data.";
    startTerminal();
  }

  window.addEventListener("beforeunload", () => {
    cancelDemoAutoSignoff();
    if (coachTimer) window.clearInterval(coachTimer);
  });
}

loadLab();
