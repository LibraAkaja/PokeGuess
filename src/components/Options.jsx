const Options = ({options = [], onGuess, disabled}) => {
    const capitalizeFirst = (str) => str.charAt(0).toUpperCase() + str.slice(1);
    
    return(
        <div className="options-container">
            {options.map((opt, i) => (
                <button 
                    key={i} 
                    className="option-button"
                    onClick={() => onGuess(opt)} 
                    disabled={disabled}
                >
                    {typeof opt === 'string' ? capitalizeFirst(opt) : capitalizeFirst(opt.name)}
                </button>
            ))}
        </div>
    );
};

export default Options;