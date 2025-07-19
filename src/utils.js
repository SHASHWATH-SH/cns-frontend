export const SIGNAL_SERVER = "ws://localhost:8080";

export function createPeerConnection() {
  const config = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };
  return new RTCPeerConnection(config);
}
