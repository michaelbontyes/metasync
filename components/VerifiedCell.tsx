'use client';

import { CellVerificationData } from '@/services/verificationService';
import { O3FormCellVerificationData } from '@/services/o3FormVerificationService';

interface VerifiedCellProps {
  value: string;
  verificationData?: CellVerificationData | O3FormCellVerificationData;
  row: number;
  col: number;
  prop: number | string;
  TD: HTMLTableCellElement;
  cellProperties: any;
}

// Store active tooltips globally
const activeTooltips = new Map<HTMLTableCellElement, HTMLDivElement>();

/**
 * Custom cell renderer for verified cells
 * This is a plain function, not a React component, as Handsontable doesn't use React's component lifecycle
 */
export function VerifiedCell({
  value,
  verificationData,
  TD,
  // Unused parameters are prefixed with underscore
  // row, col, prop, cellProperties are not used but required by Handsontable
}: VerifiedCellProps): string {
  // Apply background color based on verification status
  if (verificationData?.isVerified) {
    TD.style.backgroundColor = verificationData.isValid
      ? 'rgba(0, 255, 0, 0.2)' // Light green for valid
      : 'rgba(255, 0, 0, 0.2)'; // Light red for invalid
  } else {
    TD.style.backgroundColor = '';
  }

  // Always ensure text color is black for readability
  TD.style.color = '#000';

  // Set up tooltip events
  if (verificationData?.tooltipContent) {
    TD.title = ''; // Remove default title tooltip

    // Clean up any existing event listeners
    TD.removeEventListener('mouseenter', handleMouseEnter);
    TD.removeEventListener('mouseleave', handleMouseLeave);

    // Add new event listeners
    TD.addEventListener('mouseenter', handleMouseEnter);
    TD.addEventListener('mouseleave', handleMouseLeave);
  }

  // Return the original value
  return value;
}

// Mouse enter event to show tooltip
function handleMouseEnter(this: HTMLTableCellElement, _e: MouseEvent) {
  // Skip if tooltip already exists
  if (activeTooltips.has(this)) return;

  // Get verification data from cell's dataset
  const verificationData = this.dataset.verificationContent;
  if (!verificationData) return;

  // Create tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'verification-tooltip';
  tooltip.style.position = 'absolute';
  tooltip.style.zIndex = '1000';
  tooltip.style.backgroundColor = '#333';
  tooltip.style.color = '#fff';
  tooltip.style.padding = '8px';
  tooltip.style.borderRadius = '4px';
  tooltip.style.maxWidth = '300px';
  tooltip.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  tooltip.style.whiteSpace = 'pre-wrap';
  tooltip.style.fontSize = '12px';
  tooltip.style.lineHeight = '1.4';
  tooltip.textContent = verificationData;

  // Position the tooltip
  const rect = this.getBoundingClientRect();
  tooltip.style.left = `${rect.left + window.scrollX}px`;
  tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;

  document.body.appendChild(tooltip);
  activeTooltips.set(this, tooltip);
}

// Mouse leave event to hide tooltip
function handleMouseLeave(this: HTMLTableCellElement) {
  const tooltip = activeTooltips.get(this);
  if (tooltip) {
    document.body.removeChild(tooltip);
    activeTooltips.delete(this);
  }
}
