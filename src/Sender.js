import React, { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { Editor } from '@monaco-editor/react';
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveAESKey,
  encryptData
} from './cryptoUtils';
import { ICONS, RTC_CONFIG } from './constants';
import './Sender.css';

function generateId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function Sender() {
  // State management
  const [id] = useState(generateId());
  const [receiverId, setReceiverId] = useState('');
  const [status, setStatus] = useState('Idle');
  const [showQR, setShowQR] = useState(false);
  const [shareableLink, setShareableLink] = useState('');
  const [encryptedChunk, setEncryptedChunk] = useState(null);
  
  // Refs for WebRTC and file handling
  const pc = useRef(null);
  const socket = useRef(null);
  const dc = useRef(null);
  const fileReader = useRef(null);
  const aesKey = useRef(null);
  const localKeyPair = useRef(null);

  // Generate shareable link when component mounts
  useEffect(() => {
    const baseUrl = window.location.origin || 'https://192.168.168.36:3000';
    setShareableLink(`${baseUrl}/receive/${id}`);
  }, [id]);

  // Socket connection setup
  useEffect(() => {
    socket.current = io('https://192.168.168.36:8080', {
      transports: ['websocket'],
      rejectUnauthorized: false
    });

    socket.current.on('connect', () => {
      socket.current.emit('register', id);
      setStatus(`Connected as ${id}`);
    });

    socket.current.on('signal', async (data) => {
      if (data.from !== receiverId) return;

      try {
        if (data.signal.publicKey) {
          const receiverPub = await importPublicKey(data.signal.publicKey);
          aesKey.current = await deriveAESKey(localKeyPair.current.privateKey, receiverPub);
        }

        if (data.signal.sdp) {
          await pc.current.setRemoteDescription(new RTCSessionDescription(data.signal));
          if (data.signal.type === 'answer') {
            setStatus('Connection established');
          }
        } else if (data.signal.candidate) {
          await pc.current.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
        }
      } catch (error) {
        setStatus(`Signal error: ${error.message}`);
        console.error('Signal error:', error);
      }
    });

    socket.current.on('error', (error) => {
      setStatus(`Socket error: ${error.message}`);
      console.error('Socket error:', error);
    });

    return () => socket.current.disconnect();
  }, [id, receiverId]);

  const startConnection = async () => {
    try {
      pc.current = new RTCPeerConnection(RTC_CONFIG);

      // Generate encryption keys
      localKeyPair.current = await generateKeyPair();
      const myPub = await exportPublicKey(localKeyPair.current.publicKey);
      
      socket.current.emit('signal', {
        target: receiverId,
        signal: { publicKey: myPub }
      });

      // Create data channel
      dc.current = pc.current.createDataChannel('fileTransfer', {
        ordered: true,
        maxRetransmits: 3
      });

      dc.current.binaryType = 'arraybuffer';
      
      // Data channel event handlers
      dc.current.onopen = () => setStatus('Connected. Ready to send files.');
      dc.current.onclose = () => setStatus('Connection closed');
      dc.current.onerror = (error) => setStatus(`Error: ${error.message}`);

      // ICE candidate handling
      pc.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.current.emit('signal', {
            target: receiverId,
            signal: { candidate: event.candidate }
          });
        }
      };

      // Connection state monitoring
      pc.current.onconnectionstatechange = () => {
        setStatus(`Connection state: ${pc.current.connectionState}`);
      };

      // Create and send offer
      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);
      socket.current.emit('signal', {
        target: receiverId,
        signal: pc.current.localDescription
      });

    } catch (error) {
      setStatus(`Connection error: ${error.message}`);
      console.error('Connection error:', error);
    }
  };

  const sendFile = async (file) => {
    if (!dc.current || dc.current.readyState !== 'open') {
      setStatus('No connection to receiver');
      return;
    }

    const chunkSize = 16384;
    let offset = 0;
    fileReader.current = new FileReader();

    fileReader.current.onload = async (e) => {
      try {
        const chunk = e.target.result;
        const { encrypted, iv } = await encryptData(aesKey.current, chunk);
        
        // Convert ArrayBuffer to Array for display
        const ivArray = Array.from(iv);
        const encryptedArray = Array.from(new Uint8Array(encrypted).slice(0, 32));

        setEncryptedChunk({
          fileName: file.name,
          chunkNumber: Math.ceil(offset / chunkSize),
          totalChunks: Math.ceil(file.size / chunkSize),
          originalSize: chunk.byteLength,
          encryptedSize: encrypted.byteLength,
          iv: ivArray,
          encryptionMethod: 'AES-GCM',
          chunk: encryptedArray,
          details: {
            timestamp: new Date().toISOString(),
            chunkPreviewSize: 32,
            ivSize: iv.byteLength,
            fullChunkSize: encrypted.byteLength,
            mimeType: file.type || 'application/octet-stream',
            encryption: {
              method: 'AES-GCM',
              keySize: '256 bits',
              ivLength: `${iv.byteLength * 8} bits`
            }
          }
        });

        dc.current.send(iv);
        dc.current.send(encrypted);

        offset += chunk.byteLength;
        const progress = ((offset / file.size) * 100).toFixed(1);
        setStatus(`Sending: ${progress}%`);

        if (offset < file.size) {
          readSlice(offset);
        } else {
          dc.current.send(JSON.stringify({ 
            done: true, 
            fileName: file.name,
            totalSize: file.size 
          }));
          setStatus('File sent successfully');
        }
      } catch (error) {
        setStatus(`Error sending file: ${error.message}`);
        console.error('File sending error:', error);
      }
    };

    const readSlice = (o) => {
      const slice = file.slice(o, o + chunkSize);
      fileReader.current.readAsArrayBuffer(slice);
    };

    readSlice(0);
  };

  return (
    <div className="sender-container">
      <div className="sender-header">
        <h2>Secure File Sender</h2>
        <div className="sender-id-container">
          <span className="sender-id">ID: {id}</span>
          <button 
            className="sender-button icon-button tooltip"
            onClick={() => navigator.clipboard.writeText(id)}
            data-tooltip="Copy ID"
          >
            {ICONS.CLIPBOARD}
          </button>
        </div>
      </div>

      <div className="sender-controls">
        <div className="connection-section">
          <div className="input-group">
            <input
              type="text"
              className="sender-input"
              placeholder="Enter Receiver ID"
              value={receiverId}
              onChange={e => setReceiverId(e.target.value.toUpperCase())}
            />
            <button
              className="sender-button"
              onClick={startConnection}
              disabled={!receiverId}
            >
              Connect to Receiver
            </button>
          </div>

          <div className="sharing-options">
            <button 
              className="sender-button secondary"
              onClick={() => setShowQR(!showQR)}
            >
              {showQR ? 'Hide QR Code' : 'Show QR Code'}
            </button>
            
            {showQR && (
              <div className="qr-container">
                <QRCodeSVG 
                  value={shareableLink} 
                  size={200}
                  level="H"
                  includeMargin={true}
                />
                <div className="shareable-link">
                  <input 
                    type="text" 
                    value={shareableLink} 
                    readOnly 
                    className="link-input"
                  />
                  <button
                    className="sender-button small tooltip"
                    onClick={() => navigator.clipboard.writeText(shareableLink)}
                    data-tooltip="Copy Link"
                  >
                    📋
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="file-section">
          <div className="file-input-container">
            <label className="file-input-label">
              <input
                type="file"
                className="file-input"
                onChange={e => e.target.files[0] && sendFile(e.target.files[0])}
                disabled={!dc.current || dc.current.readyState !== 'open'}
              />
              {dc.current && dc.current.readyState === 'open' 
                ? `${ICONS.ATTACHMENT} Click to select a file`
                : `${ICONS.WARNING} Connect to a receiver first`}
            </label>
          </div>

          {encryptedChunk && (
            <div className="encryption-details">
              <h3>Encryption Information</h3>
              <div className="encryption-summary">
                <div className="info-item">
                  <span>Method:</span> 
                  <span>{encryptedChunk.encryptionMethod}</span>
                </div>
                <div className="info-item">
                  <span>Progress:</span> 
                  <span>{encryptedChunk.chunkNumber}/{encryptedChunk.totalChunks}</span>
                </div>
                <div className="info-item">
                  <span>Original Size:</span> 
                  <span>{encryptedChunk.originalSize} bytes</span>
                </div>
                <div className="info-item">
                  <span>Encrypted Size:</span> 
                  <span>{encryptedChunk.encryptedSize} bytes</span>
                </div>
              </div>
              <div className="editor-container">
                <Editor
                  height="300px"
                  defaultLanguage="json"
                  theme="vs-dark"
                  value={JSON.stringify(encryptedChunk, null, 2)}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    renderLineHighlight: 'all',
                    scrollbar: {
                      vertical: 'visible',
                      horizontal: 'visible'
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="status-section">
          <div className="progress-container">
            {status.includes('Sending:') && (
              <div 
                className="progress-bar"
                style={{
                  width: `${parseFloat(status.match(/[\d.]+/)[0])}%`
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