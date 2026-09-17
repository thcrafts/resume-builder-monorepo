function isPrivateIpv4(ip: string): boolean {
  if (ip.startsWith('192.168.')) return true;
  if (ip.startsWith('10.')) return true;
  const match = /^172\.(\d+)\./.exec(ip);
  if (!match) return false;
  const second = Number(match[1]);
  return second >= 16 && second <= 31;
}

function rank(ip: string): number {
  if (ip.startsWith('192.168.')) return 0;
  if (ip.startsWith('10.')) return 1;
  return 2;
}

function collectIp(target: Set<string>, value: string): void {
  if (isPrivateIpv4(value)) target.add(value);
}

async function discoverPrivateIpv4(): Promise<string[]> {
  const found = new Set<string>();
  if (typeof RTCPeerConnection === 'undefined') return [];

  const pc = new RTCPeerConnection({ iceServers: [] });
  try {
    pc.createDataChannel('lan');
    await pc.setLocalDescription(await pc.createOffer());
    await new Promise<void>((resolve) => {
      const finish = () => {
        pc.onicecandidate = null;
        resolve();
      };
      pc.onicecandidate = (event) => {
        const candidate = event.candidate?.candidate || '';
        const ip = candidate.match(/(\d{1,3}(?:\.\d{1,3}){3})/)?.[1];
        if (ip) collectIp(found, ip);
        if (!event.candidate) finish();
      };
      const sdp = pc.localDescription?.sdp || '';
      for (const match of sdp.matchAll(/(\d{1,3}(?:\.\d{1,3}){3})/g)) {
        collectIp(found, match[1]);
      }
      setTimeout(finish, 1200);
    });
  } catch {
    /* WebRTC blocked */
  } finally {
    pc.close();
  }

  return [...found].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export async function discoverLanApiBases(port = '3001'): Promise<string[]> {
  const ips = await discoverPrivateIpv4();
  return ips.map((ip) => `http://${ip}:${port}`);
}
