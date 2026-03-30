import { motion, useReducedMotion } from 'framer-motion';
import React from 'react';

const DURATION = 0.38;
const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const OFFSET = 24;

interface Props {
  children: React.ReactNode;
}

const PageTransition: React.FC<Props> = ({ children }) => {
  const reduced = useReducedMotion();

  const variants = reduced
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0 } },
        exit: { opacity: 0, transition: { duration: 0 } },
      }
    : {
        initial: { opacity: 0, y: OFFSET },
        animate: {
          opacity: 1,
          y: 0,
          transition: { duration: DURATION, ease: EASE },
        },
        exit: {
          opacity: 0,
          y: -OFFSET,
          transition: { duration: DURATION, ease: EASE },
        },
      };

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ width: '100%' }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
