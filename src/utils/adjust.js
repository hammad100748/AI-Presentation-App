import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const baseWidth = 375; // Standard width for design

// Function to adjust sizes based on screen width
const adjust = (size) => {
  return (width / baseWidth) * size;
};

export default adjust;
