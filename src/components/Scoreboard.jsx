const Scoreboard = ({ score, highScore }) => {
    return(
        <div className="scoreboard">
            <div className="score-item">
                <div className="score-label">Current Score</div>
                <div className="score-value">{score}</div>
            </div>
            <div className="score-item">
                <div className="score-label">High Score</div>
                <div className="score-value">{highScore}</div>
            </div>
        </div>
    );
};

export default Scoreboard;