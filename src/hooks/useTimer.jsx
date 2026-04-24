import { useState, useEffect, useRef } from "react";

const useTimer = (initial, onEnd, active = true) => {
    const [time, setTime] = useState(initial);
    const ref = useRef(null);

    useEffect(() => {
        if(!active) return;
        ref.current = setInterval(() => {
            setTime((t) => {
                if (t<=1) {
                    clearInterval(ref.current);
                    onEnd?.();
                    return 0;
                }
                return t-1;
            });
        }, 1000);
        return () => clearInterval(ref.current);
    },[active]);

    const reset = (newTime) => setTime(newTime);

    return {time, reset};
};

export default useTimer;