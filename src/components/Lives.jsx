const Lives = ({ lives }) => {
    return (
        <div className="lives-container">
            {Array.from({ length: lives }).map((_, i) => (
                <span key={i} className="heart">❤️</span>
            ))}
        </div>
    );
};

export default Lives;