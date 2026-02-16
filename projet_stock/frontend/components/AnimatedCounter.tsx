import React, { useEffect, useRef, useState } from 'react';
import { Text, TextStyle, Animated, Easing } from 'react-native';

type AnimatedCounterProps = {
    value: number;
    duration?: number;
    style?: TextStyle;
    prefix?: string;
    suffix?: string;
};

export default function AnimatedCounter({
    value,
    duration = 1000,
    style,
    prefix = '',
    suffix = ''
}: AnimatedCounterProps) {
    const animatedValue = useRef(new Animated.Value(0)).current;
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const listener = animatedValue.addListener(({ value: v }) => {
            setDisplayValue(Math.floor(v));
        });

        Animated.timing(animatedValue, {
            toValue: value,
            duration: duration,
            useNativeDriver: false, // using true for listener on value change doesn't work well on Android sometimes without special handling, but let's stick to simple state update via JS thread for maximum compatibility
            // actually, to update state in listener, useNativeDriver MUST be false.
            // Re-correcting:
            easing: Easing.out(Easing.exp),
        }).start();

        return () => {
            animatedValue.removeListener(listener);
        };
    }, [value, duration]);

    /* Second useEffect removed as it was redundant */

    return (
        <Text style={style}>
            {prefix}{displayValue.toLocaleString()}{suffix}
        </Text>
    );
}
