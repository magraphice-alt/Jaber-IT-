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
    totalCommission?: number;
    commissionRate?: number;
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

  // 4. Sort Transactions in Strict Chronological Order (First transaction on First Line, Last on Last Line)
  const sortedTxns = [...transactions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  let totalSend = 0;
  let totalDeposit = 0;
  let totalCommission = 0;
  let totalCharges = 0;

  // Format currency with standard 2 decimal places for bank balance sheets
  const formatCurrency = (val: number) => {
    return val.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Calculate Net Total Credits & Debits to derive Opening Balance accurately
  let periodTotalDebit = 0;
  let periodTotalCredit = 0;

  sortedTxns.forEach(t => {
    const isDebit = (t.type === 'send' || t.type === 'charge') && t.status !== 'rejected';
    const isCredit = t.type === 'deposit' && t.status === 'approved';

    if (t.type === 'send' && t.status !== 'rejected') {
      totalSend += t.amount;
      // Calculate user commission earned on this send transaction
      const earned = (t.commissionEarned !== undefined && t.commissionEarned > 0)
        ? t.commissionEarned
        : ((t.amount / 1000) * 7.5);
      totalCommission += earned;
    } else if (t.type === 'deposit' && t.status === 'approved') {
      totalDeposit += t.amount;
    } else if (t.type === 'charge') {
      totalCharges += t.amount;
    }

    if (isDebit) periodTotalDebit += t.amount;
    if (isCredit) periodTotalCredit += t.amount;
  });

  // If filtered transactions have no send transactions, fallback to user's overall commission if present
  const displayCommission = totalCommission > 0 
    ? totalCommission 
    : (user.totalCommission !== undefined && user.totalCommission > 0 ? user.totalCommission : 0);

  // Opening Balance before the first transaction of the selected period
  const currentBalance = user.balance ?? 0;
  const openingBalance = currentBalance - periodTotalCredit + periodTotalDebit;

  // Render Customer & Statement Info Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, startY, pageWidth - 28, 28, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, startY, pageWidth - 28, 28, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Customer Name: ${user.name || 'User'}`, 18, startY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Mobile: ${user.mobile || 'N/A'}  |  Address: ${user.address || 'Dhaka, Bangladesh'}`, 18, startY + 12.5);

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
  doc.text(`Statement Period: ${filterSummary || 'All Time'}`, 18, startY + 20);

  // Right Side - Balances & Total Commission
  const userTotalCommission = (user.totalCommission !== undefined && user.totalCommission >= 0)
    ? user.totalCommission
    : displayCommission;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Opening Balance: Tk. ${formatCurrency(openingBalance)}`, pageWidth - 18, startY + 6.5, { align: 'right' });

  doc.setFontSize(9.5);
  doc.setTextColor(30, 58, 138);
  doc.text(`Closing Balance: Tk. ${formatCurrency(currentBalance)}`, pageWidth - 18, startY + 13.5, { align: 'right' });

  doc.setFontSize(8.5);
  doc.setTextColor(217, 119, 6);
  doc.text(`Total Commission: Tk. ${formatCurrency(userTotalCommission)}`, pageWidth - 18, startY + 20.5, { align: 'right' });

  startY += 32;

  // Running Ledger Balance Calculator (Debit Minus -, Credit Plus +)
  let rollingBal = openingBalance;
  const runningBalances = new Map<string, number>();

  sortedTxns.forEach(t => {
    const isDebit = (t.type === 'send' || t.type === 'charge') && t.status !== 'rejected';
    const isCredit = t.type === 'deposit' && t.status === 'approved';

    if (isDebit) {
      rollingBal -= t.amount;
    } else if (isCredit) {
      rollingBal += t.amount;
    }
    runningBalances.set(t.id, rollingBal);
  });

  // Calculate totals and format rows
  const tableHead = [[
    'SL',
    'Date & Time (BST)',
    'Txn ID',
    'Particulars / Method',
    'Target / Ref',
    'Status',
    'Debit (Tk.)',
    'Credit (Tk.)',
    'Balance (Tk.)'
  ]];

  const tableData = sortedTxns.map((t, index) => {
    const isSend = t.type === 'send';
    const isCharge = t.type === 'charge';
    const isDeposit = t.type === 'deposit';

    const dateStr = formatBDDateTime(t.createdAt, false);
    const particularLabel = isCharge ? 'COMMISSION CHARGE' : `${isSend ? 'SEND MONEY' : 'DEPOSIT'} (${t.method.toUpperCase()})`;
    const targetLabel = t.recipientMobile ? `${t.recipientMobile}${t.adminPin ? ` [Key:${t.adminPin}]` : ''}` : (t.comment || '-');
    const statusStr = isCharge ? 'POSTED' : t.status.toUpperCase();

    // Bank Ledger Debit / Credit split:
    // Debit = Outflow / Deductions (Send, Charge)
    // Credit = Inflow / Additions (Deposit)
    const debitAmount = (isSend || isCharge) ? formatCurrency(t.amount) : '-';
    const creditAmount = isDeposit ? formatCurrency(t.amount) : '-';
    const computedBal = runningBalances.get(t.id) ?? currentBalance;
    const balanceStr = formatCurrency(computedBal);

    return [
      (index + 1).toString(),
      dateStr,
      t.id,
      particularLabel,
      targetLabel,
      statusStr,
      debitAmount,
      creditAmount,
      balanceStr
    ];
  });

  // 5. Draw Bank Balance Sheet Table
  autoTable(doc, {
    startY: startY,
    head: tableHead,
    body: tableData,
    theme: 'grid',
    margin: { left: 10, right: 10 },
    headStyles: {
      fillColor: [15, 23, 42], // Slate 900
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: 2
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 2,
      valign: 'middle'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 9 },
      1: { cellWidth: 26 },
      2: { fontStyle: 'bold', cellWidth: 19, halign: 'center' },
      3: { cellWidth: 32 },
      4: { cellWidth: 26 },
      5: { halign: 'center', cellWidth: 20 },
      6: { halign: 'right', fontStyle: 'bold', textColor: [225, 29, 72], cellWidth: 19 }, // Debit (Red)
      7: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129], cellWidth: 19 }, // Credit (Emerald)
      8: { halign: 'right', fontStyle: 'bold', textColor: [30, 58, 138], cellWidth: 20 }   // Balance (Navy)
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    didDrawPage: (data) => {
      // Footer on each page
      const pageCount = typeof (doc as any).getNumberOfPages === 'function' ? (doc as any).getNumberOfPages() : data.pageNumber;
      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'This is an authentic computer-generated digital balance sheet statement from Masud Telecom.',
        10,
        pageHeight - 8
      );
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth - 10,
        pageHeight - 8,
        { align: 'right' }
      );
    }
  });

  // 6. Attached Summary Area DIRECTLY UNDER the Table Finish Line
  const finalTableY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : startY + 60;
  let summaryY = finalTableY;

  // If near page bottom, add a new page so summary stays intact
  if (summaryY > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    summaryY = 20;
  }

  // Summary Container Box attached under table finish line
  const summaryBoxHeight = 14;
  doc.setFillColor(241, 245, 249); // Clean slate background
  doc.rect(10, summaryY, 190, summaryBoxHeight, 'F');
  
  // Double-line finish border (Standard Financial Statement Finishing Line)
  doc.setDrawColor(15, 23, 42); // Dark Navy / Slate Finish
  doc.setLineWidth(0.6);
  doc.line(10, summaryY, 200, summaryY); // Top finish line attached to table bottom
  doc.line(10, summaryY + summaryBoxHeight, 200, summaryY + summaryBoxHeight); // Bottom line
  doc.setLineWidth(0.2);
  doc.line(10, summaryY + summaryBoxHeight + 0.8, 200, summaryY + summaryBoxHeight + 0.8); // Double finish line

  // Left & Right boundary lines
  doc.line(10, summaryY, 10, summaryY + summaryBoxHeight);
  doc.line(200, summaryY, 200, summaryY + summaryBoxHeight);

  // Summary Metrics Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  const textY = summaryY + 8.5;
  doc.text(`Total Records: ${transactions.length}`, 14, textY);
  
  doc.setTextColor(16, 185, 129);
  doc.text(`Total Deposit (+): Tk. ${formatCurrency(totalDeposit)}`, 48, textY);

  doc.setTextColor(225, 29, 72);
  doc.text(`Total Send (-): Tk. ${formatCurrency(totalSend)}`, 102, textY);

  doc.setTextColor(217, 119, 6);
  doc.text(`Commission: Tk. ${formatCurrency(displayCommission)}`, 154, textY);

  // 7. Statement Sign-off / Balance Verification Note below finish line
  const signOffY = summaryY + summaryBoxHeight + 8;
  if (signOffY < doc.internal.pageSize.getHeight() - 20) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Closing Balance: Tk. ${formatCurrency(user.balance || 0)}  |  Total Outflows (Debits): Tk. ${formatCurrency(totalSend + totalCharges)}  |  Total Inflows (Credits): Tk. ${formatCurrency(totalDeposit)}`,
      10,
      signOffY
    );
  }

  // Save the PDF File
  const safeFileName = `Statement_${user.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(safeFileName);
};
