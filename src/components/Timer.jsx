const Timer = ({label, time}) => {
    return (
        <h3> {label}: {time === Infinity? "∞": `${time}s` } </h3>
    );
};

export default Timer;