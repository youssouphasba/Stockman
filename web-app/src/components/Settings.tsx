'use client';

import type { User as AppUser } from '../services/api';
import SettingsWorkspace from './SettingsWorkspace';
import ScreenGuide, { GuideStep } from './ScreenGuide';

type SettingsProps = {
    user?: AppUser | null;
};

const settingsSteps: GuideStep[] = [
    {
        title: 'Rôle des paramètres',
        content: "Cet écran centralise les réglages du compte, de l'organisation, des notifications, des documents, des boutiques et de la sécurité. Commencez toujours par choisir le bon onglet selon ce que vous voulez réellement modifier.",
    },
    {
        title: 'Lire les onglets correctement',
        content: "Les onglets en haut divisent les réglages par famille. Ouvrez d'abord l'onglet concerné avant de modifier un champ, puis relisez les explications de portée pour savoir si vous agissez au niveau du compte, de l'organisation ou de la boutique.",
        details: [
            { label: 'Compte', description: "Profil, langue, devise et informations de facturation.", type: 'filter' },
            { label: 'Organisation', description: "Modules actifs, droits étendus et rappels partagés pour votre structure.", type: 'filter' },
            { label: 'Notifications', description: "Préférences personnelles et destinataires de notifications.", type: 'filter' },
            { label: 'Documents', description: "Tickets, factures, taxes et terminaux.", type: 'filter' },
            { label: 'Boutiques', description: "Fiche des boutiques et informations associées.", type: 'filter' },
            { label: 'Sécurité', description: "Mot de passe, déconnexion et suppression du compte.", type: 'filter' },
        ],
    },
    {
        title: 'Modifier puis enregistrer',
        content: "Chaque grande section possède son propre bouton d'enregistrement. Après une modification, validez uniquement la section concernée pour éviter de penser qu'un changement a été sauvegardé alors qu'il est encore local à l'écran.",
    },
    {
        title: 'Notifications et contacts',
        content: "Les réglages de notifications servent à choisir qui reçoit quoi et par quel canal. Utilisez-les pour répartir les alertes entre les bonnes personnes sans surcharger toute l'équipe.",
    },
    {
        title: "Utilisation de l'IA",
        content: "L'assistant IA peut maintenant expliquer les réglages visibles à votre profil, rappeler la portée réelle d'un paramètre et résumer l'état actuel des notifications, des documents ou des modules actifs. Il respecte les autorisations du compte : il n'affiche pas les réglages organisationnels ou de facturation si votre profil n'y a pas accès.",
    },
    {
        title: 'Documents et fiscalité',
        content: "L'onglet Documents sert à personnaliser les tickets, les factures, la TVA et les terminaux. C'est ici que vous adaptez les documents envoyés aux clients à votre manière de travailler.",
    },
    {
        title: 'Sécurité et zone sensible',
        content: "L'onglet Sécurité regroupe les actions sensibles comme le changement de mot de passe, la déconnexion ou la suppression du compte. Prenez le temps de relire les avertissements avant toute action irréversible.",
    },
];

export default function Settings({ user }: SettingsProps) {
    return (
        <>
            <ScreenGuide guideKey="settings_tour" steps={settingsSteps} />
            <SettingsWorkspace user={user} />
        </>
    );
}


