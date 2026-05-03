import mouseHoverAudio from "../assets/Hover-Btn.WAV";
import mouseClickAudio from "../assets/Mouse-Click.WAV";

export const playAudio = (a) => {
    const aud = new Audio(a);
    aud.play();
};

const Options = ({options = [], onGuess, disabled}) => {
    const capitalizeFirst = (str) => str.charAt(0).toUpperCase() + str.slice(1);
    
    return(
        <div className="options-container">
            {options.filter(opt => opt != null).map((opt, i) => (
                <button 
                    key={i} 
                    className="option-button"
                    onClick={() => {playAudio(mouseClickAudio); onGuess(opt);}}
                    onMouseOver={() => playAudio(mouseHoverAudio)} 
                    disabled={disabled}
                >
                    {typeof opt === 'string' ? capitalizeFirst(opt) : (opt?.name ? capitalizeFirst(opt.name) : 'Unknown')}
                </button>
            ))}
        </div>
    );
};

export default Options;