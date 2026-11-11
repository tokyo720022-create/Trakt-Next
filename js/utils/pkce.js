// PKCE helpers: the verifier stays on the phone, only its SHA-256 hash (the challenge) goes to Trakt.
const base64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const randomState = () => crypto.randomUUID();

export async function createPkcePair() {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(48)));
  const challenge = base64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  return { verifier, challenge };
}
