import mouseHoverAudio from "../assets/Hover-Btn.WAV";
import mouseClickAudio from "../assets/Mouse-Click.WAV";

const Options = ({playAudio, options = [], onGuess, disabled}) => {
    const capitalizeFirst = (str) => {
        if (typeof str !== 'string' || str.length === 0) {
            return '';
        }
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

    const getDisplayText = (opt) => {
        if (typeof opt === 'string') {
            return capitalizeFirst(opt);
        }
        if (opt?.label) {
            return opt.label;
        }
        if (opt?.name) {
            return capitalizeFirst(opt.name);
        }
        if (opt?.value) {
            return capitalizeFirst(String(opt.value));
        }
        return 'Unknown';
    };
    
    return(
        <div className="options-container">
            {options.filter(opt => opt != null).map((opt, i) => (
                <button 
                    key={i} 
                    className="option-button"
                    onClick={() => {playAudio(mouseClickAudio); onGuess(opt);}}
                    onMouseEnter={() => playAudio(mouseHoverAudio)} 
                    disabled={disabled}
                >
                    {getDisplayText(opt)}
                </button>
            ))}
        </div>
    );
};

export default Options;