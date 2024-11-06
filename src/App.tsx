import React, { useEffect, useState } from 'react';
import FlappyBird from './FlappyBird';

function App() {
    const [userId, setUserId] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setUserId(params.get('userId') || '');
    }, []);

    return (
        <div className="App">
            <FlappyBird userId={userId} />
        </div>
    );
}

export default App;
