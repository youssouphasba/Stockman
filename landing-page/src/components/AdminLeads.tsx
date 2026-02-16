import { useState, useEffect } from 'react';
import '../App.css';

interface ContactMessage {
    name: string;
    email: string;
    message: string;
    created_at: string;
}

interface Subscriber {
    email: string;
    created_at: string;
}

const AdminLeads = () => {
    const [contacts, setContacts] = useState<ContactMessage[]>([]);
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchLeads = async () => {
            try {
                const response = await fetch('http://localhost:8000/api/public/leads');
                if (response.ok) {
                    const data = await response.json();
                    setContacts(data.contacts);
                    setSubscribers(data.subscribers);
                } else {
                    setError('Failed to fetch leads');
                }
            } catch (err) {
                setError('Error fetching leads');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchLeads();
    }, []);

    if (loading) return <div className="container" style={{ paddingTop: '100px', textAlign: 'center' }}>Loading...</div>;
    if (error) return <div className="container" style={{ paddingTop: '100px', textAlign: 'center', color: 'red' }}>{error}</div>;

    return (
        <div className="container" style={{ paddingTop: '100px', paddingBottom: '100px' }}>
            <h1 className="text-gradient" style={{ marginBottom: '40px' }}>Admin Dashboard - Leads</h1>

            <div style={{ display: 'grid', gap: '40px' }}>
                <section>
                    <h2>📬 Messages de Contact ({contacts.length})</h2>
                    <div className="glass-card" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text)' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                                    <th style={{ padding: '15px' }}>Date</th>
                                    <th style={{ padding: '15px' }}>Nom</th>
                                    <th style={{ padding: '15px' }}>Email</th>
                                    <th style={{ padding: '15px' }}>Message</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contacts.map((contact, index) => (
                                    <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '15px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                            {new Date(contact.created_at).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '15px' }}>{contact.name}</td>
                                        <td style={{ padding: '15px' }}>{contact.email}</td>
                                        <td style={{ padding: '15px' }}>{contact.message}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section>
                    <h2>📧 Inscrits Newsletter ({subscribers.length})</h2>
                    <div className="glass-card" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text)' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                                    <th style={{ padding: '15px' }}>Date</th>
                                    <th style={{ padding: '15px' }}>Email</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subscribers.map((sub, index) => (
                                    <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '15px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                            {new Date(sub.created_at).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '15px' }}>{sub.email}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AdminLeads;
