import React from 'react';
import { SubmissionStatus, PayoutStatus, PayoutItemStatus } from '@/types';

interface StatusBadgeProps {
  status: SubmissionStatus | PayoutStatus | PayoutItemStatus | string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';
  const normalized = (status || '').toUpperCase();

  let colorClasses = 'bg-[#FDF2F4] dark:bg-[#2E1823] text-[#7B1E4B] dark:text-pink-300 border-[#FAD8E2] dark:border-[#421D30] font-semibold';
  let label = status.replace(/_/g, ' ');

  switch (normalized) {
    case 'APPROVED':
      colorClasses = 'bg-[#FDF2F4] dark:bg-[#2E1823] text-[#7B1E4B] dark:text-pink-300 border-[#FAD8E2] dark:border-[#421D30] font-bold';
      label = 'Approved';
      break;
    case 'SUBMITTED':
      colorClasses = 'bg-[#FFF8FA] dark:bg-[#28151E] text-[#8E2848] dark:text-pink-300 border-[#F5E1E8] dark:border-[#381B2B] font-semibold';
      label = 'Submitted';
      break;
    case 'UNDER_REVIEW':
      colorClasses = 'bg-[#FFF0F5] dark:bg-[#2B1420] text-[#7B1E4B] dark:text-pink-300 border-[#F7D0DC] dark:border-[#3F1929] font-semibold';
      label = 'Under Review';
      break;
    case 'REVISION_REQUESTED':
      colorClasses = 'bg-[#FFF0F4] dark:bg-[#2E121B] text-[#9E2A4E] dark:text-pink-300 border-[#F7C6D5] dark:border-[#4D1C2C] font-semibold';
      label = 'Revision Requested';
      break;
    case 'REJECTED':
      colorClasses = 'bg-[#FDF2F4] dark:bg-[#2E121B] text-[#993352] dark:text-pink-400 border-[#FAD8E2] dark:border-[#4D1C2C] line-through font-medium';
      label = 'Rejected';
      break;
    case 'PAID':
    case 'COMPLETED':
      colorClasses = 'bg-[#7B1E4B] text-white border-[#5E1438] font-bold shadow-xs';
      label = 'Completed';
      break;
    case 'REQUESTED':
      colorClasses = 'bg-[#FDF2F4] dark:bg-[#2E1823] text-[#7B1E4B] dark:text-pink-300 border-[#FAD8E2] dark:border-[#421D30] font-semibold';
      label = 'Payout Requested';
      break;
    case 'PROCESSING':
      colorClasses = 'bg-[#FFF0F5] dark:bg-[#2B1420] text-[#8E2848] dark:text-pink-300 border-[#F7D0DC] dark:border-[#3F1929] font-semibold';
      label = 'Processing Transfer';
      break;
    case 'CANCELLED':
    case 'FAILED':
      colorClasses = 'bg-[#FDF2F4] dark:bg-[#2E121B] text-[#993352] dark:text-pink-400 border-[#FAD8E2] dark:border-[#4D1C2C] font-medium';
      label = normalized === 'FAILED' ? 'Transfer Failed' : 'Cancelled';
      break;
    case 'REFUNDED':
      colorClasses = 'bg-[#FDF2F4] dark:bg-[#2E1823] text-[#7B1E4B] dark:text-pink-300 border-[#FAD8E2] dark:border-[#421D30] font-semibold';
      label = 'Refunded';
      break;
    case 'RESERVED':
      colorClasses = 'bg-[#FBF0F4] dark:bg-[#2B1621] text-[#7B1E4B] dark:text-pink-300 border-[#F5D5E0] dark:border-[#3E1C2B] font-semibold';
      label = 'Reserved in Payout';
      break;
    case 'UNPAID':
      colorClasses = 'bg-[#FDE8EF] dark:bg-[#341825] text-[#7B1E4B] dark:text-pink-200 border-[#F9B8CB] dark:border-[#4D1F34] font-bold';
      label = 'Available for Payout';
      break;
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border tracking-wide uppercase ${sizeClasses} ${colorClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {label}
    </span>
  );
}
