// src/components/common/FlowFooter.jsx
import React from "react";

/**
 * Props:
 * - onBack?: () => void
 * - onNext?: () => void
 * - onSkip?: () => void
 * - onFinish?: () => void
 * - nextLabel?: string        // 기본: "다음"
 * - skipLabel?: string        // 기본: "건너뛰기"
 * - finishLabel?: string      // 기본: "완료"
 * - showBack?: boolean        // 기본: true
 * - showNext?: boolean        // 기본: true
 * - showSkip?: boolean        // 기본: false
 * - showFinish?: boolean      // 기본: false
 * - nextDisabled?: boolean
 * - skipDisabled?: boolean
 * - finishDisabled?: boolean
 */
export default function FlowFooter({
  onBack,
  onNext,
  onSkip,
  onFinish,
  nextLabel = "다음",
  skipLabel = "건너뛰기",
  finishLabel = "완료",
  showBack = true,
  showNext = true,
  showSkip = false,
  showFinish = false,
  nextDisabled = false,
  skipDisabled = false,
  finishDisabled = false,
}) {
  return (
    <div className="flow-footer">
      <div className="left">
        {showBack && (
          <button className="btn-outline" onClick={onBack}>
            뒤로
          </button>
        )}
      </div>
      <div className="right">
        {showSkip && (
          <button className="btn-secondary" onClick={onSkip} disabled={skipDisabled}>
            {skipLabel}
          </button>
        )}
        {showNext && (
          <button className="btn-primary" onClick={onNext} disabled={nextDisabled}>
            {nextLabel}
          </button>
        )}
        {showFinish && (
          <button className="btn-success" onClick={onFinish} disabled={finishDisabled}>
            {finishLabel}
          </button>
        )}
      </div>
    </div>
  );
}