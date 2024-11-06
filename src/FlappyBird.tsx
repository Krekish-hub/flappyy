import React, { useEffect, useRef, useReducer } from 'react';
import axios from 'axios';

const SERVER_URL = 'http://localhost:5000/api';

const images = {
    bird: new Image(),
    bg: new Image(),
    fg: new Image(),
    pipeUp: new Image(),
    pipeBottom: new Image(),
};

interface GameState {
    score: number;
    birdY: number;
    velocity: number;
    pipes: { x: number, y: number }[];
    isGameRunning: boolean;
    highScores: { name: string, record: number }[];
}

type Action =
    | { type: 'SET_SCORE', payload: number }
    | { type: 'SET_BIRD_Y', payload: number }
    | { type: 'SET_VELOCITY', payload: number }
    | { type: 'SET_PIPES', payload: { x: number, y: number }[] }
    | { type: 'SET_IS_GAME_RUNNING', payload: boolean }
    | { type: 'SET_HIGH_SCORES', payload: { name: string, record: number }[] }
    | { type: 'RESET_GAME' };

const initialState: GameState = {
    score: 0,
    birdY: 150,
    velocity: 0,
    pipes: [{ x: 300, y: 0 }],
    isGameRunning: false,
    highScores: []
};

const reducer = (state: GameState, action: Action): GameState => {
    switch (action.type) {
        case 'SET_SCORE':
            return { ...state, score: action.payload };
        case 'SET_BIRD_Y':
            return { ...state, birdY: action.payload };
        case 'SET_VELOCITY':
            return { ...state, velocity: action.payload };
        case 'SET_PIPES':
            return { ...state, pipes: action.payload };
        case 'SET_IS_GAME_RUNNING':
            return { ...state, isGameRunning: action.payload };
        case 'SET_HIGH_SCORES':
            return { ...state, highScores: action.payload };
        case 'RESET_GAME':
            return { ...state, birdY: 150, velocity: 0, score: 0, pipes: [{ x: 300, y: 0 }], isGameRunning: true };
        default:
            return state;
    }
};

const FlappyBird: React.FC<{ userId: string }> = ({ userId }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [{ score, birdY, velocity, pipes, isGameRunning, highScores }, dispatch] = useReducer(reducer, initialState);
    const gap = 100;
    const birdX = 10;
    const pipeWidth = 52;
    const birdSize = 24;
    const canvasHeight = 512;
    const canvasWidth = 288;
    const gravity = 0.5;
    const jump = -6;

    useEffect(() => {
        const loadImages = async () => {
            images.bird.src = await axios.get('/images/flappy_bird_bird.png', { responseType: 'blob' }).then((res) => URL.createObjectURL(res.data));
            images.bg.src = await axios.get('/images/bg.png', { responseType: 'blob' }).then((res) => URL.createObjectURL(res.data));
            images.fg.src = await axios.get('/images/fg.png', { responseType: 'blob' }).then((res) => URL.createObjectURL(res.data));
            images.pipeUp.src = await axios.get('/images/pipeUp.png', { responseType: 'blob' }).then((res) => URL.createObjectURL(res.data));
            images.pipeBottom.src = await axios.get('/images/pipeBottom.png', { responseType: 'blob' }).then((res) => URL.createObjectURL(res.data));
        };
        loadImages();
    }, []);

    const handleKeyDown = () => {
        if (isGameRunning) {
            dispatch({ type: 'SET_VELOCITY', payload: jump });
        }
    };

    const resetGame = () => {
        dispatch({ type: 'RESET_GAME' });
    };

    const drawFrame = () => {
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx && canvasRef.current) {
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            ctx.drawImage(images.bg, 0, 0);

            pipes.forEach((pipe, index) => {
                const pipeUpY = pipe.y;
                const pipeBottomY = pipe.y + images.pipeUp.height + gap;

                ctx.drawImage(images.pipeUp, pipe.x, pipeUpY);
                ctx.drawImage(images.pipeBottom, pipe.x, pipeBottomY);

                if (isGameRunning) pipe.x -= 2;

                if (pipe.x + pipeWidth <= 0 && isGameRunning) {
                    pipes.splice(index, 1);
                    dispatch({ type: 'SET_SCORE', payload: score + 1 });
                    dispatch({
                        type: 'SET_PIPES', payload: [
                            ...pipes,
                            { x: canvasWidth, y: Math.floor(Math.random() * images.pipeUp.height) - images.pipeUp.height }
                        ]
                    });
                }

                if (
                    (birdX + birdSize >= pipe.x && birdX <= pipe.x + pipeWidth &&
                    (birdY <= pipeUpY + images.pipeUp.height || birdY + birdSize >= pipeBottomY)) ||
                    birdY + birdSize >= canvasHeight - images.fg.height ||
                    birdY <= 0
                ) {
                    dispatch({ type: 'SET_IS_GAME_RUNNING', payload: false });
                    saveScore(score);
                }
            });

            ctx.drawImage(images.fg, 0, canvasHeight - images.fg.height);
            ctx.drawImage(images.bird, birdX, birdY);

            ctx.fillStyle = "#000";
            ctx.font = "24px Arial";
            ctx.fillText("Счет: " + score, 10, canvasHeight - 20);
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            if (isGameRunning) {
                dispatch({ type: 'SET_VELOCITY', payload: velocity + gravity });
                dispatch({ type: 'SET_BIRD_Y', payload: birdY + velocity });
            }
            drawFrame();
        }, 20);

        return () => clearInterval(interval);
    }, [birdY, pipes, score, isGameRunning, velocity]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isGameRunning]);

    const saveScore = async (score: number) => {
        try {
            await axios.post(`${SERVER_URL}/save_score`, { userId, record: score });
            const response = await axios.get(`${SERVER_URL}/highscores`);
            dispatch({ type: 'SET_HIGH_SCORES', payload: response.data });
        } catch (error) {
            console.error("Ошибка при сохранении счета:", error);
        }
    };

    return (
        <div id="game">
            <canvas ref={canvasRef} width={canvasWidth} height={canvasHeight} />
            <div>
                {!isGameRunning && (
                    <>
                        <button onClick={resetGame}>Начать заново</button>
                        <button onClick={() => alert(`Рекорды игроков:\n${highScores.map((record) => `${record.name}: ${record.record}`).join('\n')}`)}>Показать рекорды</button>
                    </>
                )}
                <p>Счет: {score}</p>
            </div>
        </div>
    );
};

export default FlappyBird;
