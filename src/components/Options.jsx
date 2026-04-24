const Options = ({options = [], onGuess, disabled}) => {
    return(
        <div style={{display:"flex", gap:"10px", justifyContent:"center"}}>
            {options.map((opt, i) => (
                <button key={i} onClick={() => onGuess(opt)} disabled={disabled}>
                    {opt.name}
                </button>
            ))}
        </div>
    );
};

export default Options;