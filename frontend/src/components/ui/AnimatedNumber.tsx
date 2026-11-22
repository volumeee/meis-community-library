import { AnimatePresence, motion } from 'motion/react';

interface AnimatedNumberProps {
  value: number;
  className?: string;
}

export function AnimatedNumber({ value, className = '' }: AnimatedNumberProps) {
  return (
    <span className={`inline-block relative overflow-hidden align-bottom ${className}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 10, opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
