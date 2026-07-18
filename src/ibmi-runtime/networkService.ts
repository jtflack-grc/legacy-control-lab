export type LinkServerEntry = {
  name: string;
  status: string;
  description: string;
  port: string;
};

const LINK_SERVERS: LinkServerEntry[] = [
  { name: "QIBM_QTM", status: "*RUNNING", description: "IBM TELNET server", port: "23" },
  { name: "QIBM_QFTP", status: "*RUNNING", description: "FTP server", port: "21" },
  { name: "QIBM_QHTTPSVR", status: "*RUNNING", description: "HTTP admin server", port: "2001" },
  { name: "QIBM_QNETSVR", status: "*RUNNING", description: "NetServer file sharing", port: "445" },
];

export function listLinkServers(): LinkServerEntry[] {
  return LINK_SERVERS;
}

export function getLinkServer(name: string): LinkServerEntry | undefined {
  return LINK_SERVERS.find((entry) => entry.name === name.trim().toUpperCase());
}

export function updateLinkServerStatus(name: string, status: string): boolean {
  const entry = LINK_SERVERS.find((item) => item.name === name.trim().toUpperCase());
  if (!entry) return false;
  entry.status = status;
  return true;
}
