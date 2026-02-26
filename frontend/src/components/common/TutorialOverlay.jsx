import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import './TutorialOverlay.css';

// Tour steps: each maps to a sidebar nav item via data-nav selector
const TOUR_STEPS = [
  { nav: '/', key: 'dashboard', icon: 'dashboard' },
  { nav: '/applications', key: 'applications', icon: 'list' },
  { nav: '/search', key: 'jobSearch', icon: 'travel_explore' },
  { nav: '/applications/new', key: 'newApplication', icon: 'add' },
  { nav: '/profile', key: 'profile', icon: 'person' },
  { nav: '/ai', key: 'aiAssistant', icon: 'smart_toy' },
  { nav: '/settings', key: 'settings', icon: 'settings' },
];

// Guide steps: visual workflow overview
const GUIDE_STEPS = [
  { icon: 'travel_explore', titleKey: 'step1Title', descKey: 'step1Desc', color: '#3b82f6' },
  { icon: 'content_copy', titleKey: 'step2Title', descKey: 'step2Desc', color: '#f59e0b' },
  { icon: 'content_paste_go', titleKey: 'step3Title', descKey: 'step3Desc', color: '#10b981' },
  { icon: 'auto_awesome', titleKey: 'step4Title', descKey: 'step4Desc', color: '#8b5cf6' },
];

export default function TutorialOverlay({ isOpen, onClose }) {
  const { t } = useTranslation();
  // phase: 'welcome' | 'guide' | 'tour' | 'finish'
  const [phase, setPhase] = useState('welcome');
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [animating, setAnimating] = useState(false);
  const overlayRef = useRef(null);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setPhase('welcome');
      setStepIndex(0);
      setTargetRect(null);
    }
  }, [isOpen]);

  // Measure the target nav element whenever stepIndex or phase changes
  useEffect(() => {
    if (!isOpen || phase !== 'tour') return;

    const measure = () => {
      const step = TOUR_STEPS[stepIndex];
      const el = document.querySelector(`[data-nav="${step.nav}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      }
    };

    // Initial measure with small delay for DOM paint
    const timer = setTimeout(measure, 50);

    // Re-measure on resize
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', measure);
    };
  }, [isOpen, phase, stepIndex]);

  const handleSkip = useCallback(() => {
    localStorage.setItem('tutorial_completed', 'true');
    onClose();
  }, [onClose]);

  const handleStartGuide = useCallback(() => {
    setPhase('guide');
  }, []);

  const handleGuideToTour = useCallback(() => {
    setPhase('tour');
    setStepIndex(0);
  }, []);

  const handleNext = useCallback(() => {
    if (animating) return;
    if (stepIndex < TOUR_STEPS.length - 1) {
      setAnimating(true);
      setTimeout(() => {
        setStepIndex((prev) => prev + 1);
        setAnimating(false);
      }, 200);
    } else {
      setPhase('finish');
    }
  }, [stepIndex, animating]);

  const handlePrevious = useCallback(() => {
    if (animating || stepIndex === 0) return;
    setAnimating(true);
    setTimeout(() => {
      setStepIndex((prev) => prev - 1);
      setAnimating(false);
    }, 200);
  }, [stepIndex, animating]);

  const handleFinish = useCallback(() => {
    localStorage.setItem('tutorial_completed', 'true');
    onClose();
  }, [onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') handleSkip();
      if (phase === 'tour') {
        if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
        if (e.key === 'ArrowLeft') handlePrevious();
      }
      if (phase === 'welcome' && e.key === 'Enter') handleStartGuide();
      if (phase === 'guide' && e.key === 'Enter') handleGuideToTour();
      if (phase === 'finish' && e.key === 'Enter') handleFinish();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, phase, handleNext, handlePrevious, handleSkip, handleStartGuide, handleGuideToTour, handleFinish]);

  if (!isOpen) return null;

  const step = TOUR_STEPS[stepIndex];

  // Spotlight SVG mask dimensions
  const spotlightPadding = 6;
  const spotlightRadius = 10;

  // Tooltip position: to the right of sidebar (sidebar is 240px)
  const tooltipLeft = 256; // 240 + 16 gap
  const rawTop = targetRect ? targetRect.top + targetRect.height / 2 : 0;
  // Clamp tooltip vertically so it stays within viewport (approx tooltip height ~220px)
  const tooltipTop = Math.max(120, Math.min(rawTop, window.innerHeight - 120));

  return (
    <div className="tutorial-overlay" ref={overlayRef}>
      {/* ── WELCOME PHASE ── */}
      {phase === 'welcome' && (
        <div className="tutorial-modal" onClick={(e) => e.stopPropagation()}>
          <img src="/logo2.png" alt="FinixJob" className="tutorial-modal-logo" />
          <h2 className="tutorial-modal-title">{t('tutorial.welcomeTitle')}</h2>
          <p className="tutorial-modal-desc">{t('tutorial.welcomeDesc')}</p>
          <div className="tutorial-modal-actions">
            <button className="btn btn-primary" onClick={handleStartGuide}>
              <span className="material-icon" style={{ fontSize: 18 }}>play_arrow</span>
              {t('tutorial.startTour')}
            </button>
            <button className="btn btn-ghost" onClick={handleSkip}>
              {t('tutorial.skipTour')}
            </button>
          </div>
        </div>
      )}

      {/* ── GUIDE PHASE ── */}
      {phase === 'guide' && (
        <div className="tutorial-guide" onClick={(e) => e.stopPropagation()}>
          <h2 className="tutorial-guide-title">{t('tutorial.guide.title')}</h2>
          <p className="tutorial-guide-subtitle">{t('tutorial.guide.subtitle')}</p>

          <div className="tutorial-guide-flow">
            {GUIDE_STEPS.map((gs, i) => (
              <Fragment key={i}>
                {i > 0 && (
                  <div className="tutorial-guide-arrow">
                    <span className="material-icon">arrow_forward</span>
                  </div>
                )}
                <div
                  className="tutorial-guide-card"
                  style={{ animationDelay: `${i * 0.12}s` }}
                >
                  <span className="tutorial-guide-card-num" style={{ background: gs.color }}>
                    {i + 1}
                  </span>
                  <div
                    className="tutorial-guide-icon-wrap"
                    style={{ '--step-color': gs.color }}
                  >
                    <span className="material-icon">{gs.icon}</span>
                  </div>
                  <h4 className="tutorial-guide-card-title">
                    {t(`tutorial.guide.${gs.titleKey}`)}
                  </h4>
                  <p className="tutorial-guide-card-desc">
                    {t(`tutorial.guide.${gs.descKey}`)}
                  </p>
                  {i === 0 && (
                    <div className="tutorial-guide-platforms">
                      <span className="platform-badge linkedin">in</span>
                      <span className="platform-badge indeed">iD</span>
                      <span className="platform-badge glassdoor">G</span>
                      <span className="platform-badge infojobs">iJ</span>
                    </div>
                  )}
                </div>
              </Fragment>
            ))}
          </div>

          <div className="tutorial-guide-actions">
            <button className="btn btn-primary" onClick={handleGuideToTour}>
              <span className="material-icon" style={{ fontSize: 18 }}>arrow_forward</span>
              {t('tutorial.guide.continue')}
            </button>
            <button className="btn btn-ghost" onClick={handleSkip}>
              {t('tutorial.guide.skipAll')}
            </button>
          </div>
        </div>
      )}

      {/* ── TOUR PHASE ── */}
      {phase === 'tour' && targetRect && (
        <>
          {/* SVG Backdrop with spotlight cutout */}
          <svg className="tutorial-backdrop-svg" onClick={handleSkip}>
            <defs>
              <mask id="tutorial-spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={targetRect.left - spotlightPadding}
                  y={targetRect.top - spotlightPadding}
                  width={targetRect.width + spotlightPadding * 2}
                  height={targetRect.height + spotlightPadding * 2}
                  rx={spotlightRadius}
                  ry={spotlightRadius}
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.65)"
              mask="url(#tutorial-spotlight-mask)"
            />
          </svg>

          {/* Highlight ring around target */}
          <div
            className="tutorial-highlight-ring"
            style={{
              top: targetRect.top - spotlightPadding,
              left: targetRect.left - spotlightPadding,
              width: targetRect.width + spotlightPadding * 2,
              height: targetRect.height + spotlightPadding * 2,
              borderRadius: spotlightRadius,
            }}
          />

          {/* Positioned tooltip */}
          <div
            className={`tutorial-tooltip ${animating ? 'tutorial-tooltip-exit' : 'tutorial-tooltip-enter'}`}
            style={{ left: tooltipLeft, top: tooltipTop }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tutorial-tooltip-arrow" />
            <div className="tutorial-tooltip-content">
              <div className="tutorial-tooltip-header">
                <span className="material-icon tutorial-tooltip-icon">{step.icon}</span>
                <h3 className="tutorial-tooltip-title">
                  {t(`tutorial.tour.${step.key}.title`)}
                </h3>
              </div>
              <p className="tutorial-tooltip-desc">
                {t(`tutorial.tour.${step.key}.desc`)}
              </p>

              {/* Dots */}
              <div className="tutorial-dots">
                {TOUR_STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={`tutorial-dot ${i === stepIndex ? 'active' : ''} ${i < stepIndex ? 'completed' : ''}`}
                  />
                ))}
              </div>

              {/* Nav buttons */}
              <div className="tutorial-tooltip-nav">
                {stepIndex > 0 ? (
                  <button className="btn btn-ghost btn-sm" onClick={handlePrevious}>
                    <span className="material-icon" style={{ fontSize: 16 }}>arrow_back</span>
                    {t('tutorial.previous')}
                  </button>
                ) : (
                  <button className="btn btn-ghost btn-sm" onClick={handleSkip}>
                    {t('tutorial.skipTour')}
                  </button>
                )}

                <span className="tutorial-counter">
                  {stepIndex + 1} {t('tutorial.stepOf')} {TOUR_STEPS.length}
                </span>

                <button className="btn btn-primary btn-sm" onClick={handleNext}>
                  {stepIndex === TOUR_STEPS.length - 1 ? t('tutorial.finish') : t('tutorial.next')}
                  {stepIndex < TOUR_STEPS.length - 1 && (
                    <span className="material-icon" style={{ fontSize: 16 }}>arrow_forward</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── FINISH PHASE ── */}
      {phase === 'finish' && (
        <div className="tutorial-modal" onClick={(e) => e.stopPropagation()}>
          <span className="material-icon tutorial-modal-finish-icon">rocket_launch</span>
          <h2 className="tutorial-modal-title">{t('tutorial.finishTitle')}</h2>
          <p className="tutorial-modal-desc">{t('tutorial.finishDesc')}</p>
          <div className="tutorial-modal-actions">
            <button className="btn btn-primary" onClick={handleFinish}>
              {t('tutorial.finish')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
