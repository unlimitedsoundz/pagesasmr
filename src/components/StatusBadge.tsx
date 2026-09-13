import React from 'react';
import { SubmissionStatus, PayoutStatus, PayoutItemStatus } from '@/types';

interface StatusBadgeProps {
  status: SubmissionStatus | PayoutStatus | PayoutItemStatus | string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';
  const normalized = (status || '').toUpperCase();

  let colorClasses = 'bg-[#FDF2F4] dark:bg-[#2E1823] text-[#7B1E4B] dark:text-pink-300 font-semibold';
  let label = status.replace(/_/g, ' ');

  switch (normalized) {
    case 'APPROVED':
      colorClasses = 'bg-[#FDF2F4] dark:bg-[#2E1823] text-[#7B1E4B] dark:text-pink-300 font-bold';
      label = 'Approved';
      break;
    case 'SUBMITTED':
      colorClasses = 'bg-[#FDF2F4] dark:bg-[#28151E] text-[#7B1E4B] dark:text-pink-300 font-semibold';
      label = 'Submitted';
      break;
    case 'UNDER_REVIEW':
      colorClasses = 'bg-[#FDF2F4] dark:bg-[#2B1420] text-[#7B1E4B] dark:text-pink-300 font-semibold';
      label = 'Under Review';
      break;
    case 'REVISION_REQUESTED':
      colorClasses = 'bg-[#FDF2F4] dark:bg-[#2E121B] text-[#7B1E4B] dark:text-pink-300 font-semibold';
      label = 'Revision Requested';
      break;
    case 'REJECTED':
      colorClasses = 'bg-[#FDF2F4] dark:bg-[#2E121B] text-[#7B1E4B] dark:text-pink-400 line-through font-medium';
      label = 'Rejected';
      break;
    case 'PAID':
    case 'COMPLETED':
      colorClasses = 'bg-[#7B1E4B] text-white font-bold shadow-xs';
      label = 'Completed';
      break;
    case 'REQUESTED':
      colorClasses = 'bg-[#FDF2F4] dark:bg-[#2E1823] text-[#7B1E4B] dark:text-pink-300 font-semibold';
      label = 'Payout Requested';
      break;
    case 'PROCESSING':
      colorClasses = 'bg-[#FDF2F4] dark:bg-[#2B1420] text-[#7B1E4B] dark:text-pink-300 font-semibold';
      label = 'Processing Transfer';
      break;
    case 'CANCELLED':
    case 'FAILED':
      colorClasses = 'bg-[#FDF2F4] dark:bg-[#2E121B] text-[#7B1E4B] dark:text-pink-400 font-medium';
      label = normalized === 'FAILED' ? 'Transfer Failed' : 'Cancelled';
      break;
    case 'REFUNDED':
      colorClasses = 'bg-[#FDF2F4] dark:bg-[#2E1823] text-[#7B1E4B] dark:text-pink-300 font-semibold';
      label = 'Refunded';
      break;
    case 'RESERVED':
      colorClasses = 'bg-[#FDF2F4] dark:bg-[#2B1621] text-[#7B1E4B] dark:text-pink-300 font-semibold';
      label = 'Reserved in Payout';
      break;
    case 'UNPAID':
      colorClasses = 'bg-[#FDF2F4] dark:bg-[#341825] text-[#7B1E4B] dark:text-pink-200 font-bold';
      label = 'Available for Payout';
      break;
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border-0 tracking-wide uppercase ${sizeClasses} ${colorClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {label}
    </span>
  );
}

