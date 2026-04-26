//websocket.ts
// ═══════════════════════════════════════════════════════════════
// Veliora.AI — WebSocket Manager with Reconnect
// Section 18: WebSocket Reference Card
// ═══════════════════════════════════════════════════════════════

import { WS_BASE } from './api';

// ── Types ──────────────────────────────────────────────────────

export interface WSHandlers {
  onOpen?: () => void;
  onMessage: (data: any) => void;
  onError?: (error: Event) => void;
  onClose?: (event: CloseEvent) => void;
}

export interface ManagedWebSocket {
  send: (data: any) => void;
  close: () => void;
  getState: () => number;
}

// ── WebSocket Close Codes (Section 19) ─────────────────────────
export const WS_CLOSE_CODES: Record<number, string> = {
  4001: 'Authentication failed',
  4002: 'Bot/voice not found',
  4003: 'Not in relationship',
  4004: 'Relationship not found or inactive',
  4005: 'Level requirement not met',
};

// ── Core: createWsWithReconnect ────────────────────────────────
// Exponential backoff reconnect per Section 18 best practices

export function createWsWithReconnect(
  url: string,
  handlers: WSHandlers,
  maxRetries: number = 5
): ManagedWebSocket {
  let retries = 0;
  let ws: WebSocket | null = null;
  let intentionalClose = false;

  function connect() {
    ws = new WebSocket(url);

    ws.onopen = () => {
      retries = 0; // Reset on successful connect
      handlers.onOpen?.();
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        handlers.onMessage(data);
      } catch (e) {
        console.error('[WS] Failed to parse message:', e);
      }
    };

    ws.onerror = (error: Event) => {
      // Ignore errors if we intentionally closed it (e.g. React StrictMode unmount during connecting)
      if (intentionalClose) return;
      console.error(`[WS] Connection error for url: ${url.split('?')[0]}`);
      handlers.onError?.(error);
    };

    ws.onclose = (event: CloseEvent) => {
      handlers.onClose?.(event);

      // Don't reconnect on intentional close or fatal codes
      if (intentionalClose) return;
      if (event.code >= 4001 && event.code <= 4005) {
        console.warn(`[WS] Fatal close code ${event.code}: ${WS_CLOSE_CODES[event.code] || 'Unknown'}`);
        return;
      }

      if (retries < maxRetries) {
        retries++;
        const delay = 1000 * retries; // Linear backoff: 1s, 2s, 3s...
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${retries}/${maxRetries})...`);
        setTimeout(connect, delay);
      } else {
        console.warn('[WS] Max retries reached. Giving up.');
      }
    };
  }

  connect();

  return {
    send: (data: any) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    },
    close: () => {
      intentionalClose = true;
      maxRetries = 0;
      ws?.close();
    },
    getState: () => ws?.readyState ?? WebSocket.CLOSED,
  };
}

// ═══════════════════════════════════════════════════════════════
// FACTORY METHODS — One for each WebSocket endpoint
// ═══════════════════════════════════════════════════════════════

// ── 6.12 Chat WebSocket ────────────────────────────────────────
// WS: ws://.../chat/ws/{relationship_id}/{user_id}
// Auth: URL path user_id

export interface ChatWSHandlers {
  onNewMessage?: (message: any) => void;
  onTyping?: (userId: string) => void;
  onStoppedTyping?: (userId: string) => void;
  onReadReceipt?: (messageId: string, readerId: string) => void;
  onReaction?: (messageId: string, emoji: string, userId: string) => void;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
}

export function createChatWS(
  relationshipId: string,
  userId: string,
  chatHandlers: ChatWSHandlers
): ManagedWebSocket {
  const url = `${WS_BASE}/chat/ws/${relationshipId}/${userId}`;

  return createWsWithReconnect(url, {
    onOpen: chatHandlers.onOpen,
    onClose: chatHandlers.onClose,
    onError: chatHandlers.onError,
    onMessage: (data) => {
      switch (data.type) {
        case 'new_message':
          chatHandlers.onNewMessage?.(data.message);
          break;
        case 'typing':
          chatHandlers.onTyping?.(data.user_id);
          break;
        case 'stopped_typing':
          chatHandlers.onStoppedTyping?.(data.user_id);
          break;
        case 'read_receipt':
          chatHandlers.onReadReceipt?.(data.message_id, data.reader_id);
          break;
        case 'reaction':
          chatHandlers.onReaction?.(data.message_id, data.emoji, data.user_id);
          break;
      }
    },
  });
}

// ── 7.1 Calls Signaling WebSocket ──────────────────────────────
// WS: ws://.../calls/signal/{relationship_id}/{user_id}
// Backend sends: incoming_call, offer, answer, ice_candidate, call_ended, call_rejected, peer_disconnected, error

export interface CallSignalHandlers {
  onIncomingCall?: (callType: string, callerId: string) => void;
  onCallAccept?: () => void;
  onOffer?: (sdp: string, from: string) => void;
  onAnswer?: (sdp: string, from: string) => void;
  onICECandidate?: (candidate: any, from: string) => void;
  onCallEnded?: (endedBy: string) => void;
  onCallRejected?: (rejectedBy: string) => void;
  onPeerDisconnected?: (userId: string) => void;
  onError?: (message: string) => void;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
}

export function createCallSignalingWS(
  relationshipId: string,
  userId: string,
  callHandlers: CallSignalHandlers
): ManagedWebSocket {
  const url = `${WS_BASE}/calls/signal/${relationshipId}/${userId}`;

  return createWsWithReconnect(url, {
    onOpen: callHandlers.onOpen,
    onClose: (e) => callHandlers.onClose?.(e),
    onMessage: (data) => {
      switch (data.type) {
        case 'incoming_call':
          callHandlers.onIncomingCall?.(data.call_type, data.caller_id);
          break;
        case 'call_accept':
          callHandlers.onCallAccept?.();
          break;
        case 'offer':
          callHandlers.onOffer?.(data.sdp, data.from);
          break;
        case 'answer':
          callHandlers.onAnswer?.(data.sdp, data.from);
          break;
        case 'ice_candidate':
          callHandlers.onICECandidate?.(data.candidate, data.from);
          break;
        case 'call_ended':
          callHandlers.onCallEnded?.(data.ended_by);
          break;
        case 'call_rejected':
          callHandlers.onCallRejected?.(data.rejected_by);
          break;
        case 'peer_disconnected':
          callHandlers.onPeerDisconnected?.(data.user_id);
          break;
        case 'error':
          callHandlers.onError?.(data.message);
          break;
      }
    },
  }, 3); // Fewer retries for calls
}

// ── 8.17 Family Room WebSocket ─────────────────────────────────
// WS: ws://.../rooms/{room_id}/ws/{user_id}

export interface RoomWSHandlers {
  onNewMessage?: (message: any) => void;
  onMemberJoined?: (userId: string, displayName: string) => void;
  onMemberLeft?: (userId: string) => void;
  onTyping?: (userId: string) => void;
  onNewPoll?: (poll: any) => void;
  onPollVote?: (pollId: string, votes: number[]) => void;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  onCustomMessage?: (data: any) => void;
}

export function createRoomWS(
  roomId: string,
  userId: string,
  roomHandlers: RoomWSHandlers
): ManagedWebSocket {
  const url = `${WS_BASE}/rooms/${roomId}/ws/${userId}`;

  return createWsWithReconnect(url, {
    onOpen: roomHandlers.onOpen,
    onClose: roomHandlers.onClose,
    onError: roomHandlers.onError,
    onMessage: (data) => {
      if (typeof window !== 'undefined' && (window as any)._handleRoomWebRTC) {
        (window as any)._handleRoomWebRTC(data);
      }
      roomHandlers.onCustomMessage?.(data);
      switch (data.type) {
        case 'new_message':
          roomHandlers.onNewMessage?.(data.message);
          break;
        case 'member_joined':
          roomHandlers.onMemberJoined?.(data.user_id, data.display_name);
          break;
        case 'member_left':
          roomHandlers.onMemberLeft?.(data.user_id);
          break;
        case 'typing':
          roomHandlers.onTyping?.(data.user_id);
          break;
        case 'new_poll':
          roomHandlers.onNewPoll?.(data.poll);
          break;
        case 'poll_vote':
          roomHandlers.onPollVote?.(data.poll_id, data.votes);
          break;
      }
    },
  });
}

// ── 10.3 Live Game WebSocket ───────────────────────────────────
// WS: ws://.../games/live/ws/{session_id}/{user_id}
//
// CLIENT sends:
//   {"type": "ready"}
//   {"type": "move", "data": {y: number}}        — Pong paddle
//   {"type": "move", "data": {x, y}}             — Air Hockey mallet
//   {"type": "move", "data": {cell: number}}     — Tic-Tac-Toe
//
// SERVER sends:
//   {"type": "waiting_for_opponent"}
//   {"type": "game_start", "state": {...}}
//   {"type": "state", "state": {...}}             — every tick (30fps pong/hockey)
//   {"type": "game_over", "winner": str, "scores": {}, "xp_awarded": {}}
//   {"type": "opponent_disconnected", "user_id": str}
// ── Global Presence WebSocket ──────────────────────────────────
// WS: ws://.../presence/ws/{user_id}

export interface PresenceWSHandlers {
  onGameInvite?: (data: { sender_id: string, sender_name: string, game_type: string, session_id: string }) => void;
  onGameInviteFailed?: (error: string) => void;
  onInviteResponse?: (data: { accept: boolean, session_id: string, responder_id: string, game_type?: string }) => void;
  onIncomingCall?: (data: { caller_id: string, caller_name: string, call_type: string, relationship_id: string }) => void;
  onGlobalNotification?: (data: any) => void;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
}

export function createPresenceWS(
  userId: string,
  handlers: PresenceWSHandlers
): ManagedWebSocket {
  const url = `${WS_BASE}/presence/ws/${userId}`;

  return createWsWithReconnect(url, {
    onOpen: handlers.onOpen,
    onClose: handlers.onClose,
    onMessage: (data) => {
      switch (data.type) {
        case 'game_invite_received':
          handlers.onGameInvite?.(data);
          break;
        case 'game_invite_failed':
          handlers.onGameInviteFailed?.(data.error);
          break;
        case 'invite_response':
          handlers.onInviteResponse?.(data);
          break;
        case 'incoming_call':
          handlers.onIncomingCall?.(data);
          break;
        case 'global_notification':
          handlers.onGlobalNotification?.(data.notification);
          break;
      }
    }
  });
}

export interface LiveGameWSHandlers {
  onWaitingForOpponent?: () => void;
  // Updated gameStart to include WebRTC initialization
  onGameStart?: (state: any, isInitiator?: boolean, players?: string[], gameType?: string) => void;
  onState?: (state: any) => void;
  // Fallback for non-latency-sensitive games
  onSyncState?: (state: any, senderId: string) => void;
  onRoundResult?: (data: { match: boolean, ans_a: string, ans_b: string, state: any }) => void;
  onGameOver?: (winner: string, scores: Record<string, number>, xpAwarded: any) => void;
  onOpponentDisconnected?: (userId: string) => void;
  // WebRTC handlers for P2P
  onWebRTCOffer?: (offer: any, senderId: string) => void;
  onWebRTCAnswer?: (answer: any, senderId: string) => void;
  onWebRTCICECandidate?: (candidate: any, senderId: string) => void;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
}

export function createLiveGameWS(
  sessionId: string,
  userId: string,
  gameHandlers: LiveGameWSHandlers
): ManagedWebSocket {
  const url = `${WS_BASE}/games/live/ws/${sessionId}/${userId}`;

  return createWsWithReconnect(url, {
    onOpen: gameHandlers.onOpen,
    onClose: gameHandlers.onClose,
    onError: gameHandlers.onError,
    onMessage: (data) => {
      switch (data.type) {
        case 'waiting_for_opponent':
          gameHandlers.onWaitingForOpponent?.();
          break;
        case 'game_start':
          gameHandlers.onGameStart?.(data.state, data.is_initiator, data.players, data.game_type);
          break;
        case 'state':
          gameHandlers.onState?.(data.state);
          break;
        case 'sync_state':
          gameHandlers.onSyncState?.(data.state, data.sender_id);
          break;
        case 'round_result':
          gameHandlers.onRoundResult?.(data);
          break;
        case 'game_over':
          gameHandlers.onGameOver?.(data.winner, data.scores, data.xp_awarded);
          break;
        case 'opponent_disconnected':
          gameHandlers.onOpponentDisconnected?.(data.user_id);
          break;
        case 'webrtc_offer':
          gameHandlers.onWebRTCOffer?.(data.offer, data.sender_id);
          break;
        case 'webrtc_answer':
          gameHandlers.onWebRTCAnswer?.(data.answer, data.sender_id);
          break;
        case 'webrtc_ice_candidate':
          gameHandlers.onWebRTCICECandidate?.(data.candidate, data.sender_id);
          break;
      }
    },
  }, 3);
}

export function createBondGameWS(
  sessionId: string,
  userId: string,
  gameHandlers: LiveGameWSHandlers
): ManagedWebSocket {
  const url = `${WS_BASE}/games/ws/${sessionId}/${userId}`;

  return createWsWithReconnect(url, {
    onOpen: gameHandlers.onOpen,
    onClose: gameHandlers.onClose,
    onError: gameHandlers.onError,
    onMessage: (data) => {
      switch (data.type) {
        case 'waiting_for_opponent':
          gameHandlers.onWaitingForOpponent?.();
          break;
        case 'opponent_joined':
          // Can optionally handle this if needed
          break;
        case 'game_start':
          gameHandlers.onGameStart?.(data.state, data.is_initiator, data.players, data.game_type);
          break;
        case 'state':
          gameHandlers.onState?.(data.state);
          break;
        case 'sync_state':
          gameHandlers.onSyncState?.(data.state, data.sender_id);
          break;
        case 'round_result':
          gameHandlers.onRoundResult?.(data);
          break;
        case 'game_over':
          gameHandlers.onGameOver?.(data.winner, data.scores, data.xp_awarded);
          break;
        case 'opponent_disconnected':
          gameHandlers.onOpponentDisconnected?.(data.user_id);
          break;
      }
    },
  }, 3);
}
