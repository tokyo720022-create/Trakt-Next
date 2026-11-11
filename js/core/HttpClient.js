// JSON over fetch. defaultHeaders is a function, so tokens are read fresh on every request.
export class HttpClient {
  constructor(baseUrl, defaultHeaders = () => ({})) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = defaultHeaders;
  }
  async request(path, { method = 'GET', body } = {}) {
    const res = await fetch(this.baseUrl + path, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: { 'Content-Type': 'application/json', ...this.defaultHeaders() },
    });
    if (!res.ok) {
      const err = new Error(`${path} failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }
}
