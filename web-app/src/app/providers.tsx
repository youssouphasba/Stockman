'use client';

import { ReactNode, useEffect, Suspense } from "react";
import "@/services/i18n";
import "@/utils/trusted-types";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { FeedbackProvider } from "@/components/ui/Feedback";

export function Providers({ children }: { children: ReactNode }) {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <ThemeProvider>
                <FeedbackProvider>
                    {children}
                </FeedbackProvider>
            </ThemeProvider>
        </Suspense>
    );
}
