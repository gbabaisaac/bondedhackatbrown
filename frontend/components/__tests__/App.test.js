import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';

const TestComponent = () => (
    <View>
        <Text>Hello Testing</Text>
    </View>
);

describe('Smoke Test', () => {
    it('renders correctly', () => {
        const { getByText } = render(<TestComponent />);
        expect(getByText('Hello Testing')).toBeTruthy();
    });
});
