import React, { useEffect, useRef, useState } from 'react';
import { Text, TextStyle, Animated, Easing, Platform, StyleProp } from 'react-native';
import { formatNumber } from '../utils/format';

type AnimatedCounterProps = {
    value: number;
    duration?: number;
    style?: StyleProp<TextStyle>;
    prefix?: string;
    suffix?: string;
    adjustsFontSizeToFit?: boolean;
    numberOfLines?: number;
};

export default function AnimatedCounter({
    value,
    duration = 1000,
    style,
    prefix = '',
    suffix = '',
    adjustsFontSizeToFit,
    numberOfLines
}: AnimatedCounterProps) {
    const animatedValue = useRef(new Animated.Value(0)).current;
    const [displayValue, setDisplayValue] = useState(value);

    useEffect(() => {
        // On web, Animated listeners can be unreliable — set value directly as safety net
        if (Platform.OS === 'web') {
            setDisplayValue(value);
            return;
        }

        const listener = animatedValue.addListener(({ value: v }) => {
            setDisplayValue(Math.floor(v));
        });

        Animated.timing(animatedValue, {
            toValue: value,
            duration: duration,
            useNativeDriver: false,
            easing: Easing.out(Easing.exp),
        }).start(({ finished }) => {
            // Ensure final value is always set even if listener missed it
            if (finished) setDisplayValue(value);
        });

        return () => {
            animatedValue.removeListener(listener);
        };
    }, [value, duration]);

    return (
        <Text
            style={style}
            adjustsFontSizeToFit={adjustsFontSizeToFit}
            numberOfLines={numberOfLines}
        >
            {prefix}{formatNumber(displayValue)}{suffix}
        </Text>
    );
}
