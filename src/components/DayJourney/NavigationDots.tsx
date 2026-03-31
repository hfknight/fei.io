import { motion } from "framer-motion";
import { styled } from "styled-components";
import type { TimeSection } from "../../types";

interface NavigationDotsProps {
  sections: TimeSection[];
  activeSection: number;
  onDotClick: (index: number) => void;
}

const NavigationDotsContainer = styled.div`
  position: fixed;
  top: 50%;
  right: 2rem;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 0;
  z-index: 100;

  @media (max-width: 768px) {
    right: 1rem;
  }
`;

const Dot = styled(motion.div)<{ $active: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${(props) =>
    props.$active ? 'white' : 'rgba(255, 255, 255, 0.4)'};
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 16px;
  box-sizing: content-box;
  background-clip: content-box;

  &:hover {
    background: white;
    transform: scale(1.2);
  }
`;

const NavigationDots: React.FC<NavigationDotsProps> = ({
  sections,
  activeSection,
  onDotClick
}) => (
  <NavigationDotsContainer>
    {sections.map((_, index) => (
      <Dot
        key={index}
        $active={activeSection === index}
        onClick={() => onDotClick(index)}
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.9 }}
      />
    ))}
  </NavigationDotsContainer>
);

export default NavigationDots;