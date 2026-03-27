export type MeasurementType = 'unit' | 'weight' | 'volume';

type MeasurementAwareProduct = {
    unit?: string;
    display_unit?: string;
    pricing_unit?: string;
    measurement_type?: string;
    allows_fractional_sale?: boolean;
    quantity_precision?: number;
    quantity?: number;
};

const UNIT_ALIASES: Record<string, string> = {
    piece: 'piece',
    pieces: 'piece',
    'pi�ce': 'piece',
    'pi�ces': 'piece',
    'pièce': 'piece',
    'pièces': 'piece',
    unite: 'piece',
    unit: 'piece',
    units: 'piece',
    kg: 'kg',
    g: 'g',
    l: 'l',
    litre: 'l',
    litres: 'l',
    ml: 'ml',
    cl: 'cl',
};

const UNIT_DISPLAY: Record<string, string> = {
    piece: 'Piece',
    kg: 'kg',
    g: 'g',
    l: 'L',
    ml: 'mL',
    cl: 'cL',
};

const WEIGHT_RATIOS: Record<string, number> = { g: 1, kg: 1000 };
const VOLUME_RATIOS: Record<string, number> = { ml: 1, cl: 10, l: 1000 };

const roundQuantity = (value: number, decimals = 3) => {
    const factor = 10 ** decimals;
    return Math.round((Number(value) || 0) * factor) / factor;
};

export function normalizeUnitLabel(unit?: string | null) {
    const raw = String(unit || '').trim();
    if (!raw) return 'piece';
    const key = raw.toLowerCase();
    return UNIT_ALIASES[key] || key;
}

export function getUnitDisplay(unit?: string | null) {
    const normalized = normalizeUnitLabel(unit);
    return UNIT_DISPLAY[normalized] || String(unit || normalized || 'Piece');
}

export function inferMeasurementType(unit?: string | null, explicit?: string | null): MeasurementType {
    if (explicit === 'unit' || explicit === 'weight' || explicit === 'volume') {
        return explicit;
    }
    const normalized = normalizeUnitLabel(unit);
    if (normalized === 'kg' || normalized === 'g') return 'weight';
    if (normalized === 'l' || normalized === 'ml' || normalized === 'cl') return 'volume';
    return 'unit';
}

export function defaultPrecisionForUnit(unit?: string | null, measurementType?: string | null) {
    const normalized = normalizeUnitLabel(unit);
    const resolvedType = inferMeasurementType(normalized, measurementType);
    if (resolvedType === 'weight') return normalized === 'kg' ? 0.001 : 1;
    if (resolvedType === 'volume') {
        if (normalized === 'l') return 0.001;
        if (normalized === 'cl') return 0.01;
        return 1;
    }
    return 1;
}

export function normalizeProductMeasurement<T extends MeasurementAwareProduct>(product: T) {
    const unit = normalizeUnitLabel(product.unit || product.display_unit || product.pricing_unit || 'piece');
    const measurementType = inferMeasurementType(unit, product.measurement_type);
    const displayUnit = normalizeUnitLabel(product.display_unit || unit);
    const pricingUnit = normalizeUnitLabel(product.pricing_unit || unit);
    const allowsFractionalSale = product.allows_fractional_sale ?? (measurementType !== 'unit');
    const quantityPrecision = product.quantity_precision || defaultPrecisionForUnit(pricingUnit, measurementType);

    return {
        ...product,
        unit,
        display_unit: displayUnit,
        pricing_unit: pricingUnit,
        measurement_type: measurementType,
        allows_fractional_sale: allowsFractionalSale,
        quantity_precision: roundQuantity(quantityPrecision),
    };
}

export function isWeightedProduct(product: MeasurementAwareProduct) {
    const normalized = normalizeProductMeasurement(product);
    return normalized.allows_fractional_sale || normalized.measurement_type !== 'unit';
}

export function getAllowedSaleUnits(product: MeasurementAwareProduct) {
    const normalized = normalizeProductMeasurement(product);
    if (normalized.measurement_type === 'weight') return ['g', 'kg'];
    if (normalized.measurement_type === 'volume') return ['ml', 'cl', 'l'];
    return [normalizeUnitLabel(normalized.pricing_unit || normalized.unit)];
}

function getRatios(measurementType: MeasurementType) {
    if (measurementType === 'weight') return WEIGHT_RATIOS;
    if (measurementType === 'volume') return VOLUME_RATIOS;
    return { piece: 1 };
}

export function convertMeasurementQuantity(
    value: number,
    fromUnit: string,
    toUnit: string,
    measurementType: MeasurementType,
) {
    if (measurementType === 'unit') return roundQuantity(value);
    const from = normalizeUnitLabel(fromUnit);
    const to = normalizeUnitLabel(toUnit);
    const ratios = getRatios(measurementType);
    if (!(from in ratios) || !(to in ratios)) {
        throw new Error('Unite incompatible');
    }
    const baseValue = (Number(value) || 0) * ratios[from];
    return roundQuantity(baseValue / ratios[to]);
}

export function buildSaleMeasurementPayload(
    product: MeasurementAwareProduct,
    soldQuantityInput: number,
    soldUnit?: string,
) {
    const normalized = normalizeProductMeasurement(product);
    const selectedUnit = normalizeUnitLabel(soldUnit || normalized.pricing_unit || normalized.unit);
    const quantity = convertMeasurementQuantity(
        soldQuantityInput,
        selectedUnit,
        normalized.pricing_unit || normalized.unit || selectedUnit,
        normalized.measurement_type as MeasurementType,
    );

    return {
        quantity,
        sold_quantity_input: roundQuantity(soldQuantityInput),
        sold_unit: selectedUnit,
        measurement_type: normalized.measurement_type as MeasurementType,
        pricing_unit: normalized.pricing_unit || normalized.unit || selectedUnit,
        display_unit: normalized.display_unit || normalized.pricing_unit || normalized.unit || selectedUnit,
    };
}

export function formatMeasurementQuantity(value: number, unit?: string | null) {
    const numeric = roundQuantity(value);
    const text = Math.abs(numeric - Math.round(numeric)) < 1e-6
        ? String(Math.round(numeric))
        : numeric.toFixed(3).replace(/\.?0+$/, '');
    return `${text} ${getUnitDisplay(unit)}`.trim();
}

export function formatSaleQuantity(item: {
    quantity?: number;
    sold_quantity_input?: number;
    sold_unit?: string;
    pricing_unit?: string;
    display_unit?: string;
    unit?: string;
}) {
    if (item.sold_quantity_input != null) {
        return formatMeasurementQuantity(item.sold_quantity_input, item.sold_unit || item.pricing_unit || item.unit);
    }
    return formatMeasurementQuantity(item.quantity || 0, item.display_unit || item.pricing_unit || item.unit);
}

export function getInputStep(product: MeasurementAwareProduct, selectedUnit?: string) {
    const normalized = normalizeProductMeasurement(product);
    const unit = normalizeUnitLabel(selectedUnit || normalized.pricing_unit || normalized.unit);
    const step = convertMeasurementQuantity(
        normalized.quantity_precision || defaultPrecisionForUnit(normalized.pricing_unit, normalized.measurement_type),
        normalized.pricing_unit || normalized.unit || unit,
        unit,
        normalized.measurement_type as MeasurementType,
    );
    return roundQuantity(step || 1);
}

export function getQuickMeasurementPresets(product: MeasurementAwareProduct) {
    const normalized = normalizeProductMeasurement(product);
    if (normalized.measurement_type === 'weight') {
        return [
            { label: '100 g', quantity: 100, unit: 'g' },
            { label: '250 g', quantity: 250, unit: 'g' },
            { label: '500 g', quantity: 500, unit: 'g' },
            { label: '1 kg', quantity: 1, unit: 'kg' },
        ];
    }
    if (normalized.measurement_type === 'volume') {
        return [
            { label: '250 mL', quantity: 250, unit: 'ml' },
            { label: '500 mL', quantity: 500, unit: 'ml' },
            { label: '1 L', quantity: 1, unit: 'l' },
        ];
    }
    return [
        { label: '1', quantity: 1, unit: normalizeUnitLabel(normalized.pricing_unit || normalized.unit) },
    ];
}
