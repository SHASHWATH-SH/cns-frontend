import React, { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Editor } from '@monaco-editor/react';
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveAESKey,
  decryptData
} from './cryptoUtils';
import './Receiver.css';

function generateId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function Receiver() {
  const [id] = useState(generateId());
  const [senderId, setSenderId] = useState('');
  const [status, setStatus] = useState('Idle');
  const [decryptedChunk, setDecryptedChunk] = useState(null);
  const pc = useRef(null);
  const socket = useRef(null);
  const dc = useRef(null);
  const localKeyPair = useRef(null);
  const aesKey = useRef(null);
  const receivedChunks = useRef([]);
  const receivedIVs = useRef([]);

  useEffect(() => {
    socket.current = io('https://192.168.168.36:8080', {
      transports: ['websocket'],
      rejectUnauthorized: false,
    });

    socket.current.on('connect', () => {
      socket.current.emit('register', id);
      setStatus(`Registered as ${id}`);
    });

    socket.current.on('signal', async (data) => {
      if (data.from !== senderId) return;

      if (data.signal.publicKey) {
        const senderPub = await importPublicKey(data.signal.publicKey);
        aesKey.current = await deriveAESKey(localKeyPair.current.privateKey, senderPub);

        const myPub = await exportPublicKey(localKeyPair.current.publicKey);
        socket.current.emit('signal', {
          target: senderId,
          signal: { publicKey: myPub },
        });
      }

      if (data.signal.sdp) {
        await pc.current.setRemoteDescription(new RTCSessionDescription(data.signal));
        if (data.signal.type === 'offer') {
          const answer = await pc.current.createAnswer();
          await pc.current.setLocalDescription(answer);
          socket.current.emit('signal', {
            target: senderId,
            signal: pc.current.localDescription,
          });
        }
      } else if (data.signal.candidate) {
        await pc.current.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
      }
    });

    return () => socket.current.disconnect();
  }, [id, senderId]);

  const startConnection = async () => {
    try {
      pc.current = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      
      localKeyPair.current = await generateKeyPair();
      setStatus('Establishing secure connection...');

      pc.current.ondatachannel = (event) => {
        dc.current = event.channel;
        dc.current.binaryType = 'arraybuffer';

        let expectingIV = true;
        let currentIV = null;

        dc.current.onmessage = async (event) => {
          if (typeof event.data === 'string') {
            try {
              const msg = JSON.parse(event.data);
              if (msg.done) {
                setStatus('Decrypting file...');
                const decryptedChunks = await Promise.all(
                  receivedChunks.current.map((enc, i) =>
                    decryptData(aesKey.current, enc, receivedIVs.current[i])
                  )
                );
                const blob = new Blob(decryptedChunks);
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = msg.fileName || 'file';
                a.click();
                setStatus('File saved successfully.');
                receivedChunks.current = [];
                receivedIVs.current = [];
              }
            } catch (error) {
              setStatus(`Error: ${error.message}`);
            }
          } else {
            if (expectingIV) {
              currentIV = new Uint8Array(event.data);
            } else {
              receivedChunks.current.push(event.data);
              receivedIVs.current.push(currentIV);
              
              // Update decryption info
              setDecryptedChunk({
                chunkNumber: receivedChunks.current.length,
                ivSize: currentIV.length,
                encryptedSize: event.data.byteLength,
                method: 'AES-GCM'
              });
              
              setStatus(`Receiving: Chunk ${receivedChunks.current.length}`);
            }
            expectingIV = !expectingIV;
          }
        };

        dc.current.onopen = () => setStatus('Connection secure. Ready to receive files.');
        dc.current.onclose = () => setStatus('Connection closed.');
        dc.current.onerror = (error) => setStatus(`Error: ${error.message}`);
      };

      pc.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.current.emit('signal', {
            target: senderId,
            signal: { candidate: event.candidate },
          });
        }
      };

      pc.current.onconnectionstatechange = () => {
        setStatus(`Connection state: ${pc.current.connectionState}`);
      };

    } catch (error) {
      setStatus(`Connection error: ${error.message}`);
    }
  };

  return (
    <div className="receiver-container">
      <div className="receiver-header">
        <h2>Secure File Receiver</h2>
        <div className="receiver-id-container">
          <span className="receiver-id">ID: {id}</span>
          <button 
            className="receiver-button icon-button"
            onClick={() => navigator.clipboard.writeText(id)}
            title="Copy ID"
          >
            📋
          </button>
        </div>
      </div>

      <div className="receiver-controls">
        <div className="connection-section">
          <div className="input-group">
            <input
              type="text"
              className="receiver-input"
              placeholder="Enter Sender ID"
              value={senderId}
              onChange={e => setSenderId(e.target.value.toUpperCase())}
            />
            <button 
              className="receiver-button"
              onClick={startConnection}
              disabled={!senderId}
            >
              Connect to Sender
            </button>
          </div>
        </div>

        {decryptedChunk && (
          <div className="encryption-details">
            <h3>Decryption Information</h3>
            <div className="encryption-summary">
              <div className="info-item">
                <span>Method:</span> 
                <span>{decryptedChunk.method}</span>
              </div>
              <div className="info-item">
                <span>Chunk Number:</span> 
                <span>{decryptedChunk.chunkNumber}</span>
              </div>
              <div className="info-item">
                <span>IV Size:</span> 
                <span>{decryptedChunk.ivSize} bytes</span>
              </div>
              <div className="info-item">
                <span>Encrypted Size:</span> 
                <span>{decryptedChunk.encryptedSize} bytes</span>
              </div>
            </div>
            <div className="editor-container">
              <Editor
                height="200px"
                defaultLanguage="json"
                theme="vs-dark"
                value={JSON.stringify(decryptedChunk, null, 2)}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  wordWrap: 'on'
                }}
              />
            </div>
          </div>
        )}

        <div className="status-section">
          <div className="progress-container">
            {status.includes('Chunk') && (
              <div 
                className="progress-bar"
                style={{
                  width: `${(receivedChunks.current.length / (receivedChunks.current.length + 1)) * 100}%`
                }}
              />
            )}
          </div>
          <div className="status-container">
            <span className="status-text">{status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}