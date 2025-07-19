// src/components/Home.js
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: 'center', marginTop: '100px' }}>
      <h1>Secure P2P File Transfer</h1>
      <button onClick={() => navigate('/send')} style={{ margin: '20px', padding: '10px 20px' }}>
        I'm the Sender
      </button>
      <button onClick={() => navigate('/receive')} style={{ padding: '10px 20px' }}>
        I'm the Receiver
      </button>
    </div>
  );
};

export default Home;
