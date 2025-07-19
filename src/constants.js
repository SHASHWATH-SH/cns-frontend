export const ICONS = {
  CLIPBOARD: '📋',
  ATTACHMENT: '📎',
  WARNING: '⚠️',
  SECURITY: '🔒'
};

export const RTC_CONFIG = {
  iceServers: [
    { 
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302'
      ]
    }
  ],
  iceCandidatePoolSize: 10
};

export const SOCKET_CONFIG = {
  URL: 'https://192.168.168.36:8080',
  OPTIONS: {
    transports: ['websocket'],
    rejectUnauthorized: false
  }
};

export const CHUNK_SIZE = 16384; // 16KB chunks

export const FILE_TYPES = {
  ANY: '*/*',
  IMAGES: 'image/*',
  DOCUMENTS: '.pdf,.doc,.docx,.txt'
};

export const ENCRYPTION_CONFIG = {
  ALGORITHM: 'AES-GCM',
  KEY_LENGTH: 256,
  IV_LENGTH: 12
};