import { useState, useEffect } from 'react';

function App() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/test')
      .then(response => response.json())
      .then(data => setMessage(data.message))
      .catch(err => setError(err.message));
  }, []);

  return (
    <div>
      <h1>こんにちは、React + FastAPI アプリケーション！
      </h1>
      {error ? (
        <p>エラー: {error}</p>
      ) : message ? (
        <p>バックエンドからのメッセージ: {message}</p>
      ) : (
        <p>読み込み中...</p>
      )}
    </div>
  );
}


export default App;