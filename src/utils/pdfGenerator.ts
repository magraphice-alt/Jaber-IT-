import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, User } from '../types';
import { formatBDDateTime, getBDDateOnly } from './timeHelper';

interface GeneratePDFParams {
  user: {
    name: string;
    mobile?: string;
    email?: string;
    address?: string;
    balance?: number;
  };
  transactions: Transaction[];
  filterInfo?: {
    type?: string;
    singleDate?: string;
    fromDate?: string;
    toDate?: string;
    mobile?: string;
  };
}

export const generateStatementPDF = ({ user, transactions, filterInfo }: GeneratePDFParams) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header Colors & Typography
  const navyColor = [15, 23, 42]; // Slate 900
  const blueColor = [30, 58, 138]; // Blue 900
  const emeraldColor = [16, 185, 129];
  const roseColor = [225, 29, 72];

  // 1. Top Decorative Bar
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageWidth, 8, 'F');

  // 2. Brand Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(30, 58, 138);
  doc.text('MASUD TELECOM', 14, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Official Digital Money Transfer & Commission Statement', 14, 26);
  doc.text('Helpline: +880 1700-000000 | Dhaka, Bangladesh', 14, 31);

  // Statement Label on Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 58, 138);
  doc.text('ACCOUNT STATEMENT', pageWidth - 14, 20, { align: 'right' });

  const generatedDateStr = formatBDDateTime(new Date(), true);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${generatedDateStr}`, pageWidth - 14, 26, { align: 'right' });

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 35, pageWidth - 14, 35);

  // 3. Customer Info Box
  let startY = 40;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, startY, pageWidth - 28, 24, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, startY, pageWidth - 28, 24, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Customer Name: ${user.name || 'User'}`, 18, startY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Mobile Number: ${user.mobile || 'N/A'}`, 18, startY + 12);
  doc.text(`Address: ${user.address || 'Dhaka, Bangladesh'}`, 18, startY + 18);

  // Balance & Filter Badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138);
  doc.text(`Current Balance: Tk. ${(user.balance || 0).toLocaleString('en-BD')}`, pageWidth - 18, startY + 6, { align: 'right' });

  const filterSummary = [
    `Filter: ${filterInfo?.type ? filterInfo.type.toUpperCase() : 'ALL'}`,
    filterInfo?.singleDate ? `Date: ${filterInfo.singleDate}` : '',
    filterInfo?.fromDate ? `From: ${filterInfo.fromDate}` : '',
    filterInfo?.toDate ? `To: ${filterInfo.toDate}` : '',
    filterInfo?.mobile ? `Mobile: ${filterInfo.mobile}` : ''
  ].filter(Boolean).join(' | ');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(filterSummary, pageWidth - 18, startY + 18, { align: 'right' });

  startY += 28;

  // 4. Calculate Totals
  const totalSend = transactions
    .filter(t => t.type === 'send' && t.status === 'approved')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalDeposit = transactions
    .filter(t => t.type === 'deposit' && t.status === 'approved')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalCommission = transactions
    .filter(t => t.type === 'charge')
    .reduce((acc, t) => acc + t.amount, 0);

  // Summary Cards Bar
  doc.setFillColor(241, 245, 249);
  doc.rect(14, startY, pageWidth - 28, 12, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, startY, pageWidth - 28, 12, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  doc.text(`Total Records: ${transactions.length}`, 18, startY + 7.5);
  doc.text(`Total Deposit: Tk. ${totalDeposit.toLocaleString('en-BD')}`, 65, startY + 7.5);
  doc.text(`Total Send: Tk. ${totalSend.toLocaleString('en-BD')}`, 120, startY + 7.5);
  doc.text(`Commission: Tk. ${totalCommission.toLocaleString('en-BD')}`, 170, startY + 7.5);

  startY += 16;

  // 5. Build AutoTable Data
  const tableHead = [['SL', 'Date & Time', 'Txn ID', 'Type', 'Method / Target', 'PIN', 'Status', 'Amount (Tk.)']];

  const tableData = transactions.map((t, index) => {
    const isSend = t.type === 'send';
    const isCharge = t.type === 'charge';
    const dateStr = formatBDDateTime(t.createdAt, false);
    const typeLabel = isCharge ? 'COMMISSION' : isSend ? 'SEND' : 'DEPOSIT';
    const targetLabel = t.recipientMobile ? `${t.method.toUpperCase()} (${t.recipientMobile})` : t.method.toUpperCase();
    const pinStr = t.adminPin ? `Key: ${t.adminPin}` : '-';
    const statusStr = isCharge ? 'Deducted' : t.status.toUpperCase();
    const amountSign = isSend || isCharge ? '-' : '+';
    const amountStr = `${amountSign}${t.amount.toLocaleString('en-BD')}`;

    return [
      (index + 1).toString(),
      dateStr,
      t.id,
      typeLabel,
      targetLabel,
      pinStr,
      statusStr,
      amountStr
    ];
  });

  autoTable(doc, {
    startY: startY,
    head: tableHead,
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2.5
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 32 },
      2: { fontStyle: 'bold', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 22 },
      4: { cellWidth: 38 },
      5: { halign: 'center', cellWidth: 18 },
      6: { halign: 'center', cellWidth: 18 },
      7: { halign: 'right', fontStyle: 'bold', cellWidth: 22 }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    didDrawPage: (data) => {
      // Footer
      const pageCount = typeof (doc as any).getNumberOfPages === 'function' ? (doc as any).getNumberOfPages() : data.pageNumber;
      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'This is a computer-generated digital statement from Masud Telecom. No seal or signature required.',
        14,
        pageHeight - 8
      );
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth - 14,
        pageHeight - 8,
        { align: 'right' }
      );
    }
  });

  // Save the PDF File
  const safeFileName = `Statement_${user.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(safeFileName);
};
