export function paymentOutcome(payment: {
  transaction_status?: string;
  fraud_status?: string;
}): 'lunas' | 'gagal' | null {
  if (
    payment.transaction_status === 'settlement' ||
    (payment.transaction_status === 'capture' && payment.fraud_status === 'accept')
  )
    return 'lunas';
  if (['deny', 'cancel', 'expire', 'failure'].includes(payment.transaction_status || ''))
    return 'gagal';
  return null;
}
