'use client';

import { ReactNode, useEffect, Suspense } from "react";
import "@/services/i18n";
import "@/utils/trusted-types";

export function Providers({ children }: { children: ReactNode }) {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0F172A]" />}>
            {children}
        </Suspense>
    );
}
