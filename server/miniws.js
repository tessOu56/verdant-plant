// 零依賴 WebSocket (RFC 6455) 伺服器（ESM）—手刻 handshake / 分幀 / 遮罩 / ping-pong。
import crypto from 'crypto';
import { EventEmitter } from 'events';
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const accept = (k) => crypto.createHash('sha1').update(k + GUID).digest('base64');

class WsConnection extends EventEmitter {
  constructor(socket) { super(); this.socket = socket; this._buf = Buffer.alloc(0);
    socket.on('data', (d) => this._onData(d)); socket.on('close', () => this.emit('close')); socket.on('error', () => {}); }
  _onData(chunk) { this._buf = Buffer.concat([this._buf, chunk]); let f;
    while ((f = this._parse())) {
      if (f.opcode === 0x8) { this.close(); return; }
      else if (f.opcode === 0x9) this._send(0xA, f.payload);
      else if (f.opcode === 0x1) this.emit('message', f.payload.toString('utf8')); } }
  _parse() { const b = this._buf; if (b.length < 2) return null;
    const opcode = b[0] & 0x0f, masked = (b[1] & 0x80) !== 0; let len = b[1] & 0x7f, off = 2;
    if (len === 126) { if (b.length < 4) return null; len = b.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (b.length < 10) return null; len = Number(b.readBigUInt64BE(2)); off = 10; }
    let mask; if (masked) { if (b.length < off + 4) return null; mask = b.subarray(off, off + 4); off += 4; }
    if (b.length < off + len) return null; let p = b.subarray(off, off + len);
    if (masked) { const o = Buffer.allocUnsafe(len); for (let i = 0; i < len; i++) o[i] = p[i] ^ mask[i & 3]; p = o; }
    this._buf = b.subarray(off + len); return { opcode, payload: p }; }
  _send(opcode, payload) { if (this.socket.destroyed) return; const len = payload.length; let h;
    if (len < 126) { h = Buffer.alloc(2); h[1] = len; }
    else if (len < 65536) { h = Buffer.alloc(4); h[1] = 126; h.writeUInt16BE(len, 2); }
    else { h = Buffer.alloc(10); h[1] = 127; h.writeBigUInt64BE(BigInt(len), 2); }
    h[0] = 0x80 | opcode; this.socket.write(Buffer.concat([h, payload])); }
  send(s) { this._send(0x1, Buffer.from(s, 'utf8')); }
  ping() { this._send(0x9, Buffer.alloc(0)); }
  close() { try { this._send(0x8, Buffer.alloc(0)); this.socket.end(); } catch {} }
}

export class WsServer extends EventEmitter {
  constructor(httpServer, pathFilter = '/ws') { super(); this.clients = new Set();
    httpServer.on('upgrade', (req, socket) => {
      if (pathFilter && !req.url.startsWith(pathFilter)) { socket.destroy(); return; }
      const key = req.headers['sec-websocket-key']; if (!key) { socket.destroy(); return; }
      socket.write(['HTTP/1.1 101 Switching Protocols','Upgrade: websocket','Connection: Upgrade',
        'Sec-WebSocket-Accept: ' + accept(key), '\r\n'].join('\r\n'));
      const conn = new WsConnection(socket); this.clients.add(conn);
      conn.on('close', () => this.clients.delete(conn)); this.emit('connection', conn, req); }); }
  broadcast(s) { for (const c of this.clients) c.send(s); }
}
