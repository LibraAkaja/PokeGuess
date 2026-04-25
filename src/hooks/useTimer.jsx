import { useState, useEffect, useRef } from "react";

const useTimer = (initial, onEnd, active = true) => {
    const [time, setTime] = useState(initial);
    const ref = useRef(null);
    const onEndRef = useRef(onEnd);

    // Update the callback ref when onEnd changes
    useEffect(() => {
        onEndRef.current = onEnd;
    }, [onEnd]);

    useEffect(() => {
        if(!active) {
            if (ref.current) {
                clearInterval(ref.current);
                ref.current = null;
            }
            return;
        }

        ref.current = setInterval(() => {
            setTime((t) => {
                if (t <= 1) {
                    clearInterval(ref.current);
                    ref.current = null;
                    onEndRef.current?.();
                    return 0;
                }
                return t - 1;
            });
        }, 1000);

        return () => {
            if (ref.current) {
                clearInterval(ref.current);
                ref.current = null;
            }
        };
    }, [active]);

    const reset = (newTime) => {
        if (ref.current) {
            clearInterval(ref.current);
            ref.current = null;
        }
        setTime(newTime);

        if (active) {
            ref.current = setInterval(() => {
                setTime((t) => {
                    if (t <= 1) {
                        clearInterval(ref.current);
                        ref.current = null;
                        onEndRef.current?.();
                        return 0;
                    }
                    return t - 1;
                });
            }, 1000);
        }
    };

    return { time, reset };
};

export default useTimer;