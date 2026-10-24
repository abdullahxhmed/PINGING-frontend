import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { useSubscription } from '../../features/subscription';
import { PlusLogo } from '../brand/PingInLogo';

export const PlusSideDrawerTab: React.FC = () => {
  const { user } = useAuth();
  const { isPlus, isUpgradeModalOpen, openUpgradeModal } = useSubscription();

  const [mounted, setMounted] = useState(false);
  const [isWiggling, setIsWiggling] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (typeof window !== 'undefined') {
      const hasWiggled = sessionStorage.getItem('has_wiggled_plus_drawer') === 'true';
      if (!hasWiggled) {
        setIsWiggling(true);
        const timer = setTimeout(() => {
          sessionStorage.setItem('has_wiggled_plus_drawer', 'true');
          setIsWiggling(false);
        }, 1800);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Only render for authenticated users who do not have Plus and when drawer is closed
  if (!mounted || !user || isPlus || isUpgradeModalOpen) {
    return null;
  }

  return createPortal(
    <>
      <style>{`
        @keyframes plus-tab-wiggle {
          0% {
            transform: translate3d(100%, -50%, 0);
            opacity: 0;
          }
          25% {
            transform: translate3d(-14px, -50%, 0) rotate(-6deg);
            opacity: 1;
          }
          45% {
            transform: translate3d(2px, -50%, 0) rotate(5deg);
          }
          65% {
            transform: translate3d(-8px, -50%, 0) rotate(-3deg);
          }
          80% {
            transform: translate3d(0, -50%, 0) rotate(1deg);
          }
          100% {
            transform: translate3d(0, -50%, 0) rotate(0deg);
          }
        }

        .plus-tab-dock {
          position: fixed;
          right: 0;
          top: 50%;
          z-index: 40;
          transform: translate3d(0, -50%, 0);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          touch-action: pan-y;
          pointer-events: auto;
          user-select: none;
          -webkit-user-select: none;
        }

        .plus-tab-dock.is-animating {
          will-change: transform, opacity;
          animation: plus-tab-wiggle 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards;
        }
      `}</style>

      <aside
        aria-label="Kauntact Plus Pull Tab"
        className={`plus-tab-dock ${isWiggling ? 'is-animating' : ''}`}
      >
        <motion.button
          type="button"
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: -120, right: 0 }}
          dragElastic={{ left: 0.2, right: 0 }}
          dragSnapToOrigin
          onDragEnd={(_e, info) => {
            // Tapping does not do anything — strictly require pulling/dragging left
            const isPull = info.offset.x <= -35 || (info.offset.x <= -20 && info.velocity.x <= -150);
            if (isPull) {
              openUpgradeModal();
            }
          }}
          onClick={(e) => {
            // Explicitly prevent click/tap triggers — only a pull gesture opens the drawer
            e.preventDefault();
            e.stopPropagation();
          }}
          whileHover={{ x: -4 }}
          whileDrag={{ scale: 1.02 }}
          className="group relative flex items-center justify-center pl-2 pr-2 py-2.5 bg-surface/95 backdrop-blur-md border-y border-l border-border hover:border-ink/40 shadow-[-3px_4px_16px_rgba(0,0,0,0.08)] hover:shadow-[-5px_6px_22px_rgba(0,0,0,0.14)] rounded-l-xl text-ink cursor-grab active:cursor-grabbing focus:outline-none select-none touch-pan-y"
          title="Pull to view Kauntact Plus"
          aria-label="Pull to view Kauntact Plus"
        >
          {/* Directional chevron only — NO vertical bar | */}
          <ChevronLeft className="w-3.5 h-3.5 text-muted group-hover:text-ink mr-1 transition-transform group-hover:-translate-x-0.5" />

          {/* Plus 3D geometric emblem */}
          <PlusLogo
            height={19}
            width={19}
            className="w-[19px] h-[19px] transition-transform duration-200 group-hover:scale-110 drop-shadow-sm shrink-0 pointer-events-none"
          />
        </motion.button>
      </aside>
    </>,
    document.body
  );
};

export default PlusSideDrawerTab;
