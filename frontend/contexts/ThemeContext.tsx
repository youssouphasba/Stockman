import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, LightTheme, Spacing, BorderRadius, FontSize } from '../constants/theme';

type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextType = {
    theme: ThemeMode;
    isDark: boolean;
    colors: typeof DarkTheme;
    spacing: typeof Spacing;
    borderRadius: typeof BorderRadius;
    fontSize: typeof FontSize;
    glassStyle: any;
    setTheme: (theme: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'user_theme_preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemColorScheme = useColorScheme();
    const [theme, setThemeState] = useState<ThemeMode>('system');

    useEffect(() => {
        loadTheme();
    }, []);

    async function loadTheme() {
        try {
            const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
            if (savedTheme) {
                setThemeState(savedTheme as ThemeMode);
            }
        } catch (e) {
            console.error('Failed to load theme', e);
        }
    }

    async function setTheme(newTheme: ThemeMode) {
        setThemeState(newTheme);
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
        } catch (e) {
            console.error('Failed to save theme', e);
        }
    }

    const isDark = theme === 'system' ? systemColorScheme === 'dark' : theme === 'dark';
    const colors = isDark ? DarkTheme : LightTheme;

    const glassStyle = {
        backgroundColor: colors.glass,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderRadius: BorderRadius.lg,
    };

    return (
        <ThemeContext.Provider
            value={{
                theme,
                isDark,
                colors,
                spacing: Spacing,
                borderRadius: BorderRadius,
                fontSize: FontSize,
                glassStyle,
                setTheme,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
