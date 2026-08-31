import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { getCorsOptions } from '../config/cors';

@WebSocketGateway({
  cors: getCorsOptions(),
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

  emitProgress(
    id: string,
    payload: {
      step: 'title' | 'jd-requirements' | 'summary' | 'skills' | 'experience';
      index?: number;
      total?: number;
    },
  ) {
    if (!this.server) {
      return;
    }

    this.server.emit('generate:progress', { id, ...payload });
  }

  emitFailed(id: string, message?: string) {
    if (!this.server) {
      console.warn('WebSocket server not ready; skipping generate:failed emit');
      return;
    }

    this.server.emit('generate:failed', { id, message });
  }
}
