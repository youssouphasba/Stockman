const ASCII_UPPER_A = 65;
const ASCII_UPPER_Z = 90;
const REGIONAL_INDICATOR_A = 0x1f1e6;
const FALLBACK_FLAG = String.fromCodePoint(0x1f3f3, 0xfe0f);

export function getFlagFromCountryCode(countryCode?: string | null): string {
    const normalizedCode = countryCode?.trim().toUpperCase();
    if (!normalizedCode || normalizedCode.length !== 2) {
        return FALLBACK_FLAG;
    }

    const first = normalizedCode.charCodeAt(0);
    const second = normalizedCode.charCodeAt(1);
    const hasOnlyAsciiLetters =
        first >= ASCII_UPPER_A &&
        first <= ASCII_UPPER_Z &&
        second >= ASCII_UPPER_A &&
        second <= ASCII_UPPER_Z;

    if (!hasOnlyAsciiLetters) {
        return FALLBACK_FLAG;
    }

    return String.fromCodePoint(
        REGIONAL_INDICATOR_A + (first - ASCII_UPPER_A),
        REGIONAL_INDICATOR_A + (second - ASCII_UPPER_A),
    );
}
