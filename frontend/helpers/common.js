import { Dimensions } from 'react-native';
// file to help make our design responsive

// Helper functions to get the width and height of the screen
// in percentage of the screen size we do this because the screen size is different on different devices

const width = Dimensions.get('window').width;
const height = Dimensions.get('window').height;

// Helper function to get the height in percentage of the screen size
export const hp = (percentage) => {
    return (percentage * height) / 100;
};

// Helper function to get the width in percentage of the screen size
export const wp = (percentage) => {
    return (percentage * width) / 100;
}