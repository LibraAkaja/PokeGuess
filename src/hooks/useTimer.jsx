import { useState, useEffect, useRef, use } from "react";

const useTimer = (initial, onEnd, active = true) => {
    const [time, setTime] = useState(initial);
    const [tick, setTick] = useState(0);
    const intervalRef = useRef(null);
    const onEndRef = useRef(onEnd);

    useEffect(() => {
        onEndRef.current = onEnd;
    }, [onEnd]);

    const clearTimer = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    useEffect(() => {
        clearTimer();
        if (!active) return;

        intervalRef.current = setInterval(() => {
            setTime((prev) => {
                if(prev <= 1){
                    clearTimer();
                    onEndRef.current?.();
                    return 0;
                }
                return prev - 1;
            });
        },1000);
        
        return clearTimer;
    }, [active, tick]);

    const reset = (newTime) => {
        setTime(newTime);
        setTick((t) => t + 1); // Force restart the timer
    };

    return { time, reset };
};

export default useTimer;