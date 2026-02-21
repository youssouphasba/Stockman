'use client';

import { ReactNode, useEffect } from "react";
import "@/services/i18n";
import "@/utils/trusted-types";

export function Providers({ children }: { children: ReactNode }) {
    return <>{children}</>;
}
