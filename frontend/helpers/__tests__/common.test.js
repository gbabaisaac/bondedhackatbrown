import { Dimensions } from 'react-native';
import { hp, wp } from '../common';

describe('Common Helpers', () => {
    it('hp should calculate height percentage correctly', () => {
        // Dimensions matches the default mock usually (e.g. 1334x750 or similar depending on setup)
        // But let's verify logic: (percentage * height) / 100
        const screenHeight = Dimensions.get('window').height;
        const expected = (50 * screenHeight) / 100;
        expect(hp(50)).toBe(expected);
        expect(hp(10)).toBe((10 * screenHeight) / 100);
    });

    it('wp should calculate width percentage correctly', () => {
        const screenWidth = Dimensions.get('window').width;
        const expected = (50 * screenWidth) / 100;
        expect(wp(50)).toBe(expected);
        expect(wp(25)).toBe((25 * screenWidth) / 100);
    });
});
