import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

const configuredOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

@WebSocketGateway({
  // Reflect Origin locally; FRONTEND_URL allowlist when set
  cors: {
    origin: configuredOrigins.length > 0 ? configuredOrigins : true,
    credentials: true,
  },
})
export class ResumesGateway {
  @WebSocketServer()
  server: Server;

  emitDone(id: string) {
    if (!this.server) {
      console.warn('WebSocket server not ready; skipping generate:done emit');
      return;
    }

    this.server.emit('generate:done', { id });
  }

  emitFailed(id: string, message?: string) {
    if (!this.server) {
      console.warn('WebSocket server not ready; skipping generate:failed emit');
      return;
    }

    this.server.emit('generate:failed', { id, message });
  }
}
