const Scoreboard = ({ score, highScore }) => {
    return(
        <>
            <h2>Score: {score}</h2>
            <h2>High Score: {highScore}</h2>
        </>
    );
};

export default Scoreboard;