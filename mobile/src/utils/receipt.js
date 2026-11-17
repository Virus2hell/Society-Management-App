// Builds an HTML receipt and turns it into a PDF the resident can share.
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { formatDate, formatDateTime, formatMoney, formatMonth } from './format';

function receiptHtml(bill, user, societyName) {
  return `
  <html><head><meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: Helvetica, Arial, sans-serif; padding: 32px; color: #111827; }
    .box { border: 1px solid #E5E7EB; border-radius: 12px; padding: 24px; }
    h1 { margin: 0; color: #2563EB; font-size: 22px; }
    .muted { color: #6B7280; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    td { padding: 10px 0; border-bottom: 1px solid #F3F4F6; font-size: 14px; }
    td:last-child { text-align: right; font-weight: bold; }
    .total { font-size: 20px; color: #16A34A; }
    .paid { display: inline-block; margin-top: 16px; padding: 6px 14px; border-radius: 20px;
            background: #DCFCE7; color: #16A34A; font-weight: bold; }
  </style></head>
  <body><div class="box">
    <h1>${societyName}</h1>
    <div class="muted">Maintenance Payment Receipt</div>
    <table>
      <tr><td>Receipt No.</td><td>${bill.paymentRef}</td></tr>
      <tr><td>Flat</td><td>${bill.flat}</td></tr>
      <tr><td>Member</td><td>${user?.name || '-'}</td></tr>
      <tr><td>Bill Month</td><td>${formatMonth(bill.month)}</td></tr>
      <tr><td>Due Date</td><td>${formatDate(bill.dueDate)}</td></tr>
      <tr><td>Paid On</td><td>${formatDateTime(bill.paidAt)}</td></tr>
      <tr><td>Payment Mode</td><td>${bill.paymentMethod}</td></tr>
      <tr><td>Amount Paid</td><td class="total">${formatMoney(bill.amount)}</td></tr>
    </table>
    <div class="paid">PAID</div>
    <p class="muted">This is a computer generated receipt and does not need a signature.</p>
  </div></body></html>`;
}

export async function shareReceipt(bill, user, societyName = 'Housing Society') {
  const html = receiptHtml(bill, user, societyName);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Share receipt' });
  } else {
    await Print.printAsync({ uri });
  }
}
