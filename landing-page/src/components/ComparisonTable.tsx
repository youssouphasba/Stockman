import { useTranslation } from 'react-i18next';
import '../App.css';

const ComparisonTable = () => {
    const { t } = useTranslation();

    return (
        <section className="comparison-section container">
            <div className="glass-card comparison-card">
                <h2>{t('comparison.title')}</h2>
                <div className="table-responsive">
                    <table className="comparison-table">
                        <thead>
                            <tr>
                                <th>{t('comparison.feature')}</th>
                                <th className="highlight">Stockman 🚀</th>
                                <th>{t('comparison.notebook')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>{t('comparison.stock_mgmt')}</td>
                                <td className="check">{t('comparison.stock_yes')}</td>
                                <td className="cross">{t('comparison.stock_no')}</td>
                            </tr>
                            <tr>
                                <td>{t('comparison.alerts')}</td>
                                <td className="check">{t('comparison.alerts_yes')}</td>
                                <td className="cross">{t('comparison.alerts_no')}</td>
                            </tr>
                            <tr>
                                <td>{t('comparison.pos')}</td>
                                <td className="check">{t('comparison.pos_yes')}</td>
                                <td className="cross">{t('comparison.pos_no')}</td>
                            </tr>
                            <tr>
                                <td>{t('comparison.backup')}</td>
                                <td className="check">{t('comparison.backup_yes')}</td>
                                <td className="cross">{t('comparison.backup_no')}</td>
                            </tr>
                            <tr>
                                <td>{t('comparison.financial')}</td>
                                <td className="check">{t('comparison.financial_yes')}</td>
                                <td className="cross">{t('comparison.financial_no')}</td>
                            </tr>
                            <tr>
                                <td>{t('comparison.marketplace')}</td>
                                <td className="check">{t('comparison.marketplace_yes')}</td>
                                <td className="cross">{t('comparison.marketplace_no')}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
};

export default ComparisonTable;
