const Timer = ({label, time}) => {
    return (
        <div className="timer-item">
            <div className="timer-label">{label} Timer</div>
            <div className="timer-value">{time === Infinity? "∞": `${time}s` }</div>
        </div>
    );
};

export default Timer;