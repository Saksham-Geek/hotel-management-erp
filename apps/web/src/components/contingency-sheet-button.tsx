'use client';

import React, { useState } from 'react';
import { btnGhostCls } from './ui';
import { FrontDeskContingencyModal } from './front-desk-contingency-modal';

export function ContingencySheetButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${btnGhostCls} border-amber-300/80 bg-amber-50/50 text-amber-900 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300 font-semibold`}
        title="Print emergency offline guest arrival and in-house register for front desk continuity"
      >
        <span>📋 Emergency Desk Sheet</span>
      </button>

      <FrontDeskContingencyModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
