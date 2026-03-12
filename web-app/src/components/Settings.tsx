'use client';

import type { User as AppUser } from '../services/api';
import SettingsWorkspace from './SettingsWorkspace';

type SettingsProps = {
    user?: AppUser | null;
};

export default function Settings({ user }: SettingsProps) {
    return <SettingsWorkspace user={user} />;
}
