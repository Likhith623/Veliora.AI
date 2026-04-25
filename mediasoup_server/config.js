const os = require('os');
module.exports = {
  listenIp: '0.0.0.0',
  listenPort: 3016,
  mediasoup: {
    // Number of mediasoup workers to launch.
    numWorkers: Object.keys(os.cpus()).length,
    // mediasoup Worker settings.
    worker: {
      rtcMinPort: 10000,
      rtcMaxPort: 10100,
      logLevel: 'warn',
      logTags: [
        'info',
        'ice',
        'dtls',
        'rtp',
        'srtp',
        'rtcp'
      ]
    },
    // mediasoup Router settings.
    router: {
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 300
          }
        },
        {
          kind: 'video',
          mimeType: 'video/VP9',
          clockRate: 90000,
          parameters: {
            'profile-id': 2,
            'x-google-start-bitrate': 300
          }
        },
        {
          kind: 'video',
          mimeType: 'video/h264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '42e01f',
            'level-asymmetry-allowed': 1,
            'x-google-start-bitrate': 300
          }
        }
      ]
    },
    // mediasoup WebRtcTransport settings.
    webRtcTransport: {
      listenIps: [
        { 
          ip: '0.0.0.0', 
          announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1' 
        }
      ],
      maxIncomingBitrate: 2500000,
      initialAvailableOutgoingBitrate: 600000
    }
  }
};
