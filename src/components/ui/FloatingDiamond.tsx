import { motion } from "framer-motion";

interface FloatingDiamondProps {
  className?: string;
  delay?: number;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-12 h-12",
};

export const FloatingDiamond = ({ 
  className = "", 
  delay = 0,
  size = "md" 
}: FloatingDiamondProps) => (
  <motion.div
    className={`absolute pointer-events-none ${className}`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ 
      opacity: [0.3, 0.6, 0.3],
      y: [0, -15, 0],
      rotate: [0, 10, 0]
    }}
    transition={{ 
      duration: 4,
      delay,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  >
    <div className={`${sizeClasses[size]} border-2 border-purple-500/30 rotate-45 rounded-sm`} />
  </motion.div>
);

export default FloatingDiamond;
