import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { styled } from "styled-components";

const ScrollIndicatorContainer = styled(motion.div)`
  position: absolute;
  top: 100vh;
  left: 50%;
  margin-top: -80px;
  transform: translate(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  color: white;
  cursor: none;
  z-index: 10;
`;

const ScrollText = styled.span`
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  opacity: 0.8;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
`;

// const scrollIndicatorVariants: Variants = {
//   animate: {
//     x: ['-50%', '-50%', '-50%'],
//     y: [0, 10, 0],
//     transition: {
//       y: {
//         duration: 2,
//         repeat: Infinity,
//         ease: 'easeInOut'
//       }
//     }
//   }
// };

const ScrollIndicator: React.FC = () => (
  <ScrollIndicatorContainer
    initial={{
      x: '-50%',
      y: 0,
      opacity: 0
    }}
    whileInView={{
      x: ['-50%', '-50%', '-50%'],
      y: [0, 10, 0],
      opacity: 1
    }}
    transition={{
      y: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      },
      opacity: {
        delay: 3
      }
    }}
  >
    <ScrollText>Scroll Down</ScrollText>
    <ChevronDown size={24} />
  </ScrollIndicatorContainer>
);

export default ScrollIndicator;