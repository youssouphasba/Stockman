import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateOrderPDF = (order: any) => {
    const doc = new jsPDF() as any;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("BON DE COMMANDE", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Référence: #${order.order_id.substring(0, 8).toUpperCase()}`, 14, 30);
    doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 14, 35);

    // Supplier Info
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text("FOURNISSEUR", 14, 50);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(order.supplier_name || "N/A", 14, 56);
    if (order.supplier_phone) doc.text(`Tél: ${order.supplier_phone}`, 14, 61);

    // Order Table
    const tableData = order.items.map((item: any) => [
        item.name,
        item.quantity,
        `${(item.unit_price || item.price || 0).toLocaleString()} F`,
        `${((item.unit_price || item.price || 0) * item.quantity).toLocaleString()} F`
    ]);

    doc.autoTable({
        startY: 70,
        head: [['Article', 'Quantité', 'Prix Unitaire', 'Total']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }, // primary color
        styles: { fontSize: 9 },
    });

    const finalY = doc.lastAutoTable.finalY + 10;

    // Totals
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`NET À PAYER : ${order.total_amount.toLocaleString()} F`, 140, finalY);

    // Notes
    if (order.notes) {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("Notes:", 14, finalY + 10);
        doc.setFontSize(9);
        doc.text(order.notes, 14, finalY + 16, { maxWidth: 180 });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Généré par Stockman Pro - Page ${i} sur ${pageCount}`, 14, 285);
    }

    doc.save(`commande_${order.order_id.substring(0, 8)}.pdf`);
};
