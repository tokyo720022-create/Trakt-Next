/* mark-sheet.js: "Mark as watched": now watching, just now, release date, other date, unknown date. */
class MarkSheet {
  static UNKNOWN = '1970-01-01T00:00:00.000Z'; // how Trakt stores "unknown date"

  // A release date like 2019-07-20 becomes a full ISO date.
  static iso(s) { return s ? (s.length === 10 ? s + 'T00:00:00.000Z' : s) : ''; }

  // The value format of a datetime-local input.
  static localNow(d = new Date()) {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  constructor(app) {
    this.app = app;
    this.opts = null;
    this.release = '';
    $('mkBack').onclick = () => { $('msheet').hidden = true; };
    $('mkNow').onclick = () => this.checkin();
    $('mkJust').onclick = () => this.pick(undefined);
    $('mkRelease').onclick = () => this.pick(this.release);
    $('mkOther').onclick = () => { $('mkOtherBox').hidden = !$('mkOtherBox').hidden; };
    $('mkUnknown').onclick = () => this.pick(MarkSheet.UNKNOWN);
    $('mkGo').onclick = () => { const v = $('mkWhen').value; if (v) this.pick(new Date(v).toISOString()); };
  }

  // opts: { title, sub, release, checkin (optional), onPick(at) }. at is an ISO date, or undefined for "just now".
  open(opts) {
    this.opts = opts;
    this.release = MarkSheet.iso(opts.release);
    $('mkTitle').textContent = opts.title || '';
    $('mkSub').textContent = opts.sub || '';
    $('mkMsg').textContent = '';
    $('mkNow').hidden = !opts.checkin;
    $('mkRelease').disabled = !this.release;
    $('mkOtherBox').hidden = true;
    $('mkWhen').value = MarkSheet.localNow();
    $('mkWhen').max = MarkSheet.localNow();
    $('msheet').hidden = false;
  }

  async pick(at) {
    $('mkMsg').textContent = 'Saving…';
    try { await this.opts.onPick(at); $('msheet').hidden = true; this.app.toast('Saved to Trakt'); }
    catch (err) { $('mkMsg').textContent = 'Could not save: ' + err.message; }
  }

  async checkin() {
    $('mkMsg').textContent = 'Saving…';
    try { await this.opts.checkin(); $('msheet').hidden = true; this.app.toast('Now watching on Trakt'); }
    catch (err) { $('mkMsg').textContent = err.status === 409 ? 'You are already watching something. Finish or cancel it on Trakt first.' : 'Could not check in: ' + err.message; }
  }
}
